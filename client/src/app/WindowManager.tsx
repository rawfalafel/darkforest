import * as React from 'react';
import { RefObject } from 'react';
import GameUIManager from './board/GameUIManager';
import Viewport from './board/Viewport';
import { CanvasCoords, WorldCoords } from '../utils/Coordinates';
import GameManager from '../api/GameManager';
import UIEmitter from '../utils/UIEmitter'

interface WindowProps {}
interface WindowState {}

class WindowManager extends React.Component<WindowProps, WindowState> {

	state = {
		forces : 0,
		activeTab: 'details',
		planet : {
			capacity: 0,
			growth: 0,
			hardiness: 0,
			stalwartness: 0,
		}
	};
	uiManager = GameUIManager.getInstance();
	gameManager = GameManager.getInstance();

	updateInfo() {
		console.log("planet has been selected!")
		this.setState({planet: this.uiManager.selectedPlanet});
	}
	constructor(props: WindowProps) {
		super(props);

		


		// WindowManager.instance = this

	}
	componentDidMount() {
		const uiManager = GameUIManager.getInstance();
		const uiEmitter = UIEmitter.getInstance();

		if(this.uiManager.selectedPlanet != null) {
			this.setState({planet: this.uiManager.selectedPlanet})
		}

		uiEmitter.on('GAME_PLANET_SELECTED', this.updateInfo.bind(this));
	}
	handleForcesChange = (e) => {
		this.setState({forces: e.target.value});
	}
	render() {
		return (
			<div className="flex flex-col
                      bg-gray-900 border border-white m-2 rounded-sm" 
                      style={{width: "18rem",  height:"12rem"}}>
	          {/* Tabs */}
	          <div className="flex flex-row justify-between m-2">
	            <a onClick={() => this.setState({activeTab: 'details'})}
	            className={this.state.activeTab=='details' ? "underline" : ""}>Details</a>
	            <a onClick={() => this.setState({activeTab: 'forces'})}
	            className={this.state.activeTab=='forces' ? "underline" : ""}>Forces</a>
	            <a onClick={() => this.setState({activeTab: 'miners'})}
	            className={this.state.activeTab=='miners' ? "underline" : ""}>Miners</a>
	          </div>

	          {/* Windows */}
	          <div className="m-2">
	            <div className={this.state.activeTab == 'details' ? "block" : "hidden"}>
	              <table className="width-full" style={{width:"100%"}}>
	              	<tbody className="width-full" style={{width:"100%"}}>
		              <tr>
		              	<td colSpan={2}>Capacity:</td>
		              	<td colSpan={2} className="text-right">{(Math.round(this.state.planet.capacity/100.0)).toString()}</td>
		              </tr>
		              <tr>
		              	<td colSpan={2}>Growth:</td>
		              	<td colSpan={2} className="text-right">{(Math.round(this.state.planet.growth/100.0)).toString()}</td>
		              </tr>
		              <tr>
		              	<td colSpan={2}>Hardiness:</td>
		              	<td colSpan={2} className="text-right">{(Math.round(this.state.planet.hardiness/100.0)).toString()}</td>
		              </tr>
		              <tr>
		              	<td colSpan={2}>Stalwartness:</td>
		              	<td colSpan={2} className="text-right">{(Math.round(this.state.planet.stalwartness/100.0)).toString()}</td>
		              </tr>
		              <tr><td colSpan={4}></td></tr>
		              <tr>
		              	<td>ETH:</td>
		              	<td className="text-left">
		              		100
		              	</td>
		              	<td>USD:</td>
		              	<td className="text-right">
		              		100
		              	</td>
		              </tr>
		            </tbody>
	              </table>
	            </div>

	            <div className={this.state.activeTab == 'miners' ? "block" : "hidden"}>
	              Manage Miners:
	            </div>

	            <div className={this.state.activeTab == 'forces' ? "block" : "hidden"}>
	              <p>Forces to send: 
	              <select value={this.state.forces}

	              	className="bg-gray-700 border border-white p-2 rounded-none" 
	              	onChange={this.handleForcesChange}>
	                <option value="10">10%</option>
	                <option value="25">25%</option>
	                <option value="50">50%</option>
	                <option value="75">75%</option>
	                <option value="100">100%</option>
	              </select>
	              </p>
	              {/* <p>{this.state.forces}% of current planet: 
	              	{this.state.planet ? (this.state.forces/100)*this.state.planet.capacity : ""}</p> */}
	            </div>
	          </div>

	        </div>
		);
	}
}

export default WindowManager;