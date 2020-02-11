import { RefObject } from 'react';

class CanvasRenderer {
  static instance: CanvasRenderer;

  canvasRef: RefObject<HTMLCanvasElement>;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  private constructor(canvasRef: RefObject<HTMLCanvasElement>) {
    this.canvasRef = canvasRef;
    this.canvas = this.canvasRef.current;
    this.ctx = this.canvas.getContext('2d');
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

    return canvasRenderer;
  }

  frame() {}
}
