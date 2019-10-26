import React, { Component } from "react";

class ScrollableBoard extends Component {
  constructor (props) {
    super(props);
  }

  getActorForCoords(i, j) {
    if (i === 10 && j === 10) {
      return <p>💩</p>;
    }
    return null;
  }

  render() {
    return (
      <canvas id={'board'} width={512} height={512}>

      </canvas>
    );
  }
}

export default ScrollableBoard;
