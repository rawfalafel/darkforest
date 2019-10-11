import * as EventEmitter from 'events';
import Web3Manager from "./Web3Manager";

class ContractAPI extends EventEmitter {
  static instance;

  web3Manager; // keep a reference so we don't have to do an async call after the first time
  loaded;
  loadingError;
  constants;
  nPlayers;
  players;
  locPlayerMap;

  constructor() {
    super();
    this.loaded = false;
    this.initialize();
  }

  async initialize() {
    const web3Manager = await Web3Manager.getInstance();
    if (web3Manager.loadingError) {
      this.loaded = true;
      this.loadingError = web3Manager.loadingError;
      this.emit('error');
      return;
    }
    this.web3Manager = web3Manager;
    this.loaded = true;
    this.emit('web3manager');
    console.log(this.web3Manager.account);
    this.getContractData();
  }

  async getContractData() {
    this.getConstants();
    this.getPlayerData();
    this.emit('contractData');
  }

  async getConstants() {
    const [p, q, g, h] = await Promise.all([this.contract.methods.p().call(),
      this.contract.methods.q().call(),
      this.contract.methods.g().call(),
      this.contract.methods.h().call()]).catch(() => {
      this.emit('error');
      return [null, null, null, null];
    });
    this.constants = {p, q, g, h};
  }

  async getPlayerData() {
    const nPlayers = parseInt(await this.contract.methods.getNPlayers().call());
    this.nPlayers = nPlayers;
    let playerPromises = [];
    for (let i = 0; i < nPlayers; i += 1) {
      playerPromises.push(this.contract.methods.players(i).call().catch(() => null));
    }
    let playerAddrs = await Promise.all(playerPromises);
    let playerLocationPromises = [];
    for (let i = 0; i < nPlayers; i += 1) {
      playerLocationPromises.push(
          playerAddrs[i] ? this.contract.methods.playerLocations(playerAddrs[i]).call().catch(() => null) : Promise.resolve(null)
      );
    }
    let playerLocations = await Promise.all(playerLocationPromises);
    let locationPlayerMap = {};
    for (let i = 0; i < nPlayers; i += 1) {
      if (playerAddrs[i] && playerLocations[i]) {
        locationPlayerMap[playerLocations[i]] = playerAddrs[i];
      }
    }
    this.players = playerAddrs.filter(addr => !!addr);
    this.locPlayerMap = locationPlayerMap;
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
