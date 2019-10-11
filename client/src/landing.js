import Web3 from "web3";
import React, { Component } from "react";
import {
  bigExponentiate,
  twoDimDLogProof,
  verifyTwoDimDLogProof
} from "./utils/homemadeCrypto";
import { contractAddress } from "./local_contract_addr"; // this is a gitignored file
import bigInt from "big-integer";
import * as stringify from "json-stable-stringify";
import * as md5 from "md5";
import Board from "./board/Board";
import ContractAPI from "./ContractAPI";

const ethereum = window.ethereum;

const contractABI = require("./build/contracts/DarkForest.json").abi;

class Landing extends Component {
  constructor(props) {
    super(props);
    this.contract = null;
    this.account = null;
    this.state = {
      loading: true,
      hasDFAccount: false,
      knownBoard: [],
      locPlayerMap: {}
    };
    this.startApp();
  }

  async startApp() {
    this.contractAPI = ContractAPI.getInstance();
    this.contractAPI.on('web3manager', () => {
      console.log('event emitter: initialized web3 object!');
    }).on('contractData', () => {
      console.log('event emitter: got contract data!');
    });
    const web3 = new Web3(ethereum);
    if (typeof web3 === "undefined") {
      console.log("no provider :(");
      return;
    }
    console.log("found provider");
    try {
      // Request account access if needed
      await ethereum.enable();
    } catch (error) {
      console.log("access not given :(");
    }
    const accounts = await web3.eth.getAccounts();
    console.log("got account");
    if (accounts.length > 0) {
      this.account = accounts[0];
    }
    await this.getContractData(web3);
    await this.getDFAccountData(web3);
    this.explore();
  }

  async getContractData(web3) {
    this.contract = new web3.eth.Contract(contractABI, contractAddress);
    console.log("contract initialized");
    const p = parseInt(await this.contract.methods.p().call());
    const q = parseInt(await this.contract.methods.q().call());
    const g = parseInt(await this.contract.methods.g().call());
    const h = parseInt(await this.contract.methods.h().call());
    console.log(p);
    this.setState({
      p,
      q,
      g,
      h,
      knownBoard: Array(p - 1)
        .fill(0)
        .map(() => Array(q - 1).fill(0))
    });
    // the following code is really bad; doesn't handle any errors etc.
    // probably the correct way to do this is to refactor the data structures
    // that we use to even store playerLocations in the smart contract
    const nPlayers = parseInt(await this.contract.methods.getNPlayers().call());
    let playerPromises = [];
    for (let i = 0; i < nPlayers; i += 1) {
      playerPromises.push(this.contract.methods.players(i).call());
    }
    let playerAddrs = await Promise.all(playerPromises);
    let playerLocationPromises = [];
    for (let i = 0; i < nPlayers; i += 1) {
      playerLocationPromises.push(
        this.contract.methods.playerLocations(playerAddrs[i]).call()
      );
    }
    let playerLocations = await Promise.all(playerLocationPromises);
    let locationPlayerMap = {};
    for (let i = 0; i < nPlayers; i += 1) {
      locationPlayerMap[playerLocations[i]] = playerAddrs[i];
    }
    this.setState({
      locPlayerMap: locationPlayerMap
    });
  }

  async getDFAccountData() {
    const myLoc = parseInt(
      await this.contract.methods.playerLocations(this.account).call()
    );
    console.log("myLoc: " + myLoc);
    if (myLoc === 0) {
      console.log("need to init");
      this.setState({
        loading: false,
        hasDFAccount: false
      });
    } else {
      console.log("i'm in");
      if (myLoc === parseInt(window.localStorage[this.account + "stagedR"])) {
        this.updateFromStaging();
      }
      this.setState({
        loading: false,
        hasDFAccount: true,
        location: myLoc,
        knownBoard: JSON.parse(window.localStorage[this.account + "knownBoard"])
      });
    }
  }

  async initialize() {
    if (!(this.state.p && this.state.q && this.state.g && this.state.h)) {
      return;
    }
    window.localStorage.setItem(
      this.account + "knownBoard",
      stringify(
        Array(this.state.p - 1)
          .fill(0)
          .map(() => Array(this.state.q - 1))
      )
    );
    const { p, q, g, h } = this.state;
    const a = Math.floor(Math.random() * (p - 1));
    const b = Math.floor(Math.random() * (q - 1));
    const r =
      (bigExponentiate(bigInt(g), a, bigInt(p * q)).toJSNumber() *
        bigExponentiate(bigInt(h), b, bigInt(p * q)).toJSNumber()) %
      (p * q);
    const proof = twoDimDLogProof(a, b, g, h, p, q);

    window.localStorage.setItem(this.account + "originX", a.toString());
    window.localStorage.setItem(this.account + "originY", b.toString());
    window.localStorage.setItem(this.account + "originR", r.toString());
    this.stageMove(a, b, r);

    this.contract.methods
      .initializePlayer(r, proof)
      .send({ from: this.account })
      .on("receipt", async receipt => {
        console.log(`receipt: ${receipt}`);
        const rRet = parseInt(
          await this.contract.methods.playerLocations(this.account).call()
        );
        console.log(`my location is ${rRet}`);
        this.telescopeUpdate(a, b, r);

        this.updateFromStaging();
        this.setState({
          hasDFAccount: true,
          location: rRet
        });
      })
      .on("error", error => {
        console.log(`error: ${error}`);
      });
  }

