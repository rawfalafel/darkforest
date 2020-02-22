import * as EventEmitter from 'events';
import LocalStorageManager from './LocalStorageManager';
import {
  getCurrentPopulation,
  getPlanetTypeForLocation,
  arrive,
} from '../utils/Utils';
import { CHUNK_SIZE, LOCATION_ID_UB } from '../utils/constants';
import mimcHash from '../miner/mimc';
import {
  BoardData,
  EthAddress,
  Location,
  Planet,
  PlanetMap,
  Player,
  PlayerMap,
  QueuedArrival,
  ChunkCoordinates,
  PlanetArrivalMap,
  ArrivalWithTimer,
  LocationId,
  PlanetLocationMap,
} from '../@types/global/global';
import EthereumAPI from './EthereumAPI';
import MinerManager from './MinerManager';
import SnarkArgsHelper from './SnarkArgsHelper';
import { locationIdToDecStr } from '../utils/CheckedTypeUtils';
import { WorldCoords } from '../utils/Coordinates';

import { MiningPattern } from '../@types/global/global';
import { SpiralPattern, GridPattern } from '../utils/MiningPatterns';
import { GridPatternType } from '../@types/global/enums';

class GameManager extends EventEmitter {
  static instance: GameManager;

  readonly account: EthAddress;
  readonly players: PlayerMap;
  readonly planets: PlanetMap;
  readonly arrivalsMap: PlanetArrivalMap;
  readonly inMemoryBoard: BoardData;
  readonly homeChunk: ChunkCoordinates | null;
  readonly planetLocationMap: PlanetLocationMap;

  private readonly ethereumAPI: EthereumAPI;
  // TODO be able to make this private
  private readonly localStorageManager: LocalStorageManager;
  private readonly snarkHelper: SnarkArgsHelper;

  private minerManager?: MinerManager;
  private miningPattern: MiningPattern;

  readonly xSize: number;
  readonly ySize: number;
  private readonly xChunks: number;
  private readonly yChunks: number;
  private readonly planetRarity: number;
  private readonly defaultGrowth: number[];
  private readonly defaultCapacity: number[];
  private readonly defaultHardiness: number[];
  private readonly defaultStalwartness: number[];

  private constructor(
    account: EthAddress,
    players: PlayerMap,
    planets: PlanetMap,
    arrivalsMap: PlanetArrivalMap,
    inMemoryBoard: BoardData,
    xSize: number,
    ySize: number,
    xChunks: number,
    yChunks: number,
    planetRarity: number,
    defaultGrowth: number[],
    defaultCapacity: number[],
    defaultHardiness: number[],
    defaultStalwartness: number[],
    ethereumAPI: EthereumAPI,
    localStorageManager: LocalStorageManager,
    snarkHelper: SnarkArgsHelper,
    homeChunk: ChunkCoordinates | null
  ) {
    super();

    this.account = account;
    this.players = players;
    this.planets = planets;
    this.arrivalsMap = arrivalsMap;
    this.inMemoryBoard = inMemoryBoard;

    this.xSize = xSize;
    this.ySize = ySize;
    this.xChunks = xChunks;
    this.yChunks = yChunks;
    this.planetRarity = planetRarity;
    this.defaultGrowth = defaultGrowth;
    this.defaultCapacity = defaultCapacity;
    this.defaultHardiness = defaultHardiness;
    this.defaultStalwartness = defaultStalwartness;
    this.homeChunk = homeChunk;

    this.ethereumAPI = ethereumAPI;
    this.localStorageManager = localStorageManager;
    this.snarkHelper = snarkHelper;

    this.planetLocationMap = {};
    for (let chunkX = 0; chunkX < inMemoryBoard.length; chunkX += 1) {
      for (let chunkY = 0; chunkY < inMemoryBoard[chunkX].length; chunkY += 1) {
        const chunkData = inMemoryBoard[chunkX][chunkY];
        if (chunkData) {
          for (const planetLocation of chunkData.planetLocations) {
            this.planetLocationMap[planetLocation.hash] = planetLocation;
          }
        }
      }
    }
  }

