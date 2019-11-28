import * as React from "react"
import './App.css';
import Landing from "./scenes/Landing";
import Loading from "./scenes/Loading";
import GameManager from "../api/GameManager";
import MainUI from "./scenes/MainUI";

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

  async startApp() {
    // window.localStorage.clear();
    this.gameManager = await GameManager.initialize();
    this.setState({
      loading: false,
      hasJoinedGame: this.gameManager.hasJoinedGame()
    })
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
            <MainUI/>
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
