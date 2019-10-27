import * as EventEmitter from 'events';
import Web3Manager from "./Web3Manager";
import LocalStorageManager from "./LocalStorageManager";
import bigInt from "big-integer";
import {witnessObjToBuffer} from "./utils/Utils";
const initCircuit = require("./circuits/init/circuit.json");
const moveCircuit = require("./circuits/move/circuit");

const zkSnark = require("snarkjs");
const {stringifyBigInts} = require("../node_modules/snarkjs/src/stringifybigint.js");

class ContractAPI extends EventEmitter {
  static instance;

  provingKeyMove;
  provingKeyInit;
  web3Manager; // keep a reference so we don't have to do an async call after the first time
  web3Loaded; // a flag
  account;
  loadingError;
  constants;
  nPlayers;
  nPlanets;
  players;
  planets;
  localStorageManager;
  hasJoinedGame;
  inMemoryBoard;
  exploreInterval;

  constructor() {
    super();
    this.web3Loaded = false;
    this.initialize();
  }

  async initialize() {
    await this.getKeys();
    await this.getContractData();
    await this.initLocalStorageManager();
    this.emit('initialized', this);
  }

  async getKeys() {
    const provingKeyMoveRes = await fetch('./proving_key_move.bin'); // proving_keys needs to be in `public`
    this.provingKeyMove = await provingKeyMoveRes.arrayBuffer();
    const provingKeyInitRes = await fetch('./proving_key_init.bin');
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
    if (player.toLowerCase() !== this.account.toLowerCase()) {
      console.log("Enemy player spawned!");
      console.log("Player:");
      console.log(player);
      console.log("Location:");
      console.log(loc);
      console.log("Planet:");
      console.log(planet);
      this.emit('locationsUpdate');
    } else {
      console.log("I spawned!");
      console.log("Player:");
      console.log(player);
      console.log("Location:");
      console.log(loc);
      console.log("Planet:");
      console.log(planet);
      this.hasJoinedGame = true;
      this.emit('initializedPlayer');
    }
    this.updateRawPlanetInMemory(planet);
  }

  handlePlayerMoved(event) {
    const {player, oldLoc, newLoc, fromPlanet, toPlanet} = event.returnValues;
    if (player.toLowerCase() !== this.account.toLowerCase()) {
      console.log("Enemy player moved!");
      console.log("Player:");
      console.log(player);
      console.log("Old Location:");
      console.log(oldLoc);
      console.log("New location:");
      console.log(newLoc);
      this.updateRawPlanetInMemory(fromPlanet);
      this.updateRawPlanetInMemory(toPlanet);
      this.emit('locationsUpdate');
    }
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
    const [maxX, maxY, difficulty] = await Promise.all([
      this.web3Manager.contract.methods.maxX().call(),
      this.web3Manager.contract.methods.maxY().call(),
      this.web3Manager.contract.methods.difficulty().call()
    ]).catch((err) => {
      this.emit('error', err);
      return [null, null];
    });
    this.constants = {maxX, maxY, difficulty};
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
      console.log(player);
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
    let ret = {};
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
    this.emit('localStorageInit');
  }

  joinGame() {
    const {maxX, maxY} = this.getConstantInts();
    let validHomePlanet = false;
    let x, y, hash;
    // search for a valid home planet
    while (!validHomePlanet) {
      // x = Math.floor(Math.random() * maxX);
      // y = Math.floor(Math.random() * maxY);
      x = 19;
      y = 26;

      hash = this.mimcHash(x, y);
      if (bigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617')
        .divide(32)
        .geq(bigInt(hash))) {
        validHomePlanet = true;
      }
    }
    console.log(x, y, hash);
    this.discover({x, y, hash});
    this.initContractCall(x, y).then(contractCall => {
      this.emit('initializingPlayer');
      this.web3Manager.initializePlayer(...contractCall);
    });
    return this;
  }

  // TODO: rewrite
  move(fromLoc, toLoc) {
    const oldX = parseInt(fromLoc.x);
    const oldY = parseInt(fromLoc.y);
    const newX = parseInt(toLoc.x);
    const newY = parseInt(toLoc.y);
    const dx = newX - oldX;
    const dy = newY - oldY;
    const distMax = Math.abs(dx) + Math.abs(dy);

    const { maxX, maxY } = this.getConstantInts();
    if (0 > newX || 0 > newY || maxX < newX || maxY < newY) {
      throw new Error('attempted to move out of bounds');
    }

    const hash = this.mimcHash(newX, newY);
    this.moveContractCall(oldX, oldY, newX, newY, distMax).then(contractCall => {
      const loc = {
        x: newX.toString(),
        y: newY.toString(),
        hash: hash.toString()
      };
      this.discover(loc);
      this.emit('moveSend');

      this.web3Manager.move(...contractCall).once('moveComplete', receipt => {
        this.emit('moveComplete');
      });
    });

    return this;
  }

  startExplore() {
    if (!this.exploreInterval) {
      this.exploreInterval = setInterval(() => {
        const {maxX, maxY} = this.getConstantInts();
        const x = Math.floor(Math.random() * maxX);
        const y = Math.floor(Math.random() * maxY);
        const hash = this.mimcHash(x, y);
        this.discover({x, y, hash});
      }, 5);
    }
  }

  stopExplore() {
    if (this.exploreInterval) {
      clearInterval(this.exploreInterval);
      this.exploreInterval = null;
    }
  }

  discover(loc) {
    if ((loc.x != null) && (loc.y != null) && (loc.hash != null)) {
      this.inMemoryBoard[loc.x][loc.y] = loc.hash;
      this.localStorageManager.updateKnownBoard(this.inMemoryBoard);
      this.emit('discover', this.inMemoryBoard);
    }
  }

  getConstantInts() {
    return {
      maxX: parseInt(this.constants.maxX),
      maxY: parseInt(this.constants.maxY),
      difficulty: parseInt(this.constants.difficulty)
    };
  }

  mimcHash(x, y) {
    const circuit = new zkSnark.Circuit(initCircuit);
    const input = {x: x.toString(), y: y.toString()};
    const witness = circuit.calculateWitness(input);
    return bigInt(witness[1]);
  }

  async initContractCall(x, y) {
    const circuit = new zkSnark.Circuit(initCircuit);
    const input = {x: x.toString(), y: y.toString()};
    const witness = witnessObjToBuffer(circuit.calculateWitness(input));
    const snarkProof = await window.genZKSnarkProof(witness, this.provingKeyInit);
    const publicSignals = [this.mimcHash(x, y)];
    const callArgs = this.genCall(snarkProof, publicSignals);
    console.log(this.provingKeyInit);
    console.log(stringifyBigInts(callArgs));
    return stringifyBigInts(callArgs);
  }

  async moveContractCall(x1, y1, x2, y2, distMax) {
    const circuit = new zkSnark.Circuit(moveCircuit);
    const input = {
      x1: x1.toString(),
      y1: y1.toString(),
      x2: x2.toString(),
      y2: y2.toString(),
      distMax: distMax.toString()
    };
    const witness = witnessObjToBuffer(circuit.calculateWitness(input));
    const snarkProof = await window.genZKSnarkProof(witness, this.provingKeyMove);
    const publicSignals = [this.mimcHash(x1, y1), this.mimcHash(x2, y2), distMax];
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

  static getInstance() {
    if (!ContractAPI.instance) {
      const contractAPI = new ContractAPI();
      ContractAPI.instance = contractAPI;
    }

    return ContractAPI.instance;
  }
}

export default ContractAPI;
