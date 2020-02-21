import { RefObject } from 'react';
import GameUIManager from './GameUIManager';
import Viewport from './Viewport';
import { CanvasCoords, WorldCoords } from '../../utils/Coordinates';
import GameManager from '../../api/GameManager';
import {
  Location,
  ChunkCoordinates,
  QueuedArrival
} from '../../@types/global/global';
import { CHUNK_SIZE } from '../../utils/constants';
import bigInt from 'big-integer';
import { getCurrentPopulation, hasOwner, getPlanetColors } from '../../utils/Utils';

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
    const arrivals = gameManager.arrivalsMap[planet.locationId] || [];
    for (const { arrivalData } of arrivals) {
      this.drawArrival(arrivalData);
    }
    const population = planet
      ? Math.floor(getCurrentPopulation(planet) / 100)
      : 0;
    const center = new WorldCoords(location.coords.x, location.coords.y);
    const radius = uiManager.radiusMap[planet.planetType];

    let colors = getPlanetColors(planet);
    let color = colors.previewColor;

    if (hasOwner(planet)) {
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

  private drawArrival(arrival: QueuedArrival) {
    const gameManager = GameManager.getInstance();

    const fromLoc = gameManager.planetLocationMap[arrival.oldLoc];
    const fromPlanet = gameManager.planets[arrival.oldLoc];
    const toLoc = gameManager.planetLocationMap[arrival.newLoc];
    if (
      !fromPlanet ||
      !fromLoc ||
      !toLoc ||
      Date.now() / 1000 > arrival.arrivalTime
    ) {
      return;
    }
    const myMove = fromPlanet.owner === gameManager.account;

    this.drawLine(fromLoc.coords, toLoc.coords, 0.5, myMove ? 'blue' : 'red');

    let proportion =
      (Date.now() / 1000 - arrival.departureTime) /
      (arrival.arrivalTime - arrival.departureTime);
    proportion = Math.max(proportion, 0.01);
    proportion = Math.min(proportion, 0.99);

    const shipsLocationX =
      (1 - proportion) * fromLoc.coords.x + proportion * toLoc.coords.x;
    const shipsLocationY =
      (1 - proportion) * fromLoc.coords.y + proportion * toLoc.coords.y;
    const shipsLocation = new WorldCoords(shipsLocationX, shipsLocationY);

    this.drawCircleWithCenter(shipsLocation, 1, myMove ? 'blue' : 'red');
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
    const uiManager = GameUIManager.getInstance();

    if (uiManager.mouseDownOverCoords && uiManager.mouseHoveringOverCoords) {
      if (
        uiManager.isOverOwnPlanet(uiManager.mouseDownOverCoords) &&
        uiManager.mouseHoveringOverCoords !== uiManager.mouseDownOverCoords
      ) {
        this.drawLine(
          uiManager.mouseDownOverCoords,
          uiManager.mouseHoveringOverCoords,
          1
        );
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
    color = 'white'
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
    color = 'white'
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
    color = 'white'
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
    color = 'white'
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

  private drawLine(
    startCoords: WorldCoords,
    endCoords: WorldCoords,
    lineWidth: number,
    color: string = 'white'
  ) {
    const viewport = Viewport.getInstance();

    this.ctx.beginPath();
    this.ctx.lineWidth = viewport.worldToCanvasDist(lineWidth);
    this.ctx.strokeStyle = color;
    const startCanvasCoords: CanvasCoords = viewport.worldToCanvasCoords(
      startCoords
    );
    this.ctx.moveTo(startCanvasCoords.x, startCanvasCoords.y);
    const endCanvasCoords: CanvasCoords = viewport.worldToCanvasCoords(
      endCoords
    );
    this.ctx.lineTo(endCanvasCoords.x, endCanvasCoords.y);
    this.ctx.stroke();
  }

  private drawText(
    text: string,
    fontSize: number,
    center: WorldCoords,
    color = 'white'
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
