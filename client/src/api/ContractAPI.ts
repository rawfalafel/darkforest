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

class ContractAPI extends EventEmitter {
  static instance: any;

  account: EthAddress;
  players: PlayerMap;
  planets: PlanetMap;
  inMemoryBoard: BoardData;

  ethereumAPI: EthereumAPI;
  localStorageManager: LocalStorageManager;
  snarkHelper: SnarkArgsHelper;
  minerManager?: MinerManager;

  xSize: number;
  ySize: number;
  xChunks: number;
  yChunks: number;
  difficulty: number;

  constructor() {
    super();
    this.initialize();
  }

  async initialize(): Promise<void> {
    await this.linkEthereumAPI();
    await this.initLocalStorageManager();
    await this.initSnarkHelper();
    const homeChunk = this.localStorageManager.getHomeChunk();
    if (!!homeChunk && this.hasJoinedGame()) {
      // TODO deal with the cases where only one of these two is true
      this.initMiningManager();
    }
    this.emit('initialized', this);
  }

  async linkEthereumAPI(): Promise<void> {
    await this.initEthereumAPI();
    await this.getContractData();
    this.setupEthEventListeners();
  }

  async initEthereumAPI(): Promise<void> {
    try {
      const ethereumAPI = await EthereumAPI.initialize();
      this.ethereumAPI = ethereumAPI;
      this.account = ethereumAPI.account;
    } catch (e) {
      console.log("ethereumAPI init error", e);
      this.emit('ethereumAPI init error');
    }
  }

  async getContractData(): Promise<void> {
    // get constants and player data
    const {xSize, ySize, difficulty} = await this.ethereumAPI.getConstants();
    this.xSize = xSize;
    this.ySize = ySize;
    this.difficulty = difficulty;
    this.xChunks = xSize / CHUNK_SIZE;
    this.yChunks = ySize / CHUNK_SIZE;
    // get players
    this.players = await this.ethereumAPI.getPlayers();
    // get planets
    this.planets = await this.ethereumAPI.getPlanets();
  }

  setupEthEventListeners(): void {
    this.ethereumAPI
      .on('playerUpdate', (player: Player) => {
        this.players[<string>player.address] = player;
      }).on('planetUpdate', (planet: Planet) => {
      this.planets[<string>planet.locationId] = planet;
    });
  }

  hasJoinedGame(): boolean {
    return <string>this.account in this.players;
  }

  async initLocalStorageManager(): Promise<void> {
    this.localStorageManager = await LocalStorageManager.initialize(this.account, this.xChunks, this.yChunks);
    this.inMemoryBoard = this.localStorageManager.getKnownBoard();
  }

  async initSnarkHelper(): Promise<void> {
    this.snarkHelper = await SnarkArgsHelper.initialize();
  }

  initMiningManager(): void {
    this.minerManager = MinerManager.initialize(this.inMemoryBoard, this.localStorageManager.getHomeChunk(), this.xSize, this.ySize, this.difficulty);
    this.minerManager.on("discoveredNewChunk", () => {
      this.localStorageManager.updateKnownBoard(this.inMemoryBoard);
    });
    this.minerManager.startExplore();
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

  joinGame(): ContractAPI {
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

  move(from: Location, to: Location): ContractAPI {
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

  static getInstance(): ContractAPI {
    if (!ContractAPI.instance) {
      const contractAPI = new ContractAPI();
      ContractAPI.instance = contractAPI;
    }

    return ContractAPI.instance;
  }
}

export default ContractAPI;
