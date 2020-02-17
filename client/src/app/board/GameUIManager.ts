import UIEmitter from '../../utils/UIEmitter';
import { WorldCoords } from '../../utils/Coordinates';
import { Planet } from '../../@types/global/global';
import GameManager from '../../api/GameManager';
import { PlanetType } from '../../@types/global/enums';

class GameUIManager {
  static instance: GameUIManager;

  readonly radiusMap = {};

  selectedPlanet: Planet | null = null;
  selectedCoords: WorldCoords | null = null;
  mouseDownOverPlanet: Planet | null = null;
  mouseDownOverCoords: WorldCoords | null = null;
  mouseHoveringOverPlanet: Planet | null = null;
  mouseHoveringOverCoords: WorldCoords | null = null;

  private constructor() {
    this.radiusMap[PlanetType.LittleAsteroid] = 1;
    this.radiusMap[PlanetType.BigAsteroid] = 1.5;
    this.radiusMap[PlanetType.BrownDwarf] = 5;
    this.radiusMap[PlanetType.RedDwarf] = 8;
    this.radiusMap[PlanetType.WhiteDwarf] = 12;
    this.radiusMap[PlanetType.YellowStar] = 20;
    this.radiusMap[PlanetType.BlueStar] = 30;
    this.radiusMap[PlanetType.SubGiant] = 40;
    this.radiusMap[PlanetType.Giant] = 50;
    this.radiusMap[PlanetType.SuperGiant] = 75;
    this.radiusMap[PlanetType.HyperGiant] = 100;
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
    // if the mouse is inside hitbox of a planet, snaps the mouse to center of planet
    this.mouseHoveringOverCoords = coords;
    this.mouseHoveringOverPlanet = null;

    const res = this.planetHitboxForCoords(coords);
    if (res) {
      this.mouseHoveringOverPlanet = res[0];
      this.mouseHoveringOverCoords = res[1];
    }

    this.mouseHoveringOverCoords = new WorldCoords(
      Math.round(this.mouseHoveringOverCoords.x),
      Math.round(this.mouseHoveringOverCoords.y)
    );
  }

  isOverOwnPlanet(coords: WorldCoords): boolean {
    const gameManager = GameManager.getInstance();

    const res = this.planetHitboxForCoords(coords);
    let planet: Planet | null = null;
    if (res) {
      planet = res[0];
    }

    return planet && planet.owner === gameManager.account;
  }

  private planetHitboxForCoords(
    coords: WorldCoords
  ): [Planet, WorldCoords] | null {
    const gameManager = GameManager.getInstance();

    const maxRadius = this.radiusMap[PlanetType.HyperGiant];
    let planetInHitbox: Planet | null = null;
    let smallestPlanetRadius: number = maxRadius + 1;
    let planetCoords: WorldCoords | null = null;

    for (let dx = -1 * maxRadius; dx < maxRadius + 1; dx += 1) {
      for (let dy = -1 * maxRadius; dy < maxRadius + 1; dy += 1) {
        const x = Math.round(coords.x) + dx;
        const y = Math.round(coords.y) + dy;
        const planet = gameManager.getPlanetIfExists(new WorldCoords(x, y));
        if (
          planet &&
          this.radiusMap[planet.planetType] >
            Math.max(Math.abs(x - coords.x), Math.abs(y - coords.y))
        ) {
          // coords is in hitbox
          if (this.radiusMap[planet.planetType] < smallestPlanetRadius) {
            // we want the smallest planet that we're in the hitbox of
            planetInHitbox = planet;
            smallestPlanetRadius = this.radiusMap[planet.planetType];
            planetCoords = new WorldCoords(x, y);
          }
        }
      }
    }

    if (planetCoords && planetInHitbox) {
      return [planetInHitbox, planetCoords];
    }
    return null;
  }
}

export default GameUIManager;
