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
    const gameManager = GameManager.getInstance();
    const viewport = Viewport.getInstance();

    const board = gameManager.inMemoryBoard;
    const knownChunks: ChunkCoordinates[] = [];
    let planetLocations: Location[] = [];
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

    planetLocations = planetLocations.filter(loc =>
      viewport.isInOrAroundViewport(new WorldCoords(loc.coords.x, loc.coords.y))
    );
    planetLocations = planetLocations.sort((a, b) => {
      const planetA = gameManager.getPlanetWithLocation(a);
      const planetB = gameManager.getPlanetWithLocation(b);
      return planetB.planetType - planetA.planetType;
    });

    this.drawCleanBoard();
    this.drawKnownChunks(knownChunks);
    this.drawPlanets(planetLocations);
    this.drawSelectedRect();
    this.drawHoveringRect();
    this.drawMousePath();
    this.drawBorders();

    window.requestAnimationFrame(this.frame.bind(this));
  }

  private drawCleanBoard() {
    const viewport = Viewport.getInstance();

    this.ctx.clearRect(0, 0, viewport.viewportWidth, viewport.viewportHeight);
    this.ctx.fillStyle = 'grey';
    this.ctx.fillRect(0, 0, viewport.viewportWidth, viewport.viewportHeight);
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
    const uiManager = GameUIManager.getInstance();

    const planet = gameManager.getPlanetWithLocation(location);
    const population = planet
      ? Math.floor(getCurrentPopulation(planet) / 100)
      : 0;
    const center = new WorldCoords(location.coords.x, location.coords.y);
    const radius = uiManager.radiusMap[planet.planetType];
    let color = bigInt(location.hash, 16)
      .and(0xffffff)
      .toString(16);
    color = '#' + '0'.repeat(6 - color.length) + color;
    if (planet && planet.destroyed) {
      color = '#000000';
    }

    if (planet.owner) {
      if (planet.owner === gameManager.account) {
        this.drawRingWithCenter(center, radius * 1.2, radius * 0.1, 'blue');
      } else {
        this.drawRingWithCenter(center, radius * 1.2, radius * 0.1, 'red');
      }
    }

    this.drawCircleWithCenter(center, radius, color);

    if (population > 0) {
      this.drawText(
        population.toString(),
        15,
        new WorldCoords(
          center.x,
          center.y - 1.1 * radius - (planet.owner ? 0.75 : 0.25)
        ),
        'white'
      );
    }
  }

  private drawHoveringRect() {
    const uiManager = GameUIManager.getInstance();

    if (!uiManager.mouseHoveringOverCoords) {
      return;
    }

    const sideLength = uiManager.mouseHoveringOverPlanet
      ? 2.4 * uiManager.radiusMap[uiManager.mouseHoveringOverPlanet.planetType]
      : 1;
    this.drawRectBorderWithCenter(
      uiManager.mouseHoveringOverCoords,
      sideLength,
      sideLength,
      0.1 * sideLength,
      'white'
    );
  }

  private drawSelectedRect() {
    const uiManager = GameUIManager.getInstance();

    if (!uiManager.selectedPlanet) {
      return;
    }

    const sideLength =
      2.4 * uiManager.radiusMap[uiManager.selectedPlanet.planetType];
    this.drawRectBorderWithCenter(
      uiManager.selectedCoords,
      sideLength,
      sideLength,
      0.1 * sideLength,
      'red'
    );
  }

  private drawMousePath() {
    const viewport = Viewport.getInstance();
    const uiManager = GameUIManager.getInstance();

    if (uiManager.mouseDownOverCoords && uiManager.mouseHoveringOverCoords) {
      if (
        uiManager.isOverOwnPlanet(uiManager.mouseDownOverCoords) &&
        uiManager.mouseHoveringOverCoords !== uiManager.mouseDownOverCoords
      ) {
        this.ctx.beginPath();
        this.ctx.lineWidth = 4;
        this.ctx.strokeStyle = 'white';
        const startCoords: CanvasCoords = viewport.worldToCanvasCoords(
          uiManager.mouseDownOverCoords
        );
        this.ctx.moveTo(startCoords.x, startCoords.y);
        const endCoords: CanvasCoords = viewport.worldToCanvasCoords(
          uiManager.mouseHoveringOverCoords
        );
        this.ctx.lineTo(endCoords.x, endCoords.y);
        this.ctx.stroke();
      }
    }
  }

  private drawBorders() {
    const { xSize, ySize } = GameManager.getInstance();

    this.drawRectWithCenter(new WorldCoords(xSize / 2, 0), xSize, 3);
    this.drawRectWithCenter(new WorldCoords(0, ySize / 2), 3, ySize);
    this.drawRectWithCenter(new WorldCoords(xSize / 2, ySize), xSize, 3);
    this.drawRectWithCenter(new WorldCoords(xSize, ySize / 2), 3, ySize);
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

  private drawRectBorderWithCenter(
    center: WorldCoords,
    width: number,
    height: number,
    strokeWidth: number,
    color: string = 'white'
  ) {
    const viewport = Viewport.getInstance();

    const centerCanvasCoords = viewport.worldToCanvasCoords(center);
    const widthCanvasCoords = viewport.worldToCanvasDist(width);
    const heightCanvasCoords = viewport.worldToCanvasDist(height);
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = viewport.worldToCanvasDist(strokeWidth);
    this.ctx.strokeRect(
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
}

export default CanvasRenderer;
