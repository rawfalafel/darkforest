import React, { useState, useEffect, useRef } from 'react';

import { FirebaseProvider } from '../integrations/firebase';
import LandingPage from './LandingPage';
import LoadingPage from './LoadingPage';
import GameManager from '../api/GameManager';
import GameScene from './GameScene';

const App = () => {
  const [loading, setLoading] = useState(true);
  const [joinedGame, setJoinedGame] = useState(false);
  const [findingFirstPlanet, setFindingFirstPlanet] = useState(false);
  const gameManagerRef = useRef(null);

  // Start app
  useEffect(() => {
    (async (): Promise<void> => {
      const newGameManager = await GameManager.initialize();
      window.gameManager = newGameManager;
      gameManagerRef.current = newGameManager;
      setLoading(false);
      setJoinedGame(newGameManager.hasJoinedGame());
    })();
  }, []);

  const initialize = () => {
    setFindingFirstPlanet(true);
    gameManagerRef.current
      .joinGame()
      .once('initializedPlayer', () => {
        setJoinedGame(true);
        setFindingFirstPlanet(false);
      })
      .once('initializedPlayerError', () => {
        setFindingFirstPlanet(false);
      });
  };

  if (loading || findingFirstPlanet) {
    return <LoadingPage />;
  }

  if (joinedGame) {
    return <GameScene />;
  } else {
    return <LandingPage onInitialize={initialize} />;
  }
};

const _App = () => {
  return (
    <div className="h-full w-full font-mono text-white bg-black">
      <FirebaseProvider>
        <App />
      </FirebaseProvider>
    </div>
  );
};

export default _App;
