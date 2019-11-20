import * as EventEmitter from 'events';
import Web3Manager from "./Web3Manager";
import LocalStorageManager from "./LocalStorageManager";
import {getCurrentPopulation, witnessObjToBuffer} from "./utils/Utils";
import {CHUNK_SIZE, DIFFICULTY, LOCATION_ID_UB} from "./constants";
import Worker from 'worker-loader!./miner/miner.worker';
import mimcHash from './miner/mimc';

const initCircuit = require("./circuits/init/circuit.json");
const moveCircuit = require("./circuits/move/circuit.json");

const zkSnark = require("snarkjs");
const {stringifyBigInts} = require("../node_modules/snarkjs/src/stringifybigint.js");

class ContractAPI extends EventEmitter {
  static instance: any;

  provingKeyMove: any;
  provingKeyInit: any;
  web3Manager: any; // keep a reference so we don't have to do an async call after the first time
  web3Loaded: any; // a flag
  account: any;
  loadingError: any;
  constants: any;
  nPlayers: any;
  nPlanets: any;
  players: any;
  planets: any;
  localStorageManager: any;
  hasJoinedGame: any;
  inMemoryBoard: any;
  worker: any;
  isExploring: any = false;
  homeChunk: any;
  discoveringFromChunk: any; // the "center" of the spiral. defaults to homeChunk

  constructor() {
    super();
    this.web3Loaded = false;
    this.isExploring = false;
    this.initialize();
  }

  async initialize() {
    await this.getKeys();
    await this.getContractData();
    await this.initWorker();
    await this.initLocalStorageManager();
    this.emit('initialized', this);
  }

  async getKeys() {
    const provingKeyMoveRes = await fetch('./public/proving_key_move.bin'); // proving_keys needs to be in `public`
    this.provingKeyMove = await provingKeyMoveRes.arrayBuffer();
    const provingKeyInitRes = await fetch('./public/proving_key_init.bin');
    this.provingKeyInit = await provingKeyInitRes.arrayBuffer();
    this.emit('proverKeys');
    return this;
  }

  async getContractData() {
    await this.getWeb3Manager();
    await this.getContractConstants();
    await this.getPlayerData();
    this.setupEventListeners();
    this.web3Loaded = true;
    this.emit('contractData', this);
    return this;
  }

  setupEventListeners() {
    this.web3Manager.contract.events.allEvents()
    .on("data", (event) => {
      if (event.event === "PlayerInitialized") { this.handlePlayerInitialized(event) }
      else if (event.event === "PlayerMoved") { this.handlePlayerMoved(event) }
      else { throw new Error('Invalid event.')}
    }).on("error", console.error);

    // TODO: this logic should work but somehow executes twice
    // this.web3Manager.contract.events.PlayerInitialized()
    // .on("data", this.handlePlayerInitialized).on("error", console.error);
    // this.web3Manager.contract.events.PlayerMoved()
    // .on("data", this.handlePlayerMoved).on("error", console.error);
  }

  handlePlayerInitialized(event) {
    const {player, loc, planet} = event.returnValues;
    this.updateRawPlanetInMemory(planet);
    if (player.toLowerCase() !== this.account.toLowerCase()) {
      this.emit('locationsUpdate');
    } else {
      this.hasJoinedGame = true;
      this.emit('initializedPlayer');
    }
  }

  handlePlayerMoved(event) {
    const {player, oldLoc, newLoc, fromPlanet, toPlanet} = event.returnValues;
    this.updateRawPlanetInMemory(fromPlanet);
    this.updateRawPlanetInMemory(toPlanet);
    this.emit('locationsUpdate');
  }

  async getWeb3Manager() {
    const web3Manager = await Web3Manager.getInstance();
    if (web3Manager.loadingError) {
      this.web3Loaded = true;
      this.loadingError = web3Manager.loadingError;
      this.emit('error');
      return;
    }
    this.web3Manager = web3Manager;
    this.account = web3Manager.account;
    this.emit('web3manager', this);
    return this;
  }

  // generally we want all call()s and send()s to only happen in web3Manager, so this is bad
  async getContractConstants() {
    const [xSize, ySize, difficulty] = await Promise.all([
      this.web3Manager.contract.methods.xSize().call(),
      this.web3Manager.contract.methods.ySize().call(),
      this.web3Manager.contract.methods.difficulty().call()
    ]).catch((err) => {
      this.emit('error', err);
      return [null, null];
    });
    // TODO: xSize should be a multiple of CHUNK_SIZE
    const xChunks = xSize / CHUNK_SIZE;
    const yChunks = ySize / CHUNK_SIZE;
    this.constants = {xSize, ySize, difficulty, xChunks, yChunks};
  }

  // generally we want all call()s and send()s to only happen in web3Manager, so this is bad
  async getPlayerData() {
    // get nPlayers
    const nPlayers = parseInt(await this.web3Manager.contract.methods.getNPlayers().call());
    this.nPlayers = nPlayers;

    // get nPlanets
    const nPlanets = parseInt(await this.web3Manager.contract.methods.getNPlanets().call());
    this.nPlanets = nPlanets;

    // get players
    let playerPromises = [];
    for (let i = 0; i < nPlayers; i += 1) {
      playerPromises.push(this.web3Manager.contract.methods.playerIds(i).call().catch(() => null));
    }
    let playerAddrs = await Promise.all(playerPromises);
    for (let player of playerAddrs) {
      if (player.toLowerCase() === this.account.toLowerCase()) {
        this.hasJoinedGame = true;
      }
    }
    this.players = playerAddrs.filter(addr => !!addr);

    // get planets
    let planetPromises = [];
    for (let i = 0; i < nPlanets; i += 1) {
      planetPromises.push(this.web3Manager.contract.methods.planetIds(i).call().then(planetId => {
        return this.web3Manager.contract.methods.planets(planetId).call()
      }).catch(() => null));
    }
    let rawPlanets = await Promise.all(planetPromises);
    this.planets = {};
    for (let rawPlanet of rawPlanets) {
      this.updateRawPlanetInMemory(rawPlanet);
    }
  }

