import Web3 from 'web3';
import React, { Component } from 'react';

const ethereum = window.ethereum;

class Landing extends Component {
  constructor(props) {
    super(props);
    console.log('constructing landing');
  }

  async componentDidMount () {
    const web3 = new Web3(ethereum);
    if (typeof web3 === 'undefined') {
      console.log('no provider :(');
      return;
    }
    console.log('found provider');
    try {
      // Request account access if needed
      await ethereum.enable();
    } catch (error) {
      console.log('access not given :(')
    }
    const accounts = await web3.eth.getAccounts();
    console.log(accounts);
  }

  render () {
    return (
      <div>

      </div>
    );
  }
}

export default Landing;
