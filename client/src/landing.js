import React, { Component } from "react";
import Board from "./board/Board";
import ContractAPI from "./ContractAPI";
import ScrollableBoard from "./board/ScrollableBoard";

class Landing extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      hasJoinedGame: false,
      moving: false,
      selectedCoords: null
    };
    this.startApp();
  }

  async startApp() {
    // window.localStorage.clear();
    this.contractAPI = ContractAPI.getInstance();
    this.contractAPI.on('initialized', contractAPI => {
      this.setState({
        loading: false,
        hasJoinedGame: contractAPI.hasJoinedGame
      });
    }).on('discover', () => {
      this.setState({});
    }).on('locationsUpdate', () => {
      this.setState({});
    }).on('initializedPlayer', () => {
      console.log('spawned on a home planet');
      this.setState({});
    }).on('error', console.error);
  }

  async initialize() {
    this.contractAPI.joinGame().once('initializedPlayer', () => {
      this.setState({
        hasJoinedGame: true
      });
    });
  }

  move(fromLocation, toLocation) {
    if (this.state.moving) {
      window.alert('a move is already queued');
      return;
    }
    this.setState({
      moving: true
    }, () => {
      this.contractAPI.move(fromLocation, toLocation).once('moveComplete', () => {
        this.setState({
          moving: false
        });
      })
    });
  }

  toggleSelect(x, y) {
    if (this.state.selectedCoords && this.state.selectedCoords.x === x && this.state.selectedCoords.y === y) {
      this.setState({
        selectedCoords: null
      });
    } else {
      this.setState({
        selectedCoords: {x, y}
      });
    }
  }

  startExplore() {
    this.contractAPI.startExplore();
  }

  stopExplore() {
    this.contractAPI.stopExplore();
  }

  initCircuitTest() {
    this.contractAPI.initCircuitTest(14,9);
  }

  moveCircuitTest() {
    this.contractAPI.moveCircuitTest(1, 1);
  }

  async getTempLoc() {
    const tempLoc = await this.contractAPI.web3Manager.contract.methods.tempLoc().call();
    this.setState({
      tempLoc
    });
  }

  render() {
    if (!this.state.loading) {
      return (
        <div>
          {this.state.hasJoinedGame ? (
            <div>
              <p>have df account</p>
              <button onClick={this.startExplore.bind(this)}>Start telescope</button>
              <button onClick={this.stopExplore.bind(this)}>Pause telescope</button>
              <button onClick={this.getTempLoc.bind(this)}>debug</button>
              <p>{`tempLoc: ${this.state.tempLoc}`}</p>
              <ScrollableBoard
                maxX={parseInt(this.contractAPI.constants.maxX)}
                maxY={parseInt(this.contractAPI.constants.maxY)}
                knownBoard={this.contractAPI.inMemoryBoard}
                planets={this.contractAPI.planets}
                myAddress={this.contractAPI.account}
                move={this.move.bind(this)}
                toggleSelect={this.toggleSelect.bind(this)}
                selected={this.state.selectedCoords}
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