  updateRawPlanetInMemory(rawPlanet) {
    const planet = this.rawPlanetToObject(rawPlanet);
    this.planets[planet.locationId] = planet;
  }

  rawPlanetToObject(rawPlanet) {
    let ret: any = {};
    ret.capacity = parseInt(rawPlanet.capacity);
    ret.growth = parseInt(rawPlanet.growth);
    ret.coordinatesRevealed = rawPlanet.coordinatesRevealed;
    ret.lastUpdated = parseInt(rawPlanet.lastUpdated);
    ret.locationId = rawPlanet.locationId;
    ret.owner = rawPlanet.owner.toLowerCase();
    ret.population = parseInt(rawPlanet.population);
    ret.version = parseInt(rawPlanet.version);
    if (ret.coordinatesRevealed) {
      ret.x = parseInt(rawPlanet.x);
      ret.y = parseInt(rawPlanet.y);
    }
    return ret;
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

  exploreRandomChunk() {
    const {xSize, ySize} = this.getConstantInts();
    const chunk_x = Math.floor(Math.random() * xSize);
    const chunk_y = Math.floor(Math.random() * ySize);
    this.worker.postMessage(this.composeMessage('exploreChunk', [chunk_x, chunk_y]));
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
          this.worker.postMessage(this.composeMessage('exploreChunk', [nextChunk.chunkX, nextChunk.chunkY]));
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
      this.worker.postMessage(this.composeMessage('exploreChunk', [firstChunk.chunkX, firstChunk.chunkY]));
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
    const {xSize, ySize} = this.getConstantInts();
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
    const {xSize, ySize} = this.getConstantInts();
    let validHomePlanet = false;
    let x, y, hash;
    // search for a valid home planet
    while (!validHomePlanet) {
      x = Math.floor(Math.random() * xSize);
      y = Math.floor(Math.random() * ySize);

      hash = mimcHash(x, y);
      if (hash.lesser(LOCATION_ID_UB.divide(DIFFICULTY))) {
        validHomePlanet = true;
      }
    }
    const chunkX = Math.floor(x / CHUNK_SIZE);
    const chunkY = Math.floor(y / CHUNK_SIZE);
    this.worker.postMessage(this.composeMessage(
      'exploreChunk',
      [chunkX, chunkY]
    ));
    this.localStorageManager.setHomeChunk(chunkX, chunkY); // set this before getting the call result, in case user exits before tx confirmed
    this.homeChunk = {chunkX, chunkY};
    this.discoveringFromChunk = this.homeChunk;
    this.initContractCall(x, y).then(contractCall => {
      this.emit('initializingPlayer');
      this.web3Manager.initializePlayer(...contractCall).on('initializedPlayerError', () => {
        this.emit('initializedPlayerError');
      });
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

    const { xSize, ySize } = this.getConstantInts();
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
      if (!toPlanet) {
        // colonizing uninhabited planet
        this.web3Manager.moveUninhabited(...contractCall).once('moveUninhabitedComplete', receipt => {
          this.emit('moveComplete');
        }).once('moveError', () => {
          this.emit('moveError');
        });
      } else if (toPlanet.owner.toLowerCase() !== this.account.toLowerCase()) {
        // attacking enemy
        this.web3Manager.moveEnemy(...contractCall).once('moveEnemyComplete', receipt => {
          this.emit('moveComplete');
        }).once('moveError', () => {
          this.emit('moveError');
        });
      } else {
        // friendly move
        this.web3Manager.moveFriendly(...contractCall).once('moveFriendlyComplete', receipt => {
          this.emit('moveComplete');
        }).once('moveError', () => {
          this.emit('moveError');
        });
      }
    });

    return this;
  }

  getConstantInts() {
    return {
      xSize: parseInt(this.constants.xSize),
      ySize: parseInt(this.constants.ySize),
      difficulty: parseInt(this.constants.difficulty)
    };
  }

  async initContractCall(x, y) {
    const circuit = new zkSnark.Circuit(initCircuit);
    const input = {x: x.toString(), y: y.toString()};
    const witness = witnessObjToBuffer(circuit.calculateWitness(input));
    const snarkProof = await (window as any).genZKSnarkProof(witness, this.provingKeyInit);
    const publicSignals = [mimcHash(x, y)];
    const callArgs = this.genCall(snarkProof, publicSignals);
    return stringifyBigInts(callArgs);
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
    const witness = witnessObjToBuffer(circuit.calculateWitness(input));
    const snarkProof = await (window as any).genZKSnarkProof(witness, this.provingKeyMove);
    const publicSignals = [mimcHash(x1, y1), mimcHash(x2, y2), distMax.toString(), shipsMoved.toString()];
    return stringifyBigInts(this.genCall(snarkProof, publicSignals));
  }

  genCall(snarkProof, publicSignals) {
    // the object returned by genZKSnarkProof needs to be massaged into a set of parameters the verifying contract
    // will accept
    return [
      snarkProof.pi_a.slice(0, 2), // pi_a
      // genZKSnarkProof reverses values in the inner arrays of pi_b
      [snarkProof.pi_b[0].reverse(), snarkProof.pi_b[1].reverse()], // pi_b
      snarkProof.pi_c.slice(0, 2), // pi_c
      publicSignals // input
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
