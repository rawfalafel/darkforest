import * as React from 'react';
import { RefObject } from 'react';
import GameUIManager from '../board/GameUIManager';
import Viewport from '../board/Viewport';
import { CanvasCoords, WorldCoords } from '../../utils/Coordinates';
import GameManager from '../../api/GameManager';
import UIEmitter from '../../utils/UIEmitter'

interface WindowProps {}
interface WindowState {}

class CoordsWindow extends React.Component<WindowProps, WindowState> {
	state = {
		coords: null,
	};
	mouseMove(myWorldCoords : WorldCoords) {
		this.setState({coords: myWorldCoords});
	}
	componentDidMount() {
		const uiEmitter = UIEmitter.getInstance();
		uiEmitter.on('WORLD_MOUSE_MOVE', this.mouseMove.bind(this));
	}
	render() {
		return (
			<p className="m-2">({this.state.coords ? Math.round(this.state.coords.x) : 0},{this.state.coords ? Math.round(this.state.coords.y) : 0})</p>
		);
	}
}

export default CoordsWindow;