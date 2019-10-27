import * as EventEmitter from 'events';
import Web3 from "web3";
import {contractAddress} from "./local_contract_addr"; // this is a gitignored file

const ethereum = window.ethereum;

const contractABI = require("./build/contracts/DarkForestV1.json").abi;

class Web3Manager extends EventEmitter {
  static instancePromise;

  web3;
  account;
  contract;
  loadingError;

  constructor(web3, account, contract, loadingError) {
    super();
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
          .then(async accounts => {
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
      ethereum.on('accountsChanged', (accounts) => {
        window.location.reload(true);
      });
    }

    return Web3Manager.instancePromise;
  }

  initializePlayer(...args) {
    this.contract.methods
        .initializePlayer(...args)
        .send({from: this.account})
        .on("receipt", async receipt => {
          this.emit('initializedPlayer', receipt);
        })
        .on("error", error => {
          console.log(`error: ${error}`);
        });
    return this;
  }

  moveUninhabited(...args) {
    this.contract.methods
      .moveUninhabited(...args)
      .send({ from: this.account })
      .on("receipt", async receipt => {
        this.emit('moveUninhabitedComplete', receipt);
      })
      .on("error", error => {
        console.log(`error: ${error}`);
      });
    return this;
  }

  moveFriendly(...args) {
    this.contract.methods
      .moveFriendly(...args)
      .send({ from: this.account })
      .on("receipt", async receipt => {
        this.emit('moveFriendlyComplete', receipt);
      })
      .on("error", error => {
        console.log(`error: ${error}`);
      });
    return this;
  }

  moveEnemy(...args) {
    this.contract.methods
      .move(...args)
      .send({ from: this.account })
      .on("receipt", async receipt => {
        this.emit('moveEnemyComplete', receipt);
      })
      .on("error", error => {
        console.log(`error: ${error}`);
      });
    return this;
  }
}

export default Web3Manager;
