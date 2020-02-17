import * as React from 'react';
import { RefObject } from 'react';
import GameUIManager from './board/GameUIManager';
import Viewport from './board/Viewport';
import { CanvasCoords, WorldCoords } from '../utils/Coordinates';
import GameManager from '../api/GameManager';

interface WindowProps {}
interface WindowState {}

class ForcesWindow extends React.Component<WindowProps, WindowState> {
	static instance : ForcesWindow;

	static getInstance() : ForcesWindow {
		return ForcesWindow.instance;
	}

	state = {
		forces : 0,
		planet : null,
	};
	constructor(props: WindowProps) {
		super(props);

		ForcesWindow.instance = this;
	}
	handleForcesChange = (e) => {
		this.setState({forces: e.target.value});
	}
	render() {
		return (
			<div className="flex flex-col w-64 h-32
                      bg-gray-900 border border-white m-2 rounded-sm">
	          {/* Tabs */}
	          <div>
	            <a>Details</a> <a>Forces</a> <a>Miners</a>
	          </div>

	          {/* Windows */}
	          <div className="m-2">
	            <div className="hidden">
	              Planet Details:
	            </div>

	            <div className="hidden">
	              Manage Miners:
	            </div>

	            <div className="block">
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
	              <p>{this.state.forces}% of current planet: 
	              	{this.state.planet ? "" : (this.state.forces/100)*this.state.planet}</p>
	            </div>
	          </div>

	        </div>
		);
	}
}

export default ForcesWindow;