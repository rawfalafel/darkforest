import * as stringify from "json-stable-stringify";

class LocalStorageManager {
  static instance;

  account;
  contractAPI;

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
    if (!contractAPI.web3Loaded) {
      throw new Error('contractAPI has not finished loading contract');
    }
    this.contractAPI = contractAPI;
    this.account = contractAPI.web3Manager.account;

    // also initializes keys if they haven't already been
    if (!this.getKey('init')) {
      const maxX = parseInt(contractAPI.constants.maxX);
      const maxY = parseInt(contractAPI.constants.maxY);
      const emptyBoard = Array(maxX + 1)
          .fill(0)
          .map(() => Array(maxY + 1).fill(null));
      this.setKey('init', 'true');
      this.setKey('hasLocation', 'false');
      this.setKey('knownBoard', stringify(emptyBoard));
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
    if (this.account && this.contractAPI) {
      this.setKey('knownBoard', stringify(board));
    }
  }

}

export default LocalStorageManager;
