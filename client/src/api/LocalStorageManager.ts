import * as stringify from "json-stable-stringify";
import {BoardData, ChunkCoordinates, EthAddress} from "../@types/global/global";

class LocalStorageManager {
  static instance: LocalStorageManager;

  account: EthAddress;

  constructor(account: EthAddress) {
    this.account = account
  }

  static getInstance(): LocalStorageManager {
    if (!LocalStorageManager.instance) {
      throw new Error("LocalStorageManager object has not been initialized yet");
    }

    return LocalStorageManager.instance;
  }

  static async initialize(account: EthAddress, xChunks: number, yChunks: number): Promise<LocalStorageManager> {
    if (!!LocalStorageManager.instance) {
      throw new Error("LocalStorageManager has already been initialized");
    }

    const localStorageManager = new LocalStorageManager(account);

    // also initializes keys if they haven't already been
    if (!localStorageManager.getKey('init')) {
      const emptyBoard = Array(xChunks)
        .fill(0)
        .map(() => Array(yChunks).fill(null));
      localStorageManager.setKey('init', 'true');
      localStorageManager.setKey('knownBoard', stringify(emptyBoard));
      // we also have a key "homeChunk" which is not set until player has initialized
    }
    return localStorageManager;
  }

  getKey(key: string): string | null | undefined {
    return window.localStorage[this.account.concat(key)];
  }

  setKey(key: string, value: string): void {
    window.localStorage.setItem(this.account.concat(key), value);
  }

  getKnownBoard(): BoardData {
    const knownBoard = this.getKey('knownBoard');
    if (knownBoard) {
      return JSON.parse(knownBoard) as BoardData;
    }
  }

  updateKnownBoard(board: BoardData): void {
    this.setKey('knownBoard', stringify(board));
  }

  getHomeChunk(): ChunkCoordinates | null {
    const homeChunk = this.getKey('homeChunk');
    if (homeChunk) {
      return JSON.parse(homeChunk) as ChunkCoordinates;
    }
    return null;
  }

  setHomeChunk(chunk: ChunkCoordinates): void {
    this.setKey('homeChunk', stringify(chunk));
  }

}

export default LocalStorageManager;
