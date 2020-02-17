import * as bigInt from 'big-integer';
import { BigInteger } from 'big-integer';
import { Witness } from 'snarkjs';
import { Location, Planet } from '../@types/global/global';
import { PlanetType } from '../@types/global/enums';

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
  for (let i = 0; i < 8; i++) {
    const v = bigInt(bi)
      .shiftRight(i * 32)
      .and(0xffffffff)
      .toJSNumber();
    _writeUint32(h, v);
  }
}

function _calculateBuffLen(witness: Witness): number {
  let size = 0;

  // beta2, delta2
  size += witness.length * 32;

  return size;
}

export const witnessObjToBuffer: (
  witness: Witness
) => ArrayBuffer = witness => {
  const buffLen: number = _calculateBuffLen(witness);

  const buff = new ArrayBuffer(buffLen);

  const h: DataViewWithOffset = {
    dataView: new DataView(buff),
    offset: 0
  };

  for (let i = 0; i < witness.length; i++) {
    _writeBigInt(h, witness[i]);
  }

  return buff;
};

export const getCurrentPopulation: (planet: Planet) => number = planet => {
  if (planet.population === 0) {
    return 0;
  }
  if (planet.destroyed) {
    return planet.population;
  }
  const timeElapsed = Date.now() / 1000 - planet.lastUpdated;
  const denominator =
    Math.exp((-4 * planet.growth * timeElapsed) / planet.capacity) *
      (planet.capacity / planet.population - 1) +
    1;
  return planet.capacity / denominator;
};

export const getPlanetTypeForLocation: (
  location: Location
) => PlanetType = location => {
  const typeString = (<string>location.hash).substring(8, 14);
  const typeBigInt = bigInt(typeString, 16);
  if (typeBigInt.lt(bigInt(8))) {
    return PlanetType.HyperGiant;
  } else if (typeBigInt.lt(bigInt(64))) {
    return PlanetType.SuperGiant;
  } else if (typeBigInt.lt(bigInt(512))) {
    return PlanetType.Giant;
  } else if (typeBigInt.lt(bigInt(2048))) {
    return PlanetType.SubGiant;
  } else if (typeBigInt.lt(bigInt(8192))) {
    return PlanetType.BlueStar;
  } else if (typeBigInt.lt(bigInt(32768))) {
    return PlanetType.YellowStar;
  } else if (typeBigInt.lt(bigInt(131072))) {
    return PlanetType.WhiteDwarf;
  } else if (typeBigInt.lt(bigInt(524288))) {
    return PlanetType.RedDwarf;
  } else if (typeBigInt.lt(bigInt(2097152))) {
    return PlanetType.BrownDwarf;
  } else if (typeBigInt.lt(bigInt(8388608))) {
    return PlanetType.BigAsteroid;
  } else if (typeBigInt.lt(bigInt(16777216))) {
    return PlanetType.LittleAsteroid;
  }
  return PlanetType.None;
};
