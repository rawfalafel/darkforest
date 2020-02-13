import UIEmitter from '../../utils/UIEmitter';
import {
  CanvasCoords,
  WorldCoords
} from '../../@types/darkforest/app/board/Camera';

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

  private constructor(
    centerWorldCoords: WorldCoords,
    widthInWorldUnits: number,
    viewportWidth: number,
    viewportHeight: number
  ) {
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
    uiEmitter: UIEmitter,
    centerWorldCoords: WorldCoords,
    widthInWorldUnits: number,
    viewportWidth: number,
    viewportHeight: number
  ): Viewport {
    const viewport = new Viewport(
      centerWorldCoords,
      widthInWorldUnits,
      viewportWidth,
      viewportHeight
    );

    uiEmitter.on('CANVAS_MOUSE_DOWN', viewport.onMouseDown.bind(viewport));
    uiEmitter.on('CANVAS_MOUSE_MOVE', viewport.onMouseMove.bind(viewport));
    uiEmitter.on('CANVAS_MOUSE_UP', viewport.onMouseUp.bind(viewport));
    uiEmitter.on('CANVAS_MOUSE_OUT', viewport.onMouseOut.bind(viewport));
    uiEmitter.on('CANVAS_SCROLL', viewport.onScroll.bind(viewport));

    return viewport;
  }

  // Event handlers
  onMouseDown(canvasX: number, canvasY: number) {
    const coords: CanvasCoords = { x: canvasX, y: canvasY };
    this.isPanning = true;
    this.mouseLastCoords = coords;
  }

  onMouseMove(canvasX: number, canvasY: number) {
    const coords: CanvasCoords = { x: canvasX, y: canvasY };
    if (this.isPanning) {
      const dx = coords.x - this.mouseLastCoords.x;
      const dy = coords.y - this.mouseLastCoords.y;
      this.centerWorldCoords.x -= dx * this.scale();
      this.centerWorldCoords.y -= -1 * dy * this.scale();
    }
    this.mouseLastCoords = coords;
  }

  onMouseUp(canvasX: number, canvasY: number) {
    const coords: CanvasCoords = { x: canvasX, y: canvasY };
    this.isPanning = false;
    this.mouseLastCoords = coords;
  }

  onMouseOut() {
    this.isPanning = false;
    this.mouseLastCoords = null;
  }

  onScroll(deltaY: number) {
    if (this.mouseLastCoords !== null) {
      const mouseWorldCoords = this.canvasToWorldCoords(this.mouseLastCoords);
      let centersDiff = {
        x: this.centerWorldCoords.x - mouseWorldCoords.x,
        y: this.centerWorldCoords.y - mouseWorldCoords.y
      };
      let newCentersDiff = {
        x: centersDiff.x * 1.001 ** deltaY,
        y: centersDiff.y * 1.001 ** deltaY
      };
      let newCenter = {
        x: mouseWorldCoords.x + newCentersDiff.x,
        y: mouseWorldCoords.y + newCentersDiff.y
      };
      this.centerWorldCoords.x = newCenter.x;
      this.centerWorldCoords.y = newCenter.y;

      let newWidth = this.widthInWorldUnits * 1.001 ** deltaY;
      this.setWorldWidth(newWidth);
    }
  }

  // Camera utility functions
  scale(): number {
    return this.widthInWorldUnits / this.viewportWidth;
  }

  canvasToWorldCoords(canvasCoords: CanvasCoords): WorldCoords {
    const worldX =
      (canvasCoords.x - this.viewportWidth / 2) * this.scale() +
      this.centerWorldCoords.x;
    const worldY =
      -1 * (canvasCoords.y - this.viewportHeight / 2) * this.scale() +
      this.centerWorldCoords.y;
    return { x: Math.round(worldX), y: Math.round(worldY) };
  }

  worldToCanvasCoords(worldCoords: WorldCoords): CanvasCoords {
    const canvasX =
      (worldCoords.x - this.centerWorldCoords.x) / this.scale() +
      this.viewportWidth / 2;
    const canvasY =
      (-1 * (worldCoords.y - this.centerWorldCoords.y)) / this.scale() +
      this.viewportHeight / 2;
    return { x: canvasX, y: canvasY };
  }

  worldToCanavsDist(d: number): number {
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

  private setWorldWidth(width: number): void {
    // world scale width
    this.widthInWorldUnits = width;
    this.heightInWorldUnits =
      (width * this.viewportHeight) / this.viewportWidth;
  }
}

export default Viewport;
