export class WorldCoords {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  public equals(obj: WorldCoords): boolean {
    return this.x === obj.x && this.y === obj.y;
  }
}

export class CanvasCoords {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  public equals(obj: CanvasCoords): boolean {
    return this.x === obj.x && this.y === obj.y;
  }
}
