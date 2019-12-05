import { BigNumber } from 'ethers/utils';

// TODO write these types
export type ContractCallArgs = Array<any>;

export type InitializePlayerArgs = ContractCallArgs;

export type MoveArgs = ContractCallArgs;

export interface ContractConstants {
  xSize: number;
  ySize: number;
  planetRarity: number;
  defaultCapacity: number[];
  defaultGrowth: number[];
}

export interface RawPlanetData
  extends Array<string | boolean | number | BigNumber> {
  0: BigNumber;
  1: string;
  2: number;
  3: BigNumber;
  4: BigNumber;
  5: BigNumber;
  6: BigNumber;
  7: boolean;
  8: BigNumber;
  9: BigNumber;
  10: number;
  planetType: number;
  capacity: BigNumber;
  growth: BigNumber;
  coordinatesRevealed: boolean;
  lastUpdated: BigNumber;
  locationId: BigNumber;
  owner: string;
  population: BigNumber;
  version: number;
  x?: BigNumber; // if coordinatesRevealed
  y?: BigNumber; // if coordinatesRevealed
}

/*export interface InitializePlayerArgs extends Array<any> {
  0: [string, string];
  1: [[string, string], [string, string]];
  2: [string, string];
  3: [string];
}

export interface MoveArgs extends Array<any> {
  0: [string, string];
  1: [[string, string], [string, string]];
  2: [string, string];
  3: [string, string, string, string]; // oldLoc, newLoc, distMax, shipsMoved
}*/
