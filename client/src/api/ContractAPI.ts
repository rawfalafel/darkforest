import * as EventEmitter from 'events';
import LocalStorageManager from "./LocalStorageManager";
import {getCurrentPopulation, witnessObjToBuffer} from "../utils/Utils";
import {CHUNK_SIZE, LOCATION_ID_UB} from "../utils/constants";
import mimcHash from '../miner/mimc';
import {Circuit} from "snarkjs";
import {
  BoardData,
  EthAddress,
  Planet,
  PlanetMap,
  Player,
  PlayerMap,
  WebsnarkProof
} from "../@types/global/global";
import {BigInteger} from "big-integer";
import EthereumAPI from "./EthereumAPI";
import {InitializePlayerArgs, MoveArgs} from "../@types/darkforest/api/EthereumAPI";
import MinerManager from "./MinerManager";

const initCircuit = require("../circuits/init/circuit.json");
const moveCircuit = require("../circuits/move/circuit.json");

const zkSnark = require("snarkjs");

class ContractAPI extends EventEmitter {
  static instance: any;

  provingKeyMove: ArrayBuffer;
  provingKeyInit: ArrayBuffer;
  ethereumAPI: EthereumAPI;
  account: EthAddress;
  players: PlayerMap;
  planets: PlanetMap;
  localStorageManager: LocalStorageManager;
  inMemoryBoard: BoardData;
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
    await this.getKeys();
    await this.linkEthereumAPI();
    await this.initLocalStorageManager();
    const homeChunk = this.localStorageManager.getHomeChunk();
    if (!!homeChunk && this.hasJoinedGame()) {
      // TODO deal with the cases where only one of these two is true
      this.initMiningManager();
    }
    this.emit('initialized', this);
  }

  async getKeys(): Promise<void> {
    // we don't do the usual webpack stuff
    // instead we do this based on the example from https://github.com/iden3/websnark
    const provingKeyMoveRes = await fetch('./public/proving_key_move.bin'); // proving_keys needs to be in `public`
    this.provingKeyMove = await provingKeyMoveRes.arrayBuffer();
    const provingKeyInitRes = await fetch('./public/proving_key_init.bin');
    this.provingKeyInit = await provingKeyInitRes.arrayBuffer();
    this.emit('proverKeys');
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
    this.initContractCall(x, y).then(contractCall => {
      this.emit('initializingPlayer');
      this.ethereumAPI.initializePlayer(contractCall)
        .then(() => {
          this.initMiningManager();
          this.emit("initializedPlayer");
        });
    });
    return this;
  }

  move(fromLoc, toLoc): ContractAPI {
    const oldX = parseInt(fromLoc.x);
    const oldY = parseInt(fromLoc.y);
    const fromPlanet = this.planets[fromLoc.hash];
    const newX = parseInt(toLoc.x);
    const newY = parseInt(toLoc.y);
    const toPlanet = this.planets[toLoc.hash];
    const dx = newX - oldX;
    const dy = newY - oldY;
    const distMax = Math.abs(dx) + Math.abs(dy);

    if (0 > newX || 0 > newY || this.xSize <= newX || this.ySize <= newY) {
      throw new Error('attempted to move out of bounds');
    }
    if (!fromPlanet || fromPlanet.owner.toLowerCase() !== this.account.toLowerCase()) {
      throw new Error('attempted to move from a planet not owned by player');
    }

    this.moveContractCall(oldX, oldY, newX, newY, distMax, Math.floor(getCurrentPopulation(fromPlanet) / 2)).then(contractCall => {
      this.emit('moveSend');
      this.ethereumAPI.move(contractCall).then(() => {
        this.emit('moveComplete');
      }).catch(() => {
        this.emit('moveError');
      });
    });
    return this;
  }

  async initContractCall(x, y): Promise<InitializePlayerArgs> {
    const circuit: Circuit = new zkSnark.Circuit(initCircuit);
    const input = {x: x.toString(), y: y.toString()};
    const witness: ArrayBuffer = witnessObjToBuffer(circuit.calculateWitness(input));
    const snarkProof: WebsnarkProof = await window.genZKSnarkProof(witness, this.provingKeyInit);
    const publicSignals: BigInteger[] = [mimcHash(x, y)];
    return this.genInitCall(snarkProof, publicSignals);
  }

  async moveContractCall(x1, y1, x2, y2, distMax, shipsMoved): Promise<MoveArgs> {
    const circuit = new zkSnark.Circuit(moveCircuit);
    const input = {
      x1: x1.toString(),
      y1: y1.toString(),
      x2: x2.toString(),
      y2: y2.toString(),
      distMax: distMax.toString()
    };
    const witness: ArrayBuffer = witnessObjToBuffer(circuit.calculateWitness(input));
    const snarkProof = await window.genZKSnarkProof(witness, this.provingKeyMove);
    const publicSignals = [mimcHash(x1, y1), mimcHash(x2, y2), distMax.toString(), shipsMoved.toString()];
    return this.genMoveCall(snarkProof, publicSignals);
  }

  genInitCall(snarkProof: WebsnarkProof, publicSignals: BigInteger[]): InitializePlayerArgs {
    // the object returned by genZKSnarkProof needs to be massaged into a set of parameters the verifying contract
    // will accept
    return [
      snarkProof.pi_a.slice(0, 2), // pi_a
      // genZKSnarkProof reverses values in the inner arrays of pi_b
      [snarkProof.pi_b[0].reverse(), snarkProof.pi_b[1].reverse()], // pi_b
      snarkProof.pi_c.slice(0, 2), // pi_c
      publicSignals.map(signal => signal.toString(10)) // input
    ]
  }

  genMoveCall(snarkProof: WebsnarkProof, publicSignals: BigInteger[]): MoveArgs {
    // the object returned by genZKSnarkProof needs to be massaged into a set of parameters the verifying contract
    // will accept
    return [
      snarkProof.pi_a.slice(0, 2), // pi_a
      // genZKSnarkProof reverses values in the inner arrays of pi_b
      [snarkProof.pi_b[0].reverse(), snarkProof.pi_b[1].reverse()], // pi_b
      snarkProof.pi_c.slice(0, 2), // pi_c
      publicSignals.map(signal => signal.toString(10)) // input
    ]
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
