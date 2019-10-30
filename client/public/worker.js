self.importScripts('./mimc.js');

const CHUNK_SIZE = 16;
const LOCATION_ID_UB = bigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');
const DIFFICULTY = 32;

exploreChunk = function(chunkX, chunkY) {
  planets = [];
  for (let x=CHUNK_SIZE*chunkX; x<CHUNK_SIZE*(chunkX+1); x++) {
    for (let y=CHUNK_SIZE*chunkY; y<CHUNK_SIZE*(chunkY+1); y++) {
      const hash = mimcHash(x, y);
      if (hash.lesser(LOCATION_ID_UB.divide(DIFFICULTY))) {
        planets.push({x, y, hash: hash.toString()});
      }
    }
  }
  postMessage(JSON.stringify({id: {chunkX, chunkY}, planets}));
};

parseMessage = function (data) {
  const dataObj = JSON.parse(data);
  return {type: dataObj[0], payload: dataObj.slice(1)};
};

onmessage = function(e) {
  console.log('Worker: Message received from main script');
  const {type, payload} = parseMessage(e.data);
  console.log(type);
  console.log(payload);
  if (type === 'exploreChunk') {
    exploreChunk(...payload);
  }
};
