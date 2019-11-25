import * as React from "react"
import './App.css';
import ScrollableBoard from "./board/ScrollableBoard";
import Landing from "./scenes/Landing";
import Loading from "./scenes/Loading";
import GameManager from "../api/GameManager";

class App extends React.Component<any, any> {
  gameManager: GameManager;

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

  rerender(): void {
    this.setState({});
  }

  async startApp() {
    window.localStorage.clear();
    this.gameManager = await GameManager.initialize();
    this.setState({
      loading: false,
      hasJoinedGame: this.gameManager.hasJoinedGame()
    });
    this.gameManager
      .on("discoveredNewChunk", this.rerender.bind(this))
      .on("planetUpdate", this.rerender.bind(this));
  }

  async initialize() {
    this.setState({
      findingFirstPlanet: true
    }, () => {
      this.gameManager.joinGame().once('initializedPlayer', () => {
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
    this.gameManager.move(fromLocation, toLocation);
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
    this.gameManager.startExplore();
  }

  stopExplore() {
    this.gameManager.stopExplore();
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
                xSize={this.gameManager.xSize}
                ySize={this.gameManager.ySize}
                homeChunk={this.gameManager.localStorageManager.getHomeChunk()}
                knownBoard={this.gameManager.inMemoryBoard}
                planets={this.gameManager.planets}
                myAddress={this.gameManager.account}
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
