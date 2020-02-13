import { RefObject } from 'react';
import GameUIManager from './GameUIManager';
import Viewport from './Viewport';

class CanvasRenderer {
  static instance: CanvasRenderer;

  uiManager: GameUIManager;
  viewport: Viewport;

  canvasRef: RefObject<HTMLCanvasElement>;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  private constructor(
    canvasRef: RefObject<HTMLCanvasElement>,
    uiManager: GameUIManager,
    viewport: Viewport
  ) {
    this.canvasRef = canvasRef;
    this.canvas = this.canvasRef.current;
    this.ctx = this.canvas.getContext('2d');

    this.uiManager = uiManager;
    this.viewport = viewport;

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

  static initialize(
    canvasRef: RefObject<HTMLCanvasElement>,
    uiManager: GameUIManager,
    viewport: Viewport
  ) {
    const canvasRenderer = new CanvasRenderer(canvasRef, uiManager, viewport);

    return canvasRenderer;
  }

  private frame() {
    this.ctx.clearRect(
      0,
      0,
      this.viewport.viewportWidth,
      this.viewport.viewportHeight
    );

    this.drawCircle();
    this.drawSquare();

    window.requestAnimationFrame(this.frame.bind(this));
  }

  private drawCircle() {
    const circleCenterCanvas = this.viewport.worldToCanvasCoords(
      this.uiManager.circleCenter
    );
    const circleRadiusCanvas = this.uiManager.radius / this.viewport.scale();

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
  }

  private drawSquare() {
    const topY = this.viewport.worldToCanvasY(
      this.uiManager.squareCenter.y + this.uiManager.sideLength / 2
    );
    const leftX = this.viewport.worldToCanvasX(
      this.uiManager.squareCenter.x - this.uiManager.sideLength / 2
    );

    this.ctx.fillStyle = 'red';
    this.ctx.fillRect(
      leftX,
      topY,
      this.viewport.worldToCanavsDist(this.uiManager.sideLength),
      this.viewport.worldToCanavsDist(this.uiManager.sideLength)
    );
  }
}

export default CanvasRenderer;
