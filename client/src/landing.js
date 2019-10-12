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
    // window.localStorage.clear();
    this.contractAPI = ContractAPI.getInstance();
    this.contractAPI.on('initialized', contractAPI => {
      this.setState({
        loading: false,
        hasJoinedGame: contractAPI.hasJoinedGame
      });
    }).on('discover', board => {
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

  moveUp() {
    this.contractAPI.move(0, -1);
  }

  moveDown() {
    this.contractAPI.move(0, 1);
  }

  moveLeft() {
    this.contractAPI.move(-1, 0);
  }

  moveRight() {
    this.contractAPI.move(1, 0);
  }

  startExplore() {
    this.contractAPI.startExplore();
  }

  stopExplore() {
    this.contractAPI.stopExplore();
  }

  render() {
    if (!this.state.loading) {
      return (
        <div>
          {this.state.hasJoinedGame ? (
            <div>
              <p>have df account</p>
              <button onClick={this.moveUp.bind(this)}>Move up</button>
              <button onClick={this.moveDown.bind(this)}>Move down</button>
              <button onClick={this.moveLeft.bind(this)}>Move left</button>
              <button onClick={this.moveRight.bind(this)}>Move right</button>
              <button onClick={this.startExplore.bind(this)}>Start telescope</button>
              <button onClick={this.stopExplore.bind(this)}>Pause telescope</button>
              <p>{`current x: ${this.contractAPI.myLocCurrent.x}`}</p>
              <p>{`current y: ${this.contractAPI.myLocCurrent.y}`}</p>
              <p>{`current r: ${this.contractAPI.myLocCurrent.r}`}</p>
              <Board
                p={parseInt(this.contractAPI.constants.p)}
                q={parseInt(this.contractAPI.constants.q)}
                knownBoard={this.contractAPI.inMemoryBoard}
                locPlayerMap={this.contractAPI.locPlayerMap}
                myAddress={this.contractAPI.account}
                myLocation={this.contractAPI.myLocCurrent}
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
