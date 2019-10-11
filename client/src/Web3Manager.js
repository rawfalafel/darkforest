import Web3 from "web3";
import { contractAddress } from "./local_contract_addr"; // this is a gitignored file

const ethereum = window.ethereum;

const contractABI = require("./build/contracts/DarkForest.json").abi;

class Web3Manager {
  static instancePromise;

  web3;
  account;
  contract;
  loadingError;

  constructor(web3, account, contract, loadingError) {
    this.web3 = web3;
    this.account = account;
    this.contract = contract;
    this.loadingError = loadingError;
  }

  static async getInstance() {
    if (!Web3Manager.instancePromise) {
      const web3 = new Web3(ethereum);
      if (typeof web3 === "undefined") {
        Web3Manager.instancePromise = Promise.resolve(
          new Web3Manager(
            web3,
            null,
            null,
            new Error("could not initialize web3 object")
          )
        );
      }
      // Request account access if needed
      // Then make sure there is a default account and you can get the contract
      Web3Manager.instancePromise = await ethereum
        .enable()
        .then(accounts => {
          if (accounts.length === 0) {
            throw new Error("found no accounts");
          }
          const account = accounts[0];
          const contract = new web3.eth.Contract(contractABI, contractAddress);
          return new Web3Manager(web3, account, contract);
        })
        .catch(error => {
          return new Web3Manager(web3, null, null, error);
        });
    }

    return Web3Manager.instancePromise;
  }
}

export default Web3Manager;
