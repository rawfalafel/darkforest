import * as bigInt from 'big-integer';
import * as React from 'react';
import { getCurrentPopulation, isOwnedPlanet } from '../../utils/Utils';
import Camera from './Camera';
import { CHUNK_SIZE } from '../../utils/constants';
import { RefObject } from 'react';
import {
  BoardData,
  ChunkCoordinates,
  Coordinates,
  EthAddress,
  Planet,
  PlanetMap,
} from '../../@types/global/global';

interface ScrollableBoardProps {
  xSize: number;
  ySize: number;
  homeChunk: ChunkCoordinates;
  knownBoard: BoardData;
  planets: PlanetMap;
  myAddress: EthAddress;
  selected: Coordinates | null;
  hoveringOver: Coordinates | null;
  mouseDown: Coordinates | null;
  mouseDownPlanet: Planet | null;
  onMouseDownOverCoords: (coords: Coordinates) => void;
  onMouseMoveOverCoords: (coords: Coordinates) => void;
  onMouseUpOverCoords: (coords: Coordinates) => void;
  onMouseOut: () => void;
}

interface ScrollableBoardState {
  width: number;
  height: number;
}

class ScrollableBoard extends React.Component<
  ScrollableBoardProps,
  ScrollableBoardState
> {
  // this component doesn't know about GameManager

  frameRate = 30;
  canvasRef: RefObject<HTMLCanvasElement> = React.createRef<
    HTMLCanvasElement
  >();
  canvas: HTMLCanvasElement | null;
  ctx: CanvasRenderingContext2D | null;
  camera: Camera;
  topBorder: any;
  bottomBorder: any;
  leftBorder: any;
  rightBorder: any;

  PlanetViewTypes = {
    UNOCCUPIED: 0,
    MINE: 1,
    ENEMY: 2,
  };

  constructor(props) {
    super(props);

    this.state = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    const { xSize, ySize } = this.props;
    const centerWorldCoords = {
      x: (this.props.homeChunk.chunkX + 0.5) * CHUNK_SIZE,
      y: (this.props.homeChunk.chunkY + 0.5) * CHUNK_SIZE,
    };
    this.camera = new Camera(
      centerWorldCoords,
      xSize / 2,
      this.state.width,
      this.state.height
    );

    this.topBorder = {
      x: xSize / 2 - 0.5,
      y: ySize - 0.7,
      width: xSize,
      height: 4,
    };
    this.bottomBorder = {
      x: xSize / 2 - 0.5,
      y: -0.3,
      width: xSize,
      height: 4,
    };
    this.leftBorder = {
      x: -0.3,
      y: ySize / 2 - 0.5,
      width: 4,
      height: ySize,
    };
    this.rightBorder = {
      x: xSize - 0.7,
      y: ySize / 2 - 0.5,
      width: 4,
      height: ySize,
    };
  }

  componentDidMount() {
    this.canvas = this.canvasRef.current;
    this.ctx = this.canvas.getContext('2d');
    // TODO: pull viewportwidth and height from page, set page size listener to update
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.addEventListener('mouseout', this.onMouseOut.bind(this));
    this.canvas.addEventListener('mousewheel', this.onScroll.bind(this));
    this.canvas.addEventListener('DOMMouseScroll', this.onScroll.bind(this));

    setInterval(() => this.frame(), 1000 / this.frameRate);
  }

  onMouseDown(e) {
    const rect = this.canvas.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    const worldCoords = this.camera.canvasToWorldCoords({
      x: canvasX,
      y: canvasY,
    });
    this.props.onMouseDownOverCoords(worldCoords);
    this.camera.startPan({ x: canvasX, y: canvasY });
  }

  onMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    const worldCoords: Coordinates = this.camera.canvasToWorldCoords({
      x: canvasX,
      y: canvasY,
    });
    this.props.onMouseMoveOverCoords(worldCoords);
    if (!!this.props.mouseDown) {
      // user is hold-dragging
      // if the hold-drag started from a planet user owns, then don't pan
      // if the hold-dragging started from anywhere else, then pan camera
      const mouseDownPlanet: Planet | null = this.props.mouseDownPlanet;
      if (
        !mouseDownPlanet ||
        !isOwnedPlanet(mouseDownPlanet) ||
        mouseDownPlanet.owner !== this.props.myAddress
      ) {
        // move camera if not holding down on a planet
        this.camera.onPanCursorMove({ x: canvasX, y: canvasY });
      }
    }
  }

  onMouseUp(e) {
    const rect = this.canvas.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    const worldCoords: Coordinates = this.camera.canvasToWorldCoords({
      x: canvasX,
      y: canvasY,
    });
    this.props.onMouseUpOverCoords(worldCoords);
    this.camera.stopPan();
  }

  onMouseOut() {
    this.props.onMouseOut();
    this.camera.stopPan();
  }

  onScroll(e) {
    e.preventDefault();
    this.camera.onWheel(e.deltaY);
  }

  drawGame() {
    this.drawBoard();
    this.ctx.fillStyle = 'white';
    this.drawGameObject(this.topBorder);
    this.drawGameObject(this.bottomBorder);
    this.drawGameObject(this.leftBorder);
    this.drawGameObject(this.rightBorder);
  }

  drawGameObject(gameObject) {
    const centerCanvasCoords = this.camera.worldToCanvasCoords(gameObject);
    this.ctx.fillRect(
      centerCanvasCoords.x - gameObject.width / this.camera.scale() / 2,
      centerCanvasCoords.y - gameObject.height / this.camera.scale() / 2,
      gameObject.width / this.camera.scale(),
      gameObject.height / this.camera.scale()
    );
  }

  drawPlanet(planetDesc) {
    const centerCanvasCoords = this.camera.worldToCanvasCoords(planetDesc);

    // border around planet indicating planet allegiance, if planet occupied
    if (planetDesc.type !== this.PlanetViewTypes.UNOCCUPIED) {
      if (planetDesc.type === this.PlanetViewTypes.MINE) {
        this.ctx.strokeStyle = 'blue';
      }
      if (planetDesc.type === this.PlanetViewTypes.ENEMY) {
        this.ctx.strokeStyle = 'red';
      }
      const ringWidth = 4.8;
      this.ctx.beginPath();
      this.ctx.arc(
        centerCanvasCoords.x,
        centerCanvasCoords.y,
        ringWidth / this.camera.scale() / 2,
        0,
        2 * Math.PI,
        false
      );
      this.ctx.stroke();
    }

    // planet color depending on hash suffix
    // if planet is destroyed, planet is pure white
    let planetColor = bigInt(planetDesc.hash, 16)
      .and(0xffffff)
      .toString(16);
    planetColor = '#' + '0'.repeat(6 - planetColor.length) + planetColor;
    if (planetDesc.destroyed) {
      planetColor = '#ffffff';
    }
    this.ctx.fillStyle = planetColor;

    const width = 4;
    const height = 4;
    this.ctx.beginPath();
    this.ctx.arc(
      centerCanvasCoords.x,
      centerCanvasCoords.y,
      width / this.camera.scale() / 2,
      0,
      2 * Math.PI,
      false
    );
    this.ctx.fill();

    // this.ctx.fillRect(centerCanvasCoords.x - width / this.camera.scale() / 2,
    //   centerCanvasCoords.y - height / this.camera.scale() / 2,
    //   width / this.camera.scale(),
    //   height / this.camera.scale());
    // draw text
    this.ctx.font = '15px sans-serif';
    this.ctx.textBaseline = 'top';
    this.ctx.textAlign = 'center';
    this.ctx.fillStyle = 'white';
    this.ctx.fillText(
      planetDesc.population.toString(),
      centerCanvasCoords.x,
      centerCanvasCoords.y +
        ((planetDesc.type === this.PlanetViewTypes.UNOCCUPIED ? 0.5 : 0.8) *
          height) /
          this.camera.scale()
    );
  }

  drawHoveringRect(x, y) {
    this.ctx.fillStyle = 'rgba(0, 0, 255, 0.2)';
    this.ctx.strokeStyle = 'white';
    this.ctx.lineWidth = 4;
    const centerCanvasCoords = this.camera.worldToCanvasCoords({ x, y });
    this.ctx.strokeRect(
      centerCanvasCoords.x - 1 / this.camera.scale() / 2,
      centerCanvasCoords.y - 1 / this.camera.scale() / 2,
      1 / this.camera.scale(),
      1 / this.camera.scale()
    );
  }

  drawSelectedRect(x, y) {
    this.ctx.fillStyle = 'rgba(0, 0, 255, 0.2)';
    this.ctx.strokeStyle = 'red';
    this.ctx.lineWidth = 4;
    const centerCanvasCoords = this.camera.worldToCanvasCoords({ x, y });
    this.ctx.strokeRect(
      centerCanvasCoords.x - 1 / this.camera.scale() / 2,
      centerCanvasCoords.y - 1 / this.camera.scale() / 2,
      1 / this.camera.scale(),
      1 / this.camera.scale()
    );
  }

  drawBoard() {
    this.ctx.clearRect(0, 0, this.state.width, this.state.height);
    this.ctx.fillStyle = 'grey';
    this.ctx.fillRect(0, 0, this.state.width, this.state.height);
    const planetLocs = [];
    for (let chunkX = 0; chunkX < this.props.knownBoard.length; chunkX += 1) {
      for (
        let chunkY = 0;
        chunkY < this.props.knownBoard[chunkX].length;
        chunkY += 1
      ) {
        const chunk = this.props.knownBoard[chunkX][chunkY];
        if (!!chunk) {
          // chunk is discovered, color it black and draw all planets
          const chunkCenterX = (chunkX + 0.5) * CHUNK_SIZE - 0.5;
          const chunkCenterY = (chunkY + 0.5) * CHUNK_SIZE - 0.5;
          this.ctx.fillStyle = 'black';
          this.drawGameObject({
            x: chunkCenterX,
            y: chunkCenterY,
            width: CHUNK_SIZE + 0.1,
            height: CHUNK_SIZE + 0.1,
          });
          for (const planetLoc of chunk.planetLocations) {
            planetLocs.push(planetLoc);
          }
        }
      }
    }
    for (const planetLoc of planetLocs) {
      if (!this.props.planets[planetLoc.hash]) {
        this.drawPlanet({
          x: planetLoc.coords.x,
          y: planetLoc.coords.y,
          hash: planetLoc.hash,
          type: this.PlanetViewTypes.UNOCCUPIED,
          population: 0,
          destroyed: false,
        });
      } else if (
        this.props.planets[planetLoc.hash].owner.toLowerCase() ===
        this.props.myAddress.toLowerCase()
      ) {
        this.drawPlanet({
          x: planetLoc.coords.x,
          y: planetLoc.coords.y,
          hash: planetLoc.hash,
          type: this.PlanetViewTypes.MINE,
          population: Math.floor(
            getCurrentPopulation(this.props.planets[planetLoc.hash]) / 100
          ),
          destroyed: this.props.planets[planetLoc.hash].destroyed,
        });
      } else {
        this.drawPlanet({
          x: planetLoc.coords.x,
          y: planetLoc.coords.y,
          hash: planetLoc.hash,
          type: this.PlanetViewTypes.ENEMY,
          population: Math.floor(
            getCurrentPopulation(this.props.planets[planetLoc.hash]) / 100
          ),
          destroyed: this.props.planets[planetLoc.hash].destroyed,
        });
      }
    }
    if (this.props.hoveringOver && this.props.mouseDownPlanet) {
      if (
        isOwnedPlanet(this.props.mouseDownPlanet) &&
        this.props.mouseDownPlanet.owner === this.props.myAddress
      ) {
        this.ctx.beginPath();
        this.ctx.lineWidth = 4;
        this.ctx.strokeStyle = 'white';
        const startCoords: Coordinates = this.camera.worldToCanvasCoords(
          this.props.mouseDown
        );
        this.ctx.moveTo(startCoords.x, startCoords.y);
        const endCoords: Coordinates = this.camera.worldToCanvasCoords(
          this.props.hoveringOver
        );
        this.ctx.lineTo(endCoords.x, endCoords.y);
        this.ctx.stroke();
      }
    }
    if (this.props.hoveringOver) {
      this.drawHoveringRect(
        this.props.hoveringOver.x,
        this.props.hoveringOver.y
      );
    }
    if (this.props.selected) {
      this.drawSelectedRect(this.props.selected.x, this.props.selected.y);
    }
  }

  frame() {
    this.drawGame();
  }

  render() {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          height: '100%',
        }}
      >
        <canvas
          ref={this.canvasRef}
          width={this.state.width}
          height={this.state.height}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    );
  }
}

export default ScrollableBoard;
