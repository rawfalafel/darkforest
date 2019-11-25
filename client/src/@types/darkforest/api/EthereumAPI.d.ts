import {BigNumber} from "ethers/utils";

export interface ContractCallArgs extends Array<any> {}

export interface InitializePlayerArgs extends ContractCallArgs {}

export interface MoveArgs extends ContractCallArgs {}

export interface ContractConstants {
  xSize: number;
  ySize: number;
  difficulty: number;
}

export interface RawPlanetData extends Array<string | boolean | number | BigNumber> {
  0: BigNumber;
  1: string;
  2: BigNumber;
  3: BigNumber;
  4: BigNumber;
  5: BigNumber;
  6: boolean;
  7: BigNumber;
  8: BigNumber;
  9: number;
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