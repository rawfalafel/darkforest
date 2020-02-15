import { RefObject } from 'react';
import GameUIManager from './GameUIManager';
import Viewport from './Viewport';
import { CanvasCoords, WorldCoords } from '../../utils/Coordinates';
import GameManager from '../../api/GameManager';
import { Location, ChunkCoordinates } from '../../@types/global/global';
import { CHUNK_SIZE } from '../../utils/constants';
import bigInt from 'big-integer';
import { getCurrentPopulation } from '../../utils/Utils';

class CanvasRenderer {
  static instance: CanvasRenderer;

  canvasRef: RefObject<HTMLCanvasElement>;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  private constructor(canvasRef: RefObject<HTMLCanvasElement>) {
    this.canvasRef = canvasRef;
    this.canvas = this.canvasRef.current;
    this.ctx = this.canvas.getContext('2d');

    this.frame();
  }

  static getInstance(): CanvasRenderer {
    if (!CanvasRenderer.instance) {
      throw new Error(
        'Attempted to get CanvasRenderer object before initialized'
      );
    }

    return CanvasRenderer.instance;
  }

  static initialize(canvasRef: RefObject<HTMLCanvasElement>) {
    const canvasRenderer = new CanvasRenderer(canvasRef);
    CanvasRenderer.instance = canvasRenderer;

    return canvasRenderer;
  }

  private frame() {
    const viewport = Viewport.getInstance();
    const gameManager = GameManager.getInstance();

    this.ctx.clearRect(0, 0, viewport.viewportWidth, viewport.viewportHeight);
    this.ctx.fillStyle = 'grey';
    this.ctx.fillRect(0, 0, viewport.viewportWidth, viewport.viewportHeight);

    const board = gameManager.inMemoryBoard;
    const knownChunks: ChunkCoordinates[] = [];
    const planetLocations: Location[] = [];
    for (let chunkX = 0; chunkX < board.length; chunkX += 1) {
      for (let chunkY = 0; chunkY < board[chunkX].length; chunkY += 1) {
        const exploredChunk = board[chunkX][chunkY];
        if (exploredChunk) {
          knownChunks.push(exploredChunk.id);
          for (const planetLocation of exploredChunk.planetLocations) {
            planetLocations.push(planetLocation);
          }
        }
      }
    }

    this.drawKnownChunks(knownChunks);
    this.drawPlanets(planetLocations);

    window.requestAnimationFrame(this.frame.bind(this));
  }

  private drawKnownChunks(knownChunks: ChunkCoordinates[]) {
    for (const chunk of knownChunks) {
      const center = new WorldCoords(
        (chunk.chunkX + 0.5) * CHUNK_SIZE,
        (chunk.chunkY + 0.5) * CHUNK_SIZE
      );
      this.drawRectWithCenter(center, CHUNK_SIZE, CHUNK_SIZE, 'black');
    }
  }

  private drawPlanets(planetLocations: Location[]) {
    for (const location of planetLocations) {
      this.drawPlanetAtLocation(location);
    }
  }

  private drawPlanetAtLocation(location: Location) {
    const gameManager = GameManager.getInstance();

    const planet = gameManager.getPlanetWithId(location.hash);
    const ownedPlanet = gameManager.planetToOwnedPlanet(planet);
    const population = ownedPlanet
      ? Math.floor(getCurrentPopulation(ownedPlanet) / 100)
      : 0;
    const center = new WorldCoords(location.coords.x, location.coords.y);
    const radius = 2;
    let color = bigInt(location.hash, 16)
      .and(0xffffff)
      .toString(16);
    color = '#' + '0'.repeat(6 - color.length) + color;
    if (ownedPlanet && ownedPlanet.destroyed) {
      color = '#000000';
    }

    if (ownedPlanet) {
      if (ownedPlanet.owner === gameManager.account) {
        this.drawRingWithCenter(center, radius * 1.2, radius * 0.1, 'blue');
      } else {
        this.drawRingWithCenter(center, radius * 1.2, radius * 0.1, 'red');
      }
    }

    this.drawCircleWithCenter(center, radius, color);

    this.drawText(
      ownedPlanet ? population.toString() : '0',
      15,
      new WorldCoords(center.x, center.y - (ownedPlanet ? 3 : 2.5)),
      'white'
    );
  }

