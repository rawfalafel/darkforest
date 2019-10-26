import React, { Component } from "react";
import Board from "./board/Board";
import ContractAPI from "./ContractAPI";

class Landing extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      hasJoinedGame: false,
    };
    this.startApp();
  }

  async startApp() {
    window.localStorage.clear();
    this.contractAPI = ContractAPI.getInstance();
    this.contractAPI.on('initialized', contractAPI => {
      this.setState({
        loading: false,
        hasJoinedGame: contractAPI.hasJoinedGame
      });
    }).on('discover', board => {
      this.setState({});
    }).on('locationsUpdate', () => {
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

  render() {
    if (!this.state.loading) {
      return (
        <div>
          {this.state.hasJoinedGame ? (
            <div>
              <p>have df account</p>
              <button onClick={this.startExplore.bind(this)}>Start telescope</button>
              <button onClick={this.stopExplore.bind(this)}>Pause telescope</button>
              <Board
                maxX={parseInt(this.contractAPI.constants.maxX)}
                maxY={parseInt(this.contractAPI.constants.maxY)}
                knownBoard={this.contractAPI.inMemoryBoard}
                planets={this.contractAPI.planets}
                myAddress={this.contractAPI.account}
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
