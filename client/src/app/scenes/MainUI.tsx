import * as React from "react"
import ScrollableBoard from "../board/ScrollableBoard";
import GameManager from "../../api/GameManager";
import {Coordinates, Planet} from "../../@types/global/global";
import {isOwnedPlanet} from "../../utils/Utils";

interface MainUIProps {

}

interface MainUIState {
  selected: Coordinates | null; // the currently selected square
  hoveringOver: Coordinates | null; // this is the current coordinate the cursor is over
  mouseDown: Coordinates | null; // if the user is holding, this is where they started
  mouseDownPlanet: Planet | null; // if mouseDown coords is a planet, this is the planet
}

class MainUI extends React.Component<MainUIProps, MainUIState> {
  gameManager: GameManager;

  constructor(props) {
    super(props);
    this.state = {
      selected: null,
      hoveringOver: null,
      mouseDown: null,
      mouseDownPlanet: null
    };
    this.gameManager = GameManager.getInstance();
    this.gameManager
      .on("discoveredNewChunk", this.rerender.bind(this))
      .on("planetUpdate", this.rerender.bind(this));
  }

  rerender(): void {
    this.setState({});
  }

  onMouseDownOverCoords(coords: Coordinates): void {
    const mouseDownPlanet: Planet | null = this.gameManager.getPlanetIfExists(coords);
    this.setState({
      mouseDown: coords,
      mouseDownPlanet
    });
  }

  onMouseMoveOverCoords(coords: Coordinates): void {
    this.setState({
      hoveringOver: coords
    });
  }

  onMouseUpOverCoords(coords: Coordinates): void {
    // the user finished a click, or finished a hold-and-drag
    // if clicked, then we a square was selected/deselected
    // if hold and drag, we need to check if the user was initiating a move
    if (this.state.mouseDown) {
      if (coords.x === this.state.mouseDown.x && coords.y === this.state.mouseDown.y) {
        // if the user clicked on a square, select it
        this.toggleSelect(coords);
      } else {
        // if the user dragged from a planet they owned to another planet, initiate a move
        const startPlanet: Planet | null = this.state.mouseDownPlanet;
        const endPlanet: Planet | null = this.gameManager.getPlanetIfExists(coords);
        if (startPlanet && endPlanet && isOwnedPlanet(startPlanet) && startPlanet.owner === this.gameManager.account) {
          this.gameManager.move({
            coords: this.state.mouseDown,
            hash: startPlanet.locationId
          }, {
            coords,
            hash: endPlanet.locationId
          })
        }
      }
    }
    this.setState({
      mouseDown: null,
      mouseDownPlanet: null
    });
  }

  onMouseOut(): void {
    this.setState({
      hoveringOver: null,
      mouseDown: null,
      mouseDownPlanet: null
    });
  }

  toggleSelect(coords: Coordinates): void {
    if (this.state.selected && this.state.selected.x === coords.x && this.state.selected.y === coords.y) {
      this.setState({
        selected: null
      });
    } else if (!!this.gameManager.getPlanetIfExists(coords)) {
      this.setState({
        selected: coords
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
    return (
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
          selected={this.state.selected}
          hoveringOver={this.state.hoveringOver}
          mouseDown={this.state.mouseDown}
          mouseDownPlanet={this.state.mouseDownPlanet}
          onMouseDownOverCoords={this.onMouseDownOverCoords.bind(this)}
          onMouseMoveOverCoords={this.onMouseMoveOverCoords.bind(this)}
          onMouseUpOverCoords={this.onMouseUpOverCoords.bind(this)}
          onMouseOut={this.onMouseOut.bind(this)}
        />
      </div>
    );
  }
}

export default MainUI;
