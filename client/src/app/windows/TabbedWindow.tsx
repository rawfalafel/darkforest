import * as React from 'react';
import GameUIManager from '../board/GameUIManager';
import GameManager from '../../api/GameManager';
import UIEmitter from '../../utils/UIEmitter';
import {
  Planet,
  ChunkCoordinates,
  MiningPattern
} from '../../@types/global/global';
import { 
	MiningPatternType, 
	GridPatternType,
	ConePatternDirection,
	ConePatternAngle
} from '../../@types/global/enums';
import {
  SpiralPattern,
  ConePattern,
  GridPattern
} from '../../utils/MiningPatterns';

import { getCurrentPopulation } from '../../utils/Utils';
import { CHUNK_SIZE } from '../../utils/constants';

interface WindowProps {}
interface WindowState {
  forces: number;
  activeTab: string; // change to enum
  planet: Planet | null;
  totalBalance: number;
  totalCapacity: number;
  conversionRate: number;
  patternType: MiningPatternType;
  miningPatternChunk: ChunkCoordinates;
  gridPatternDirection: GridPatternType;
  gridPatternDimension: number;
  conePatternDirection: ConePatternDirection;
  conePatternAngle: ConePatternAngle;
}

class TabbedWindow extends React.Component<WindowProps, WindowState> {
	CoordInput = () => (
		<span>(<input 
			type="text" 
			className="bg-gray-700 border border-white rounded-none"
			onChange={(e)=>{
				const gameManager = this.gameManager;
				const p = parseInt(e.target.value);
				// clean input
				let myVal: number = Math.max((p) ? p : 0, 0);
				let myC = Math.floor(myVal / CHUNK_SIZE);
				console.log(gameManager.getMaxChunks().chunkX-1);
				this.setState({
					miningPatternChunk: {
						chunkX: Math.min(gameManager.getMaxChunks().chunkX-1, myC),
						chunkY: this.state.miningPatternChunk.chunkY,
					}
				}, this.doPatternChange);
			}}
			style={{width: "3em"}}/>, 
		<input 
			type="text" 
			className="bg-gray-700 border border-white rounded-none"
			onChange={(e)=>{
				const gameManager = this.gameManager;
				const p = parseInt(e.target.value);
				// clean input
				let myVal: number = Math.max((p) ? p : 0, 0);
				let myC = Math.floor(myVal / CHUNK_SIZE);
				this.setState({
					miningPatternChunk: {
						chunkX: this.state.miningPatternChunk.chunkX,
						chunkY: Math.min(gameManager.getMaxChunks().chunkY-1, myC),
					}
				}, this.doPatternChange);
			}}
			style={{width: "3em"}}/>)
	</span>
	);
	state = {
		forces : 50,
		activeTab: 'details',
		planet : null,
		totalBalance : 0,
		totalCapacity : Infinity,
		conversionRate: 268.19,
		patternType : MiningPatternType.Home,
		miningPatternChunk : {chunkX: 0, chunkY: 0},
		gridPatternDirection: GridPatternType.Row,
		gridPatternDimension: 1024,
		conePatternDirection: ConePatternDirection.Up,
		conePatternAngle: ConePatternAngle.ONE,
	};

	frameCount = 0;
	uiManager = GameUIManager.getInstance();
	gameManager = GameManager.getInstance();

	/* BEGIN init stuff handlers */
	constructor(props: WindowProps) {
		super(props);

		const gameManager = GameManager.getInstance();
		this.state.miningPatternChunk = gameManager.getLocalStorageManager().getHomeChunk();
	}

  componentDidMount() {
    const uiManager = GameUIManager.getInstance();
    const uiEmitter = UIEmitter.getInstance();

    if (this.uiManager.selectedPlanet != null) {
      this.setState({ planet: this.uiManager.selectedPlanet });
    }

    uiEmitter.on('GAME_PLANET_SELECTED', this.updateInfo.bind(this));

    window.requestAnimationFrame(this.animate.bind(this));
  }

