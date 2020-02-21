import * as React from 'react';
import { RefObject } from 'react';
import UIEmitter from '../../utils/UIEmitter';
import Noise from '../../utils/Noise';
import { getPlanetColors } from '../../utils/Utils';
import GameUIManager from '../board/GameUIManager';
import { Planet } from '../../@types/global/global';
import { BigInteger } from 'big-integer';

interface CanvasProps{}
interface CanvasState{}

class PlanetCanvas extends React.Component<CanvasProps, CanvasState> {
	canvasRef: RefObject<HTMLCanvasElement> = React.createRef<HTMLCanvasElement>();
	canvas: HTMLCanvasElement | null;
	ctx: CanvasRenderingContext2D | null;
	uiEmitter: UIEmitter;
	noise: any = null;
	_seed = 0;

	private readonly WIDTH = 320;
	private readonly HEIGHT = 160;

	constructor(props) {
		super(props);

		this.uiEmitter = UIEmitter.getInstance();
	}
	seedRandom(planet: Planet) {
		this._seed = parseInt("0x"+planet.locationId.substring(0, 16))

		this._seed = this._seed % 2147483647;
  		if (this._seed <= 0) this._seed += 2147483646;
	}
	nextInt() {
		return this._seed = this._seed * 16807 % 2147483647;
	}
	nextFloat() {
		return (this.nextInt() - 1) / 2147483646;
	}
	fillPath(points) {
		const ctx = this.ctx;
		ctx.beginPath();
		ctx.moveTo(points[0].x, points[0].y);
		for(let i=1; i<points.length; i++) {
			ctx.lineTo(points[i].x, points[i].y);
		}
		ctx.lineTo(points[0].x, points[0].y);

		ctx.fill();
	};
	fillNoise(yLoc, z, yScale, xScale, octaves) {
		const noise = this.noise.noise;
		let xS = 0.1*xScale; // just so values are less cumbersome

		let points = [];
		points.push({x: 0, y: 0});
		for(let x=0; x<=this.WIDTH; x+=2) {
			let myY = yLoc+yScale*noise.simplex2(xS*x, 0.37*this._seed+z);
			for(let i=2; i<=octaves; i++) {
				myY+=yScale*Math.pow(0.5, (i-1))*noise.simplex2(Math.pow(2, (i-1))*xS*x, 0.37*this._seed+z);
			}
			points.push({
				x: x,
				y: myY,
			});
		}
		points.push({x: this.WIDTH, y: 0});

		this.fillPath(points);
	}

	renderPlanet() {
		const ctx = this.ctx;
		const noise = this.noise.noise;
		ctx.clearRect(0, 0, this.WIDTH, this.HEIGHT);

		const myPlanet = GameUIManager.getInstance().selectedPlanet;
		console.log(myPlanet);
		this.seedRandom(myPlanet);

		let colors = getPlanetColors(myPlanet);
		console.log(colors);

		//sky
		ctx.fillStyle = colors.backgroundColor;
		ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);

		// mountains
		ctx.fillStyle = colors.secondaryColor;
		this.fillNoise(80, 0, 80, 0.2, 2);
		ctx.fillStyle = colors.secondaryColor2;
		this.fillNoise(73, 0.01, 80, 0.2, 2);
		ctx.fillStyle = colors.secondaryColor3;
		this.fillNoise(60, 0.03, 80, 0.2, 2);

		// hills
		ctx.fillStyle = colors.baseColor;
		this.fillNoise(50, 0, 15, 0.07, 1);
		ctx.fillStyle = colors.baseColor2;
		this.fillNoise(45, 0.01, 15, 0.07, 1);
		ctx.fillStyle = colors.baseColor3;
		this.fillNoise(36, 0.03, 15, 0.07, 1);
		

	}

	componentDidMount() {
		this.canvas = this.canvasRef.current;
    	this.ctx = this.canvas.getContext('2d');
    	this.ctx.scale(1, -1);
    	this.ctx.translate(0, -this.HEIGHT);

    	this.uiEmitter.on('GAME_PLANET_SELECTED', this.renderPlanet.bind(this));
    	this.noise = Noise.initialize();
	}

	render() {
		return (
		  <canvas id="planetCanvas" 
	        className="border border-white m-2 rounded-sm"
	        style={{width: `${this.WIDTH}px`, height:`${this.HEIGHT}px`}}
	        width={this.WIDTH}
	        height={this.HEIGHT}
	        ref={this.canvasRef}
	       >
	     </canvas>
	    );
	}
}

export default PlanetCanvas;