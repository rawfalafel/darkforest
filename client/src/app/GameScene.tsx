import React, { useState, useEffect } from 'react';

import Spinner from 'react-spinkit';
import ScrollableBoard from './board/ScrollableBoard';
import GameManager from '../api/GameManager';
import { Coordinates, Planet } from '../@types/global/global';
import Button from '../components/Button';
import { WorldCoords } from '../utils/Coordinates';

interface GameSceneProps {
  gameManager: GameManager; // GameManager object, expect not null
}

interface GameSceneState {
  selected: Coordinates | null; // the currently selected square
  hoveringOver: Coordinates | null; // this is the current coordinate the cursor is over
  mouseDown: Coordinates | null; // if the user is holding, this is where they started
  mouseDownPlanet: Planet | null; // if mouseDown coords is a planet, this is the planet
}

const GameScene = ({ gameManager }: GameSceneProps) => {
  const [_, forceRerender] = useState({});
  const [selected, setSelected] = useState(null);
  const [hoveringOver, setHoveringOver] = useState(null);
  const [mouseDown, setMouseDown] = useState(null);
  const [mouseDownPlanet, setMouseDownPlanet] = useState(null);
  const [exploring, setExploring] = useState(true);

  function rerender(): void {
    forceRerender({});
  }

  useEffect(() => {
    gameManager.on('discoveredNewChunk', rerender).on('planetUpdate', rerender);
  }, []);

  function toggleSelect(coords: Coordinates): void {
    if (selected && selected.x === coords.x && selected.y === coords.y) {
      setSelected(null);
    } else if (
      gameManager.getPlanetIfExists(new WorldCoords(coords.x, coords.y))
    ) {
      setSelected(coords);
      const planet = gameManager.getPlanetIfExists(
        new WorldCoords(coords.x, coords.y)
      );
      console.log(planet);
    }
  }

  function onMouseDownOverCoords(coords: Coordinates): void {
    const mouseDownPlanet: Planet | null = gameManager.getPlanetIfExists(
      new WorldCoords(coords.x, coords.y)
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
        const endPlanet: Planet | null = gameManager.getPlanetIfExists(
          new WorldCoords(coords.x, coords.y)
        );
        if (
          startPlanet &&
          endPlanet &&
          startPlanet.owner === gameManager.account &&
          !startPlanet.destroyed
        ) {
          gameManager.move(
            {
              coords: mouseDown,
              hash: startPlanet.locationId
            },
            {
              coords,
              hash: endPlanet.locationId
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
            if (selected) {
              const planet: Planet | null = gameManager.getPlanetIfExists(
                selected
              ); // returns Planet | null
              if (
                planet &&
                gameManager.planets.hasOwnProperty(planet.locationId)
              ) {
                const ownedPlanet: Planet =
                  gameManager.planets[planet.locationId];
                if (ownedPlanet.owner === gameManager.account) {
                  gameManager.cashOut({
                    coords: selected,
                    hash: ownedPlanet.locationId
                  });
                }
              }
            }
          }}
        >
          Cash out
        </Button>
      </div>
      <ScrollableBoard
        xSize={gameManager.xSize}
        ySize={gameManager.ySize}
        homeChunk={gameManager.getHomeChunk()}
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
    </React.Fragment>
  );
};

export default GameScene;
