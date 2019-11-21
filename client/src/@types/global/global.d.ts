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

export interface Planet {
    capacity: number;
    growth: number;
    coordinatesRevealed: boolean;
    lastUpdated: number;
    locationId: LocationId;
    owner: Address;
    population: number;
    version: number;
}

export interface ExploredChunkData {
    id: {
        chunkX: number;
        chunkY: number;
    };
    planetLocations: Location[];
}

export interface BoardData extends Array<Array<(ExploredChunkData | null | undefined)>> { }
