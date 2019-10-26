import React, { Component } from "react";

class Board extends Component {
  getActorForCoords(i, j, planets) {
    const locAddress = this.props.knownBoard[j][i] ? this.props.knownBoard[j][i].toString() : null;
    if (locAddress && !!planets[locAddress]) {
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
                {this.getActorForCoords(i, j, this.props.planets)}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }
}

export default Board;
