import * as EventEmitter from 'events';
import LocalStorageManager from './LocalStorageManager';
import {
  getCurrentPopulation,
  getPlanetTypeForLocationId
} from '../utils/Utils';
import { CHUNK_SIZE, LOCATION_ID_UB } from '../utils/constants';
import mimcHash from '../miner/mimc';
import {
  BoardData,
  Coordinates,
  EthAddress,
  Location,
  LocationId,
  Planet,
  PlanetMap,
  Player,
  PlayerMap,
  ChunkCoordinates
} from '../@types/global/global';
import EthereumAPI from './EthereumAPI';
import MinerManager from './MinerManager';
import SnarkArgsHelper from './SnarkArgsHelper';
import { locationIdToDecStr } from '../utils/CheckedTypeUtils';

class GameManager extends EventEmitter {
  static instance: any;

  readonly account: EthAddress;
  readonly players: PlayerMap;
  readonly planets: PlanetMap;
  readonly inMemoryBoard: BoardData;
  readonly homeChunk: ChunkCoordinates | null;

  private readonly ethereumAPI: EthereumAPI;
  // TODO be able to make this private
  private readonly localStorageManager: LocalStorageManager;
  private readonly snarkHelper: SnarkArgsHelper;
  private minerManager?: MinerManager;

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
    snarkHelper: SnarkArgsHelper
  ) {
    super();

    this.account = account;
    this.players = players;
    this.planets = planets;
    this.inMemoryBoard = inMemoryBoard;
    this.homeChunk = localStorageManager.getHomeChunk();

    this.xSize = xSize;
    this.ySize = ySize;
    this.xChunks = xChunks;
    this.yChunks = yChunks;
    this.planetRarity = planetRarity;
    this.defaultGrowth = defaultGrowth;
    this.defaultCapacity = defaultCapacity;
    this.defaultHardiness = defaultHardiness;
    this.defaultStalwartness = defaultStalwartness;

    this.ethereumAPI = ethereumAPI;
    this.localStorageManager = localStorageManager;
    this.snarkHelper = snarkHelper;
  }

  static getInstance(): GameManager {
    if (!GameManager.instance) {
      throw new Error('GameManager object has not been initialized yet');
    }

    return GameManager.instance;
  }

  static async initialize(): Promise<GameManager> {
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
      defaultStalwartness
    } = await ethereumAPI.getConstants();
    const xChunks = xSize / CHUNK_SIZE;
    const yChunks = ySize / CHUNK_SIZE;
    const players = await ethereumAPI.getPlayers();
    const planets = await ethereumAPI.getPlanets();

    // then we initialize the local storage manager, which may depend on some of the contract constants
    const localStorageManager = await LocalStorageManager.initialize(
      account,
      xChunks,
      yChunks
    );
    const inMemoryBoard = localStorageManager.getKnownBoard();

    // finally we initialize the snark helper; this doesn't actually have any dependencies
    const snarkHelper = await SnarkArgsHelper.initialize();

    const gameManager = new GameManager(
      account,
      players,
      planets,
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
      snarkHelper
    );

    // we only want to initialize the mining manager if the player has already joined the game
    // if they haven't, we'll do this once the player has joined the game
    if (!!localStorageManager.getHomeChunk() && account in players) {
      gameManager.initMiningManager();
    }

    // set up listeners: whenever EthereumAPI reports some game state update, do some logic
    gameManager.ethereumAPI
      .on('playerUpdate', (player: Player) => {
        gameManager.players[<string>player.address] = player;
      })
      .on('planetUpdate', (planet: Planet) => {
        gameManager.planets[<string>planet.locationId] = planet;
        gameManager.emit('planetUpdate');
      });

    GameManager.instance = gameManager;
    return gameManager;
  }

  private initMiningManager(): void {
    this.minerManager = MinerManager.initialize(
      this.inMemoryBoard,
      this.localStorageManager.getHomeChunk(),
      this.xSize,
      this.ySize,
      this.planetRarity
    );
    this.minerManager.on('discoveredNewChunk', () => {
      this.localStorageManager.updateKnownBoard(this.inMemoryBoard);
      this.emit('discoveredNewChunk');
    });
    this.minerManager.startExplore();
  }

  hasJoinedGame(): boolean {
    return <string>this.account in this.players;
  }

  getPlanetIfExists(coords: Coordinates): Planet | null {
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
        const locationId = location.hash;
        return this.getPlanetWithId(locationId);
      }
    }
    return null;
  }

  getPlanetWithId(locationId: LocationId): Planet {
    if (!!this.planets[locationId]) {
      return this.planets[locationId];
    }
    // return a default unowned planet
    const planetType = getPlanetTypeForLocationId(locationId);
    return {
      owner: null,
      planetType: planetType,
      capacity: this.defaultCapacity[planetType],
      growth: this.defaultGrowth[planetType],
      hardiness: this.defaultHardiness[planetType],
      stalwartness: this.defaultStalwartness[planetType],
      lastUpdated: Date.now(),
      locationId,
      destroyed: false,
      population: 0,
      coordinatesRevealed: false
    };
  }

  getHomeChunk(): ChunkCoordinates | null {
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

  joinGame(): GameManager {
    let validHomePlanet = false;
    let x, y, hash;
    // search for a valid home planet
    while (!validHomePlanet) {
      x = Math.floor(Math.random() * this.xSize);
      y = Math.floor(Math.random() * this.ySize);

      hash = mimcHash(x, y);
      if (hash.lesser(LOCATION_ID_UB.divide(this.planetRarity))) {
        validHomePlanet = true;
      }
    }
    const chunkX = Math.floor(x / CHUNK_SIZE);
    const chunkY = Math.floor(y / CHUNK_SIZE);
    this.localStorageManager.setHomeChunk({ chunkX, chunkY }); // set this before getting the call result, in case user exits before tx confirmed
    this.snarkHelper
      .getInitArgs(x, y)
      .then(callArgs => {
        return this.ethereumAPI.initializePlayer(callArgs);
      })
      .then(() => {
        this.initMiningManager();
        this.emit('initializedPlayer');
      })
      .catch(() => {
        this.emit('initializedPlayerError');
      });
    return this;
  }

  move(from: Location, to: Location): GameManager {
    const oldX = from.coords.x;
    const oldY = from.coords.y;
    const fromPlanet = this.planets[<string>from.hash];
    const newX = to.coords.x;
    const newY = to.coords.y;
    const distMax = Math.abs(newX - oldX) + Math.abs(newY - oldY);
    const shipsMoved = Math.floor(getCurrentPopulation(fromPlanet) / 2);

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
