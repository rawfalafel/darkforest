import React, { useState, useEffect } from 'react';

import ScrollableBoard from './board/ScrollableBoard';
import GameManager from '../api/GameManager';
import { Coordinates, Planet } from '../@types/global/global';
import {getPlanetTypeForLocationId, isOwnedPlanet} from '../utils/Utils';
import Button from '../components/Button';

interface MainUIProps {
  gameManager: GameManager; // GameManager object, expect not null
}

interface MainUIState {
  selected: Coordinates | null; // the currently selected square
  hoveringOver: Coordinates | null; // this is the current coordinate the cursor is over
  mouseDown: Coordinates | null; // if the user is holding, this is where they started
  mouseDownPlanet: Planet | null; // if mouseDown coords is a planet, this is the planet
}

const MainUI = ({ gameManager }: MainUIProps) => {
  const [_, forceRerender] = useState({});
  const [selected, setSelected] = useState(null);
  const [hoveringOver, setHoveringOver] = useState(null);
  const [mouseDown, setMouseDown] = useState(null);
  const [mouseDownPlanet, setMouseDownPlanet] = useState(null);

  function rerender(): void {
    forceRerender({});
  }

  useEffect(() => {
    gameManager.on('discoveredNewChunk', rerender).on('planetUpdate', rerender);
  }, []);

  function toggleSelect(coords: Coordinates): void {
    if (selected && selected.x === coords.x && selected.y === coords.y) {
      setSelected(null);
    } else if (gameManager.getPlanetIfExists(coords)) {
      setSelected(coords);
      const planet = gameManager.getPlanetIfExists(coords);
      console.log(planet);
    }
  }

  function onMouseDownOverCoords(coords: Coordinates): void {
    const mouseDownPlanet: Planet | null = gameManager.getPlanetIfExists(
      coords
    );
    setMouseDown(coords);
    setMouseDownPlanet(mouseDownPlanet);
  }

  function onMouseMoveOverCoords(coords: Coordinates): void {
    setHoveringOver(coords);
  }

  function onMouseUpOverCoords(coords: Coordinates): void {
    // the user finished a click, or finished a hold-and-drag
    // if clicked, then we a square was selected/deselected
    // if hold and drag, we need to check if the user was initiating a move
    if (mouseDown) {
      if (coords.x === mouseDown.x && coords.y === mouseDown.y) {
        // if the user clicked on a square, select it
        toggleSelect(coords);
      } else {
        // if the user dragged from a planet they owned to another planet, initiate a move
        const startPlanet: Planet | null = mouseDownPlanet;
        const endPlanet: Planet | null = gameManager.getPlanetIfExists(coords);
        if (
          startPlanet &&
          endPlanet &&
          isOwnedPlanet(startPlanet) &&
          startPlanet.owner === gameManager.account
        ) {
          gameManager.move(
            {
              coords: mouseDown,
              hash: startPlanet.locationId,
            },
            {
              coords,
              hash: endPlanet.locationId,
            }
          );
        }
      }
    }
    setMouseDown(null);
    setMouseDownPlanet(null);
  }

  function onMouseOut(): void {
    setHoveringOver(null);
    setMouseDown(null);
    setMouseDownPlanet(null);
  }

  return (
    <div>
      <div className="absolute top-0 left-0">
        <Button
          className="bg-gray-900 border border-white rounded-sm p-2 m-2"
          onClick={() => gameManager.startExplore()}
        >
          Start explore
        </Button>
        <Button
          className="bg-gray-900 border border-white rounded-sm p-2 m-2"
          onClick={() => gameManager.stopExplore()}
        >
          Stop explore
        </Button>
      </div>
      <ScrollableBoard
        xSize={gameManager.xSize}
        ySize={gameManager.ySize}
        homeChunk={gameManager.localStorageManager.getHomeChunk()}
        knownBoard={gameManager.inMemoryBoard}
        planets={gameManager.planets}
        myAddress={gameManager.account}
        selected={selected}
        hoveringOver={hoveringOver}
        mouseDown={mouseDown}
        mouseDownPlanet={mouseDownPlanet}
        onMouseDownOverCoords={onMouseDownOverCoords}
        onMouseMoveOverCoords={onMouseMoveOverCoords}
        onMouseUpOverCoords={onMouseUpOverCoords}
        onMouseOut={onMouseOut}
      />
    </div>
  );
};

export default MainUI;
