import {CanvasCoords, WorldCoords} from "../../@types/darkforest/components/board/Camera";
import {Coordinates} from "../../@types/global/global";

class Camera {
  centerWorldCoords: WorldCoords;
  widthInWorldUnits: number;
  heightInWorldUnits: number;
  viewportWidth: number;
  viewportHeight: number;
  isPanning: boolean = false;
  panLastCoords: CanvasCoords | null = null;

  constructor(centerWorldCoords, widthInWorldUnits, viewportWidth, viewportHeight) {
    // each of these is measured relative to the world coordinate system
    this.centerWorldCoords = centerWorldCoords;
    this.widthInWorldUnits = widthInWorldUnits;
    this.heightInWorldUnits = widthInWorldUnits * viewportHeight / viewportWidth;
    // while all of the above are in the world coordinate system, the below are in the page coordinate system
    this.viewportWidth = viewportWidth; // width / height
    this.viewportHeight = viewportHeight;

    this.isPanning = false;
  }

  scale(): number {
    return this.widthInWorldUnits / this.viewportWidth;
  }

  canvasToWorldCoords(canvasCoords: CanvasCoords): WorldCoords {
    const worldX = (canvasCoords.x - this.viewportWidth / 2) * this.scale() + this.centerWorldCoords.x;
    const worldY = -1 * (canvasCoords.y - this.viewportHeight / 2) * this.scale() + this.centerWorldCoords.y;
    return {x: worldX, y: worldY};
  }

  worldToCanvasCoords(worldCoords: WorldCoords): CanvasCoords {
    const canvasX = (worldCoords.x - this.centerWorldCoords.x) / this.scale() + this.viewportWidth / 2;
    const canvasY = -1 * (worldCoords.y - this.centerWorldCoords.y) / this.scale() + this.viewportHeight / 2;
    return {x: canvasX, y: canvasY};
  }

  roundWorldCoords(worldCoords: WorldCoords): Coordinates {
    return {
      x: Math.round(worldCoords.x),
      y: Math.round(worldCoords.y)
    };
  }

  startPan(coords: CanvasCoords): void {
    this.isPanning = true;
    this.panLastCoords = coords;
  }

  onPanCursorMove(coords: CanvasCoords): void {
    if (this.isPanning) {
      if (this.panLastCoords) {
        const dx = coords.x - this.panLastCoords.x;
        const dy = coords.y - this.panLastCoords.y;
        this.centerWorldCoords.x -= dx * this.scale();
        this.centerWorldCoords.y -= -1 * dy * this.scale();
        this.panLastCoords = coords;
      }
    }
  }

  stopPan(): void {
    this.isPanning = false;
    this.panLastCoords = null;
  }

  onWheel(deltaY: number): void {
    let newWidth = this.widthInWorldUnits * (1.001 ** deltaY);
    //clip
    newWidth = Math.max(6, newWidth);
    this.setWorldWidth(newWidth);
  }

  private setWorldWidth(width: number): void { // world scale width
    this.widthInWorldUnits = width;
    this.heightInWorldUnits = width * this.viewportHeight / this.viewportWidth;
  }
}

export default Camera;
