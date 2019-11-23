import * as stringify from "json-stable-stringify";

class LocalStorageManager {
  static instance: any;

  account: any;
  contractAPI: any;

  constructor() {}

  static getInstance() {
    if (!LocalStorageManager.instance) {
      const localStorageManager = new LocalStorageManager();
      LocalStorageManager.instance = localStorageManager;
    }

    return LocalStorageManager.instance;
  }

  setContractAPI(contractAPI) {
    // this should only be called once the contractAPI object has web3Loaded === true
    this.contractAPI = contractAPI;
    this.account = contractAPI.account;

    // also initializes keys if they haven't already been
    if (!this.getKey('init')) {
      const xChunks = contractAPI.constants.xChunks;
      const yChunks = contractAPI.constants.yChunks;
      const emptyBoard = Array(xChunks)
          .fill(0)
          .map(() => Array(yChunks).fill(null));
      this.setKey('init', 'true');
      this.setKey('knownBoard', stringify(emptyBoard));
      // we also have a key "homeChunk" which is not set until player has initialized
    }
  }

  getKey(key) {
    if (this.account && this.contractAPI) {
      return window.localStorage[this.account.concat(key)];
    }
  }

  setKey(key, value) {
    if (this.account && this.contractAPI) {
      window.localStorage.setItem(this.account.concat(key), value);
    }
  }

  getKnownBoard() {
    if (this.account && this.contractAPI) {
      const knownBoard = this.getKey('knownBoard');
      if (knownBoard) {
        return JSON.parse(knownBoard);
      }
    }
  }

  updateKnownBoard(board) {
    this.setKey('knownBoard', stringify(board));
  }

  setHomeChunk(chunkX, chunkY) {
    this.setKey('homeChunk', stringify([chunkX, chunkY]));
  }

  getHomeChunk() {
    const homeChunk = this.getKey('homeChunk');
    if (homeChunk) {
      return JSON.parse(homeChunk);
    }
  }

}

export default LocalStorageManager;
