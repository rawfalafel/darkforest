import Web3 from "web3";

const ethereum = window.ethereum;

class Web3Manager {
  static instance;

  web3;
  accountPromise;
  contractPromise;
  loadingError;
  loaded;

  Web3Manager() {
    this.web3 = new Web3(ethereum);
    if (typeof this.web3 === "undefined") {
      this.loadingError = "could not initialize web3 object";
      return;
    }
    try {
      // Request account access if needed
      ethereum.enable().then(accounts => {});
    } catch (error) {
      console.log("access not given :(");
    }
  }

  static async getInstance() {
    if (Web3Manager.instance) {
      return Web3Manager.instance;
    }
  }
}
