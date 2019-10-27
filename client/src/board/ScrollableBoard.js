import React, { Component } from "react";

class ScrollableBoard extends Component {
  canvasRef = React.createRef();
  ctx;

  square = {
    x: 0,
    y: 0
  };

  state = {}
  getActorForCoords(i, j) {
    if (i === 10 && j === 10) {
      return <p>💩</p>;
    }

    return null;
  }

  componentDidMount() {
    this.ctx = this.canvasRef.current.getContext("2d");

    setInterval(() => this.frame(), 1000 / 60);

    this.setState({
      width: 512,
      height: 512
    })
  }

  updateGame() {
    this.square.x += 1;
    this.square.y += 1;
  }

  drawGame() {
    this.ctx.clearRect(0, 0, this.state.width, this.state.height);
    this.ctx.fillRect(this.square.x, this.square.y, 10 , 10);
  }

  frame() {
    this.updateGame();
    this.drawGame();
  }

  render() {
    return (
      <canvas ref={this.canvasRef} id={'board'} width={this.state.width} height={this.state.height}>

      </canvas>
    );
  }
}

export default ScrollableBoard;
