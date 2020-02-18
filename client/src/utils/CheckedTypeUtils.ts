import { EthAddress, LocationId } from '../@types/global/global';
import * as bigInt from 'big-integer';
import { LOCATION_ID_UB } from './constants';
import { BigInteger } from 'big-integer';
import { utils } from 'ethers';
import { BigNumber } from 'ethers/utils';

// constructors for specific types
// this pattern ensures that LocationIds and Addresses can only be initialized through constructors that do
// appropriate validation
// see https://stackoverflow.com/questions/51813272/declaring-string-type-with-min-max-length-in-typescript
export const locationIdFromHexStr: (
  location: string
) => LocationId = location => {
  const locationBI = bigInt(location, 16);
  if (locationBI.geq(LOCATION_ID_UB)) throw new Error('not a valid location');
  let ret = locationBI.toString(16);
  while (ret.length < 64) ret = '0' + ret;
  return <LocationId>ret;
};

export const locationIdFromDecStr: (
  location: string
) => LocationId = location => {
  const locationBI = bigInt(location);
  if (locationBI.geq(LOCATION_ID_UB)) throw new Error('not a valid location');
  let ret = locationBI.toString(16);
  while (ret.length < 64) ret = '0' + ret;
  return <LocationId>ret;
};

export const locationIdFromBigInt: (
  location: BigInteger
) => LocationId = location => {
  const locationBI = bigInt(location);
  if (locationBI.geq(LOCATION_ID_UB)) throw new Error('not a valid location');
  let ret = locationBI.toString(16);
  while (ret.length < 64) ret = '0' + ret;
  return <LocationId>ret;
};

export const locationIdToDecStr: (
  locationId: LocationId
) => string = locationId => {
  return bigInt(locationId, 16).toString(10);
};

export const locationIdToHexStr: (
  locationId: LocationId
) => string = locationId => {
  return bigInt(locationId, 16).toString(16);
};

export const locationIdToBigNumber: (
  location: string
) => BigNumber = location => {
  return utils.bigNumberify('0x' + locationIdToHexStr(<LocationId>location));
};

export const address: (str: string) => EthAddress = str => {
  let ret = str.toLowerCase();
  if (ret.slice(0, 2) === '0x') {
    ret = ret.slice(2);
  }
  for (const c of ret) {
    if ('0123456789abcdef'.indexOf(c) === -1)
      throw new Error('not a valid address');
  }
  if (ret.length !== 40) throw new Error('not a valid address');
  return <EthAddress>ret;
};
