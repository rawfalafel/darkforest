import * as EventEmitter from 'events';
import LocalStorageManager from "./LocalStorageManager";
import {getCurrentPopulation, witnessObjToBuffer} from "../utils/Utils";
import {CHUNK_SIZE, LOCATION_ID_UB} from "../utils/constants";
import Worker from 'worker-loader!../miner/miner.worker';
import mimcHash from '../miner/mimc';
import {Circuit} from "snarkjs";
import {EthAddress, Planet, PlanetMap, Player, PlayerMap, WebsnarkProof} from "../@types/global/global";
import {BigInteger} from "big-integer";
import EthereumAPI from "./EthereumAPI";
import {InitializePlayerArgs, MoveArgs} from "../@types/darkforest/api/EthereumAPI";

const initCircuit = require("../circuits/init/circuit.json");
const moveCircuit = require("../circuits/move/circuit.json");

const zkSnark = require("snarkjs");

class ContractAPI extends EventEmitter {
  static instance: any;

  provingKeyMove: ArrayBuffer;
  provingKeyInit: ArrayBuffer;
  ethereumAPI: EthereumAPI;
  account: EthAddress;
  constants: any;
  players: PlayerMap;
  planets: PlanetMap;
  localStorageManager: any;
  inMemoryBoard: any;
  worker: any;
  isExploring: any = false;
  homeChunk: any;
  discoveringFromChunk: any; // the "center" of the spiral. defaults to homeChunk

  constructor() {
    super();
    this.isExploring = false;
    this.initialize();
  }

  async initialize() {
    await this.getKeys();
    await this.linkEthereumAPI();
    await this.initWorker();
    await this.initLocalStorageManager();
    this.emit('initialized', this);
  }

  async getKeys() {
    // we don't do the usual webpack stuff
    // instead we do this based on the example from https://github.com/iden3/websnark
    const provingKeyMoveRes = await fetch('./public/proving_key_move.bin'); // proving_keys needs to be in `public`
    this.provingKeyMove = await provingKeyMoveRes.arrayBuffer();
    const provingKeyInitRes = await fetch('./public/proving_key_init.bin');
    this.provingKeyInit = await provingKeyInitRes.arrayBuffer();
    this.emit('proverKeys');
    return this;
  }

  async linkEthereumAPI() {
    await this.initEthereumAPI();
    await this.getContractData();
    this.setupEthEventListeners();
  }

  async initEthereumAPI() {
    try {
      const ethereumAPI = await EthereumAPI.initialize();
      this.ethereumAPI = ethereumAPI;
      this.account = ethereumAPI.account;
      return this;
    } catch (e) {
      console.log("ethereumAPI init error", e);
      this.emit('ethereumAPI init error');
    }
  }

  async getContractData() {
    // get constants and player data
    const {xSize, ySize, difficulty} = await this.ethereumAPI.getConstants();
    const xChunks = xSize / CHUNK_SIZE;
    const yChunks = ySize / CHUNK_SIZE;
    this.constants = {xSize, ySize, difficulty, xChunks, yChunks};
    // get players
    this.players = await this.ethereumAPI.getPlayers();
    // get planets
    this.planets = await this.ethereumAPI.getPlanets();
  }

  setupEthEventListeners() {
    this.ethereumAPI
      .on('playerUpdate', (player: Player) => {
        this.players[<string>player.address] = player;
      }).on('planetUpdate', (planet: Planet) => {
      this.planets[<string>planet.locationId] = planet;
    });
  }

  hasJoinedGame() {
    return this.account in this.players;
  }

  async initLocalStorageManager() {
    this.localStorageManager = LocalStorageManager.getInstance();
    this.localStorageManager.setContractAPI(this);
    this.inMemoryBoard = this.localStorageManager.getKnownBoard();
    const homeChunkRaw = this.localStorageManager.getHomeChunk();
    if (homeChunkRaw) {
      this.homeChunk = {
        chunkX: homeChunkRaw[0],
        chunkY: homeChunkRaw[1]
      };
      this.discoveringFromChunk = this.homeChunk;
      this.startExplore(null);
    }
    this.emit('localStorageInit');
  }