  private drawRectWithCenter(
    center: WorldCoords,
    width: number,
    height: number,
    color: string = 'white'
  ) {
    const viewport = Viewport.getInstance();

    const centerCanvasCoords = viewport.worldToCanvasCoords(center);
    const widthCanvasCoords = viewport.worldToCanvasDist(width);
    const heightCanvasCoords = viewport.worldToCanvasDist(height);
    this.ctx.fillStyle = color;
    this.ctx.fillRect(
      centerCanvasCoords.x - widthCanvasCoords / 2,
      centerCanvasCoords.y - heightCanvasCoords / 2,
      widthCanvasCoords,
      heightCanvasCoords
    );
  }

  private drawCircleWithCenter(
    center: WorldCoords,
    radius: number,
    color: string = 'white'
  ) {
    const viewport = Viewport.getInstance();

    const centerCanvasCoords = viewport.worldToCanvasCoords(center);
    const radiusCanvasCoords = viewport.worldToCanvasDist(radius);
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(
      centerCanvasCoords.x,
      centerCanvasCoords.y,
      radiusCanvasCoords,
      0,
      2 * Math.PI,
      false
    );
    this.ctx.fill();
  }

  private drawRingWithCenter(
    center: WorldCoords,
    radius: number,
    width: number,
    color: string = 'white'
  ) {
    const viewport = Viewport.getInstance();

    const centerCanvasCoords = viewport.worldToCanvasCoords(center);
    const radiusCanvasCoords = viewport.worldToCanvasDist(radius);
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = viewport.worldToCanvasDist(width);
    this.ctx.beginPath();
    this.ctx.arc(
      centerCanvasCoords.x,
      centerCanvasCoords.y,
      radiusCanvasCoords,
      0,
      2 * Math.PI,
      false
    );
    this.ctx.stroke();
  }

  private drawText(
    text: string,
    fontSize: number,
    center: WorldCoords,
    color: string = 'white'
  ) {
    const viewport = Viewport.getInstance();

    const centerCanvasCoords = viewport.worldToCanvasCoords(center);

    this.ctx.font = `${fontSize}px sans-serif`;
    this.ctx.textBaseline = 'top';
    this.ctx.textAlign = 'center';
    this.ctx.fillStyle = color;
    this.ctx.fillText(text, centerCanvasCoords.x, centerCanvasCoords.y);
  }

  private drawCursorPath() {
    const viewport = Viewport.getInstance();
    const uiManager = GameUIManager.getInstance();

    if (uiManager.mouseLastCoords) {
      if (
        uiManager.mouseDownOverCircle &&
        uiManager.mouseLastCoords !== uiManager.circleCenter
      ) {
        this.ctx.beginPath();
        this.ctx.lineWidth = 4;
        this.ctx.strokeStyle = 'white';
        const startCoords: CanvasCoords = viewport.worldToCanvasCoords(
          uiManager.circleCenter
        );
        this.ctx.moveTo(startCoords.x, startCoords.y);
        const endCoords: CanvasCoords = viewport.worldToCanvasCoords(
          uiManager.mouseLastCoords
        );
        this.ctx.lineTo(endCoords.x, endCoords.y);
        this.ctx.stroke();
      } else if (
        uiManager.mouseDownOverSquare &&
        uiManager.mouseLastCoords !== uiManager.squareCenter
      ) {
        this.ctx.beginPath();
        this.ctx.lineWidth = 4;
        this.ctx.strokeStyle = 'white';
        const startCoords: CanvasCoords = viewport.worldToCanvasCoords(
          uiManager.squareCenter
        );
        this.ctx.moveTo(startCoords.x, startCoords.y);
        const endCoords: CanvasCoords = viewport.worldToCanvasCoords(
          uiManager.mouseLastCoords
        );
        this.ctx.lineTo(endCoords.x, endCoords.y);
        this.ctx.stroke();
      }
    }
  }
}

export default CanvasRenderer;
