import React, { useState } from 'react';

import Spinner from 'react-spinkit';
import GameManager from '../api/GameManager';
import Button from '../components/Button';
import ControllableCanvas from './board/ControllableCanvas';
import GameUIManager from './board/GameUIManager';

import TabbedWindow from './windows/TabbedWindow';
import CoordsWindow from './windows/CoordsWindow';

interface SceneProps {}
interface SceneState {
  exploring: boolean;
  showLeaderboard: boolean;
}

class GameScene extends React.Component<SceneProps, SceneState> {
  state = {
    exploring: true,
    showLeaderboard: false,
  };

  render() {
    const gameManager = GameManager.getInstance();
    const uiManager = GameUIManager.getInstance();
    return (
      <React.Fragment>
        <div
          className={
            'absolute top-0 left-0 w-full h-full ' +
            (this.state.showLeaderboard ? 'block' : 'hidden')
          }
          style={{
            background: 'rgba(0, 0, 0, 0.6)',
            zIndex: 999,
          }}
        >
          <div
            className="bg-gray-900 border border-white rounded-sem p-2"
            style={{
              margin: '0 auto',
              marginTop: '2em',
              width: '600px',
            }}
          >
            <p
              onClick={() => {
                this.setState({ showLeaderboard: false });
              }}
            >
              <u>Close Leaderboard</u>
            </p>
            <h3>Leaderboard</h3>
            <div className="flex flex-col">
              {gameManager.getAssetsOfPlayers().map(playerIdAndAssets => {
                return (
                  <div className="flex flex-row justify-between">
                    <p>{playerIdAndAssets[0]}</p>
                    <p className="align-right">
                      {Math.round(playerIdAndAssets[1] / 100)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="absolute top-0 left-0 flex flex-col">
          <div className="flex flex-row items-center">
            <Button
              className="bg-gray-900 border border-white rounded-sm p-2 m-2"
              onClick={() => {
                this.state.exploring
                  ? gameManager.stopExplore()
                  : gameManager.startExplore();
                this.setState({ exploring: !this.state.exploring });
              }}
            >
              {this.state.exploring ? 'Stop' : 'Start'} exploring
            </Button>
            {this.state.exploring && (
              <div className="ml-6 mt-2">
                <Spinner name="ball-clip-rotate-multiple" fadeIn="none" />
              </div>
            )}
          </div>

          <div className="flex flex-row items-center">
            <Button
              className="bg-gray-900 border border-white rounded-sm p-2 mx-2 my-0"
              onClick={() => {
                this.setState({ showLeaderboard: true });
              }}
            >
              Leaderboard
            </Button>
          </div>

          <div className="flex flex-row items-center">
            <Button
              className="bg-gray-900 border border-white rounded-sm p-2 m-2"
              onClick={() => {
                window.alert(
                  'This feature will be available in a future mainnet release!'
                );
                /*
                const selectedPlanet = uiManager.selectedPlanet;
                if (
                  selectedPlanet &&
                  selectedPlanet.owner === gameManager.account
                ) {
                gameManager.cashOut({
                  coords: uiManager.selectedCoords,
                  hash: selectedPlanet.locationId
                });
                }*/
              }}
            >
              Cash out
            </Button>
          </div>
        </div>

        <div className="absolute top-0 right-0">
          <Button
            className="bg-gray-900 border border-white rounded-sm p-2 m-2"
            onClick={() => {
              window.location.href = 'https://briangu33.github.io/darkforest/';
            }}
          >
            Tutorial
          </Button>
        </div>

        <div className="absolute bottom-0 left-0">
          <CoordsWindow />
        </div>

        {/* Wrapper */}
        <TabbedWindow />

        <ControllableCanvas />
      </React.Fragment>
    );
  }
}

export default GameScene;
