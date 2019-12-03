import React, { useState, useEffect } from 'react';

import Landing from './scenes/Landing';
import Loading from './scenes/Loading';
import GameManager from '../api/GameManager';
import MainUI from './scenes/MainUI';

const App: React.FC<{}> = () => {
  const [loading, setLoading] = useState(true);
  const [joinedGame, setJoinedGame] = useState(false);
  const [findingFirstPlanet, setFindingFirstPlanet] = useState(false);
  const [gameManager, setGameManager] = useState<GameManager | null>(null);

  // Start app
  useEffect(() => {
    (async (): Promise<void> => {
      const newGameManager = await GameManager.initialize();
      setGameManager(newGameManager);
      setLoading(false);
      setJoinedGame(newGameManager.hasJoinedGame());
    })();
  }, []);

  const initialize = (): void => {
    setFindingFirstPlanet(true);
    gameManager
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
    return <Loading />;
  }

  if (joinedGame) {
    return <MainUI />;
  } else {
    return <Landing onInitialize={initialize} />;
  }
};

const _App: React.FC<{}> = () => {
  return (
    <div className="h-full w-full font-mono text-white">
      <App />
    </div>
  );
};

export default _App;
