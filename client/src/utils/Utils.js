import bigInt from "big-integer";
import {CHUNK_SIZE} from "../constants";

// largely taken from websnark/tools/buildwitness.js

function _writeUint32(h, val) {
  h.dataView.setUint32(h.offset, val, true);
  h.offset += 4;
}


function _writeBigInt(h, bi) {
  for (let i=0; i<8; i++) {
    const v = bigInt(bi).shiftRight(i*32).and(0xFFFFFFFF).toJSNumber();
    _writeUint32(h, v);
  }
}

function _calculateBuffLen(witness) {
  let size = 0;

  // beta2, delta2
  size += witness.length * 32;

  return size;
}

export const witnessObjToBuffer = (witness) => {
  const buffLen = _calculateBuffLen(witness);

  const buff = new ArrayBuffer(buffLen);

  const h = {
    dataView: new DataView(buff),
    offset: 0
  };

  for (let i=0; i<witness.length; i++) {
    _writeBigInt(h, witness[i]);
  }

  return buff;
};

// is this address a habitable planet?

export const isPlanet = locationId => {
  if (!locationId) return false;
  return bigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617')
    .divide(32).geq(bigInt(locationId));
};

export const getPlanetLocationIfKnown = (x, y, knownBoard) => {
  const chunkX = Math.floor(x / CHUNK_SIZE);
  const chunkY = Math.floor(y / CHUNK_SIZE);
  const chunk = knownBoard[chunkX][chunkY];
  if (!chunk) {
    return null;
  }
  for (let planet of chunk.planets) {
    if (planet.x === x && planet.y === y) {
      return planet;
    }
  }
  return null;
};

export const getCurrentPopulation = planet => {
  if (!planet || planet.population === 0) {
    return 0;
  }
  const timeElapsed = (Date.now() / 1000) - planet.lastUpdated;
  const denom = Math.exp(-4 * planet.growth * timeElapsed / planet.capacity) * ((planet.capacity / planet.population) - 1) + 1;
  const currentPop = planet.capacity / denom;
  return currentPop;
};
