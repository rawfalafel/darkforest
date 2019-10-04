import React, { Component } from 'react';

class Board extends Component {
  render() {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        {[...Array(this.props.p - 1).keys()].map(i => (
          <div
            key={i}
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            {[...Array(this.props.q - 1).keys()].map(j => (
              <div
                key={j}
                style={{
                  width: '30px',
                  height: '30px',
                  border: '1px solid black',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                {(parseInt(window.localStorage.myX) === i) && (parseInt(window.localStorage.myY) === j) ? (
                  <p>💩</p>
                ) : null}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }
}

export default Board;
