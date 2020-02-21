import {
  BoardData,
  ChunkCoordinates,
  ExploredChunkData,
  MiningPattern
} from '../@types/global/global';
import { CHUNK_SIZE } from '../utils/constants';
import Worker from 'worker-loader!../miner/miner.worker';
import { EventEmitter } from 'events';
import { MiningPatternType, GridPatternType } from '../@types/global/enums';
import {
  SpiralPattern,
  GridPattern,
  ConePattern
} from '../utils/MiningPatterns';

class MinerManager extends EventEmitter {
  private readonly inMemoryBoard: BoardData;
  private isExploring = false;
  private miningPattern: MiningPattern;
  private worker: Worker;
  private readonly maxX: number;
  private readonly maxY: number;
  private readonly planetRarity: number;

  private resetChunk = false;


  static instance: MinerManager;

  private constructor(
    inMemoryBoard: BoardData,
    miningPattern: MiningPattern,
    maxX: number,
    maxY: number,
    planetRarity: number
  ) {
    super();

    this.inMemoryBoard = inMemoryBoard;
    this.miningPattern = miningPattern;
    this.maxX = maxX / CHUNK_SIZE;
    this.maxY = maxY / CHUNK_SIZE;
    this.planetRarity = planetRarity;
  }

  setMiningPattern(pattern: MiningPattern) {
    this.miningPattern = pattern;
    this.resetChunk = true;
  }

  static getInstance(): MinerManager {
    if (!MinerManager.instance) {
      throw new Error('MinerManager object has not been initialized yet');
    }

    return MinerManager.instance;
  }

  static initialize(
    inMemoryBoard: BoardData,
    miningPattern: MiningPattern,
    xSize: number,
    ySize: number,
    planetRarity: number
  ): MinerManager {
    if (!!MinerManager.instance) {
      throw new Error('MinerManager has already been initialized');
    }

    const minerManager = new MinerManager(
      inMemoryBoard,
      miningPattern,
      xSize,
      ySize,
      planetRarity
    );
    minerManager.initWorker();
    MinerManager.instance = minerManager;

    return minerManager;
  }

  private initWorker(): void {
    this.worker = new Worker();
    this.worker.onmessage = (e: MessageEvent) => {
      // worker explored some coords
      const data: ExploredChunkData = JSON.parse(e.data) as ExploredChunkData;
      this.discovered(data);
    };
  }

  private async discovered(chunk: ExploredChunkData): Promise<void> {
    this.inMemoryBoard[chunk.id.chunkX][chunk.id.chunkY] = chunk;
    this.emit('discoveredNewChunk', chunk);
    if (this.isExploring) {
      // if this.isExploring, move on to the next chunk

      let nextChunk: ChunkCoordinates | null;
      if (this.resetChunk) {
        this.resetChunk = false;
        if (
          !this.inMemoryBoard[this.miningPattern.fromChunk.chunkX][
            this.miningPattern.fromChunk.chunkY
          ]
        ) {
          this.sendMessageToWorker(this.miningPattern.fromChunk);
        }
        nextChunk = await this.nextValidExploreTarget({
          chunkX: this.miningPattern.fromChunk.chunkX,
          chunkY: this.miningPattern.fromChunk.chunkY
        });
      } else {
        nextChunk = await this.nextValidExploreTarget({
          chunkX: chunk.id.chunkX,
          chunkY: chunk.id.chunkY
        });
      }
      // TERRIBLE solution that works
      // const nextChunk: ChunkCoordinates | null = await this.nextValidExploreTarget({
      //   chunkX: this.miningPattern.fromChunk.chunkX,
      //   chunkY: this.miningPattern.fromChunk.chunkY
      // });
      if (nextChunk) {
        this.sendMessageToWorker(nextChunk);
      }
    }
  }

  startExplore(): void {
    if (!this.isExploring) {
      this.isExploring = true;
      if (
        !this.inMemoryBoard[this.miningPattern.fromChunk.chunkX][
          this.miningPattern.fromChunk.chunkY
        ]
      ) {
        this.sendMessageToWorker(this.miningPattern.fromChunk);
      } else {
        this.nextValidExploreTarget(this.miningPattern.fromChunk).then(
          (firstChunk: ChunkCoordinates | null) => {
            if (!!firstChunk) {
              this.sendMessageToWorker(firstChunk);
            }
          }
        );
      }
    }
  }

  stopExplore(): void {
    this.isExploring = false;
  }

  private async nextValidExploreTarget(
    chunk: ChunkCoordinates
  ): Promise<ChunkCoordinates | null> {
    // async because it may take indefinitely long to find the next target. this will block UI if done sync
    // we use this trick to promisify:
    // https://stackoverflow.com/questions/10344498/best-way-to-iterate-over-an-array-without-blocking-the-ui/10344560#10344560

    // this function may return null if user chooses to stop exploring in the middle of its resolution
    // so any function calling it should handle the null case appropriately
    if (!this.isExploring) {
      return null;
    }
    let nextChunk = this.nextChunkInExploreOrder(chunk);
    let count = 100;
    while (!this.isValidExploreTarget(nextChunk) && count > 0) {
      nextChunk = this.nextChunkInExploreOrder(nextChunk);
      count -= 1;
    }
    if (this.isValidExploreTarget(nextChunk)) {
      return nextChunk;
    }
    return new Promise(resolve => {
      setTimeout(async () => {
        const nextNextChunk = await this.nextValidExploreTarget(nextChunk);
        resolve(nextNextChunk);
      }, 1);
    });
  }

  private isValidExploreTarget(chunk: ChunkCoordinates): boolean {
    const { chunkX, chunkY } = chunk;
    const xChunks = this.maxX;
    const yChunks = this.maxY;
    // should be inbounds, and unexplored
    return (
      chunkX >= 0 &&
      chunkX < xChunks &&
      chunkY >= 0 &&
      chunkY < yChunks &&
      !this.inMemoryBoard[chunkX][chunkY]
    );
  }

  private nextChunkInExploreOrder(chunk: ChunkCoordinates): ChunkCoordinates {
    let pattern: MiningPattern = this.miningPattern;
    return pattern.nextChunk(chunk);
  }

  private sendMessageToWorker(chunkToExplore: ChunkCoordinates): void {
    this.worker.postMessage(
      JSON.stringify({
        chunkX: chunkToExplore.chunkX,
        chunkY: chunkToExplore.chunkY,
        planetRarity: this.planetRarity,
        patternId: this.miningPattern.patternId,
      })
    );
  }
}

export default MinerManager;
