include "../../client/node_modules/circomlib/circuits/mimcsponge.circom"
include "../../client/node_modules/circomlib/circuits/comparators.circom"

template GetFinal(m) {
   signal input c;
   signal input x;
   signal input y;
   signal input xi;
   signal input yi;
   signal input w1;
   signal input w2;
   signal output final;

   signal hashx;
   signal hashy;
   signal val1;
   signal val2;
   signal dot;

   component mimc_addr = MiMCSponge(2, 10, 1);
   mimc_addr.ins[0] <-- xi;
   mimc_addr.ins[1] <-- yi;
   mimc_addr.k <-- 0;
   hashx <-- mimc_addr.outs[0] & (m - 1);

   component mimc_addr2 = MiMCSponge(2, 10, 1);
   mimc_addr2.ins[0] <-- hashx;
   mimc_addr2.ins[1] <-- 50;
   mimc_addr2.k <-- 0;
   hashy <-- mimc_addr2.outs[0] & (m - 1);

   val1 <-- x - c * xi;
   val2 <-- y - c * yi;

   signal dot1;
   signal dot2;
   dot1 <-- val1 * hashx;
   dot2 <-- val2 * hashy;
   dot <-- dot1 + dot2;

   signal w;
   w <-- w1*w2;
   final <-- w*dot;
}

template CheckPerlin() {
    signal private input x;
    signal private input y;
    signal private input x0;
    signal private input y0;
    signal input c;
    signal output out;
    signal output addr;

    component mimc_addr = MiMCSponge(2, 220, 1);

    mimc_addr.ins[0] <-- x;
    mimc_addr.ins[1] <-- y;
    mimc_addr.k <-- 0;

    addr <== mimc_addr.outs[0];

    signal x1;
    signal y1;

    x1 <-- x0 + 1;
    y1 <-- y0 + 1;

    component cxltex = LessThan(32);
    component cyltey = LessThan(32);

    cxltex.in[0] <-- x;
    cxltex.in[1] <-- c*x0;
    cxltex.out === 0;

    cyltey.in[0] <-- y;
    cyltey.in[1] <-- c*y0;
    cyltey.out === 0;

    component xltcx = LessThan(32);
    component yltcy = LessThan(32);

    xltcx.in[0] <-- x;
    xltcx.in[1] <-- c*x1;
    xltcx.out === 1;

    yltcy.in[0] <-- y;
    yltcy.in[1] <-- c*y1;
    yltcy.out === 1;

    signal wx0;
    signal wy0;
    signal wx1;
    signal wy1;

    wx0 <-- x - c*x0;
    wy0 <-- y - c*y0;
    wx1 <-- c - wx0;
    wy1 <-- c - wy0;

    /* Begin 0, 0 */
    component get_final00 = GetFinal(2**8);
    get_final00.c <-- c;
    get_final00.x <-- x;
    get_final00.y <-- y;
    get_final00.xi <-- x0;
    get_final00.yi <-- y0;
    get_final00.w1 <-- wx1;
    get_final00.w2 <-- wy1;
    signal final00;
    final00 <-- get_final00.final;
    /* End 0, 0 */

    /* Begin 1, 0 */
    component get_final10 = GetFinal(2**8);
    get_final10.c <-- c;
    get_final10.x <-- x;
    get_final10.y <-- y;
    get_final10.xi <-- x1;
    get_final10.yi <-- y0;
    get_final10.w1 <-- wx0;
    get_final10.w2 <-- wy1;
    signal final10;
    final10 <-- get_final10.final;
    /* End 1, 0 */

    /* Begin 0, 1 */
    component get_final01 = GetFinal(2**8);
    get_final01.c <-- c;
    get_final01.x <-- x;
    get_final01.y <-- y;
    get_final01.xi <-- x0;
    get_final01.yi <-- y1;
    get_final01.w1 <-- wx1;
    get_final01.w2 <-- wy0;
    signal final01;
    final01 <-- get_final01.final;
    /* End 0, 1 */

    /* Begin 1, 1 */
    component get_final11 = GetFinal(2**8);
    get_final11.c <-- c;
    get_final11.x <-- x;
    get_final11.y <-- y;
    get_final11.xi <-- x1;
    get_final11.yi <-- y1;
    get_final11.w1 <-- wx0;
    get_final11.w2 <-- wy0;
    signal final11;
    final11 <-- get_final11.final;
    /* End 1, 1 */

    signal final1;
    signal final2;
    final1 <-- final00 + final01;
    final2 <-- final10 + final11;

    signal final;
    final <-- final1 + final2;

    out <== final;
}

component main = CheckPerlin();