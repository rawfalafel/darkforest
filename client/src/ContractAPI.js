import * as EventEmitter from 'events';
import Web3Manager from "./Web3Manager";
import LocalStorageManager from "./LocalStorageManager";
import {bigExponentiate, twoDimDLogProof} from "./utils/homemadeCrypto";
import bigInt from "big-integer";
const initCircuit = require("./circuits/init/circuit.json");
const initPk = require("./circuits/init/proving_key.json");

const zkSnark = require("snarkjs");
const {stringifyBigInts, unstringifyBigInts} = require("../node_modules/snarkjs/src/stringifybigint.js");

class ContractAPI extends EventEmitter {
  static instance;

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
    await this.getContractData();
    await this.initLocalStorageManager();
    this.emit('initialized', this);
  }

  async getContractData() {
    await this.getWeb3Manager();
    await this.getContractConstants();
    await this.getPlayerData();
    this.web3Loaded = true;
    this.emit('contractData', this);
    return this;
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

  async getContractConstants() {
    const [p, q, g, h] = await Promise.all([this.web3Manager.contract.methods.p().call(),
      this.web3Manager.contract.methods.q().call(),
      this.web3Manager.contract.methods.g().call(),
      this.web3Manager.contract.methods.h().call()]).catch((err) => {
      this.emit('error', err);
      return [null, null, null, null];
    });
    this.constants = {p, q, g, h};
  }

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
        locationPlayerMap[playerLocations[i]] = playerAddrs[i];
        if (playerAddrs[i].toLowerCase() === this.web3Manager.account.toLowerCase()) {
          this.myLocAddr = playerLocations[i];
          this.hasJoinedGame = true;
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
      if (localStorageLocationCurrent.r === this.myLocAddr) {
        myLocCurrent = localStorageLocationCurrent;
      } else if (localStorageLocationStaged.r === this.myLocAddr) {
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
    const {p, q, g, h} = this.getConstantInts();
    const x = Math.floor(Math.random() * (p - 1));
    const y = Math.floor(Math.random() * (q - 1));
    const r =
        ((bigExponentiate(bigInt(g), x, bigInt(p * q)).toJSNumber() *
            bigExponentiate(bigInt(h), y, bigInt(p * q)).toJSNumber()) %
        (p * q));
    const proof = twoDimDLogProof(x, y, g, h, p, q);
    const loc = {
      x: x.toString(),
      y: y.toString(),
      r: r.toString()
    };
    this.setLocationStaged(loc);
    this.emit('initializingPlayer');
    this.web3Manager.initializePlayer(r, proof).once('initializedPlayer', receipt => {
      this.hasJoinedGame = true;
      this.myLocAddr = r;
      this.setLocationCurrent(loc);
      this.emit('initializedPlayer');
    });
    return this;
  }

  move(dx, dy) {
    if (!!this.myLocStaged.r) {
      throw new Error('another move is already queued');
    }
    const {p, q, g, h} = this.getConstantInts();
    const x = parseInt(this.myLocCurrent.x);
    const y = parseInt(this.myLocCurrent.y);
    const stagedX = (x + dx + p - 1) % (p - 1);
    const stagedY = (y + dy + q - 1) % (q - 1);
    const m = p * q;
    const stagedR = (bigInt(g).modPow(bigInt(stagedX), bigInt(m)).toJSNumber() *
        bigInt(h).modPow(bigInt(stagedY), bigInt(m)).toJSNumber()) % m;
    const loc = {
      x: stagedX.toString(),
      y: stagedY.toString(),
      r: stagedR.toString()
    };
    this.setLocationStaged(loc);
    this.emit('moveSend');
    this.web3Manager.move(dx, dy).once('moveComplete', receipt => {
      this.setLocationCurrent(loc);
      this.emit('moveComplete');
    });
    return this;
  }

  startExplore() {
    if (!this.exploreInterval) {
      this.exploreInterval = setInterval(() => {
        const {p, q, g, h} = this.getConstantInts();
        const x = Math.floor(Math.random() * (p - 1));
        const y = Math.floor(Math.random() * (q - 1));
        const m = p * q;
        const r = (bigInt(g).modPow(bigInt(x), bigInt(m)).toJSNumber() *
            bigInt(h).modPow(bigInt(y), bigInt(m)).toJSNumber()) % m;
        this.discover({x, y, r});
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
    if (loc.x && loc.y && loc.r) {
      this.inMemoryBoard[loc.x][loc.y] = loc.r;
      this.localStorageManager.updateKnownBoard(this.inMemoryBoard);
      this.emit('discover', this.inMemoryBoard);
    }
  }

  getConstantInts() {
    return {
      p: parseInt(this.constants.p),
      q: parseInt(this.constants.q),
      g: parseInt(this.constants.g),
      h: parseInt(this.constants.h)
    };
  }

  static genCall(snarkProof) {
    const {proof, publicSignals} = snarkProof;
    return [
      [proof.pi_a[0], proof.pi_a[1]], // a
      [proof.pi_ap[0], proof.pi_ap[1]], // a_p
      // genProof formats b in the reverse order that the contract expects. utterly baffling.
      [[proof.pi_b[0][1], proof.pi_b[0][0]], [proof.pi_b[1][1], proof.pi_b[1][0]]], // b
      [proof.pi_bp[0], proof.pi_bp[1]], // b_p
      [proof.pi_c[0], proof.pi_c[1]], // c
      [proof.pi_cp[0], proof.pi_cp[1]], // c_p
      [proof.pi_h[0], proof.pi_h[1]], // h
      [proof.pi_kp[0], proof.pi_kp[1]], // k
      publicSignals // input
    ]
  }

  async initCircuitTest(x, y) {
    const circuit = new zkSnark.Circuit(initCircuit);
    const input = {"x": JSON.stringify(x), "y": JSON.stringify(y)}
    const witness = circuit.calculateWitness(input);
    const snarkProof = zkSnark.original.genProof(unstringifyBigInts(initPk), witness);
    const contractCall = stringifyBigInts(ContractAPI.genCall(snarkProof));
    await this.web3Manager.contract.methods.newInitialize(...contractCall).call().then(console.log);
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
