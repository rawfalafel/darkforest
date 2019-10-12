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
      const p = parseInt(contractAPI.constants.p);
      const q = parseInt(contractAPI.constants.q);
      const emptyBoard = Array(p - 1)
          .fill(0)
          .map(() => Array(q - 1).fill(null));
      const currentLocation = {};
      const stagedLocation = {};
      this.setKey('init', 'true');
      this.setKey('hasLocation', 'false');
      this.setKey('knownBoard', stringify(emptyBoard));
      this.setKey('myLocCurrent', stringify(currentLocation));
      this.setKey('myLocStaged', stringify(stagedLocation));
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

  getLocationCurrent() {
    if (this.account && this.contractAPI) {
      const locationCurrent = this.getKey('myLocCurrent');
      if (locationCurrent) {
        return JSON.parse(locationCurrent);
      }
    }
  }

  getLocationStaged() {
    if (this.account && this.contractAPI) {
      const locationStaged = this.getKey('myLocStaged');
      if (locationStaged) {
        return JSON.parse(locationStaged);
      }
    }
  }

  setLocationCurrent(loc) {
    if (this.account && this.contractAPI) {
      this.setKey('hasLocation', 'true');
      this.setKey('myLocCurrent', stringify(loc));
      this.setKey('myLocStaged', stringify({}));
    }
  }

  setLocationStaged(loc) {
    if (this.account && this.contractAPI) {
      this.setKey('myLocStaged', stringify(loc));
    }
  }

  updateKnownBoard(board) {
    if (this.account && this.contractAPI) {
      this.setKey('knownBoard', stringify(board));
    }
  }

}

export default LocalStorageManager;
