import * as React from 'react';
import { RefObject } from 'react';
import GameUIManager from './board/GameUIManager';
import Viewport from './board/Viewport';
import { CanvasCoords, WorldCoords } from '../utils/Coordinates';
import GameManager from '../api/GameManager';
import UIEmitter from '../utils/UIEmitter'
import { Planet } from '../@types/global/global';

import { getCurrentPopulation } from '../utils/Utils';

interface WindowProps {}
interface WindowState {}

class WindowManager extends React.Component<WindowProps, WindowState> {

	state = {
		forces : 25,
		activeTab: 'details',
		planet : null,
	};
	uiManager = GameUIManager.getInstance();
	gameManager = GameManager.getInstance();

	updateInfo() {
		if(this.uiManager.selectedPlanet != null) {
			this.setState({planet: this.uiManager.selectedPlanet});
		}
	}
	animate() {
		this.updateInfo();
		window.requestAnimationFrame(this.animate.bind(this));
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

		window.requestAnimationFrame(this.animate.bind(this));
	}
	handleForcesChange = (e) => {
		this.setState({forces: e.target.value});
	}
	renderPlanetProp(prop : string):string {
		if(prop == "population") {
			return (this.state.planet
					? (Math.round(getCurrentPopulation(this.state.planet)/100.0)).toString() 
					: "0");
		} else if(prop == "scaledPopulation") {
			return (this.state.planet
					? ((this.state.forces/100.0)*Math.round(getCurrentPopulation(this.state.planet)/100.0)).toString() 
					: "0");

		} else { 
			return (this.state.planet 
					? (Math.round(this.state.planet[prop]/100.0)).toString() 
					: "0");
		}
	}
	render() {
		return (
			<div className="flex flex-col
                      bg-gray-900 border border-white m-2 rounded-sm" 
                      style={{width: "18rem",  height:"14rem"}}>
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
		              	<td colSpan={2}>Population:</td>
		              	<td colSpan={2} className="text-right">{this.renderPlanetProp("population")}</td>
		              </tr>
		              <tr>
		              	<td colSpan={2}>Capacity:</td>
		              	<td colSpan={2} className="text-right">{this.renderPlanetProp("capacity")}</td>
		              </tr>
		              <tr>
		              	<td colSpan={2}>Growth:</td>
		              	<td colSpan={2} className="text-right">{this.renderPlanetProp("growth")}</td>
		              </tr>
		              <tr>
		              	<td colSpan={2}>Hardiness:</td>
		              	<td colSpan={2} className="text-right">{this.renderPlanetProp("hardiness")}</td>
		              </tr>
		              <tr>
		              	<td colSpan={2}>Stalwartness:</td>
		              	<td colSpan={2} className="text-right">{this.renderPlanetProp("stalwartness")}</td>
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
	            <table>
	            	<tbody>
	            		<tr>
	            			<td>Forces to send:</td>
	            			<td>
	            			  <select value={this.state.forces}
				              	className="bg-gray-700 border border-white p-2 rounded-none" 
				              	onChange={this.handleForcesChange}>
				                <option value="10">10%</option>
				                <option value="25">25%</option>
				                <option value="50">50%</option>
				                <option value="75">75%</option>
				                <option value="100">100%</option>
				              </select>
	              			</td>
	            		</tr>
	            		<tr>
	            			<td colSpan={2}>{this.state.forces}% of current planet:
	            			&nbsp;<b>{this.renderPlanetProp("scaledPopulation")}</b></td>
	            		</tr>
	            	</tbody>
	            </table>
	            </div>
	          </div>

	        </div>
		);
	}
}

export default WindowManager;