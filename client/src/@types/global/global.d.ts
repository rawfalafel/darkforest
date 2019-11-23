// web3 injected types, from metamask
interface Web3ProviderObject { }

interface Web3Object {
  currentProvider: Web3ProviderObject;
}

declare global {
  interface Window {
    web3: Web3Object;
    // from websnark's function injected into window
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

export type EthAddress = string & {
  __value__: never;
}; // this is expected to be 40 chars, lowercase hex. see src/utils/CheckedTypeUtils.ts for constructor

export interface Location {
  x: number;
  y: number;
  hash: LocationId;
}

export interface Planet {
  capacity: number;
  growth: number;
  lastUpdated: number;
  locationId: LocationId;
  owner: EthAddress;
  population: number;
  version: number;
  coordinatesRevealed: boolean;
  x?: number;
  y?: number;
}

export interface PlanetMap {
  [planetId: string]: Planet;
}

export interface Player {
  address: EthAddress;
}

export class PlayerMap {
  [playerId: string]: Player;
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
