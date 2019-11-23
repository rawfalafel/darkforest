import {EventEmitter} from "events";
import ContractAPI from "./ContractAPI";

class GameManagerCreator extends EventEmitter {
  static instance: any;

  constructor() {
    super();
  }

  async instantiateContractAPI(): Promise<void> {
    const {provingKeyMove, provingKeyInit} = await this.getKeys();

    const contractAPI = new ContractAPI();
  }

  async getKeys(): Promise<{provingKeyMove: ArrayBuffer, provingKeyInit: ArrayBuffer}> {
    // we don't do the usual webpack stuff
    // instead we do this based on the example from https://github.com/iden3/websnark
    const provingKeyMoveRes = await fetch('./public/proving_key_move.bin'); // proving_keys needs to be in `public`
    const provingKeyMove = await provingKeyMoveRes.arrayBuffer();
    const provingKeyInitRes = await fetch('./public/proving_key_init.bin');
    const provingKeyInit = await provingKeyInitRes.arrayBuffer();
    return {provingKeyMove, provingKeyInit};
  }

  static getInstance(): GameManagerCreator {
    if (!GameManagerCreator.instance) {
      const contractAPICreator = new GameManagerCreator();
      GameManagerCreator.instance = contractAPICreator;
    }

    return GameManagerCreator.instance;
  }
}