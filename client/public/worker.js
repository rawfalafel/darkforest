self.importScripts('./mimc.js');

var minX = 0;
var minY = 0;
var maxX = 30;
var maxY = 30;
var exploreInterval = null;

startExplore = function() {
  if (!exploreInterval) {
    exploreInterval = setInterval(() => {
      const rangeX = maxX - minX + 1;
      const rangeY = maxY - minY + 1;
      const x = minX + Math.floor(Math.random() * rangeX);
      const y = Math.floor(Math.random() * rangeY);
      const hash = mimcHash(x, y);
      postMessage([x, y, hash]);
    }, 5);
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
  }
}