  static getInstance(): GameManager {
    if (!GameManager.instance) {
      throw new Error('GameManager object has not been initialized yet');
    }

    return GameManager.instance;
  }

  static async initialize(): Promise<GameManager> {
    window.mimcHash = mimcHash;
    // basically, we have a bunch of dependencies that need to be loaded according to a DAG

    // first we initialize the EthereumAPI and get the user's eth account, and load contract constants + state
    const ethereumAPI = await EthereumAPI.initialize();
    const account = ethereumAPI.account;
    const {
      xSize,
      ySize,
      planetRarity,
      defaultGrowth,
      defaultCapacity,
      defaultHardiness,
      defaultStalwartness,
    } = await ethereumAPI.getConstants();
    const xChunks = xSize / CHUNK_SIZE;
    const yChunks = ySize / CHUNK_SIZE;
    const players = await ethereumAPI.getPlayers();
    const planets = await ethereumAPI.getPlanets();
    const arrivalsMap: PlanetArrivalMap = {};
    const arrivalPromises: Promise<null>[] = [];
    for (const planetId in planets) {
      if (planets.hasOwnProperty(planetId)) {
        const planet = planets[planetId];
        const planetArrivalsPromise = ethereumAPI
          .getArrivals(planet)
          .then(arrivalsForPlanet => {
            arrivalsForPlanet.sort((a, b) => a.arrivalTime - b.arrivalTime);
            arrivalsMap[planetId] = GameManager.processArrivalsForPlanet(
              planet.locationId,
              arrivalsForPlanet,
              planets
            );
            return null;
          })
          .catch(err => {
            console.error(`error occurred in processing arrivals: ${err}`);
            return null;
          });
        arrivalPromises.push(planetArrivalsPromise);
      }
    }
    await Promise.all(arrivalPromises);

    // then we initialize the local storage manager, which may depend on some of the contract constants
    const localStorageManager = await LocalStorageManager.initialize(
      account,
      xChunks,
      yChunks
    );
    const inMemoryBoard = await localStorageManager.getKnownBoard();

    const homeChunk = await localStorageManager.getHomeChunk();
    // finally we initialize the snark helper; this doesn't actually have any dependencies
    const snarkHelper = await SnarkArgsHelper.initialize();

    const gameManager = new GameManager(
      account,
      players,
      planets,
      arrivalsMap,
      inMemoryBoard,
      xSize,
      ySize,
      xChunks,
      yChunks,
      planetRarity,
      defaultGrowth,
      defaultCapacity,
      defaultHardiness,
      defaultStalwartness,
      ethereumAPI,
      localStorageManager,
      snarkHelper,
      homeChunk
    );

    // we only want to initialize the mining manager if the player has already joined the game
    // if they haven't, we'll do this once the player has joined the game
    if (!!homeChunk && account in players) {
      gameManager.initMiningManager(homeChunk);
    }

    // set up listeners: whenever EthereumAPI reports some game state update, do some logic
    gameManager.ethereumAPI
      .on('playerUpdate', (player: Player) => {
        gameManager.players[player.address as string] = player;
      })
      .on('planetUpdate', async (planet: Planet) => {
        gameManager.planets[planet.locationId as string] = planet;
        gameManager.clearOldArrivals(planet);
        ethereumAPI.getArrivals(planet).then(arrivals => {
          const arrivalsWithTimers = GameManager.processArrivalsForPlanet(
            planet.locationId,
            arrivals,
            planets
          );
          gameManager.arrivalsMap[planet.locationId] = arrivalsWithTimers;
          gameManager.emit('planetUpdate');
        });
      });

    GameManager.instance = gameManager;
    return gameManager;
  }
  getLocalStorageManager(): LocalStorageManager {
    return this.localStorageManager;
  }
  getMaxChunks(): ChunkCoordinates {
    return <ChunkCoordinates>{
      chunkX: this.xChunks,
      chunkY: this.yChunks,
    };
  }

