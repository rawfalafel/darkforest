import UIEmitter from '../../utils/UIEmitter';
import { WorldCoords } from '../../utils/Coordinates';
import { Planet } from '../../@types/global/global';
import GameManager from '../../api/GameManager';

class GameUIManager {
  static instance: GameUIManager;

  readonly radius = 2;

  selectedPlanet: Planet | null = null;
  selectedCoords: WorldCoords | null = null;
  mouseDownOverPlanet: Planet | null = null;
  mouseDownOverCoords: WorldCoords | null = null;
  mouseHoveringOverPlanet: Planet | null = null;
  mouseHoveringOverCoords: WorldCoords | null = null;

  private constructor() {}

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
    uiEmitter.on('WORLD_MOUSE_OUT', uiManager.onMouseOut.bind(uiManager));

    GameUIManager.instance = uiManager;

    return uiManager;
  }

  onMouseDown(coords: WorldCoords) {
    const gameManager = GameManager.getInstance();

    this.updateMouseHoveringOverCoords(coords);

    this.mouseDownOverPlanet = gameManager.getPlanetIfExists(
      this.mouseHoveringOverCoords
    );
    this.mouseDownOverCoords = this.mouseHoveringOverCoords;
  }

  onMouseMove(coords: WorldCoords) {
    this.updateMouseHoveringOverCoords(coords);
  }

  onMouseUp(coords: WorldCoords) {
    const gameManager = GameManager.getInstance();

    this.updateMouseHoveringOverCoords(coords);

    const mouseUpOverCoords = this.mouseHoveringOverCoords;
    const mouseUpOverPlanet = gameManager.getPlanetIfExists(mouseUpOverCoords);
    if (mouseUpOverPlanet) {
      if (
        mouseUpOverPlanet.locationId === this.mouseDownOverPlanet.locationId
      ) {
        // toggle select
        if (
          this.selectedPlanet &&
          this.selectedPlanet.locationId === mouseUpOverPlanet.locationId
        ) {
          this.selectedPlanet = null;
          this.selectedCoords = null;
        } else {
          this.selectedPlanet = mouseUpOverPlanet;
          this.selectedCoords = mouseUpOverCoords;
        }
      } else if (this.mouseDownOverPlanet.owner === gameManager.account) {
        // move initiated
        gameManager.move(
          {
            coords: this.mouseDownOverCoords,
            hash: this.mouseDownOverPlanet.locationId
          },
          {
            coords: mouseUpOverCoords,
            hash: mouseUpOverPlanet.locationId
          }
        );
      }
    }

    this.mouseDownOverPlanet = null;
    this.mouseDownOverCoords = null;
  }

  onMouseOut() {
    this.mouseDownOverPlanet = null;
    this.mouseDownOverCoords = null;
    this.mouseHoveringOverPlanet = null;
    this.mouseHoveringOverCoords = null;
  }

  updateMouseHoveringOverCoords(coords: WorldCoords) {
    const gameManager = GameManager.getInstance();

    this.mouseHoveringOverCoords = coords;
    this.mouseHoveringOverPlanet = null;

    for (let dx = -1 * this.radius; dx < this.radius + 1; dx += 1) {
      for (let dy = -1 * this.radius; dy < this.radius + 1; dy += 1) {
        const x = Math.round(coords.x) + dx;
        const y = Math.round(coords.y) + dy;
        const planet = gameManager.getPlanetIfExists(new WorldCoords(x, y));
        if (planet) {
          this.mouseHoveringOverCoords = new WorldCoords(x, y);
          this.mouseHoveringOverPlanet = planet;
          return;
        }
      }
    }
  }

  isOverOwnPlanet(coords: WorldCoords): boolean {
    const gameManager = GameManager.getInstance();

    let planetInHitbox: Planet | null = null;
    for (let dx = -1 * this.radius; dx < this.radius + 1; dx += 1) {
      for (let dy = -1 * this.radius; dy < this.radius + 1; dy += 1) {
        const x = Math.round(coords.x) + dx;
        const y = Math.round(coords.y) + dy;
        const planet = gameManager.getPlanetIfExists(new WorldCoords(x, y));
        if (planet) {
          planetInHitbox = planet;
          break;
        }
      }
    }

    return planetInHitbox && planetInHitbox.owner === gameManager.account;
  }
}

export default GameUIManager;
