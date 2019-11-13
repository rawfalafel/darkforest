/*
    Prove: I know (x,y) such that:
    - 0 <= x,y < 2048
    - MiMCSponge(x,y) = pub
*/

include "../../client/node_modules/circomlib/circuits/mimcsponge.circom"
include "../../client/node_modules/circomlib/circuits/comparators.circom"
include "../difficulty/circuit.circom"

template Main() {
    signal private input x;
    signal private input y;

    signal output pub;

    /* check 0 <= x,y < 2048 */
    component ltxlower = LessThan(32);
    component ltylower = LessThan(32);

    ltxlower.in[0] <== x;
    ltxlower.in[1] <== 0;
    ltxlower.out === 0;
    ltylower.in[0] <== y;
    ltylower.in[1] <== 0;
    ltylower.out === 0;

    component ltxupper = LessThan(32);
    component ltyupper = LessThan(32);

    ltxupper.in[0] <== x;
    ltxupper.in[1] <== 2048;
    ltxupper.out === 1;
    ltyupper.in[0] <== y;
    ltyupper.in[1] <== 2048;
    ltyupper.out === 1;

    /* check MiMCSponge(x,y) = pub */
    /*
        220 = 2 * ceil(log_5 p), as specified by mimc paper, where
        p = 21888242871839275222246405745257275088548364400416034343698204186575808495617
    */
    component mimc = MiMCSponge(2, 220, 1);

    mimc.ins[0] <== x;
    mimc.ins[1] <== y;
    mimc.k <== 0;

    component difficulty = DifficultyInvProb();
    difficulty.in[0] <== x;
    difficulty.in[1] <== y;

    signal hashCutoff <-- 21888242871839275222246405745257275088548364400416034343698204186575808495616 \ difficulty.out;
    signal remainder <-- 21888242871839275222246405745257275088548364400416034343698204186575808495616 - difficulty.out * hashCutoff;

    difficulty.out * hashCutoff + remainder === 21888242871839275222246405745257275088548364400416034343698204186575808495616;
    component ltRemainder = LessThan(128);
    ltRemainder.in[0] <== remainder;
    ltRemainder.in[1] <== difficulty.out;
    ltRemainder.out === 1;

    component ltPub = LessThan(128);
    ltPub.in[0] <== pub;
    ltPub.in[1] <== hashCutoff+1;
    ltPub.out === 1;

    pub <== mimc.outs[0];
}

component main = Main();