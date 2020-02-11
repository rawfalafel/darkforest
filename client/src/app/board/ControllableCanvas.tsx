import * as React from 'react';
import { RefObject } from 'react';

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

  constructor(props) {
    super(props);

    this.state = {
      width: window.innerWidth,
      height: window.innerHeight
    };
  }

  componentDidMount() {
    this.canvas = this.canvasRef.current;
    this.ctx = this.canvas.getContext('2d');
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
  }

  onMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
  }

  onMouseUp(e) {
    const rect = this.canvas.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
  }

  onMouseOut() {}

  onScroll(e) {
    e.preventDefault();
    const { deltaY } = e;
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
