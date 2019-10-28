import React, { Component } from "react";
import {isPlanet} from "../utils/Utils";

class Board extends Component {
  constructor(props) {
    super(props);
    this.state = {
      mouseDown: null
    };
  }

  getActorForCoords(x, y, planets) {
    const locAddress = this.props.knownBoard[x][y] ? this.props.knownBoard[x][y].toString() : null;
    if (locAddress && !!planets[locAddress]) {
      if (planets[locAddress].owner.toLowerCase() === this.props.myAddress.toLowerCase()) {
        return <p>🌎</p>;
      }
      return <p>🌖</p>;
    } else if (locAddress && isPlanet(locAddress)) {
      return <p>🌑</p>;
    }
    return null;
  }

  onMouseDown(x, y) {
    this.setState({
      mouseDown: {x, y}
    });
  }

  onMouseUp(x, y) {
    if (!this.state.mouseDown) {
      return;
    }
    if (x === this.state.mouseDown.x && y === this.state.mouseDown.y) {
      this.props.toggleSelect(x, y);
    } else {
      if (this.props.knownBoard[x][y] && isPlanet(this.props.knownBoard[x][y])) {
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
                x, y, hash: this.props.knownBoard[x][y]
              });
            }
          }
        }
      }
    }
    this.setState({
      mouseDown: null
    });
  }

  render() {
    let selectedX;
    let selectedY;
    if (this.state.mouseDown) {
      selectedX = this.state.mouseDown.x;
      selectedY = this.state.mouseDown.y;
    } else if (this.props.selected) {
      selectedX = this.props.selected.x;
      selectedY = this.props.selected.y;
    }
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center"
        }}
      >
        {[...Array(this.props.maxY - 1).keys()].map(i => (
          <div
            key={i}
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center"
            }}
          >
            {[...Array(this.props.maxX).keys()].map(j => (
              <div
                key={j}
                style={{
                  width: "25px",
                  height: "25px",
                  border: (selectedX === j && selectedY === this.props.maxY - 1 - i) ? "1px solid red" : "1px solid black" ,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  backgroundColor: !this.props.knownBoard[j][this.props.maxY - 1 - i]
                    ? "grey"
                    : "black"
                }}
                onMouseUp={() => {this.onMouseUp(j, this.props.maxY - 1 - i)}}
                onMouseDown={() => {this.onMouseDown(j, this.props.maxY - 1 - i)}}
              >
                {this.getActorForCoords(j, this.props.maxY - 1 - i, this.props.planets)}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }
}

export default Board;
