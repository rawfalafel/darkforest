import * as EventEmitter from 'events';
import LocalStorageManager from "./LocalStorageManager";
import {getCurrentPopulation} from "../utils/Utils";
import {CHUNK_SIZE, LOCATION_ID_UB} from "../utils/constants";
import mimcHash from '../miner/mimc';
import {
  BoardData,
  EthAddress,
  Location,
  Planet,
  PlanetMap,
  Player,
  PlayerMap
} from "../@types/global/global";
import EthereumAPI from "./EthereumAPI";
import MinerManager from "./MinerManager";
import SnarkArgsHelper from "./SnarkArgsHelper";

class GameManager extends EventEmitter {
  static instance: any;

  readonly account: EthAddress;
  readonly players: PlayerMap;
  readonly planets: PlanetMap;
  readonly inMemoryBoard: BoardData;

  private readonly ethereumAPI: EthereumAPI;
  // TODO be able to make this private
  readonly localStorageManager: LocalStorageManager;
  private readonly snarkHelper: SnarkArgsHelper;
  private minerManager?: MinerManager;

  readonly xSize: number;
  readonly ySize: number;
  private readonly xChunks: number;
  private readonly yChunks: number;
  private readonly difficulty: number;

  private constructor(account: EthAddress,
              players: PlayerMap,
              planets: PlanetMap,
              inMemoryBoard: BoardData,
              xSize: number,
              ySize: number,
              xChunks: number,
              yChunks: number,
              difficulty: number,
              ethereumAPI: EthereumAPI,
              localStorageManager: LocalStorageManager,
              snarkHelper: SnarkArgsHelper) {
    super();

    this.account = account;
    this.players = players;
    this.planets = planets;
    this.inMemoryBoard = inMemoryBoard;

    this.xSize = xSize;
    this.ySize = ySize;
    this.xChunks = xChunks;
    this.yChunks = yChunks;
    this.difficulty = difficulty;

    this.ethereumAPI = ethereumAPI;
    this.localStorageManager = localStorageManager;
    this.snarkHelper = snarkHelper;
  }

  static getInstance(): GameManager {
    if (!GameManager.instance) {
      throw new Error("GameManager object has not been initialized yet");
    }

    return GameManager.instance;
  }

  static async initialize(): Promise<GameManager> {
    // basically, we have a bunch of dependencies that need to be loaded according to a DAG

    // first we initialize the EthereumAPI and get the user's eth account, and load contract constants + state
    const ethereumAPI = await EthereumAPI.initialize();
    const account = ethereumAPI.account;
    const {xSize, ySize, difficulty} = await ethereumAPI.getConstants();
    const xChunks = xSize / CHUNK_SIZE;
    const yChunks = ySize / CHUNK_SIZE;
    const players = await ethereumAPI.getPlayers();
    const planets = await ethereumAPI.getPlanets();

    // then we initialize the local storage manager, which may depend on some of the contract constants
    const localStorageManager = await LocalStorageManager.initialize(account, xChunks, yChunks);
    const inMemoryBoard = localStorageManager.getKnownBoard();

    // finally we initialize the snark helper; this doesn't actually have any dependencies
    const snarkHelper = await SnarkArgsHelper.initialize();

    const gameManager = new GameManager(account, players, planets, inMemoryBoard, xSize, ySize, xChunks, yChunks,
      difficulty, ethereumAPI, localStorageManager, snarkHelper);

    // we only want to initialize the mining manager if the player has already joined the game
    // if they haven't, we'll do this once the player has joined the game
    if (!!localStorageManager.getHomeChunk() && (account in players)) {
      gameManager.initMiningManager();
    }

    // set up listeners: whenever EthereumAPI reports some game state update, do some logic
    gameManager.ethereumAPI
      .on('playerUpdate', (player: Player) => {
        gameManager.players[<string>player.address] = player;
      })
      .on('planetUpdate', (planet: Planet) => {
        gameManager.planets[<string>planet.locationId] = planet;
        gameManager.emit("planetUpdate");
      });

    return gameManager;
  }

  private initMiningManager(): void {
    this.minerManager = MinerManager.initialize(this.inMemoryBoard, this.localStorageManager.getHomeChunk(), this.xSize, this.ySize, this.difficulty);
    this.minerManager.on("discoveredNewChunk", () => {
      this.localStorageManager.updateKnownBoard(this.inMemoryBoard);
      this.emit("discoveredNewChunk");
    });
    this.minerManager.startExplore();
  }

  hasJoinedGame(): boolean {
    return <string>this.account in this.players;
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
      if (hash.lesser(LOCATION_ID_UB.divide(this.difficulty))) {
        validHomePlanet = true;
      }
    }
    const chunkX = Math.floor(x / CHUNK_SIZE);
    const chunkY = Math.floor(y / CHUNK_SIZE);
    this.localStorageManager.setHomeChunk({chunkX, chunkY}); // set this before getting the call result, in case user exits before tx confirmed
    this.snarkHelper.getInitArgs(x, y)
      .then(callArgs => {
        return this.ethereumAPI.initializePlayer(callArgs)
      })
      .then(() => {
        this.initMiningManager();
        this.emit("initializedPlayer");
      });
    return this;
  }

  move(from: Location, to: Location): GameManager {
    const oldX = from.x;
    const oldY = from.y;
    const fromPlanet = this.planets[<string>from.hash];
    const newX = to.x;
    const newY = to.y;
    const distMax = Math.abs(newX - oldX) + Math.abs(newY - oldY);
    const shipsMoved = Math.floor(getCurrentPopulation(fromPlanet) / 2);

    if (0 > newX || 0 > newY || this.xSize <= newX || this.ySize <= newY) {
      throw new Error('attempted to move out of bounds');
    }

    if (!fromPlanet || fromPlanet.owner.toLowerCase() !== this.account.toLowerCase()) {
      throw new Error('attempted to move from a planet not owned by player');
    }

    this.snarkHelper.getMoveArgs(oldX, oldY, newX, newY, distMax, shipsMoved)
      .then(callArgs => {
        return this.ethereumAPI.move(callArgs)
      })
      .then(() => {
        this.emit('moved');
      });
    return this;
  }
}

export default GameManager;
