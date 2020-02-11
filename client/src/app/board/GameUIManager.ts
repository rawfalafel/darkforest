import { RefObject } from 'react';

class GameUIManager {
  static instance: GameUIManager;

  private constructor() {}

  static getInstance(): GameUIManager {
    if (!GameUIManager.instance) {
      throw new Error(
        'Attempted to get GameUIManager object before initialized'
      );
    }

    return GameUIManager.instance;
  }

  static initialize() {
    const gameUIManager = new GameUIManager();

    return GameUIManager;
  }
}
