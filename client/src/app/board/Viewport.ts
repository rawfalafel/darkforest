import CanvasEmitter from '../../utils/CanvasEmitter';
import { CanvasCoords } from '../../@types/darkforest/app/board/Camera';

class Viewport {
  static instance: Viewport;

  private constructor() {}

  static getInstance(): Viewport {
    if (!Viewport.instance) {
      throw new Error('Attempted to get Viewport object before initialized');
    }

    return Viewport.instance;
  }

  static initialize(canvasEmitter: CanvasEmitter): Viewport {
    const viewport = new Viewport();

    canvasEmitter.on('MOUSE_DOWN', viewport.onMouseDown.bind(viewport));
    canvasEmitter.on('MOUSE_MOVE', viewport.onMouseMove.bind(viewport));
    canvasEmitter.on('MOUSE_UP', viewport.onMouseUp.bind(viewport));
    canvasEmitter.on('MOUSE_OUT', viewport.onMouseOut.bind(viewport));
    canvasEmitter.on('SCROLL', viewport.onScroll.bind(viewport));

    return viewport;
  }

  onMouseDown(canvasX: number, canvasY: number) {}

  onMouseMove(canvasX: number, canvasY: number) {}

  onMouseUp(canvasX: number, canvasY: number) {}

  onMouseOut() {}

  onScroll(deltaY: number) {}
}

export default Viewport;