  async initWorker() {
    this.worker = new Worker();
    this.worker.onmessage = (e) => {
      // worker explored some coords
      const data = JSON.parse(e.data);
      const {chunkX, chunkY} = data.id;
      this.discover({chunkX, chunkY, chunkData: data});
    }
  }

  async discover(chunk) {
    if ((chunk.chunkX != null) && (chunk.chunkY != null) && (chunk.chunkData != null)) {
      this.inMemoryBoard[chunk.chunkX][chunk.chunkY] = chunk.chunkData;
      this.localStorageManager.updateKnownBoard(this.inMemoryBoard);
      this.emit('discover', this.inMemoryBoard);
      if (this.isExploring) {
        // if this.isExploring, move on to the next chunk
        let nextChunk: any = await this.nextValidExploreTarget(chunk);
        if (nextChunk) {
          this.worker.postMessage(this.composeMessage('exploreChunk', [nextChunk.chunkX, nextChunk.chunkY, this.constants.difficulty]));
        }
      }
    }
  }

  async startExplore(centerChunk) {
    if (!!centerChunk) {
      this.discoveringFromChunk = centerChunk;
    } else if (!this.discoveringFromChunk) {
      this.discoveringFromChunk = this.homeChunk;
    }
    if (!this.discoveringFromChunk) {
      return;
    }
    this.isExploring = true;
    const firstChunk: any = await this.nextValidExploreTarget(this.discoveringFromChunk);
    if (firstChunk) {
      this.worker.postMessage(this.composeMessage('exploreChunk', [firstChunk.chunkX, firstChunk.chunkY, this.constants.difficulty]));
    }
  }

  stopExplore() {
    this.isExploring = false;
  }

  async nextValidExploreTarget(chunk) {
    // async because it may take indefinitely long to find the next target. this will block UI if done sync
    // we use this trick to promisify:
    // https://stackoverflow.com/questions/10344498/best-way-to-iterate-over-an-array-without-blocking-the-ui/10344560#10344560

    // this function may return null if user chooses to stop exploring in the middle of its resolution
    // so any function calling it should handle the null case appropriately
    if (!this.isExploring) {
      return null;
    }
    let nextChunk = this.nextChunkInExploreOrder(chunk, this.discoveringFromChunk);
    let count = 100;
    while (!this.isValidExploreTarget(nextChunk) && count > 0) {
      nextChunk = this.nextChunkInExploreOrder(nextChunk, this.discoveringFromChunk);
      count -= 1;
    }
    if (this.isValidExploreTarget(nextChunk)) {
      return nextChunk;
    }
    return new Promise(resolve => {
      setTimeout(async () => {
        this.nextValidExploreTarget(nextChunk).then(validExploreChunk => {
          resolve(validExploreChunk);
        });
      }, 1);
    })
  }

  isValidExploreTarget(chunk) {
    const {chunkX, chunkY} = chunk;
    const {xSize, ySize} = this.constants;
    const xChunks = xSize / CHUNK_SIZE;
    const yChunks = ySize / CHUNK_SIZE;
    // should be inbounds, and unexplored
    return (chunkX >= 0 && chunkX < xChunks && chunkY >= 0 && chunkY < yChunks && !this.inMemoryBoard[chunkX][chunkY])
  }

  nextChunkInExploreOrder(chunk, homeChunk) {
    // spiral
    const homeChunkX = homeChunk.chunkX;
    const homeChunkY = homeChunk.chunkY;
    const currentChunkX = chunk.chunkX;
    const currentChunkY = chunk.chunkY;
    if (currentChunkX === homeChunkX && currentChunkY === homeChunkY) {
      return {
        chunkX: homeChunkX,
        chunkY: homeChunkY + 1
      };
    }
    if (currentChunkY - currentChunkX > homeChunkY - homeChunkX && currentChunkY + currentChunkX >= homeChunkX + homeChunkY) {
      if (currentChunkY + currentChunkX == homeChunkX + homeChunkY) {
        // break the circle
        return {
          chunkX: currentChunkX,
          chunkY: currentChunkY + 1
        };
      }
      return {
        chunkX: currentChunkX + 1,
        chunkY: currentChunkY
      };
    }
    if (currentChunkX + currentChunkY > homeChunkX + homeChunkY && currentChunkY - currentChunkX <= homeChunkY - homeChunkX) {
      return {
        chunkX: currentChunkX,
        chunkY: currentChunkY - 1
      };
    }
    if (currentChunkX + currentChunkY <= homeChunkX + homeChunkY && currentChunkY - currentChunkX < homeChunkY - homeChunkX) {
      return {
        chunkX: currentChunkX - 1,
        chunkY: currentChunkY
      };
    }
    if (currentChunkX + currentChunkY < homeChunkX + homeChunkY && currentChunkY - currentChunkX >= homeChunkY - homeChunkX) {
      return {
        chunkX: currentChunkX,
        chunkY: currentChunkY + 1
      };
    }
  }

