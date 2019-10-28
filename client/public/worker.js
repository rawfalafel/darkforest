self.importScripts('./mimc.js');

var minX = 0;
var minY = 0;
var maxX = 29;
var maxY = 29;
var exploreInterval = null;

const CHUNK_SIZE = 10;
const MAX_HASH = bigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');
const DIFFICULTY = 32;

exploreChunk = function(chunk_x, chunk_y) {
  planets = [];
  for (let x=CHUNK_SIZE*chunk_x; x<CHUNK_SIZE*(chunk_x+1); x++) {
    for (let y=CHUNK_SIZE*chunk_y; y<CHUNK_SIZE*(chunk_y+1); y++) {
      const hash = mimcHash(x, y);
      if (hash.lesser(MAX_HASH.divide(DIFFICULTY))) {
        planets.push((x, y, hash));
      }
    }
  }
  postMessage(planets);
}

startExplore = function() {
  if (!exploreInterval) {
    exploreInterval = setInterval(() => {
      const rangeX = maxX - minX + 1;
      const rangeY = maxY - minY + 1;
      const x = minX + Math.floor(Math.random() * rangeX);
      const y = Math.floor(Math.random() * rangeY);
      const hash = mimcHash(x, y).toString();
      postMessage([x, y, hash]);
    }, 0);
  }
}
stopExplore = function() {
  if (exploreInterval) {
    clearInterval(exploreInterval);
    exploreInterval = null;
  }
}
setBounds = function(_minX, _minY, _maxX, _maxY) {
  minX = _minX;
  minY = _minY;
  maxX = _maxX;
  maxY = _maxY;
}

parseMessage = function (data) {
  return {type: data[0], payload: data.slice(1)}
}

onmessage = function(e) {
  console.log('Worker: Message received from main script');
  const {type, payload} = parseMessage(e.data);
  console.log(type);
  console.log(payload);
  if (type === 'start') {
    startExplore();
  } else if (type === 'stop') {
    stopExplore();
  } else if (type === 'setBounds') {
    setBounds(...payload);
  } else if (type === 'exploreChunk') {
    setBounds(...payload);
  }
}
