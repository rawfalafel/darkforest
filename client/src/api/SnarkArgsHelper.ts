import {ContractCallArgs, InitializePlayerArgs, MoveArgs} from "../@types/darkforest/api/EthereumAPI";
import {Circuit, CircuitDef} from "snarkjs";
import {witnessObjToBuffer} from "../utils/Utils";
import {WebsnarkProof} from "../@types/global/global";
import {BigInteger} from "big-integer";
import mimcHash from "../miner/mimc";
import * as bigInt from "big-integer";

const zkSnark = require("snarkjs");

class SnarkArgsHelper {
  static instance: SnarkArgsHelper;

  private readonly initCircuit: Circuit;
  private readonly moveCircuit: Circuit;
  private readonly provingKeyInit: ArrayBuffer;
  private readonly provingKeyMove: ArrayBuffer;

  private constructor(provingKeyInit: ArrayBuffer, provingKeyMove: ArrayBuffer) {
    const initCircuit: CircuitDef = require("../circuits/init/circuit.json");
    const moveCircuit: CircuitDef = require("../circuits/move/circuit.json");

    this.initCircuit = new zkSnark.Circuit(initCircuit);
    this.moveCircuit = new zkSnark.Circuit(moveCircuit);
    this.provingKeyInit = provingKeyInit;
    this.provingKeyMove = provingKeyMove;
  }

  static getInstance(): SnarkArgsHelper {
    if (!SnarkArgsHelper.instance) {
      throw new Error("SnarkArgsHelper object has not been initialized yet");
    }

    return SnarkArgsHelper.instance;
  }

  static async initialize(): Promise<SnarkArgsHelper> {
    // we don't do the usual webpack stuff
    // instead we do this based on the example from https://github.com/iden3/websnark
    const provingKeyInitBin = await fetch('./public/proving_key_init.bin');
    const provingKeyInit = await provingKeyInitBin.arrayBuffer();
    const provingKeyMoveBin = await fetch('./public/proving_key_move.bin'); // proving_keys needs to be in `public`
    const provingKeyMove = await provingKeyMoveBin.arrayBuffer();

    const snarkArgsHelper = new SnarkArgsHelper(provingKeyInit, provingKeyMove);
    SnarkArgsHelper.instance = snarkArgsHelper;

    return snarkArgsHelper;
  }

  async getInitArgs(x: number, y: number): Promise<InitializePlayerArgs> {
    const input: any = {
      x: x.toString(),
      y: y.toString()
    };
    const witness: ArrayBuffer = witnessObjToBuffer(this.initCircuit.calculateWitness(input));

    const snarkProof: WebsnarkProof = await window.genZKSnarkProof(witness, this.provingKeyInit);
    const publicSignals: BigInteger[] = [mimcHash(x, y)];
    return this.callArgsFromProofAndSignals(snarkProof, publicSignals) as InitializePlayerArgs;
  }

  async getMoveArgs(x1: number, y1: number, x2: number, y2: number, distMax: number, shipsMoved: number): Promise<MoveArgs> {
    const input: any = {
      x1: x1.toString(),
      y1: y1.toString(),
      x2: x2.toString(),
      y2: y2.toString(),
      distMax: distMax.toString()
    };
    const witness: ArrayBuffer = witnessObjToBuffer(this.moveCircuit.calculateWitness(input));

    const snarkProof: WebsnarkProof = await window.genZKSnarkProof(witness, this.provingKeyMove);
    const publicSignals: BigInteger[] = [mimcHash(x1, y1), mimcHash(x2, y2), bigInt(distMax), bigInt(shipsMoved)];
    return this.callArgsFromProofAndSignals(snarkProof, publicSignals) as MoveArgs;
  }

  private callArgsFromProofAndSignals(snarkProof: WebsnarkProof, publicSignals: BigInteger[]): ContractCallArgs {
    // the object returned by genZKSnarkProof needs to be massaged into a set of parameters the verifying contract
    // will accept
    return [
      snarkProof.pi_a.slice(0, 2), // pi_a
      // genZKSnarkProof reverses values in the inner arrays of pi_b
      [snarkProof.pi_b[0].reverse(), snarkProof.pi_b[1].reverse()], // pi_b
      snarkProof.pi_c.slice(0, 2), // pi_c
      publicSignals.map(signal => signal.toString(10)) // input
    ]
  }
}

export default SnarkArgsHelper;
