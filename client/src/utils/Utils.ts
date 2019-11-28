import * as bigInt from "big-integer";
import {CHUNK_SIZE} from "./constants";
import {BigInteger} from "big-integer";
import {Witness} from "snarkjs";
import {BoardData, Location, LocationId, OwnedPlanet, Planet} from "../@types/global/global";

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

// type guard
export function isOwnedPlanet(planet: Planet): planet is OwnedPlanet {
  return (planet as OwnedPlanet).owner !== undefined;
}

export const getCurrentPopulation: (planet: OwnedPlanet) => number = planet => {
  if (planet.population === 0) {
    return 0;
  }
  const timeElapsed = (Date.now() / 1000) - planet.lastUpdated;
  const denominator = Math.exp(-4 * planet.growth * timeElapsed / planet.capacity) * ((planet.capacity / planet.population) - 1) + 1;
  return planet.capacity / denominator;
};
