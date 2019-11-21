import * as bigInt from "big-integer";
import {CHUNK_SIZE} from "./constants";
import {BigInteger} from "big-integer";
import {Witness} from "snarkjs";
import {BoardData, Location, LocationId, Planet} from "../@types/global/global";

// largely taken from websnark/tools/buildwitness.js, and typed by us (see src/@types/snarkjs)

interface DataViewWithOffset {
  dataView: DataView;
  offset: number;
}

function _writeUint32(h: DataViewWithOffset, val: number): void {
  h.dataView.setUint32(h.offset, val, true);
  h.offset += 4;
}


function _writeBigInt(h: DataViewWithOffset, bi: BigInteger): void {
  for (let i=0; i<8; i++) {
    const v = bigInt(bi).shiftRight(i*32).and(0xFFFFFFFF).toJSNumber();
    _writeUint32(h, v);
  }
}

function _calculateBuffLen(witness: Witness): number {
  let size = 0;

  // beta2, delta2
  size += witness.length * 32;

  return size;
}

export const witnessObjToBuffer: (witness: Witness) => ArrayBuffer = (witness) => {
  const buffLen: number = _calculateBuffLen(witness);

  const buff = new ArrayBuffer(buffLen);

  const h: DataViewWithOffset = {
    dataView: new DataView(buff),
    offset: 0
  };

  for (let i=0; i<witness.length; i++) {
    _writeBigInt(h, witness[i]);
  }

  return buff;
};

// is this address a habitable planet?

export const isPlanet: (locationId: LocationId) => boolean = locationId => {
  if (!locationId) return false;
  return bigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617')
    .divide(32).geq(bigInt(locationId));
};

export const getPlanetLocationIfKnown: (x: number, y: number, knownBoard: BoardData) => (Location | null) = (x, y, knownBoard) => {
  const chunkX = Math.floor(x / CHUNK_SIZE);
  const chunkY = Math.floor(y / CHUNK_SIZE);
  if (chunkX < 0 || chunkY < 0 || chunkX >= knownBoard.length || chunkY >= knownBoard[chunkX].length) {
    return null;
  }
  const chunk = knownBoard[chunkX][chunkY];
  if (!chunk) {
    return null;
  }
  for (let location of chunk.planetLocations) {
    if (location.x === x && location.y === y) {
      return location;
    }
  }
  return null;
};

export const getCurrentPopulation: (planet: Planet) => number = planet => {
  if (planet.population === 0) {
    return 0;
  }
  const timeElapsed = (Date.now() / 1000) - planet.lastUpdated;
  const denominator = Math.exp(-4 * planet.growth * timeElapsed / planet.capacity) * ((planet.capacity / planet.population) - 1) + 1;
  return planet.capacity / denominator;
};
