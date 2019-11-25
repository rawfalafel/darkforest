import * as React from "react"
import './App.css';
import ContractAPI from "../api/ContractAPI";
import ScrollableBoard from "./board/ScrollableBoard";
import Landing from "./scenes/Landing";
import Loading from "./scenes/Loading";

class App extends React.Component<any, any> {
  contractAPI: ContractAPI;

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      hasJoinedGame: false,
      selectedCoords: null,
      findingFirstPlanet: false
    };
    this.startApp();
  }

  async startApp() {
    // window.localStorage.clear();
    this.contractAPI = ContractAPI.getInstance();
    this.contractAPI.on('initialized', contractAPI => {
      this.setState({
        loading: false,
        hasJoinedGame: contractAPI.hasJoinedGame()
      });
    }).on('discover', () => {
      this.setState({});
    }).on('locationsUpdate', () => {
      this.setState({});
    }).on('initializedPlayer', () => {
      console.log('spawned on a home planet');
      this.startExplore();
      this.setState({});
    }).on('error', console.error);
  }

  async initialize() {
    this.setState({
      findingFirstPlanet: true
    }, () => {
      this.contractAPI.joinGame().once('initializedPlayer', () => {
        this.setState({
          hasJoinedGame: true,
          findingFirstPlanet: false
        });
      }).once('initializedPlayerError', () => {
        this.setState({
          findingFirstPlanet: false
        });
      });
    });
  }

  move(fromLocation, toLocation) {
    this.contractAPI.move(fromLocation, toLocation);
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

  render() {
    if (!this.state.loading && !this.state.findingFirstPlanet) {
      return (
        <div
          style={{
            width: '100%',
            height: '100%'
          }}
        >
          {this.state.hasJoinedGame ? (
            <div>
              <div
                style={{position: 'absolute', top: 0, left: 0}}
              >
                <button onClick={this.startExplore.bind(this)}>Start explore</button>
                <button onClick={this.stopExplore.bind(this)}>Stop explore</button>
              </div>
              <ScrollableBoard
                xSize={this.contractAPI.xSize}
                ySize={this.contractAPI.ySize}
                homeChunk={this.contractAPI.localStorageManager.getHomeChunk()}
                knownBoard={this.contractAPI.inMemoryBoard}
                planets={this.contractAPI.planets}
                myAddress={this.contractAPI.account}
                move={this.move.bind(this)}
                toggleSelect={this.toggleSelect.bind(this)}
                selected={this.state.selectedCoords}
              />
            </div>
          ) : (
            <Landing
              onInitialize={this.initialize.bind(this)}
            />
          )}
        </div>
      );
    }
    return <Loading/>;
  }
}

export default App;
