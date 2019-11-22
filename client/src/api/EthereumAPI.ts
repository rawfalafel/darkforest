import * as EventEmitter from 'events';
import {Address, Web3Object} from "../@types/global/global";
import {JsonRpcSigner, Provider, Web3Provider} from "ethers/providers";
import {Contract, Signer} from "ethers";

import {contractAddress} from "../utils/local_contract_addr";
import {address} from "../utils/CheckedTypeUtils";  // this is a gitignored file and must be generated
const contractABI = require("../contracts/DarkForestV1.json").abi; // this is also gitignored and must be compiled

// singleton class for managing all ethereum network calls
class EthereumAPI extends EventEmitter {
  static instancePromise;

  provider: Provider;
  signer: Signer;
  account: Address;
  contract: Contract;

  private constructor(provider: Provider, signer: Signer, account: Address, contract: Contract) {
    super();
    this.provider = provider;
    this.signer = signer;
    this.account = account;
    this.contract = contract;
  }

  static async createWeb3EthereumAPI(): Promise<EthereumAPI> {
    const web3: Web3Object = window.web3;
    if (typeof web3 === 'undefined') {
      throw new Error('No web3 object detected');
    }
    const provider: Web3Provider = new Web3Provider(window.web3);
    const signer: JsonRpcSigner = provider.getSigner();
    const account: Address = address(await signer.getAddress());
    const contract: Contract = new Contract(contractAddress, contractABI, signer);
    return new EthereumAPI(provider, signer, account, contract);
  }

  static getInstance(): EthereumAPI {
    if (!EthereumAPI.instancePromise) {
      throw new Error("EthereumAPI object has not been initialized yet");
    }

    return EthereumAPI.instancePromise;
  }

  initializePlayer(...args) {
    this.contract.methods
      .initializePlayer(...args)
      .send({from: this.account})
      .on("receipt", async receipt => {
        this.emit('initializedPlayer', receipt);
      })
      .on("error", error => {
        this.emit('initializedPlayerError');
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
        this.emit('moveError');
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
      .moveEnemy(...args)
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

export default EthereumAPI;
