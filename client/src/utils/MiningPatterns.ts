import { 
	MiningPatternType, 
	GridPatternType,
	ConePatternDirection,
	ConePatternAngle
} from '../@types/global/enums';
import { ChunkCoordinates } from '../@types/global/global';
import { WorldCoords } from './Coordinates';

export class MiningPatternID {
	patternId: string;
	constructor() {
		this.patternId=""+Date.now();
	}
}

export class SpiralPattern extends MiningPatternID {
	type: MiningPatternType = MiningPatternType.Spiral;
	fromChunk : ChunkCoordinates;
	constructor(homeChunk : ChunkCoordinates) {
		super();
		this.fromChunk = homeChunk;
	}
	nextChunk(chunk: ChunkCoordinates) : ChunkCoordinates {
		const homeX = this.fromChunk.chunkX;
		const homeY = this.fromChunk.chunkY;
		const currX = chunk.chunkX;
		const currY = chunk.chunkY;

		if (currX === homeX && currY === homeY) {
			return <ChunkCoordinates>{
			  chunkX: homeX,
			  chunkY: homeY + 1
			};
		}
		if (
			currY - currX > homeY - homeX &&
			currY + currX >= homeX + homeY
		) {
			if (currY + currX == homeX + homeY) {
			  // break the circle
			  return <ChunkCoordinates>{
			    chunkX: currX,
			    chunkY: currY + 1
			  };
			}
			return <ChunkCoordinates>{
			  chunkX: currX + 1,
			  chunkY: currY
			};
		}
		if (
			currX + currY > homeX + homeY &&
			currY - currX <= homeY - homeX
		) {
			return <ChunkCoordinates>{
			  chunkX: currX,
			  chunkY: currY - 1
			};
		}
		if (
			currX + currY <= homeX + homeY &&
			currY - currX < homeY - homeX
		) {
			return <ChunkCoordinates>{
			  chunkX: currX - 1,
			  chunkY: currY
			};
		}
		if (
			currX + currY < homeX + homeY &&
			currY - currX >= homeY - homeX
		) {
			return <ChunkCoordinates>{
			  chunkX: currX,
			  chunkY: currY + 1
			};
		}
	}
}
export class ConePattern extends MiningPatternID {
	type: MiningPatternType = MiningPatternType.Cone;
	fromChunk : ChunkCoordinates;
	direction: ConePatternDirection;
	angle: ConePatternAngle;
	nextChunk(chunk : ChunkCoordinates) : ChunkCoordinates {
		const homeX = this.fromChunk.chunkX;
		const homeY = this.fromChunk.chunkY;
		const currX = chunk.chunkX;
		const currY = chunk.chunkY;
		const delX = currX - homeX;
		const delY = currY - homeY;

		// TODO clean this up

		if(this.direction == ConePatternDirection.Up) {
			// if past right bound, go up and left
			let rightBound = Math.abs(delY * this.angle);

			if(delX >= rightBound) {
				return <ChunkCoordinates> {
					chunkX: homeX - (delY+1)*this.angle,
					chunkY: currY + 1,
				}
			}
			// otherwise just move one right
			else {
				return <ChunkCoordinates> {
					chunkX: currX + 1,
					chunkY: currY,
				}
			}
		} else if(this.direction == ConePatternDirection.Down) {
			// if past right bound, go down and left
			let rightBound = Math.abs(delY * this.angle);

			if(delX >= rightBound) {
				return <ChunkCoordinates> {
					chunkX: homeX - (Math.abs(delY)+1)*this.angle,
					chunkY: currY - 1,
				}
			}
			// otherwise just move one right
			else {
				return <ChunkCoordinates> {
					chunkX: currX + 1,
					chunkY: currY,
				}
			}
		} else if(this.direction == ConePatternDirection.Right) {
			// if past top bound, go right and down
			let topBound = Math.abs(delX) * this.angle;

			if(delY >= topBound) {
				return <ChunkCoordinates> {
					chunkX: currX + 1,
					chunkY: homeY - (Math.abs(delY)+1)*this.angle,
				}
			}
			// otherwise just move one up
			else {
				return <ChunkCoordinates> {
					chunkX: currX,
					chunkY: currY+1,
				}
			}
		} else if(this.direction == ConePatternDirection.Left) {
			// if past top bound, go left and down
			let topBound = Math.abs(delX * this.angle);

			if(delY >= topBound) {
				return <ChunkCoordinates> {
					chunkX: currX - 1,
					chunkY: homeY - (Math.abs(delY)+1)*this.angle,
				}
			}
			// otherwise just move one up
			else {
				return <ChunkCoordinates> {
					chunkX: currX,
					chunkY: currY+1,
				}
			}
		}
		
	}
	constructor(fromChunk: ChunkCoordinates, direction: ConePatternDirection, angle: ConePatternAngle) {
		super();
		this.fromChunk = fromChunk;
		this.direction = direction;
		this.angle = angle;
	}
}

export class GridPattern extends MiningPatternID {
	type: MiningPatternType = MiningPatternType.Grid;
	gridType: GridPatternType;
	fromChunk : ChunkCoordinates = <ChunkCoordinates> {
		chunkX:0,
		chunkY:0,
	};
	maxDim : number;
	nextChunk(chunk : ChunkCoordinates) : ChunkCoordinates {
		const homeX = this.fromChunk.chunkX;
		const homeY = this.fromChunk.chunkY;
		const currX = chunk.chunkX;
		const currY = chunk.chunkY;
		const delX = currX - homeX;
		const delY = currY - homeY;
		const isRow = (this.gridType == GridPatternType.Row);

		if((isRow ? delX : delY) > this.maxDim) {
			return <ChunkCoordinates>{
				chunkX: (isRow ? homeX : currX+1),
				chunkY: (isRow ? currY+1 : homeY),
			}
		} else {
			return <ChunkCoordinates>{
				chunkX: (isRow ? currX+1 : currX),
				chunkY: (isRow ? currY : currY+1),
			}
		}
	}
	constructor(fromChunk: ChunkCoordinates, gridType: GridPatternType, maxDim: number) {
		super();
		this.fromChunk = fromChunk;
		this.gridType = gridType;
		this.maxDim = maxDim;
	}
}
/*
export class TargetPattern extends MiningPatternID {
	type: MiningPatternType = MiningPatternType.Target;
	destination: WorldCoords;
	fromChunk : ChunkCoordinates;
	nextChunk(chunk : ChunkCoordinates) : ChunkCoordinates {
		return <ChunkCoordinates>{
			chunkX: 0,
			chunkY: 0,
		}
	}
	constructor(destination: WorldCoords) {
		super();
		this.destination = destination;
	}
}
*/