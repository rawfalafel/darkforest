import React, { Component } from "react";
import {isPlanet} from "../utils/Utils";
import Camera from "./Camera";

class ScrollableBoard extends Component {
  canvasRef = React.createRef();
  ctx;
  camera;

  topBorder = {
    x: 14.5,
    y: 29.3,
    width: 30,
    height: 0.2
  };
  bottomBorder = {
    x: 14.5,
    y: -0.3,
    width: 30,
    height: 0.2
  };
  leftBorder = {
    x: -0.3,
    y: 14.5,
    width: 0.2,
    height: 30
  };
  rightBorder = {
    x: 29.3,
    y: 14.5,
    width: 0.2,
    height: 30
  };

  constructor(props) {
    super(props);

    this.state = {
      width: 768,
      height: 640,
      mouseDown: null, // world coords, rounded to int
      hoveringOver: null // world coords, rounded to int
    };
  }

  componentDidMount() {
    this.canvas = this.canvasRef.current;
    this.ctx = this.canvas.getContext("2d");
    // TODO: pull viewportwidth and height from page, set page size listener to update
    this.camera = new Camera(14.5, 14.5, -0.5, -0.5, 29.5, 29.5, 15, this.state.width, this.state.height);
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.addEventListener('mouseout', this.onMouseOut.bind(this));
    this.canvas.addEventListener('mousewheel', this.onScroll.bind(this));
    this.canvas.addEventListener('DOMMouseScroll', this.onScroll.bind(this));

    setInterval(() => this.frame(), 1000 / 30);
  }

  onMouseDown(e) {
    const rect = this.canvas.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    const worldCoords = this.camera.canvasToWorldCoords(canvasX, canvasY);
    this.setState({
      mouseDown: {x: Math.round(worldCoords.x), y: Math.round(worldCoords.y)}
    });
    this.camera.onMouseDown(canvasX, canvasY);
  }

  onMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    const worldCoords = this.camera.canvasToWorldCoords(canvasX, canvasY);
    const worldX = Math.round(worldCoords.x);
    const worldY = Math.round(worldCoords.y);
    this.setState({
      hoveringOver: {x: worldX, y: worldY}
    });
    if (!!this.state.mouseDown && !isPlanet(this.props.knownBoard[this.state.mouseDown.x][this.state.mouseDown.y])) {
      // move if not holding down on a planet
      this.camera.onMouseMove(canvasX, canvasY);
    }
    this.drawGame();
  }

  onMouseUp(e) {
    const rect = this.canvas.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    const worldCoords = this.camera.canvasToWorldCoords(canvasX, canvasY);
    const worldX = Math.round(worldCoords.x);
    const worldY = Math.round(worldCoords.y);
    if (!this.state.mouseDown) {
      return;
    }
    if (worldX === this.state.mouseDown.x && worldY === this.state.mouseDown.y) {
      this.props.toggleSelect(worldX, worldY);
    } else {
      if (this.props.knownBoard[worldX][worldY] && isPlanet(this.props.knownBoard[worldX][worldY])) {
        const startX = this.state.mouseDown.x;
        const startY = this.state.mouseDown.y;
        if (this.props.knownBoard[startX][startY]) {
          if (this.props.planets[this.props.knownBoard[startX][startY]]) {
            if (this.props.planets[this.props.knownBoard[startX][startY]].owner.toLowerCase() === this.props.myAddress.toLowerCase()) {
              this.props.move({
                x: startX,
                y: startY,
                hash: this.props.knownBoard[startX][startY]
              }, {
                x: worldX,
                y: worldY,
                hash: this.props.knownBoard[worldX][worldY]
              });
            }
          }
        }
      }
    }
    this.setState({
      mouseDown: null
    });
    if (!!this.state.mouseDown && !isPlanet(this.props.knownBoard[this.state.mouseDown.x][this.state.mouseDown.y])) {
      // move if not holding down on a planet
      this.camera.onMouseUp(canvasX, canvasY);
    }
  }

  onMouseOut(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.setState({hoveringOver: null, mouseDown: null});
    if (!!this.state.mouseDown && !isPlanet(this.props.knownBoard[this.state.mouseDown.x][this.state.mouseDown.y])) {
      // move if not holding down on a planet
      this.camera.onMouseUp(e.clientX - rect.left, e.clientY - rect.top);
    }
  }

  onScroll(e) {
    e.preventDefault();
    this.camera.onWheel(e.deltaY);
  }

  updateGame() {
    // no-op
  }

  drawGame() {
    this.drawBoard();
    this.drawGameObject(this.topBorder);
    this.drawGameObject(this.bottomBorder);
    this.drawGameObject(this.leftBorder);
    this.drawGameObject(this.rightBorder);
  }

  drawGameObject(gameObject) {
    const centerCanvasCoords = this.camera.worldToCanvasCoords(gameObject.x, gameObject.y);
    this.ctx.fillRect(centerCanvasCoords.x - gameObject.width / this.camera.scale / 2,
      centerCanvasCoords.y - gameObject.height / this.camera.scale / 2,
      gameObject.width / this.camera.scale,
      gameObject.height / this.camera.scale);
  }

  drawHoveringRect(x, y) {
    this.ctx.fillStyle = "rgba(0, 0, 255, 0.2)";
    this.ctx.strokeStyle = "white";
    this.ctx.lineWidth = 4;
    const centerCanvasCoords = this.camera.worldToCanvasCoords(x, y);
    this.ctx.strokeRect(centerCanvasCoords.x - 1 / this.camera.scale / 2,
      centerCanvasCoords.y - 1 / this.camera.scale / 2,
      1 / this.camera.scale,
      1 / this.camera.scale);
  }

  drawSelectedRect(x, y) {
    this.ctx.fillStyle = "rgba(0, 0, 255, 0.2)";
    this.ctx.strokeStyle = "red";
    this.ctx.lineWidth = 4;
    const centerCanvasCoords = this.camera.worldToCanvasCoords(x, y);
    this.ctx.strokeRect(centerCanvasCoords.x - 1 / this.camera.scale / 2,
      centerCanvasCoords.y - 1 / this.camera.scale / 2,
      1 / this.camera.scale,
      1 / this.camera.scale);
  }

  drawBoard() {
    this.ctx.clearRect(0, 0, this.state.width, this.state.height);
    this.ctx.fillStyle = 'black';
    this.ctx.fillRect(0, 0, this.state.width, this.state.height);
    for (let x = 0; x < this.props.knownBoard.length; x += 1) {
      for (let y = 0; y < this.props.knownBoard[x].length; y += 1) {
        if (!this.props.knownBoard[x][y]) {
          this.ctx.fillStyle = 'grey';
          this.drawGameObject({
            x,
            y,
            width: 1.1,
            height: 1.1
          });
        } else if (!this.props.planets[this.props.knownBoard[x][y]] && isPlanet(this.props.knownBoard[x][y])) {
          this.ctx.fillStyle = 'green';
          this.drawGameObject({
            x,
            y,
            width: 0.6,
            height: 0.6
          });
        } else if (this.props.planets[this.props.knownBoard[x][y]]) {
          if (this.props.planets[this.props.knownBoard[x][y]].owner.toLowerCase() === this.props.myAddress.toLowerCase()) {
            this.ctx.fillStyle = 'blue';
            this.drawGameObject({
              x,
              y,
              width: 0.6,
              height: 0.6
            });
          } else {
            this.ctx.fillStyle = 'red';
            this.drawGameObject({
              x,
              y,
              width: 0.6,
              height: 0.6
            });
          }
        }
      }
    }
    if (this.state.hoveringOver && this.state.mouseDown) {
      if (isPlanet(this.props.knownBoard[this.state.mouseDown.x][this.state.mouseDown.y])
        && (this.state.hoveringOver.x !== this.state.mouseDown.x || this.state.hoveringOver.y !== this.state.mouseDown.y)) {
        this.ctx.beginPath();
        this.ctx.lineWidth = 4;
        this.ctx.strokeStyle = 'white';
        const startCoords = this.camera.worldToCanvasCoords(this.state.mouseDown.x, this.state.mouseDown.y);
        this.ctx.moveTo(startCoords.x, startCoords.y);
        const endCoords = this.camera.worldToCanvasCoords(this.state.hoveringOver.x, this.state.hoveringOver.y);
        this.ctx.lineTo(endCoords.x, endCoords.y);
        this.ctx.stroke();
      }
    }
    if (this.state.hoveringOver) {
      this.drawHoveringRect(this.state.hoveringOver.x, this.state.hoveringOver.y);
    }
    if (this.props.selected) {
      this.drawSelectedRect(this.props.selected.x, this.props.selected.y);
    }
  }

  frame() {
    this.updateGame();
    this.drawGame();
  }

  render() {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center"
        }}
      >
        <canvas
          ref={this.canvasRef}
          width={this.state.width}
          height={this.state.height}
          style={{ border: '1px solid black '}}
        />
      </div>
    );
  }
}

export default ScrollableBoard;
