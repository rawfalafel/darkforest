import { EventEmitter } from 'events';

class UIEmitter extends EventEmitter {
  static instance: UIEmitter;

  private constructor() {
    super();
  }

  static getInstance(): UIEmitter {
    if (!UIEmitter.instance) {
      UIEmitter.instance = new UIEmitter();
    }

    return UIEmitter.instance;
  }

  static initialize(): UIEmitter {
    const uiEmitter = new UIEmitter();

    return uiEmitter;
  }
}

export default UIEmitter;