  joinGame() {
    const {xSize, ySize} = this.constants;
    let validHomePlanet = false;
    let x, y, hash;
    // search for a valid home planet
    while (!validHomePlanet) {
      x = Math.floor(Math.random() * xSize);
      y = Math.floor(Math.random() * ySize);

      hash = mimcHash(x, y);
      if (hash.lesser(LOCATION_ID_UB.divide(this.constants.difficulty))) {
        validHomePlanet = true;
      }
    }
    const chunkX = Math.floor(x / CHUNK_SIZE);
    const chunkY = Math.floor(y / CHUNK_SIZE);
    this.worker.postMessage(this.composeMessage(
      'exploreChunk',
      [chunkX, chunkY, this.constants.difficulty]
    ));
    this.localStorageManager.setHomeChunk(chunkX, chunkY); // set this before getting the call result, in case user exits before tx confirmed
    this.homeChunk = {chunkX, chunkY};
    this.discoveringFromChunk = this.homeChunk;
    this.initContractCall(x, y).then(contractCall => {
      this.emit('initializingPlayer');
      this.ethereumAPI.initializePlayer(contractCall).then(() => {this.emit("initializedPlayer")});
    });
    return this;
  }

  move(fromLoc, toLoc) {
    const oldX = parseInt(fromLoc.x);
    const oldY = parseInt(fromLoc.y);
    const fromPlanet = this.planets[fromLoc.hash];
    const newX = parseInt(toLoc.x);
    const newY = parseInt(toLoc.y);
    const toPlanet = this.planets[toLoc.hash];
    const dx = newX - oldX;
    const dy = newY - oldY;
    const distMax = Math.abs(dx) + Math.abs(dy);

    const { xSize, ySize } = this.constants;
    if (0 > newX || 0 > newY || xSize <= newX || ySize <= newY) {
      throw new Error('attempted to move out of bounds');
    }
    if (!fromPlanet || fromPlanet.owner.toLowerCase() !== this.account.toLowerCase()) {
      throw new Error('attempted to move from a planet not owned by player');
    }

    const hash = mimcHash(newX, newY);
    this.moveContractCall(oldX, oldY, newX, newY, distMax, Math.floor(getCurrentPopulation(fromPlanet) / 2)).then(contractCall => {
      const loc = {
        x: newX.toString(),
        y: newY.toString(),
        hash: hash.toString()
      };
      this.emit('moveSend');
      this.ethereumAPI.move(contractCall).then(() => {
        this.emit('moveComplete');
      }).catch(() => {
        this.emit('moveError');
      });
    });

    return this;
  }

  async initContractCall(x, y) {
    const circuit: Circuit = new zkSnark.Circuit(initCircuit);
    const input = {x: x.toString(), y: y.toString()};
    const witness: ArrayBuffer = witnessObjToBuffer(circuit.calculateWitness(input));
    const snarkProof: WebsnarkProof = await window.genZKSnarkProof(witness, this.provingKeyInit);
    console.log("snarkProof", snarkProof);
    const publicSignals: BigInteger[] = [mimcHash(x, y)];
    return this.genInitCall(snarkProof, publicSignals);
  }

  async moveContractCall(x1, y1, x2, y2, distMax, shipsMoved) {
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

  composeMessage(type, payload) {
    return JSON.stringify([type].concat(payload));
  }

  static getInstance() {
    if (!ContractAPI.instance) {
      const contractAPI = new ContractAPI();
      ContractAPI.instance = contractAPI;
    }

    return ContractAPI.instance;
  }
}

export default ContractAPI;