  private initMiningManager(homeChunk): void {
    const myPattern: MiningPattern = new SpiralPattern(homeChunk);

    this.minerManager = MinerManager.initialize(
      this.inMemoryBoard,
      myPattern,
      this.xSize,
      this.ySize,
      this.planetRarity
    );

    this.minerManager.on('discoveredNewChunk', chunk => {
      for (const planetLocation of chunk.planetLocations) {
        this.planetLocationMap[planetLocation.hash] = planetLocation;
      }
      if (Math.random() < 0.1) {
        //TODO, make this nicer.
        this.localStorageManager.updateKnownBoard(this.inMemoryBoard);
      }
      this.emit('discoveredNewChunk');
    });
    this.minerManager.startExplore();
  }
  setMiningPattern(pattern: MiningPattern) {
    if (this.minerManager) {
      this.minerManager.setMiningPattern(pattern);
    }
  }

  hasJoinedGame(): boolean {
    return (this.account as string) in this.players;
  }

  getPlanetIfExists(coords: WorldCoords): Planet | null {
    const { x, y } = coords;
    const knownBoard: BoardData = this.inMemoryBoard;
    const chunkX = Math.floor(x / CHUNK_SIZE);
    const chunkY = Math.floor(y / CHUNK_SIZE);
    if (
      chunkX < 0 ||
      chunkY < 0 ||
      chunkX >= knownBoard.length ||
      chunkY >= knownBoard[chunkX].length
    ) {
      return null;
    }
    const chunk = knownBoard[chunkX][chunkY];
    if (!chunk) {
      return null;
    }
    for (const location of chunk.planetLocations) {
      if (location.coords.x === x && location.coords.y === y) {
        return this.getPlanetWithLocation(location);
      }
    }
    return null;
  }
  getAssetsOfPlayer(playerId: string) {
    return parseInt('0x' + playerId.substring(0, 6));
  }

  getPlanetWithLocation(location: Location): Planet {
    if (!!this.planets[location.hash]) {
      return this.planets[location.hash];
    }
    // return a default unowned planet
    const planetType = getPlanetTypeForLocation(location);
    return {
      owner: null,
      planetType: planetType,
      capacity: this.defaultCapacity[planetType],
      growth: this.defaultGrowth[planetType],
      hardiness: this.defaultHardiness[planetType],
      stalwartness: this.defaultStalwartness[planetType],
      lastUpdated: Date.now(),
      locationId: location.hash,
      destroyed: false,
      population: 0,
      coordinatesRevealed: false,
    };
  }

  async getTotalBalance(): Promise<number> {
    const eApi = EthereumAPI.getInstance();
    const balance = await eApi.getBalance();

    return balance;
  }
  getTotalCapacity(): number {
    let totalCap = 0;

    for (const key in this.planets) {
      totalCap += this.planets[key].capacity;
    }

    return totalCap;
  }
  getHomeChunk(): ChunkCoordinates {
    if (this.homeChunk) {
      return this.homeChunk;
    }
    return this.localStorageManager.getHomeChunk();
  }

  startExplore(): void {
    if (this.minerManager) {
      this.minerManager.startExplore();
    }
  }

  stopExplore(): void {
    if (this.minerManager) {
      this.minerManager.stopExplore();
    }
  }

  private clearOldArrivals(planet: Planet) {
    const planetId = planet.locationId;
    // clear old timeouts
    if (this.arrivalsMap[planetId]) {
      // clear if the planet already had stored arrivals
      for (const arrivalWithTimer of this.arrivalsMap[planetId]) {
        clearTimeout(arrivalWithTimer.timer);
      }
    }
    this.arrivalsMap[planetId] = [];
  }

