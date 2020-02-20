import { MiningPatternType, GridPatternType } from '../@types/global/enums';
import { ChunkCoordinates } from '../@types/global/global';
import { WorldCoords } from './Coordinates';

export class SpiralPattern {
	type: MiningPatternType = MiningPatternType.Spiral;
	fromChunk : ChunkCoordinates;
	constructor(homeChunk : ChunkCoordinates) {
		this.fromChunk = homeChunk;
	}
}
export class ConePattern {
	type: MiningPatternType = MiningPatternType.Cone;
	fromChunk : ChunkCoordinates;
	constructor() {
	}
}

export class GridPattern {
	type: MiningPatternType = MiningPatternType.Grid;
	gridType: GridPatternType;
	fromChunk : ChunkCoordinates = <ChunkCoordinates> {
		chunkX:0,
		chunkY:0,
	};
	constructor(gridType: GridPatternType) {
		this.gridType = gridType;
	}
}
export class TargetPattern {
	type: MiningPatternType = MiningPatternType.Target;
	destination: WorldCoords;
	fromChunk : ChunkCoordinates;
	constructor(destination: WorldCoords) {
		this.destination = destination;
	}
}