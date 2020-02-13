import { WorldCoords } from '../../@types/darkforest/app/board/Camera';
import Viewport from './Viewport';

class GameUIManager {
  static instance: GameUIManager;

  readonly radius = 1.5;
  readonly sideLength = 2.5;
  squareCenter: WorldCoords;
  squareSelected = false;
  circleCenter: WorldCoords;
  circleSelected = false;

  private constructor() {
    this.squareCenter = { x: 10, y: 20 };
    this.circleCenter = { x: -5, y: 12 };
  }

  static getInstance(): GameUIManager {
    if (!GameUIManager.instance) {
      throw new Error(
        'Attempted to get GameUIManager object before initialized'
      );
    }

    return GameUIManager.instance;
  }

  static initialize(viewport: Viewport) {
    const gameUIManager = new GameUIManager();

    return gameUIManager;
  }
}

export default GameUIManager;
