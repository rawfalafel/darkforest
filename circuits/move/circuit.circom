/*
    Prove: I know (x1,y1,x2,y2) such that:
    - 0 <= x1, x2, y1, y2 < 8192
    - |x1-x2|+|y1-y2| <= distMax
    - MiMCSponge(x1,y1) = pub1
    - MiMCSponge(x2,y2) = pub2
*/

include "../../client/node_modules/circomlib/circuits/mimcsponge.circom"
include "../../client/node_modules/circomlib/circuits/comparators.circom"

template AbsoluteDifference() {
    signal input in[2];
    signal output out;

    component lt = LessThan(32);
    lt.in[0] <== in[0];
    lt.in[1] <== in[1];
    var bit = 2*lt.out - 1;

    var diff = in[1] - in[0];
    out <== bit * diff;
}

template Main() {
    signal private input x1;
    signal private input y1;
    signal private input x2;
    signal private input y2;
    signal input distMax;

    signal output pub1;
    signal output pub2;

    /* check 0 <= x1, x2, y1, y2 < 8192 */
    component ltx1lower = LessThan(32);
    component lty1lower = LessThan(32);
    component ltx2lower = LessThan(32);
    component lty2lower = LessThan(32);

    ltx1lower.in[0] <== x1;
    ltx1lower.in[1] <== 0;
    ltx1lower.out === 0;
    lty1lower.in[0] <== y1;
    lty1lower.in[1] <== 0;
    lty1lower.out === 0;
    ltx2lower.in[0] <== x2;
    ltx2lower.in[1] <== 0;
    ltx2lower.out === 0;
    lty2lower.in[0] <== y2;
    lty2lower.in[1] <== 0;
    lty2lower.out === 0;

    component ltx1upper = LessThan(32);
    component lty1upper = LessThan(32);
    component ltx2upper = LessThan(32);
    component lty2upper = LessThan(32);

    ltx1upper.in[0] <== x1;
    ltx1upper.in[1] <== 8192;
    ltx1upper.out === 1;
    lty1upper.in[0] <== y1;
    lty1upper.in[1] <== 8192;
    lty1upper.out === 1;
    ltx2upper.in[0] <== x2;
    ltx2upper.in[1] <== 8192;
    ltx2upper.out === 1;
    lty2upper.in[0] <== y2;
    lty2upper.in[1] <== 8192;
    lty2upper.out === 1;

    /* check |x1-x2|+|y1-y2| <= distMax */
    component abs1 = AbsoluteDifference();
    component abs2 = AbsoluteDifference();

    abs1.in[0] <== x1;
    abs1.in[1] <== x2;
    abs2.in[0] <== y1;
    abs2.in[1] <== y2;

    component ltDist = LessThan(32);
    ltDist.in[0] <== abs1.out + abs2.out;
    ltDist.in[1] <== distMax + 1;
    ltDist.out === 1;

    /* check MiMCSponge(x1,y1) = pub1, MiMCSponge(x2,y2) = pub2 */
    /*
        220 = 2 * ceil(log_5 p), as specified by mimc paper, where
        p = 21888242871839275222246405745257275088548364400416034343698204186575808495617
    */
    component mimc1 = MiMCSponge(2, 220, 1);
    component mimc2 = MiMCSponge(2, 220, 1);

    mimc1.ins[0] <== x1;
    mimc1.ins[1] <== y1;
    mimc1.k <== 0;
    mimc2.ins[0] <== x2;
    mimc2.ins[1] <== y2;
    mimc2.k <== 0;

    pub1 <== mimc1.outs[0];
    pub2 <== mimc2.outs[0];
}

component main = Main();
