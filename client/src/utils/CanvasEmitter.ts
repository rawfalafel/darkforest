import { EventEmitter } from 'events';

class CanvasEmitter extends EventEmitter {
  static instance: CanvasEmitter;

  private constructor() {
    super();
  }

  static getInstance(): CanvasEmitter {
    if (!CanvasEmitter.instance) {
      CanvasEmitter.instance = new CanvasEmitter();
    }

    return CanvasEmitter.instance;
  }

  static initialize(): CanvasEmitter {
    const canvasEmitter = new CanvasEmitter();

    return canvasEmitter;
  }
}

export default CanvasEmitter;
