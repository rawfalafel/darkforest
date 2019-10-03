import Web3 from 'web3';
import React, { Component } from 'react';
import { bigExponentiate, twoDimDLogProof, verifyTwoDimDLogProof } from './utils/homemadeCrypto';
import { contractAddress } from './local_contract_addr'; // this is a gitignored file
import bigInt from 'big-integer';

const ethereum = window.ethereum;

const contractABI = require('./build/contracts/DarkForest.json').abi;

class Landing extends Component {
  constructor(props) {
    console.log('constructing');
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
    console.log('got account');
    if (accounts.length > 0) {
      this.account = accounts[0]
    }
    await this.getContractData(web3);
    await this.getDFAccountData(web3);
  }

  async getContractData(web3) {
    this.contract = new web3.eth.Contract(contractABI, contractAddress);
    console.log('contract initialized');
    const p = await this.contract.methods.p().call();
    console.log('got p');
    const q = await this.contract.methods.q().call();
    const g = await this.contract.methods.g().call();
    const h = await this.contract.methods.h().call();
    this.setState({
      p, q, g, h
    });
    console.log('(p,q,g,h):');
    console.log(p);
    console.log(q);
    console.log(g);
    console.log(h);
    console.log(this.contract);
  }

  async getDFAccountData() {
    const myLoc = await this.contract.methods.playerLocations(this.account).call();
    console.log('myLoc: ' + myLoc);
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
    const proof = twoDimDLogProof(a, b, g, h, p, q);
    console.log('(a,b,r,proof):');
    console.log(a);
    console.log(b);
    console.log(r);
    console.log(proof);
    console.log('proof verifies locally: ' + verifyTwoDimDLogProof(r, g, h, p, q, proof));
    console.log('account' + this.account);

    this.contract.methods.initializePlayer(r, proof)
      .send({from: this.account})
      .on('receipt', async (receipt) => {
        console.log(`receipt: ${receipt}`);
        const rRet = await this.contract.methods.playerLocations(this.account).call();
        console.log(`my location is ${rRet}`);
      })
      .on('error', (error) => {
        console.log(`error: ${error}`);
      });
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
