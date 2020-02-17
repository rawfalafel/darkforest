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
  defaultHardiness: number[];
  defaultStalwartness: number[];
}

export interface RawTransactionData extends Array<string | boolean | number | BigNumber> {
  0: BigNumber;
  1: string;
  2: BigNumber;
  3: BigNumber;
  4: number;
  5: number;

  arrivalTime: BigNumber;
  player: string;
  oldLoc: BigNumber;
  newLoc: BigNumber;
  maxDist: number;
  shipsMoved: number;

        //uint arrivalTime;
        //address player;
        //uint oldLoc;
        //uint newLoc;
        //uint maxDist;
        //uint shipsMoved;
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
  7: BigNumber;
  8: BigNumber;
  9: boolean;
  10: BigNumber;
  11: BigNumber;

  locationId: BigNumber;
  owner: string;
  planetType: number;
  capacity: BigNumber;
  growth: BigNumber;
  hardiness: BigNumber;
  stalwartness: BigNumber;
  population: BigNumber;
  lastUpdated: BigNumber;
  coordinatesRevealed: boolean;
  x: BigNumber; // if coordinatesRevealed
  y: BigNumber; // if coordinatesRevealed
}

export interface RawPlanetMetadata
  extends Array<string | boolean | number | BigNumber> {
  0: BigNumber;
  1: string;
  2: number;
  3: boolean;
  4: BigNumber;
  5: any;
  6: BigNumber;

  locationId: BigNumber;
  owner: string;
  version: number;
  destroyed: boolean;
  pending: any;
  pendingCount: BigNumber;
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
