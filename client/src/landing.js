import Web3 from 'web3';
import React, { Component } from 'react';

const ethereum = window.ethereum;

const contractABI = require('./build/contracts/DarkForest.json').abi;
const contractAddress = '0xAE1e488129A4a46f2A8aFB666D36226185BD7337';

class Landing extends Component {
  constructor(props) {
    super(props);
    this.contract = null;
    this.account = null;
    this.state = {
      loading: true,
      hasDFAccount: false
    };
    this.startApp();
  }

  async startApp() {
    const web3 = new Web3(ethereum);
    if (typeof web3 === 'undefined') {
      console.log('no provider :(');
      return;
    }
    console.log('found provider');
    try {
      // Request account access if needed
      await ethereum.enable();
    } catch (error) {
      console.log('access not given :(')
    }
    const accounts = await web3.eth.getAccounts();
    if (accounts.length > 0) {
      this.account = accounts[0]
    }
    await this.getContractData(web3);
    await this.getDFAccountData(web3);
  }

  async getContractData(web3) {
    this.contract = new web3.eth.Contract(contractABI, contractAddress);
    console.log(this.contract);
  }

  async getDFAccountData(web3) {
    console.log(this.account);
    const players = await this.contract.methods.dummyFn().call();
    console.log(players);
  }

  render () {
    return (
      <div>

      </div>
    );
  }
}

export default Landing;
