import * as React from 'react';
import { RefObject } from 'react';
import UIEmitter from '../../utils/UIEmitter';
import Viewport from './Viewport';
import { WorldCoords, CanvasCoords } from '../../utils/Coordinates';
import CanvasRenderer from './CanvasRenderer';

interface ControllableCanvasProps {}

interface ControllableCanvasState {
  width: number;
  height: number;
}

class ControllableCanvas extends React.Component<
  ControllableCanvasProps,
  ControllableCanvasState
> {
  canvasRef: RefObject<HTMLCanvasElement> = React.createRef<
    HTMLCanvasElement
  >();
  canvas: HTMLCanvasElement | null;
  ctx: CanvasRenderingContext2D | null;
  uiEmitter: UIEmitter;

  constructor(props) {
    super(props);

    this.uiEmitter = UIEmitter.getInstance();

    this.state = {
      width: window.innerWidth,
      height: window.innerHeight
    };
  }

  componentDidMount() {
    this.canvas = this.canvasRef.current;
    this.ctx = this.canvas.getContext('2d');

    Viewport.initialize(250, this.state.width, this.state.height);

    CanvasRenderer.initialize(this.canvasRef);

    // TODO: pull viewportwidth and height from page, set page size listener to update
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.addEventListener('mouseout', this.onMouseOut.bind(this));
    this.canvas.addEventListener('mousewheel', this.onScroll.bind(this));
    this.canvas.addEventListener('DOMMouseScroll', this.onScroll.bind(this));
  }

  onMouseDown(e) {
    const rect = this.canvas.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    this.uiEmitter.emit(
      'CANVAS_MOUSE_DOWN',
      new CanvasCoords(canvasX, canvasY)
    );
  }

  onMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    this.uiEmitter.emit(
      'CANVAS_MOUSE_MOVE',
      new CanvasCoords(canvasX, canvasY)
    );
  }

  onMouseUp(e) {
    const rect = this.canvas.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    this.uiEmitter.emit('CANVAS_MOUSE_UP', new CanvasCoords(canvasX, canvasY));
  }

  onMouseOut() {
    this.uiEmitter.emit('CANVAS_MOUSE_OUT');
  }

  onScroll(e) {
    e.preventDefault();
    const { deltaY } = e;
    this.uiEmitter.emit('CANVAS_SCROLL', deltaY);
  }

  render() {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          height: '100%'
        }}
      >
        <canvas
          ref={this.canvasRef}
          width={this.state.width}
          height={this.state.height}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    );
  }
}

export default ControllableCanvas;
