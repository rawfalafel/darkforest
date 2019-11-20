import * as React from "react"
import * as firebase from "firebase/app";
import "firebase/analytics";
import "firebase/auth";
import "firebase/firestore";

class Landing extends React.Component<any, any> {
  db: any;

  constructor(props) {
    super(props);
    const firebaseConfig = {
      apiKey: "AIzaSyAUrYUN39t8-2fKwEmer2ys7ORQ1_7gu3U",
      authDomain: "darkforest-7f0ab.firebaseapp.com",
      databaseURL: "https://darkforest-7f0ab.firebaseio.com",
      projectId: "darkforest-7f0ab",
      storageBucket: "darkforest-7f0ab.appspot.com",
      messagingSenderId: "998658691897",
      appId: "1:998658691897:web:96cb33612d50382ab84ee8",
      measurementId: "G-V98GLBPCC5"
    };
    try {
      firebase.initializeApp(firebaseConfig);
    } catch (e) {
      // already initialized
    }
    this.db = firebase.firestore();
    this.state = {
      email: '',
      emailSubmitted: false
    };
  }

  async initialize() {
    this.props.onInitialize();
  }

  handleEmailChange(e) {
    this.setState({
      email: e.target.value
    });
  }

  handleEmailSubmit(e) {
    this.setState({
      emailSubmitted: true
    });
    this.db.collection('emails').add({
      email: this.state.email
    });
    e.preventDefault();
  }

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
        <h1>DARK FOREST (v0.0 - WORKSHOP DEMO)</h1>
        <h2>a game built on Ethereum with zkSNARKs</h2>
        {this.state.emailSubmitted ? (
          <div>
            <button onClick={this.initialize.bind(this)}>Initialize me</button>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'row'
              }}
            >
              <p>email:</p>
              <div style={{height: '20px', margin: '5px'}}>
                <input type="text" value={this.state.email} onChange={this.handleEmailChange.bind(this)} />
              </div>
            </div>
            <button onClick={this.handleEmailSubmit.bind(this)}>Start</button>
          </div>
        )}
      </div>
    );
  }
}

export default Landing;
