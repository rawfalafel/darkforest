import { RefObject } from 'react';
import GameUIManager from './GameUIManager';
import Viewport from './Viewport';
import { CanvasCoords } from '../../utils/Coordinates';

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

    this.ctx.clearRect(0, 0, viewport.viewportWidth, viewport.viewportHeight);

    this.drawCircle();
    this.drawSquare();
    this.drawCursorPath();

    window.requestAnimationFrame(this.frame.bind(this));
  }

  private drawCircle() {
    const viewport = Viewport.getInstance();
    const uiManager = GameUIManager.getInstance();

    const circleCenterCanvas = viewport.worldToCanvasCoords(
      uiManager.circleCenter
    );
    const circleRadiusCanvas = uiManager.radius / viewport.scale();

    this.ctx.fillStyle = 'blue';
    this.ctx.beginPath();
    this.ctx.arc(
      circleCenterCanvas.x,
      circleCenterCanvas.y,
      circleRadiusCanvas,
      0,
      2 * Math.PI,
      false
    );
    this.ctx.fill();

    if (uiManager.circleSelected) {
      this.ctx.lineWidth = 4;
      this.ctx.beginPath();
      this.ctx.arc(
        circleCenterCanvas.x,
        circleCenterCanvas.y,
        circleRadiusCanvas + 10,
        0,
        2 * Math.PI,
        false
      );
      this.ctx.stroke();
    }
  }

  private drawSquare() {
    const viewport = Viewport.getInstance();
    const uiManager = GameUIManager.getInstance();

    const topY = viewport.worldToCanvasY(
      uiManager.squareCenter.y + uiManager.sideLength / 2
    );
    const leftX = viewport.worldToCanvasX(
      uiManager.squareCenter.x - uiManager.sideLength / 2
    );

    this.ctx.fillStyle = 'red';
    this.ctx.fillRect(
      leftX,
      topY,
      viewport.worldToCanvasDist(uiManager.sideLength),
      viewport.worldToCanvasDist(uiManager.sideLength)
    );

    if (uiManager.squareSelected) {
      this.ctx.fillStyle = 'rgba(0, 0, 255, 0.2)';
      this.ctx.strokeStyle = 'white';
      this.ctx.lineWidth = 4;
      this.ctx.strokeRect(
        leftX - 5,
        topY - 5,
        viewport.worldToCanvasDist(uiManager.sideLength) + 10,
        viewport.worldToCanvasDist(uiManager.sideLength) + 10
      );
    }
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
