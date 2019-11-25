import mimcHash from './mimc';
import * as bigInt from 'big-integer';
import {CHUNK_SIZE, LOCATION_ID_UB} from "../utils/constants";
import {BigInteger} from "big-integer";
import {ExploredChunkData, Location, MinerWorkerMessage} from "../@types/global/global";
import {locationIdFromBigInt} from "../utils/CheckedTypeUtils";

const ctx: Worker = self as any;

const exploreChunk: (chunkX: number, chunkY: number, difficulty: number) => void = (chunkX, chunkY, difficulty) => {
  let planetLocations: Location[] = [];
  let difficultyBI: BigInteger = bigInt(difficulty);
  for (let x=CHUNK_SIZE*chunkX; x<CHUNK_SIZE*(chunkX+1); x++) {
    for (let y=CHUNK_SIZE*chunkY; y<CHUNK_SIZE*(chunkY+1); y++) {
      const hash: BigInteger = mimcHash(x, y);
      if (hash.lesser(LOCATION_ID_UB.divide(difficultyBI))) {
        planetLocations.push({x, y, hash: locationIdFromBigInt(hash)});
      }
    }
  }
  const chunkData: ExploredChunkData = {id: {chunkX, chunkY}, planetLocations};
  ctx.postMessage(JSON.stringify(chunkData));
};

ctx.addEventListener("message", (e: MessageEvent) => {
  const exploreMessage: MinerWorkerMessage = JSON.parse(e.data) as MinerWorkerMessage;
  exploreChunk(exploreMessage.chunkX, exploreMessage.chunkY, exploreMessage.difficulty);
});
