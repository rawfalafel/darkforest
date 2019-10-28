import React, { Component } from "react";
import {isPlanet} from "../utils/Utils";

class Camera {
  constructor(x, y, minX, minY, maxX, maxY, width, viewportWidth, viewportHeight) {
    // each of these is measured relative to the world coordinate system
    this.x = x;
    this.y = y;
    this.minX = minX;
    this.minY = minY;
    this.maxX = maxX;
    this.maxY = maxY;
    this.width = width;
    this.height = width * viewportHeight / viewportWidth;
    this.scale = width / viewportWidth;
    // while all of the above are in the world coordinate system, the below are in the page coordinate system
    this.viewportWidth = viewportWidth; // width / height
    this.viewportHeight = viewportHeight;
    this.isMoving = false;
    this.moveLastX = null;
    this.moveLastY = null;
  }

  canvasToWorldCoords(x, y) {
    const worldX = (x - this.viewportWidth / 2) * (this.width / this.viewportWidth) + this.x;
    const worldY = -1 * (y - this.viewportHeight / 2) * (this.width / this.viewportWidth) + this.y;
    return {x: worldX, y: worldY};
  }

  worldToCanvasCoords(x, y) {
    const canvasX = (x - this.x) * (this.viewportWidth / this.width) + this.viewportWidth / 2;
    const canvasY = -1 * (y - this.y) * (this.viewportWidth / this.width) + this.viewportHeight / 2;
    return {x: canvasX, y: canvasY};
  }

  onMouseDown(x, y) {
    if (x && y) {
      this.moveLastX = x;
      this.moveLastY = y;
      this.isMoving = true;
    }
  }

  onMouseMove(x, y) {
    if (this.isMoving && x && y) {
      this.setNewMousePosition(x, y);
      this.moveLastX = x;
      this.moveLastY = y;
    }
  }

  onMouseUp(x, y) {
    if (this.isMoving && x && y) {
      this.setNewMousePosition(x, y);
      this.moveLastX = null;
      this.moveLastY = null;
      this.isMoving = false;
    }
  }

  setWidth(width) {
    this.width = width;
    this.height = width * this.viewportHeight / this.viewportWidth;
    this.scale = width / this.viewportWidth;
  }

  onWheel(deltaY) {
    let newWidth = this.width * (1.01 ** deltaY);
    //clip
    newWidth = Math.max(6, newWidth);
    newWidth = Math.min(newWidth, 2 * (this.x - this.minX), 2 * (this.y - this.minY), 2 * (this.maxX - this.x), 2 * (this.maxY - this.y))
    this.setWidth(newWidth);
  }

  setNewMousePosition(mouseNewX, mouseNewY) {
    const dx = mouseNewX - this.moveLastX;
    const dy = mouseNewY - this.moveLastY;
    this.x -= dx * this.scale;
    this.y -= -1 * dy * this.scale;
    // clip
    this.x = Math.max(this.minX + this.width/2, Math.min(this.maxX - this.width/2, this.x));
    this.y = Math.max(this.minY + this.height/2, Math.min(this.maxY - this.height/2, this.y));
  }
}

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
      mouseDown: null,
      hoveringOver: null
    };
  }

  componentDidMount() {
    this.canvas = this.canvasRef.current;
    this.ctx = this.canvas.getContext("2d");
    // TODO: pull viewportwidth and height from page, set page size listener to update
    this.camera = new Camera(14.5, 14.5, -0.5, -0.5, 29.5, 29.5, 15, this.state.width, this.state.height);
    this.canvas.addEventListener('mousedown', e => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this.camera.onMouseDown(x, y);
    });
    this.canvas.addEventListener('mousemove', e => {
      const rect = this.canvas.getBoundingClientRect();
      const canvasX = e.clientX - rect.left;
      const canvasY = e.clientY - rect.top;
      const worldCoords = this.camera.canvasToWorldCoords(canvasX, canvasY);
      const worldX = Math.round(worldCoords.x);
      const worldY = Math.round(worldCoords.y);
      this.setState({
        hoveringOver: {x: worldX, y: worldY}
      });
      this.camera.onMouseMove(canvasX, canvasY);
    });
    this.canvas.addEventListener('mouseup', e => {
      const rect = this.canvas.getBoundingClientRect();
      this.camera.onMouseUp(e.clientX - rect.left, e.clientY - rect.top);
    });
    this.canvas.addEventListener('mouseout', e => {
      const rect = this.canvas.getBoundingClientRect();
      this.setState({hoveringOver: null});
      this.camera.onMouseUp(e.clientX - rect.left, e.clientY - rect.top);
    });
    this.canvas.addEventListener('mousewheel', e => {
      e.preventDefault();
      this.camera.onWheel(e.deltaY);
    });
    this.canvas.addEventListener('DOMMouseScroll', e => {
      e.preventDefault();
      this.camera.onWheel(e.deltaY);
    });

    setInterval(() => this.frame(), 1000 / 30);
  }

  updateGame() {
    // no-op
  }

  drawGame() {
    this.ctx.clearRect(0, 0, this.state.width, this.state.height);
    this.ctx.fillStyle = 'black';
    this.ctx.fillRect(0, 0, this.state.width, this.state.height);
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
    const centerCanvasCoords = this.camera.worldToCanvasCoords(x, y);
    this.ctx.strokeRect(centerCanvasCoords.x - 1 / this.camera.scale / 2,
      centerCanvasCoords.y - 1 / this.camera.scale / 2,
      1 / this.camera.scale,
      1 / this.camera.scale);
  }

  drawBoard() {
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
        if (this.state.hoveringOver && x === this.state.hoveringOver.x && y === this.state.hoveringOver.y) {
          this.ctx.fillStyle = "rgba(0, 0, 255, 0.2)";
          this.ctx.strokeStyle = "white";
          this.ctx.lineWidth = 4;
          this.drawHoveringRect(x, y);
        }
      }
    }
  }

  frame() {
    this.updateGame();
    this.drawGame();
  }

  render() {
    console.log(this.props.knownBoard);
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
