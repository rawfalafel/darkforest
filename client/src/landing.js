import Web3 from 'web3';
import React, { Component } from 'react';
import { bigExponentiate, twoDimDLogProof, verifyTwoDimDLogProof } from './utils/homemadeCrypto';
import { contractAddress } from './local_contract_addr'; // this is a gitignored file
import bigInt from 'big-integer';
import * as stringify from 'json-stable-stringify';
import * as md5 from 'md5';

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
      if (myLoc === parseInt(window.localStorage.stagedR)) {
        this.updateFromStaging();
      }
      this.setState({
        loading: false,
        hasDFAccount: true,
        location: myLoc
      });
    }
  }

  async initialize() {
    window.localStorage.clear();

    if (!(this.state.p && this.state.q && this.state.g && this.state.h)) {
      return;
    }
    const { p, q, g, h } = this.state;
    const a = Math.floor(Math.random() * (p-1));
    const b = Math.floor(Math.random() * (q-1));
    const r = (bigExponentiate(bigInt(g), a, bigInt(p * q)).toJSNumber() * bigExponentiate(bigInt(h), b, bigInt(p * q)).toJSNumber()) % (p * q);
    const proof = twoDimDLogProof(a, b, g, h, p, q);

    window.localStorage.setItem('originX', a.toString());
    window.localStorage.setItem('originY', b.toString());
    window.localStorage.setItem('originR', r.toString());
    this.stageMove(a, b, r);

    this.contract.methods.initializePlayer(r, proof)
    .send({from: this.account})
    .on('receipt', async (receipt) => {
      console.log(`receipt: ${receipt}`);
      const rRet = await this.contract.methods.playerLocations(this.account).call();
      console.log(`my location is ${rRet}`);

      this.updateFromStaging();
      this.setState({
        hasDFAccount: true,
        location: rRet
      });
    })
    .on('error', (error) => {
      console.log(`error: ${error}`);
    });
  }

  async updateFromStaging() {
    window.localStorage.setItem('myX', window.localStorage.stagedX);
    window.localStorage.setItem('myY', window.localStorage.stagedY);
    window.localStorage.setItem('myR', window.localStorage.stagedR);
    window.localStorage.removeItem('stagedX');
    window.localStorage.removeItem('stagedY');
    window.localStorage.removeItem('stagedR');
  }

  async stageMove(x, y, r) {
    window.localStorage.setItem('stagedX', x.toString());
    window.localStorage.setItem('stagedY', y.toString());
    window.localStorage.setItem('stagedR', r.toString());
  }

  async move(x, y) {
    console.log(`my current location according to me: ${this.state.location}`);
    const oldLoc = await this.contract.methods.playerLocations(this.account).call();
    console.log(`my current location according to server: ${oldLoc}`);
    console.log(`moving (${x}, ${y})`);
    const stagedX = (parseInt(window.localStorage.myX) + x) % (this.state.p - 1);
    const stagedY = (parseInt(window.localStorage.myY) + y) % (this.state.q - 1);
    const stagedR = (this.state.g ** stagedX) * (this.state.h ** stagedY) % (this.state.p * this.state.q);
    this.stageMove(stagedX, stagedY, stagedR);
    this.contract.methods.move(x, y)
    .send({from: this.account})
    .on('receipt', async (receipt) => {
      console.log(`receipt: ${receipt}`);
      const newLoc = await this.contract.methods.playerLocations(this.account).call();
      console.log(`my new location is ${newLoc}`);
      this.updateFromStaging();
      this.setState({location: newLoc});
    });
  }

  async moveNE() {
    await this.move(1,1);
  }
  async moveSW() {
    await this.move(-1, -1);
  }

  render () {
    if (!this.state.loading) {
      return (
        <div>
          {this.state.hasDFAccount ? (
            <div>
              <p>have df account</p>
              <button
                onClick={this.moveNE.bind(this)}
              >
                Move (1,1)
              </button>
              <button
              onClick={this.moveSW.bind(this)}
              >
                  Move (-1,-1)
              </button>
              <p>{`current a: ${window.localStorage.myX}`}</p>
              <p>{`current b: ${window.localStorage.myY}`}</p>
              <p>{`current r: ${window.localStorage.myR}`}</p>
            </div>
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
