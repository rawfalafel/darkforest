import React, { Component } from "react";

class Loading extends Component {
  render() {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0f0f0f'
        }}
      >
        <p>Loading... (this may take a few seconds)</p>
      </div>
    );
  }
}

export default Loading;
