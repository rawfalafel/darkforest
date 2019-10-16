import React, { Component } from "react";

class Board extends Component {
  getActorForCoords(i, j, locPlayerMap) {
    if (
      parseInt(this.props.myLocation.x) === j &&
      parseInt(this.props.myLocation.y) === i
    ) {
      return <p>💩</p>;
    }
    const locAddress = this.props.knownBoard[j][i] ? this.props.knownBoard[j][i].toString() : null;
    if (locPlayerMap[locAddress]) {
      return <p>👻</p>;
    }
    return null;
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
        {[...Array(this.props.maxY).keys()].map(i => (
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
                  border: "1px solid black",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  backgroundColor: !this.props.knownBoard[j][i]
                    ? "grey"
                    : "white"
                }}
              >
                {this.getActorForCoords(i, j, this.props.locPlayerMap)}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }
}

export default Board;