  private static processArrivalsForPlanet(
    planetId: LocationId,
    arrivals: QueuedArrival[],
    allPlanets: PlanetMap
  ): ArrivalWithTimer[] {
    // process the QueuedArrival[] for a single planet
    const arrivalsWithTimers: ArrivalWithTimer[] = [];

    // sort arrivals by timestamp
    arrivals.sort((a, b) => a.arrivalTime - b.arrivalTime);
    const nowInSeconds = Date.now() / 1000;
    for (const arrival of arrivals) {
      try {
        if (
          nowInSeconds - arrival.arrivalTime > 0 &&
          allPlanets[arrival.oldLoc] &&
          allPlanets[arrival.newLoc]
        ) {
          // if arrival happened in the past, run this arrival
          arrive(
            allPlanets[arrival.oldLoc],
            allPlanets[arrival.newLoc],
            arrival
          );
        } else {
          // otherwise, set a timer to do this arrival in the future
          // and append it to arrivalsWithTimers
          const applyFutureArrival = setTimeout(() => {
            arrive(
              allPlanets[arrival.oldLoc],
              allPlanets[arrival.newLoc],
              arrival
            );
          }, arrival.arrivalTime * 1000 - Date.now());
          const arrivalWithTimer = {
            arrivalData: arrival,
            timer: applyFutureArrival,
          };
          arrivalsWithTimers.push(arrivalWithTimer);
        }
      } catch (e) {
        console.error(
          `error occurred processing arrival for updated planet ${planetId}: ${e}`
        );
      }
    }
    return arrivalsWithTimers;
  }

  joinGame(): GameManager {
    this.getRandomHomePlanetCoords().then(async coords => {
      const { x, y } = coords;
      const chunkX = Math.floor(x / CHUNK_SIZE);
      const chunkY = Math.floor(y / CHUNK_SIZE);
      await this.localStorageManager.setHomeChunk({ chunkX, chunkY }); // set this before getting the call result, in case user exits before tx confirmed
      this.snarkHelper
        .getInitArgs(x, y)
        .then(callArgs => {
          return this.ethereumAPI.initializePlayer(callArgs);
        })
        .then(async () => {
          this.initMiningManager(await this.localStorageManager.getHomeChunk());
          this.emit('initializedPlayer');
        })
        .catch(() => {
          this.emit('initializedPlayerError');
        });
    });

    return this;
  }

  private async getRandomHomePlanetCoords(): Promise<WorldCoords> {
    let count = 100;
    let validHomePlanet = false;
    let x = Math.floor(Math.random() * this.xSize);
    let y = Math.floor(Math.random() * this.ySize);
    let hash = mimcHash(x, y);
    if (hash.lesser(LOCATION_ID_UB.divide(this.planetRarity))) {
      validHomePlanet = true;
    }
    while (!validHomePlanet && count > 0) {
      x = Math.floor(Math.random() * this.xSize);
      y = Math.floor(Math.random() * this.ySize);

      hash = mimcHash(x, y);
      if (hash.lesser(LOCATION_ID_UB.divide(this.planetRarity))) {
        validHomePlanet = true;
      }
      count -= 1;
    }
    if (validHomePlanet) {
      return new WorldCoords(x, y);
    }
    return new Promise(resolve => {
      setTimeout(async () => {
        const coords = await this.getRandomHomePlanetCoords();
        resolve(coords);
      }, 1);
    });
  }

  move(from: Location, to: Location, forces: number): GameManager {
    const oldX = from.coords.x;
    const oldY = from.coords.y;
    const fromPlanet = this.planets[from.hash as string];
    const newX = to.coords.x;
    const newY = to.coords.y;
    const distMax = Math.abs(newX - oldX) + Math.abs(newY - oldY);

    const shipsMoved = Math.floor(
      getCurrentPopulation(fromPlanet) * (forces / 100)
    );

    if (0 > newX || 0 > newY || this.xSize <= newX || this.ySize <= newY) {
      throw new Error('attempted to move out of bounds');
    }

    if (
      !fromPlanet ||
      fromPlanet.owner.toLowerCase() !== this.account.toLowerCase()
    ) {
      throw new Error('attempted to move from a planet not owned by player');
    }

    this.snarkHelper
      .getMoveArgs(oldX, oldY, newX, newY, distMax, shipsMoved)
      .then(callArgs => {
        return this.ethereumAPI.move(callArgs);
      })
      .then(() => {
        this.emit('moved');
      });
    return this;
  }

  cashOut(location: Location): GameManager {
    this.ethereumAPI.cashOut(locationIdToDecStr(location.hash)).then(() => {
      this.emit('destroyedPlanet');
    });
    return this;
  }
}

export default GameManager;
