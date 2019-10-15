/*
    Prove: I know (x,y) such that:
    - 0 < x,y < 31
    - MiMCSponge(x,y) = pub
*/

include "../../circomlib/circuits/mimcsponge.circom"
include "../../circomlib/circuits/comparators.circom"

template Main() {
    signal private input x;
    signal private input y;

    signal output pub;

    /* check 0 < x,y < 31 */
    component ltxlower = LessThan(32);
    component ltylower = LessThan(32);

    ltxlower.in[0] <== 0;
    ltxlower.in[1] <== x;
    ltxlower.out === 1;
    ltylower.in[0] <== 0;
    ltylower.in[1] <== y;
    ltylower.out === 1;

    component ltxupper = LessThan(32);
    component ltyupper = LessThan(32);

    ltxupper.in[0] <== x;
    ltxupper.in[1] <== 31;
    ltxupper.out === 1;
    ltyupper.in[0] <== y;
    ltyupper.in[1] <== 31;
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

    pub <== mimc.outs[0];
}

component main = Main();
