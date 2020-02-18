import React, { useState } from 'react';

import Spinner from 'react-spinkit';
import GameManager from '../api/GameManager';
import Button from '../components/Button';
import ControllableCanvas from './board/ControllableCanvas';
import GameUIManager from './board/GameUIManager';

import TabbedWindow from './windows/TabbedWindow';
import CoordsWindow from './windows/CoordsWindow';

const GameScene = () => {
  const [exploring, setExploring] = useState(true);
  const gameManager = GameManager.getInstance();
  const uiManager = GameUIManager.getInstance();

  return (
    <React.Fragment>
      <div className="absolute top-0 left-0 flex flex-row items-center">
        <Button
          className="bg-gray-900 border border-white rounded-sm p-2 m-2"
          onClick={() => {
            exploring ? gameManager.stopExplore() : gameManager.startExplore();
            setExploring(!exploring);
          }}
        >
          {exploring ? 'Stop' : 'Start'} exploring
        </Button>
        {exploring && (
          <div className="ml-6 mt-2">
            <Spinner name="ball-clip-rotate-multiple" fadeIn="none" />
          </div>
        )}
      </div>
      <div className="absolute top-0 right-0 flex flex-row items-center">
        <Button
          className="bg-gray-900 border border-white rounded-sm p-2 m-2"
          onClick={() => {
            const selectedPlanet = uiManager.selectedPlanet;
            if (
              selectedPlanet &&
              selectedPlanet.owner === gameManager.account
            ) {
              gameManager.cashOut({
                coords: uiManager.selectedCoords,
                hash: selectedPlanet.locationId
              });
            }
          }}
        >
          Cash out
        </Button>
      </div>

      <div className="absolute bottom-0 left-0">
        <CoordsWindow />
      </div>

      <div className="absolute bottom-0 right-0">
        {/* Wrapper */}
        <TabbedWindow />
      </div>
      <ControllableCanvas />
    </React.Fragment>
  );
};

export default GameScene;
