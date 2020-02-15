import UIEmitter from '../../utils/UIEmitter';
import { WorldCoords } from '../../utils/Coordinates';

class GameUIManager {
  static instance: GameUIManager;

  readonly radius = 1.5;
  readonly sideLength = 2.5;
  squareCenter: WorldCoords;
  squareSelected = false;
  mouseDownOverSquare = false;
  circleCenter: WorldCoords;
  circleSelected = false;
  mouseDownOverCircle = false;

  mouseLastCoords: WorldCoords;

  private constructor() {
    this.squareCenter = new WorldCoords(10, 20);
    this.circleCenter = new WorldCoords(-5, 12);
  }

  static getInstance(): GameUIManager {
    if (!GameUIManager.instance) {
      GameUIManager.initialize();
    }

    return GameUIManager.instance;
  }

  static initialize() {
    const uiEmitter = UIEmitter.getInstance();

    const uiManager = new GameUIManager();

    uiEmitter.on('WORLD_MOUSE_DOWN', uiManager.onMouseDown.bind(uiManager));
    uiEmitter.on('WORLD_MOUSE_MOVE', uiManager.onMouseMove.bind(uiManager));
    uiEmitter.on('WORLD_MOUSE_UP', uiManager.onMouseUp.bind(uiManager));

    GameUIManager.instance = uiManager;

    return uiManager;
  }

  onMouseDown(coords: WorldCoords) {
    this.updateMouseLastCoords(coords);
    if (this.isOverSquare(coords)) {
      this.mouseDownOverSquare = true;
    } else if (this.isOverCircle(coords)) {
      this.mouseDownOverCircle = true;
    }
  }

  onMouseMove(coords: WorldCoords) {
    this.updateMouseLastCoords(coords);
  }

  onMouseUp(coords: WorldCoords) {
    this.updateMouseLastCoords(coords);
    if (this.isOverSquare(coords)) {
      if (this.mouseDownOverSquare) {
        this.squareSelected = !this.squareSelected;
      }
    } else if (this.isOverCircle(coords)) {
      if (this.mouseDownOverCircle) {
        this.circleSelected = !this.circleSelected;
      }
    }

    this.mouseDownOverSquare = false;
    this.mouseDownOverCircle = false;
  }

  updateMouseLastCoords(coords: WorldCoords) {
    this.mouseLastCoords = coords;

    if (this.isOverSquare(coords)) {
      this.mouseLastCoords = this.squareCenter;
    } else if (this.isOverCircle(coords)) {
      this.mouseLastCoords = this.circleCenter;
    }
  }

  isOverGameObject(coords: WorldCoords) {
    return this.isOverSquare(coords) || this.isOverCircle(coords);
  }

  isOverSquare(coords: WorldCoords) {
    return (
      Math.abs(coords.x - this.squareCenter.x) < this.sideLength / 2 &&
      Math.abs(coords.y - this.squareCenter.y) < this.sideLength / 2
    );
  }

  isOverCircle(coords: WorldCoords) {
    return (
      Math.pow(coords.x - this.circleCenter.x, 2) +
        Math.pow(coords.y - this.circleCenter.y, 2) <
      Math.pow(this.radius, 2)
    );
  }
}

export default GameUIManager;
