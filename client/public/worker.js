self.importScripts('./mimc.js');

var xLower = 0;
var yLower = 0;
var xUpper = 30;
var yUpper = 30;
var exploreInterval = null;

const CHUNK_SIZE = 10;
const LOCATION_ID_UB = bigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');
const DIFFICULTY = 32;

exploreChunk = function(chunk_x, chunk_y) {
  planets = [];
  for (let x=CHUNK_SIZE*chunk_x; x<CHUNK_SIZE*(chunk_x+1); x++) {
    for (let y=CHUNK_SIZE*chunk_y; y<CHUNK_SIZE*(chunk_y+1); y++) {
      const hash = mimcHash(x, y);
      if (hash.lesser(LOCATION_ID_UB.divide(DIFFICULTY))) {
        planets.push((x, y, hash));
      }
    }
  }
  postMessage(planets);
}

startExplore = function() {
  if (!exploreInterval) {
    exploreInterval = setInterval(() => {
      const rangeX = xUpper - xLower;
      const rangeY = yUpper - yLower;
      const x = xLower + Math.floor(Math.random() * rangeX);
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
setBounds = function(_xLower, _yLower, _xUpper, _yUpper) {
  xLower = _xLower;
  yLower = _yLower;
  xUpper = _xUpper;
  yUpper = _yUpper;
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
