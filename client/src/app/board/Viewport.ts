import UIEmitter from '../../utils/UIEmitter';
import GameUIManager from './GameUIManager';
import { WorldCoords, CanvasCoords } from '../../utils/Coordinates';
import GameManager from '../../api/GameManager';
import { CHUNK_SIZE } from '../../utils/constants';

class Viewport {
  // The sole listener for events from Canvas
  // Handles panning and zooming
  // Handles reports of user interaction in canvas coords, transforms these events to world coords and filters when necessary,
  // and sends events up to GameUIManager

  static instance: Viewport;

  centerWorldCoords: WorldCoords;
  widthInWorldUnits: number;
  heightInWorldUnits: number;
  viewportWidth: number;
  viewportHeight: number;
  isPanning = false;
  mouseLastCoords: CanvasCoords;

  uiEmitter: UIEmitter;

  private constructor(
    centerWorldCoords: WorldCoords,
    widthInWorldUnits: number,
    viewportWidth: number,
    viewportHeight: number,
    uiEmitter: UIEmitter
  ) {
    this.uiEmitter = uiEmitter;

    // each of these is measured relative to the world coordinate system
    this.centerWorldCoords = centerWorldCoords;
    this.widthInWorldUnits = widthInWorldUnits;
    this.heightInWorldUnits =
      (widthInWorldUnits * viewportHeight) / viewportWidth;
    // while all of the above are in the world coordinate system, the below are in the page coordinate system
    this.viewportWidth = viewportWidth; // width / height
    this.viewportHeight = viewportHeight;

    this.mouseLastCoords = centerWorldCoords;

    this.isPanning = false;
  }

  static getInstance(): Viewport {
    if (!Viewport.instance) {
      throw new Error('Attempted to get Viewport object before initialized');
    }

    return Viewport.instance;
  }

  static initialize(
    widthInWorldUnits: number,
    viewportWidth: number,
    viewportHeight: number
  ): Viewport {
    const gameManager = GameManager.getInstance();
    const uiEmitter = UIEmitter.getInstance();

    const homeChunk = gameManager.getHomeChunk();
    const initialCenterX = (homeChunk.chunkX + 0.5) * CHUNK_SIZE;
    const initialCenterY = (homeChunk.chunkY + 0.5) * CHUNK_SIZE;

    const viewport = new Viewport(
      new WorldCoords(initialCenterX, initialCenterY),
      widthInWorldUnits,
      viewportWidth,
      viewportHeight,
      uiEmitter
    );

    uiEmitter.on('CANVAS_MOUSE_DOWN', viewport.onMouseDown.bind(viewport));
    uiEmitter.on('CANVAS_MOUSE_MOVE', viewport.onMouseMove.bind(viewport));
    uiEmitter.on('CANVAS_MOUSE_UP', viewport.onMouseUp.bind(viewport));
    uiEmitter.on('CANVAS_MOUSE_OUT', viewport.onMouseOut.bind(viewport));
    uiEmitter.on('CANVAS_SCROLL', viewport.onScroll.bind(viewport));

    Viewport.instance = viewport;

    return viewport;
  }

  // Event handlers
  onMouseDown(canvasCoords: CanvasCoords) {
    const uiManager = GameUIManager.getInstance();

    const worldCoords = this.canvasToWorldCoords(canvasCoords);
    if (!uiManager.isOverOwnPlanet(worldCoords)) {
      this.isPanning = true;
    }
    this.uiEmitter.emit('WORLD_MOUSE_DOWN', worldCoords);
    this.mouseLastCoords = canvasCoords;
  }

