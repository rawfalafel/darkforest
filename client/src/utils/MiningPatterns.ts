import { MiningPatternType, GridPatternType } from '../@types/global/enums';
import { ChunkCoordinates } from '../@types/global/global';
import { WorldCoords } from './Coordinates';

export class SpiralPattern {
	type: MiningPatternType = MiningPatternType.Spiral;
	fromChunk : ChunkCoordinates;
	constructor(homeChunk : ChunkCoordinates) {
		this.fromChunk = homeChunk;
	}
	nextChunk(chunk: ChunkCoordinates) : ChunkCoordinates {
		const homeChunkX = this.fromChunk.chunkX;
		const homeChunkY = this.fromChunk.chunkY;
		const currentChunkX = chunk.chunkX;
		const currentChunkY = chunk.chunkY;
		if (currentChunkX === homeChunkX && currentChunkY === homeChunkY) {
			return <ChunkCoordinates>{
			  chunkX: homeChunkX,
			  chunkY: homeChunkY + 1
			};
		}
		if (
			currentChunkY - currentChunkX > homeChunkY - homeChunkX &&
			currentChunkY + currentChunkX >= homeChunkX + homeChunkY
		) {
			if (currentChunkY + currentChunkX == homeChunkX + homeChunkY) {
			  // break the circle
			  return <ChunkCoordinates>{
			    chunkX: currentChunkX,
			    chunkY: currentChunkY + 1
			  };
			}
			return <ChunkCoordinates>{
			  chunkX: currentChunkX + 1,
			  chunkY: currentChunkY
			};
		}
		if (
			currentChunkX + currentChunkY > homeChunkX + homeChunkY &&
			currentChunkY - currentChunkX <= homeChunkY - homeChunkX
		) {
			return <ChunkCoordinates>{
			  chunkX: currentChunkX,
			  chunkY: currentChunkY - 1
			};
		}
		if (
			currentChunkX + currentChunkY <= homeChunkX + homeChunkY &&
			currentChunkY - currentChunkX < homeChunkY - homeChunkX
		) {
			return <ChunkCoordinates>{
			  chunkX: currentChunkX - 1,
			  chunkY: currentChunkY
			};
		}
		if (
			currentChunkX + currentChunkY < homeChunkX + homeChunkY &&
			currentChunkY - currentChunkX >= homeChunkY - homeChunkX
		) {
			return <ChunkCoordinates>{
			  chunkX: currentChunkX,
			  chunkY: currentChunkY + 1
			};
		}
	}
}
export class ConePattern {
	type: MiningPatternType = MiningPatternType.Cone;
	fromChunk : ChunkCoordinates;
	nextChunk() : ChunkCoordinates {
		return <ChunkCoordinates>{
			chunkX: 0,
			chunkY: 0,
		}
	}
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
	nextChunk() : ChunkCoordinates {
		return <ChunkCoordinates>{
			chunkX: 0,
			chunkY: 0,
		}
	}
	constructor(gridType: GridPatternType) {
		this.gridType = gridType;
	}
}
export class TargetPattern {
	type: MiningPatternType = MiningPatternType.Target;
	destination: WorldCoords;
	fromChunk : ChunkCoordinates;
	nextChunk() : ChunkCoordinates {
		return <ChunkCoordinates>{
			chunkX: 0,
			chunkY: 0,
		}
	}
	constructor(destination: WorldCoords) {
		this.destination = destination;
	}
}