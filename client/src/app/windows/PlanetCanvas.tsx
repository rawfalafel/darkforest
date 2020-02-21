import * as React from 'react';
import { RefObject } from 'react';
import UIEmitter from '../../utils/UIEmitter';
import Noise from '../../utils/Noise';
import { getPlanetColors } from '../../utils/Utils';
import GameUIManager from '../board/GameUIManager';
import { Planet } from '../../@types/global/global';

interface CanvasProps{}
interface CanvasState{}

class PlanetCanvas extends React.Component<CanvasProps, CanvasState> {
	canvasRef: RefObject<HTMLCanvasElement> = React.createRef<HTMLCanvasElement>();
	canvas: HTMLCanvasElement | null;
	ctx: CanvasRenderingContext2D | null;
	uiEmitter: UIEmitter;
	noise: any = null;
	_seed = 0;

	constructor(props) {
		super(props);

		this.uiEmitter = UIEmitter.getInstance();
	}
	seedRandom(planet: Planet) {
		this._seed = planet.capacity*17+planet.growth*13+planet.hardiness*11+planet.stalwartness;
		this._seed = this._seed % 2147483647;
  		if (this._seed <= 0) this._seed += 2147483646;
	}
	nextInt() {
		return this._seed = this._seed * 16807 % 2147483647;
	}
	nextFloat() {
		return (this.nextInt() - 1) / 2147483646;
	}

	renderPlanet() {
		const ctx = this.ctx;
		const noise = this.noise.noise;
		ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

		const myPlanet = GameUIManager.getInstance().selectedPlanet;
		console.log(myPlanet);
		this.seedRandom(myPlanet);

		let colors = getPlanetColors(myPlanet);
		console.log(colors);
		

		let fillPath = (points) => {
			ctx.beginPath();
			ctx.moveTo(points[0].x, points[0].y);
			for(let i=1; i<points.length; i++) {
				ctx.lineTo(points[i].x, points[i].y);
			}
			ctx.lineTo(points[0].x, points[0].y);

			ctx.fill();
		};

		let points = [];
		for(let i=0; i<100; i++) {
			points.push({
				x: i, y:Math.random()*30
			});
		}
		ctx.fillStyle = colors.baseColor;
		fillPath(points);

	}

	componentDidMount() {
		this.canvas = this.canvasRef.current;
    	this.ctx = this.canvas.getContext('2d');

    	this.uiEmitter.on('GAME_PLANET_SELECTED', this.renderPlanet.bind(this));
    	this.noise = Noise.initialize();
	}

	render() {
		return (
		  <canvas id="planetCanvas" 
	        className="border border-white m-2 rounded-sm"
	        style={{width: '320px', height:'160px'}}
	        ref={this.canvasRef}
	       >
	     </canvas>
	    );
	}
}

export default PlanetCanvas;