  onMouseMove(canvasCoords: CanvasCoords) {
    if (this.isPanning) {
      // if panning, don't need to emit mouse move event
      const dx = canvasCoords.x - this.mouseLastCoords.x;
      const dy = canvasCoords.y - this.mouseLastCoords.y;
      this.centerWorldCoords.x -= dx * this.scale();
      this.centerWorldCoords.y -= -1 * dy * this.scale();
    } else {
      const worldCoords = this.canvasToWorldCoords(canvasCoords);
      this.uiEmitter.emit('WORLD_MOUSE_MOVE', worldCoords);
    }
    this.mouseLastCoords = canvasCoords;
  }

  onMouseUp(canvasCoords: CanvasCoords) {
    const worldCoords = this.canvasToWorldCoords(canvasCoords);
    this.uiEmitter.emit('WORLD_MOUSE_UP', worldCoords);
    this.isPanning = false;
    this.mouseLastCoords = canvasCoords;
  }

  onMouseOut() {
    this.uiEmitter.emit('WORLD_MOUSE_OUT');
    this.isPanning = false;
    this.mouseLastCoords = null;
  }

  onScroll(deltaY: number) {
    if (this.mouseLastCoords !== null) {
      const mouseWorldCoords = this.canvasToWorldCoords(this.mouseLastCoords);
      const centersDiff = {
        x: this.centerWorldCoords.x - mouseWorldCoords.x,
        y: this.centerWorldCoords.y - mouseWorldCoords.y
      };
      const newCentersDiff = {
        x: centersDiff.x * 1.001 ** deltaY,
        y: centersDiff.y * 1.001 ** deltaY
      };
      const newCenter = {
        x: mouseWorldCoords.x + newCentersDiff.x,
        y: mouseWorldCoords.y + newCentersDiff.y
      };
      this.centerWorldCoords.x = newCenter.x;
      this.centerWorldCoords.y = newCenter.y;

      const newWidth = this.widthInWorldUnits * 1.001 ** deltaY;
      this.setWorldWidth(newWidth);
    }
  }

  // Camera utility functions
  scale(): number {
    return this.widthInWorldUnits / this.viewportWidth;
  }

  canvasToWorldCoords(canvasCoords: CanvasCoords): WorldCoords {
    const worldX = this.canvasToWorldX(canvasCoords.x);
    const worldY = this.canvasToWorldY(canvasCoords.y);
    return new WorldCoords(worldX, worldY);
  }

  worldToCanvasCoords(worldCoords: WorldCoords): CanvasCoords {
    const canvasX = this.worldToCanvasX(worldCoords.x);
    const canvasY = this.worldToCanvasY(worldCoords.y);
    return new CanvasCoords(canvasX, canvasY);
  }

  worldToCanvasDist(d: number): number {
    return d / this.scale();
  }

  canvasToWorldDist(d: number): number {
    return d * this.scale();
  }

  worldToCanvasX(x: number): number {
    return (
      (x - this.centerWorldCoords.x) / this.scale() + this.viewportWidth / 2
    );
  }

  canvasToWorldX(x: number): number {
    return (
      (x - this.viewportWidth / 2) * this.scale() + this.centerWorldCoords.x
    );
  }

  worldToCanvasY(y: number): number {
    return (
      (-1 * (y - this.centerWorldCoords.y)) / this.scale() +
      this.viewportHeight / 2
    );
  }

  canvasToWorldY(y: number): number {
    return (
      -1 * (y - this.viewportHeight / 2) * this.scale() +
      this.centerWorldCoords.y
    );
  }

  isInOrAroundViewport(coords: WorldCoords): boolean {
    if (
      Math.abs(coords.x - this.centerWorldCoords.x) >
      0.6 * this.widthInWorldUnits
    ) {
      return false;
    }
    if (
      Math.abs(coords.y - this.centerWorldCoords.y) >
      0.6 * this.heightInWorldUnits
    ) {
      return false;
    }
    return true;
  }

  private setWorldWidth(width: number): void {
    // world scale width
    this.widthInWorldUnits = width;
    this.heightInWorldUnits =
      (width * this.viewportHeight) / this.viewportWidth;
  }
}

export default Viewport;