  async updateFromStaging() {
    window.localStorage.setItem(
      this.account + "myX",
      window.localStorage[this.account + "stagedX"]
    );
    window.localStorage.setItem(
      this.account + "myY",
      window.localStorage[this.account + "stagedY"]
    );
    window.localStorage.setItem(
      this.account + "myR",
      window.localStorage[this.account + "stagedR"]
    );
    window.localStorage.removeItem(this.account + "stagedX");
    window.localStorage.removeItem(this.account + "stagedY");
    window.localStorage.removeItem(this.account + "stagedR");
  }

  async stageMove(x, y, r) {
    window.localStorage.setItem(this.account + "stagedX", x.toString());
    window.localStorage.setItem(this.account + "stagedY", y.toString());
    window.localStorage.setItem(this.account + "stagedR", r.toString());
  }

  async move(x, y) {
    console.log(`my current location according to me: ${this.state.location}`);
    const oldLoc = parseInt(
      await this.contract.methods.playerLocations(this.account).call()
    );
    console.log(`my current location according to server: ${oldLoc}`);
    console.log(`moving (${x}, ${y})`);
    const stagedX =
      (parseInt(window.localStorage[this.account + "myX"]) +
        x +
        this.state.p -
        1) %
      (this.state.p - 1);
    const stagedY =
      (parseInt(window.localStorage[this.account + "myY"]) +
        y +
        this.state.q -
        1) %
      (this.state.q - 1);
    const m = this.state.p * this.state.q;
    const stagedR =
      (bigInt(this.state.g)
        .modPow(bigInt(stagedX), bigInt(m))
        .toJSNumber() *
        bigInt(this.state.h)
          .modPow(bigInt(stagedY), bigInt(m))
          .toJSNumber()) %
      m;
    this.stageMove(stagedX, stagedY, stagedR);
    this.contract.methods
      .move(x, y)
      .send({ from: this.account })
      .on("receipt", async receipt => {
        console.log(`receipt: ${receipt}`);
        const newLoc = parseInt(
          await this.contract.methods.playerLocations(this.account).call()
        );
        console.log(`my new location is ${newLoc}`);
        this.telescopeUpdate(stagedX, stagedY, stagedR);
        this.updateFromStaging();
        this.setState({ location: newLoc });
      });
  }

  moveUp() {
    this.move(0, -1);
  }

  moveDown() {
    this.move(0, 1);
  }

  moveLeft() {
    this.move(-1, 0);
  }

  moveRight() {
    this.move(1, 0);
  }

  explore() {
    setInterval(() => {
      if (this.state.hasDFAccount) {
        const x = Math.floor(Math.random() * (this.state.p - 1));
        const y = Math.floor(Math.random() * (this.state.q - 1));
        const m = this.state.p * this.state.q;
        const r =
          (bigInt(this.state.g)
            .modPow(bigInt(x), bigInt(m))
            .toJSNumber() *
            bigInt(this.state.h)
              .modPow(bigInt(y), bigInt(m))
              .toJSNumber()) %
          m;
        this.telescopeUpdate(x, y, r);
      }
    }, 5000);
  }

  telescopeUpdate(x, y, r) {
    this.state.knownBoard[x][y] = r;
    this.setState(
      {
        knownBoard: this.state.knownBoard
      },
      () => {
        window.localStorage.setItem(
          this.account + "knownBoard",
          stringify(this.state.knownBoard)
        );
      }
    );
  }

  render() {
    if (!this.state.loading) {
      return (
        <div>
          {this.state.hasDFAccount ? (
            <div>
              <p>have df account</p>
              <button onClick={this.moveUp.bind(this)}>Move up</button>
              <button onClick={this.moveDown.bind(this)}>Move down</button>
              <button onClick={this.moveLeft.bind(this)}>Move left</button>
              <button onClick={this.moveRight.bind(this)}>Move right</button>
              <p>{`current a: ${window.localStorage[this.account + "myX"]}`}</p>
              <p>{`current b: ${window.localStorage[this.account + "myY"]}`}</p>
              <p>{`current r: ${window.localStorage[this.account + "myR"]}`}</p>
              <Board
                p={parseInt(this.state.p)}
                q={this.state.q}
                knownBoard={this.state.knownBoard}
                locPlayerMap={this.state.locPlayerMap}
                myAddress={this.account}
              />
            </div>
          ) : (
            <button onClick={this.initialize.bind(this)}>Initialize me</button>
          )}
        </div>
      );
    }
    return <div>loading...</div>;
  }
}

export default Landing;
