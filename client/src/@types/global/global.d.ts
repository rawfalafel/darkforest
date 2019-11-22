import {Witness} from "snarkjs";

interface Web3Object {
}

declare global {
  interface Window {
    web3: any;
    ethereum: any;
    genZKSnarkProof: (witness: ArrayBuffer, provingKey: ArrayBuffer) => Promise<WebsnarkProof>;
  }
}

export interface WebsnarkProof {
  pi_a: [string, string, string];
  pi_b: [[string, string], [string, string], [string, string]];
  pi_c: [string, string, string];
}

export type LocationId = string & {
  __value__: never;
}; // this is expected to be 64 chars, lowercase hex. see src/utils/CheckedTypeUtils.ts for constructor

export type Address = string & {
  __value__: never;
}; // this is expected to be 40 chars, lowercase hex. see src/utils/CheckedTypeUtils.ts for constructor

export interface Location {
  x: number;
  y: number;
  hash: LocationId;
}

export class Planet {
  capacity: number;
  growth: number;
  lastUpdated: number;
  locationId: LocationId;
  owner: Address;
  population: number;
  version: number;
  coordinatesRevealed: boolean;
  x?: number;
  y?: number;
}

export interface ExploredChunkData {
  id: {
    chunkX: number;
    chunkY: number;
  };
  planetLocations: Location[];
}

export interface BoardData extends Array<Array<(ExploredChunkData | null | undefined)>> {
}
