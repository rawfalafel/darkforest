import React, { Component } from "react";

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
      this.setNewPosition(x, y);
      this.moveLastX = x;
      this.moveLastY = y;
    }
  }

  onMouseUp(x, y) {
    if (this.isMoving && x && y) {
      this.setNewPosition(x, y);
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
    this.setWidth(this.width + deltaY * 0.1);
  }

  setNewPosition(mouseNewX, mouseNewY) {
    const dx = mouseNewX - this.moveLastX;
    const dy = mouseNewY - this.moveLastY;
    this.x -= dx * this.scale;
    this.y -= -1 * dy * this.scale;
    // clip
    this.x = Math.max(this.minX + this.width/2, Math.min(this.maxX - this.width/2, this.x));
    this.y = Math.max(this.minY + this.width/2, Math.min(this.maxY - this.width/2, this.y));
  }
}

class ScrollableBoard extends Component {
  canvasRef = React.createRef();
  ctx;
  camera;

  square = {
    x: 10,
    y: 12,
    width: 1,
    height: 1
  };
  square2 = {
    x: 1,
    y: 1,
    width: 1,
    height: 1
  };
  topBorder = {
    x: 14.5,
    y: 29.5,
    width: 30,
    height: 0.2
  };
  bottomBorder = {
    x: 14.5,
    y: -0.5,
    width: 30,
    height: 0.2
  };
  leftBorder = {
    x: -0.5,
    y: 14.5,
    width: 0.2,
    height: 30
  };
  rightBorder = {
    x: 29.5,
    y: 14.5,
    width: 0.2,
    height: 30
  };

  state = {};
  getActorForCoords(i, j) {
    if (i === 10 && j === 10) {
      return <p>💩</p>;
    }

    return null;
  }

  constructor(props) {
    super(props);

    this.state = {
      width: 256,
      height: 256
    };
  }

  componentDidMount() {
    this.canvas = this.canvasRef.current;
    this.ctx = this.canvas.getContext("2d");
    this.camera = new Camera(14.5, 14.5, -0.5, -0.5, 29.5, 29.5, 15, 256, 256);
    this.canvas.addEventListener('mousedown', e => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this.camera.onMouseDown(x, y);
    });
    this.canvas.addEventListener('mousemove', e => {
      const rect = this.canvas.getBoundingClientRect();
      this.camera.onMouseMove(e.clientX - rect.left, e.clientY - rect.top);
    });
    this.canvas.addEventListener('mouseup', e => {
      const rect = this.canvas.getBoundingClientRect();
      this.camera.onMouseUp(e.clientX - rect.left, e.clientY - rect.top);
    });
    this.canvas.addEventListener('mouseout', e => {
      const rect = this.canvas.getBoundingClientRect();
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

    setInterval(() => this.frame(), 1000 / 60);
  }

  updateGame() {

  }

  drawGame() {
    this.ctx.clearRect(0, 0, this.state.width, this.state.height);
    this.drawGameObject(this.square);
    this.drawGameObject(this.square2);
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

  frame() {
    this.updateGame();
    this.drawGame();
  }

  render() {
    return (
      <canvas
        ref={this.canvasRef}
        tabIndex={0}
        width={this.state.width}
        height={this.state.height}
        style={{ border: '1px solid black '}}
      >

      </canvas>
    );
  }
}

export default ScrollableBoard;