  /* BEGIN details handlers */
  async updateBalance() {
    const balance = await this.gameManager.getTotalBalance();
    this.setState({
      totalBalance: balance
    });
  }
  updateCapacity() {
    const capacity = this.gameManager.getTotalCapacity();
    this.setState({
      totalCapacity: capacity
    });
  }
  async updateConversion() {
    return 268.19; // temporary
    let myStr = await fetch('https://www.coinbase.com/price/ethereum', {
      mode: 'no-cors'
    })
      .then(r => r.text())
      .then(t => t.match(/(?<="price":")(\d+.\d+)/g).slice(-1));

    console.log(myStr);
    this.setState({
      conversionRate: parseFloat(myStr[0])
    });
  }
  updateInfo() {
    if (this.uiManager.selectedPlanet != null) {
      this.setState({ planet: this.uiManager.selectedPlanet });
    }
  }
  getEtherValue() {
    if (this.state.planet == null) return 0;
    else
      return (
        (getCurrentPopulation(this.state.planet) / this.state.totalCapacity) *
        this.state.totalBalance
      );
  }
  getUsdValue = () => this.getEtherValue() * this.state.conversionRate;
  animate() {
    this.frameCount++;
    if (this.frameCount % 3600 == 0) {
      this.updateConversion();
    }
    if (this.frameCount % 150 == 0) {
      this.updateBalance();
    }
    if (this.frameCount % 60 == 0) {
      this.updateCapacity();
    }
    if (this.frameCount % 15 == 0) {
      this.updateInfo();
    }
    window.requestAnimationFrame(this.animate.bind(this));
  }
  renderPlanetProp(prop: string): string {
    if (prop == 'population') {
      return this.state.planet
        ? Math.round(getCurrentPopulation(this.state.planet) / 100.0).toString()
        : '0';
    } else if (prop == 'scaledPopulation') {
      return this.state.planet
        ? Math.round(
            ((this.state.forces / 100.0) *
              getCurrentPopulation(this.state.planet)) /
              100.0
          ).toString()
        : '0';
    } else if (prop == 'hardiness' || prop == 'stalwartness') {
      return this.state.planet
        ? Math.round(this.state.planet[prop]).toString()
        : '0';
    } else {
      return this.state.planet
        ? Math.round(this.state.planet[prop] / 100.0).toString()
        : '0';
    }
  }

  /* BEGIN forces handlers */
  handleForcesChange = e => {
    const uiManager = GameUIManager.getInstance();
    this.setState({ forces: e.target.value });
    uiManager.setForces(e.target.value);
  };

  /* BEGIN mining handlers */
  doPatternChange() {
    let myPattern: MiningPattern;
    if (this.state.patternType == MiningPatternType.Target) {
      myPattern = new SpiralPattern(this.state.miningPatternChunk);
    } else if (this.state.patternType == MiningPatternType.Grid) {
      myPattern = new GridPattern(
        this.state.miningPatternChunk,
        this.state.gridPatternDirection,
        this.state.gridPatternDimension
      );
    }  else if (this.state.patternType == MiningPatternType.Cone) {
      myPattern = new ConePattern(
        this.state.miningPatternChunk,
        this.state.conePatternDirection,
        this.state.conePatternAngle
      );
    } /*(this.state.patternType == MiningPatternType.Home)*/ else {
      myPattern = new SpiralPattern(
        this.gameManager.getLocalStorageManager().getHomeChunk()
      );
    }
    console.log("detected UI pattern update");
    console.log(myPattern);
    this.gameManager.setMiningPattern(myPattern);
  }
  handlePatternTypeChange = e => {
    this.setState({ patternType: e.target.value }, this.doPatternChange);
  };
  render() {
    return (
      <div
        className="flex flex-col
                      bg-gray-900 border border-white m-2 rounded-sm"
        style={{ width: '18rem', height: '14rem' }}
      >
        {/* Tabs */}
        <div className="flex flex-row justify-between m-2">
          <a
            onClick={() => this.setState({ activeTab: 'details' })}
            className={this.state.activeTab == 'details' ? 'underline' : ''}
          >
            Details
          </a>
          <a
            onClick={() => this.setState({ activeTab: 'forces' })}
            className={this.state.activeTab == 'forces' ? 'underline' : ''}
          >
            Forces
          </a>
          <a
            onClick={() => this.setState({ activeTab: 'miners' })}
            className={this.state.activeTab == 'miners' ? 'underline' : ''}
          >
            Miners
          </a>
        </div>

        {/* Windows */}
        <div className="m-2 h-full">
          <div
            className={this.state.activeTab == 'details' ? 'block' : 'hidden'}
          >
            <table className="width-full" style={{ width: '100%' }}>
              <tbody className="width-full" style={{ width: '100%' }}>
                <tr>
                  <td colSpan={2}>Population:</td>
                  <td colSpan={2} className="text-right">
                    {this.renderPlanetProp('population')}
                  </td>
                </tr>
                <tr>
                  <td colSpan={2}>Capacity:</td>
                  <td colSpan={2} className="text-right">
                    {this.renderPlanetProp('capacity')}
                  </td>
                </tr>
                <tr>
                  <td colSpan={2}>Growth:</td>
                  <td colSpan={2} className="text-right">
                    {this.renderPlanetProp('growth')}
                  </td>
                </tr>
                <tr>
                  <td colSpan={2}>Hardiness:</td>
                  <td colSpan={2} className="text-right">
                    {this.renderPlanetProp('hardiness')}
                  </td>
                </tr>
                <tr>
                  <td colSpan={2}>Stalwartness:</td>
                  <td colSpan={2} className="text-right">
                    {this.renderPlanetProp('stalwartness')}
                  </td>
                </tr>
                <tr>
                  <td colSpan={4}></td>
                </tr>
                <tr>
                  <td>ETH:</td>
                  <td className="text-left">
                    {this.getEtherValue().toFixed(4)}
                  </td>
                  <td>USD:</td>
                  <td className="text-right">
                    {this.getUsdValue().toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* BEGIN MINERS */}
          <div
            className={
              'flex flex-col h-full ' +
              (this.state.activeTab == 'miners' ? 'block' : 'hidden')
            }
          >
            {/* BEGIN top half */}
            <div className="flex flex-row justify-between flex-grow-0">
              <p>Mining pattern:</p>
              <select
                value={this.state.patternType}
                className="bg-gray-700 border border-white p-2 rounded-none"
                onChange={this.handlePatternTypeChange}
              >
                <option value={MiningPatternType.Home}>Home</option>
                <option value={MiningPatternType.Target}>Target</option>
                <option value={MiningPatternType.Cone}>Cone</option>
                <option value={MiningPatternType.Grid}>Grid</option>
                <option value={MiningPatternType.ETH}>ETH</option>
              </select>
            </div>

            <div className="flex-grow">
              <div
                className={
                  'flex flex-col justify-around h-full ' +
                  (this.state.patternType == MiningPatternType.Home
                    ? 'block'
                    : 'hidden')
                }
              >
                <p>You are currently exploring from HOME.</p>
                <div>
	                <p>Your home chunk is:</p>
	                <p>
	                  {(() => {
	                    let myChunk = this.gameManager
	                      .getLocalStorageManager()
	                      .getHomeChunk();
	                    return `<${myChunk ? myChunk.chunkX : 'none'}, ${
	                      myChunk ? myChunk.chunkY : 'none'
	                    }>`;
	                  })()}
	                </p>
                </div>
              </div>

              <div
                className={
                  'flex flex-col justify-around h-full ' +
                  (this.state.patternType == MiningPatternType.Target
                    ? 'block'
                    : 'hidden')
                }
              >
                <div>
                  <p>Target coords:</p>
                  <p>{this.CoordInput()}</p>
                </div>
                <div>
                  <p>Targeting chunk: </p>
                  <p>
                    {(c => `<${c.chunkX}, ${c.chunkY}>`)(
                      this.state.miningPatternChunk
                    )}
                  </p>
                </div>
              </div>

              <div
                className={
                  'flex flex-col justify-around h-full ' +
                  (this.state.patternType == MiningPatternType.Cone
                    ? 'block'
                    : 'hidden')
                }
              >
                <p>Explore from: {this.CoordInput()}</p>
                <p>Cone direction:<select
                value={this.state.conePatternDirection}
                className="bg-gray-700 border border-white p-2 rounded-none"
                onChange={e => {
                  this.setState(
                    { conePatternDirection: parseInt(e.target.value) },
                    this.doPatternChange
                  );
                }}
              >
                <option value={ConePatternDirection.Up}>Up</option>
                <option value={ConePatternDirection.Down}>Down</option>
                <option value={ConePatternDirection.Left}>Left</option>
                <option value={ConePatternDirection.Right}>Right</option>
              </select></p>
                <p>Cone Angle: <select
                value={this.state.conePatternAngle}
                className="bg-gray-700 border border-white p-2 rounded-none"
                onChange={e => {
                  this.setState(
                    { conePatternAngle: parseInt(e.target.value) },
                    this.doPatternChange
                  );
                }}
              >
                <option value={ConePatternAngle.ONE}>90</option>
                <option value={ConePatternAngle.TWO}>120</option>
                <option value={ConePatternAngle.THREE}>140</option>
              </select></p>
              </div>

              <div
                className={
                  'flex flex-col justify-around h-full ' +
                  (this.state.patternType == MiningPatternType.Grid
                    ? 'block'
                    : 'hidden')
                }
              >
                <p>Start from: {this.CoordInput()}</p>
                <p>
                  Move direction:
                  <select
                    value={this.state.gridPatternDirection}
                    className="bg-gray-700 border border-white p-2 rounded-none"
                    onChange={e => {
                      this.setState(
                        { gridPatternDirection: parseInt(e.target.value) },
                        this.doPatternChange
                      );
                    }}
                  >
                    <option value={GridPatternType.Row}>Row</option>
                    <option value={GridPatternType.Column}>Column</option>
                  </select>
                </p>
                <p>
                  Grid{' '}
                  {this.state.gridPatternDirection == GridPatternType.Column
                    ? 'height'
                    : 'width'}
                  :
                  <input
                    type="text"
                    className="bg-gray-700 border border-white rounded-none"
                    onChange={e => {
                      const p = parseInt(e.target.value);
                      let myVal: number = p ? p : 0;
                      this.setState(
                        {
                          gridPatternDimension: Math.max(1, myVal)
                        },
                        this.doPatternChange
                      );
                    }}
                    style={{ width: '3em' }}
                  />
                </p>
              </div>

              <div
                className={
                  'flex flex-col justify-around h-full ' +
                  (this.state.patternType == MiningPatternType.ETH
                    ? 'block'
                    : 'hidden')
                }
              >
                <p>Welcome to the 2020 Ethereum workshop!</p>
              </div>
            </div>
            {/* END top half */}

            {/* END MINERS */}
          </div>

          <div
            className={this.state.activeTab == 'forces' ? 'block' : 'hidden'}
          >
            <table>
              <tbody>
                <tr>
                  <td>Forces to send:</td>
                  <td>
                    <select
                      value={this.state.forces}
                      className="bg-gray-700 border border-white p-2 rounded-none"
                      onChange={this.handleForcesChange}
                    >
                      <option value="10">10%</option>
                      <option value="25">25%</option>
                      <option value="50">50%</option>
                      <option value="75">75%</option>
                      <option value="100">100%</option>
                    </select>
                  </td>
                </tr>
                <tr>
                  <td colSpan={2}>{this.state.forces}% of current planet:</td>
                </tr>
                <tr>
                  <td colSpan={2}>
                    <b>{this.renderPlanetProp('scaledPopulation')}</b>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }
}

export default TabbedWindow;
