import mimcHash from './mimc';
import * as bigInt from 'big-integer';
import {CHUNK_SIZE, LOCATION_ID_UB} from "../utils/constants";

const ctx: Worker = self as any;

const exploreChunk = function(chunkX, chunkY, difficulty) {
  let planets = [];
  for (let x=CHUNK_SIZE*chunkX; x<CHUNK_SIZE*(chunkX+1); x++) {
    for (let y=CHUNK_SIZE*chunkY; y<CHUNK_SIZE*(chunkY+1); y++) {
      const hash = mimcHash(x, y);
      if (hash.lesser(LOCATION_ID_UB.divide(bigInt(difficulty)))) {
        planets.push({x, y, hash: hash.toString()});
      }
    }
  }
  ctx.postMessage(JSON.stringify({id: {chunkX, chunkY}, planets}));
};

const parseMessage = function (data) {
  const dataObj = JSON.parse(data);
  return {type: dataObj[0], payload: dataObj.slice(1)};
};

ctx.addEventListener("message", (e) => {
  console.log('Worker: Message received from main script');
  const {type, payload} = parseMessage(e.data);
  console.log(type);
  console.log(payload);
  if (type === 'exploreChunk' && Array.isArray(payload) && payload.length === 3) {
    exploreChunk(payload[0], payload[1], payload[2]);
  }
});
