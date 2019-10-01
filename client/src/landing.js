import Web3 from 'web3';
import React, { Component } from 'react';
import { bigExponentiate, twoDimDLogProof } from './utils/homemadeCrypto';
import bigInt from 'big-integer';

const ethereum = window.ethereum;

const contractABI = require('./build/contracts/DarkForest.json').abi;
const contractAddress = '0x5c8fdd4a7cbac9a8c49e3f5c48d14a1a8b08e926';

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
    const p = await this.contract.methods.p().call();
    const q = await this.contract.methods.q().call();
    const g = await this.contract.methods.g().call();
    const h = await this.contract.methods.h().call();
    this.setState({
      p, q, g, h
    });
    console.log(this.contract);
  }

  async getDFAccountData(web3) {
    const myLoc = await this.contract.methods.playerLocations(this.account).call();
    if (myLoc === '0') {
      console.log('need to init');
      this.setState({
        loading: false,
        hasDFAccount: false
      });
    } else {
      console.log('i\'m in');
      this.setState({
        loading: false,
        hasDFAccount: true,
        location: myLoc
      });
    }
  }

  async initialize() {
    if (!(this.state.p && this.state.q && this.state.g && this.state.h)) {
      return;
    }
    const { p, q, g, h } = this.state;
    const a = Math.floor(Math.random() * (p-1));
    const b = Math.floor(Math.random() * (q-1));
    const r = (bigExponentiate(bigInt(g), a, bigInt(p * q)).toJSNumber() * bigExponentiate(bigInt(h), b, bigInt(p * q)).toJSNumber()) % (p * q);
    console.log(r);
    console.log(twoDimDLogProof(a, b, g, h, p, q));

  }

  render () {
    if (!this.state.loading) {
      return (
        <div>
          {this.state.hasDFAccount ? (
            <p>have df account</p>
          ) : (
            <button
              onClick={this.initialize.bind(this)}
            >
              Initialize me
            </button>
          )}
        </div>
      );
    }
    return (
      <div>
        loading...
      </div>
    );
  }
}

export default Landing;
