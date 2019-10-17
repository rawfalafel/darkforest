import * as EventEmitter from 'events';
import Web3Manager from "./Web3Manager";
import LocalStorageManager from "./LocalStorageManager";
import bigInt from "big-integer";
import {witnessObjToBuffer} from "./utils/Utils";
const initCircuit = require("./circuits/init/circuit.json");
const moveCircuit = require("./circuits/move/circuit");

const zkSnark = require("snarkjs");
const {stringifyBigInts, unstringifyBigInts} = require("../node_modules/snarkjs/src/stringifybigint.js");

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
  players;
  locPlayerMap;
  localStorageManager;
  hasJoinedGame;
  myLocAddr;
  myLocCurrent;
  myLocStaged;
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
    const {player, loc} = event.returnValues;
    if (player.toLowerCase() !== this.account.toLowerCase()) {
      console.log("Enemy player spawned!");
      console.log("Player:");
      console.log(player);
      console.log("Location:");
      console.log(loc);
      this.locPlayerMap[loc] = player;
      this.emit('locationsUpdate');
    }
  }

  handlePlayerMoved(event) {
    const {player, oldLoc, newLoc} = event.returnValues;
    if (player.toLowerCase() !== this.account.toLowerCase()) {
      console.log("Enemy player moved!");
      console.log("Player:");
      console.log(player);
      console.log("Old Location:");
      console.log(oldLoc);
      console.log("New location:");
      console.log(newLoc);
      delete this.locPlayerMap[oldLoc];
      this.locPlayerMap[newLoc] = player;
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
    const [maxX, maxY] = await Promise.all([
      this.web3Manager.contract.methods.maxX().call(),
      this.web3Manager.contract.methods.maxY().call()
    ]).catch((err) => {
      this.emit('error', err);
      return [null, null];
    });
    this.constants = {maxX, maxY};
  }

  // generally we want all call()s and send()s to only happen in web3Manager, so this is bad
  async getPlayerData() {
    const nPlayers = parseInt(await this.web3Manager.contract.methods.getNPlayers().call());
    this.nPlayers = nPlayers;
    let playerPromises = [];
    for (let i = 0; i < nPlayers; i += 1) {
      playerPromises.push(this.web3Manager.contract.methods.players(i).call().catch(() => null));
    }
    let playerAddrs = await Promise.all(playerPromises);
    let playerLocationPromises = [];
    for (let i = 0; i < nPlayers; i += 1) {
      playerLocationPromises.push(
          playerAddrs[i] ? this.web3Manager.contract.methods.playerLocations(playerAddrs[i]).call().catch(() => null) : Promise.resolve(null)
      );
    }
    let playerLocations = await Promise.all(playerLocationPromises);
    let locationPlayerMap = {};
    for (let i = 0; i < nPlayers; i += 1) {
      if (playerAddrs[i] && playerLocations[i]) {
        if (playerAddrs[i].toLowerCase() === this.web3Manager.account.toLowerCase()) {
          this.myLocAddr = playerLocations[i];
          this.hasJoinedGame = true;
        } else {
          locationPlayerMap[playerLocations[i]] = playerAddrs[i];
        }
      }
    }
    this.players = playerAddrs.filter(addr => !!addr);
    this.locPlayerMap = locationPlayerMap;
  }

  async initLocalStorageManager() {
    this.localStorageManager = LocalStorageManager.getInstance();
    this.localStorageManager.setContractAPI(this);
    this.inMemoryBoard = this.localStorageManager.getKnownBoard();
    let myLocCurrent = {};
    if (this.myLocAddr) {
      const localStorageLocationCurrent = this.localStorageManager.getLocationCurrent();
      const localStorageLocationStaged = this.localStorageManager.getLocationStaged();
      if (localStorageLocationCurrent.hash === this.myLocAddr) {
        myLocCurrent = localStorageLocationCurrent;
      } else if (localStorageLocationStaged.hash === this.myLocAddr) {
        myLocCurrent = localStorageLocationStaged;
      } else {
        throw new Error('Can\'t find my coordinates');
      }
    }
    this.setLocationCurrent(myLocCurrent);
    this.emit('localStorageInit');
  }

  setLocationCurrent(loc) {
    this.myLocCurrent = loc;
    this.myLocStaged = {};
    this.localStorageManager.setLocationCurrent(loc);
    this.discover(loc);
  }

  setLocationStaged(loc) {
    this.myLocStaged = loc;
    this.localStorageManager.setLocationStaged(loc);
    this.discover(loc);
  }

  joinGame() {
    const {maxX, maxY} = this.getConstantInts();
    const x = Math.floor(Math.random() * maxX);
    const y = Math.floor(Math.random() * maxY);

    const hash = this.mimcHash(x, y);
    const contractCall = this.initContractCall(x, y);

    const loc = {
      x: x.toString(),
      y: y.toString(),
      hash: hash.toString()
    };
    this.setLocationStaged(loc);
    this.emit('initializingPlayer');

    this.web3Manager.initializePlayer(...contractCall).once('initializedPlayer', receipt => {
      this.hasJoinedGame = true;
      this.myLocAddr = hash;
      this.setLocationCurrent(loc);
      this.emit('initializedPlayer');
    });
    return this;
  }

  move(dx, dy) {
    if (!!this.myLocStaged.hash) {
      throw new Error('another move is already queued');
    }
    if (!this.myLocCurrent.x || !this.myLocCurrent.y || !this.myLocCurrent.hash) {
      throw new Error('don\'t have current location');
    }
    const oldX = parseInt(this.myLocCurrent.x);
    const oldY = parseInt(this.myLocCurrent.y);
    const newX = oldX + dx;
    const newY = oldY + dy;
    const distMax = Math.abs(dx) + Math.abs(dy);

    const { maxX, maxY } = this.getConstantInts();
    if (0 > newX || 0 > newY || maxX < newX || maxY < newY) {
      throw new Error('attempted to move out of bounds');
    }

    const hash = this.mimcHash(newX, newY);
    const contractCall = this.moveContractCall(oldX, oldY, newX, newY, distMax);

    const loc = {
      x: newX.toString(),
      y: newY.toString(),
      hash: hash.toString()
    };
    this.setLocationStaged(loc);
    this.emit('moveSend');

    this.web3Manager.move(...contractCall).once('moveComplete', receipt => {
      this.setLocationCurrent(loc);
      this.emit('moveComplete');
    });
  }

  startExplore() {
    if (!this.exploreInterval) {
      this.exploreInterval = setInterval(() => {
        const {maxX, maxY} = this.getConstantInts();
        const x = Math.floor(Math.random() * maxX);
        const y = Math.floor(Math.random() * maxY);
        const hash = this.mimcHash(x, y);
        this.discover({x, y, hash});
      }, 5000);
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
      maxY: parseInt(this.constants.maxY)
    };
  }

  mimcHash(x, y) {
    const circuit = new zkSnark.Circuit(initCircuit);
    const input = {x: x.toString(), y: y.toString()};
    const witness = circuit.calculateWitness(input);
    return bigInt(witness[1]);
  }

  async initContractCall(x, y) {
    const circuit = new zkSnark.Circuit(moveCircuit);
    const input = {x: x.toString(), y: y.toString()};
    const witness = witnessObjToBuffer(circuit.calculateWitness(input));
    const snarkProof = await window.genZKSnarkProof(witness, this.provingKeyInit);
    return stringifyBigInts(this.genCall(snarkProof));
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
    return stringifyBigInts(this.genCall(snarkProof));
  }

  genCall(snarkProof) {
    const {proof, publicSignals} = snarkProof;
    return [
      proof.pi_a.slice(0,2), // a
      proof.pi_ap.slice(0,2), // a_p
      // genProof formats b in the reverse order that the contract expects. utterly baffling.
      [proof.pi_b[0].reverse(), proof.pi_b[1].reverse()], // b
      proof.pi_bp.slice(0,2), // b_p
      proof.pi_c.slice(0,2), // c
      proof.pi_cp.slice(0,2), // c_p
      proof.pi_h.slice(0,2), // h
      proof.pi_kp.slice(0,2), // k
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
