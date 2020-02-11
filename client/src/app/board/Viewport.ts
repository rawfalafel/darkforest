import ControllableCanvas from './ControllableCanvas';

class Viewport {
  static instance: Viewport;

  private constructor() {}

  static getInstance(): Viewport {
    if (!Viewport.instance) {
      throw new Error('Attempted to get Viewport object before initialized');
    }

    return Viewport.instance;
  }

  static initialize(controllableCanvas: ControllableCanvas): Viewport {
    const viewport = new Viewport();

    return viewport;
  }
}
