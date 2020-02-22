import * as stringify from 'json-stable-stringify';
import {
  BoardData,
  ChunkCoordinates,
  EthAddress,
} from '../@types/global/global';
//import LZ from 'lz-string';
import { openDB } from 'idb';

class LocalStorageManager {
  static instance: LocalStorageManager;

  private homeChunk: ChunkCoordinates | null;
  private db;
  private readonly account: EthAddress;

  constructor(account: EthAddress) {
    this.account = account;
  }

  static getInstance(): LocalStorageManager {
    if (!LocalStorageManager.instance) {
      throw new Error(
        'LocalStorageManager object has not been initialized yet'
      );
    }

    return LocalStorageManager.instance;
  }

  static async initialize(
    account: EthAddress,
    xChunks: number,
    yChunks: number
  ): Promise<LocalStorageManager> {
    if (!!LocalStorageManager.instance) {
      throw new Error('LocalStorageManager has already been initialized');
    }

    //console.log('called initialize with', account);

    const localStorageManager = new LocalStorageManager(account);

    localStorageManager.db = await openDB('darkforest', 1, {
      upgrade(db) {
        db.createObjectStore('df');
      },
    });

    // also initializes keys if they haven't already been
    if (!(await localStorageManager.getKey('init'))) {
      const emptyBoard = Array(xChunks)
        .fill(0)
        .map(() => Array(yChunks).fill(null));
      await localStorageManager.setKey('init', 'true');
      await localStorageManager.setKey('knownBoard', stringify(emptyBoard));
      // we also have a key "homeChunk" which is not set until player has initialized
    }

    const homeChunkStr = await localStorageManager.getKey('homeChunk');
    localStorageManager.homeChunk = homeChunkStr
      ? (JSON.parse(homeChunkStr) as ChunkCoordinates)
      : null; //extremely gross hack to deal with overreliance on getChunk().

    LocalStorageManager.instance = localStorageManager;
    return localStorageManager;
  }

  private async getKey(key: string): Promise<string | null | undefined> {
    const out = await this.db.get('df', this.account.concat(key));
    //if (out) {
    //  return LZ.decompressFromUTF16(out);
    //}
    return out;
  }

  private async setKey(key: string, value: string): Promise<void> {
    //if (value) {
    //  await this.db.put(this.account, LZ.compressToUTF16(value), key);
    //} else {
    await this.db.put('df', value, this.account.concat(key));
    //}
  }

  async getKnownBoard(): Promise<BoardData> {
    const knownBoard = await this.getKey('knownBoard');
    if (knownBoard) {
      return JSON.parse(knownBoard) as BoardData;
    }
  }

  async updateKnownBoard(board: BoardData): Promise<void> {
    await this.setKey('knownBoard', stringify(board));
  }

  getHomeChunk(): ChunkCoordinates | null {
    return this.homeChunk;
  }

  setHomeChunk(chunk: ChunkCoordinates): void {
    this.homeChunk = chunk;
    this.setKey('homeChunk', stringify(chunk));
  }
}

export default LocalStorageManager;
