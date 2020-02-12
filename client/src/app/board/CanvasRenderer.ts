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
    uiManager: GameUIManager
  ) {
    this.canvasRef = canvasRef;
    this.canvas = this.canvasRef.current;
    this.ctx = this.canvas.getContext('2d');

    this.uiManager = uiManager;

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
    uiManager: GameUIManager
  ) {
    const canvasRenderer = new CanvasRenderer(canvasRef, uiManager);

    return canvasRenderer;
  }

  private frame() {
    this.drawCircle();
    this.drawSquare();

    window.requestAnimationFrame(this.frame.bind(this));
  }

  private drawCircle() {}

  private drawSquare() {}
}
