include "../../client/node_modules/circomlib/circuits/comparators.circom"
include "../../client/node_modules/circomlib/circuits/bitify.circom"

template FpMultiply() {
    /*
        in[0]: 32x32 fixedpt
        in[1]: 32x32 fixedpt
    */
    signal input in[2];
    /*
        out: 32x32 fixedpt, represents in[0]*in[1] truncated
    */
    signal output out;
    signal remainder;

    component lt1 = LessThan(128);
    component lt2 = LessThan(128);
    component lt3 = LessThan(128);
    component lt4 = LessThan(128);

    lt1.in[0] <== in[0];
    lt1.in[1] <== 0x10000000000000000;
    lt1.out === 1;
    lt2.in[0] <== in[1];
    lt2.in[1] <== 0x10000000000000000;
    lt2.out === 1;

    var prod = in[0] * in[1]; // 64x64
    out <-- (prod >> 32) & 0xFFFFFFFFFFFFFFFF; // 32x32
    remainder <-- prod & 0xFFFFFFFF; // 32

    lt3.in[0] <== out;
    lt3.in[1] <== 0x10000000000000000;
    lt3.out === 1;

    lt4.in[0] <== remainder;
    lt4.in[1] <== 0x100000000;
    lt4.out === 1;

    out * 0x100000000 + remainder === prod;
}

template IntDivide() {
    /*
        in[0]: 64 bit int
        in[1]: 64 bit int
    */
    signal input in[2];
    /*
        out: 64 bit int, represents in[0] / in[1] truncated
        remainder: 64 bit int
    */
    signal output out;
    signal output remainder;

    component lt1 = LessThan(128);
    component lt2 = LessThan(128);
    component lt3 = LessThan(128);
    lt1.in[0] <== in[0];
    lt1.in[1] <== 0x10000000000000000;
    lt1.out === 1;
    lt2.in[0] <== in[1];
    lt2.in[1] <== 0x10000000000000000;
    lt2.out === 1;

    out <-- in[0] \ in[1];
    remainder <-- in[0] - out * in[1];

    lt3.in[0] <== remainder;
    lt3.in[1] <== in[1];
    lt3.out === 1;

    in[0] === in[1] * out + remainder;
}

template FpDivide() {
    /*
        in[0]: 32x32 fixedpt
        in[1]: 64 bit int
    */
    signal input in[2];
    /*
        out: 32x32 fixedpt, represents in[0] / in[1] truncated
    */
    signal output out;

    component intdiv = IntDivide();
    intdiv.in[0] <== in[0];
    intdiv.in[1] <== in[1];
    out <== intdiv.out;
}

template FpInt() {
    /*
        in: 32x32 fixedpt
    */
    signal input in;
    /*
        out: 32 bit int, represents integer part of in
    */
    signal output out;
    component intdiv = IntDivide();

    intdiv.in[0] <== in;
    intdiv.in[1] <== 0x100000000;

    out <== intdiv.out;
}

template FpFrac() {
    /*
        in: 32x32 fixedpt
    */
    signal input in;
    /*
        out: 32x32 fixedpt between 0 and 1, represents fractional part of in
    */
    signal output out;
    component intdiv = IntDivide();

    intdiv.in[0] <== in;
    intdiv.in[1] <== 0x100000000;
    out <== intdiv.remainder;
}

template FpAdd() {
    /*
        in[0]: 32x32 fixedpt
        in[1]: 32x32 fixedpt
    */
    signal input in[2];
    /*
        out: 32x32 fixedpt, represents in[0]+in[1]
    */
    signal output out;

    component lt1 = LessThan(128);
    component lt2 = LessThan(128);
    component lt3 = LessThan(128);

    lt1.in[0] <== in[0];
    lt1.in[1] <== 0x10000000000000000;
    lt1.out === 1;
    lt2.in[0] <== in[1];
    lt2.in[1] <== 0x10000000000000000;
    lt2.out === 1;

    out <== in[0] + in[1];

    lt3.in[0] <== out;
    lt3.in[1] <== 0x10000000000000000;
    lt3.out === 1;
}

template FpSubtract() {
    /*
        in[0]: 32x32 fixedpt
        in[1]: 32x32 fixedpt
    */
    signal input in[2];
    /*
        out: 32x32 fixedpt, represents in[0]-in[1]
    */
    signal output out;

    component lt1 = LessThan(128);
    component lt2 = LessThan(128);

    lt1.in[0] <== in[0];
    lt1.in[1] <== 0x10000000000000000;
    lt1.out === 1;
    lt2.in[0] <== in[0];
    lt2.in[1] <== in[1];
    lt2.out === 0;

    out <== in[0] - in[1];
}

template FpPow2() {
    /*
        in: 32x32 fixedpt
    */
    signal input in;
    /*
        in: 32x32 fixedpt
    */
    signal output out;

    component lt = LessEqThan(128);
    lt.in[0] <== in;
    lt.in[1] <== 0x2000000000 // 32x32 rep of 32
    lt.out === 1;

    component bitify = Num2Bits(38);
    bitify.in <== in;

    component multipliers[37];
    for (var i = 0; i < 37; i++) {
        multipliers[i] = FpMultiply();
    }
    multipliers[0].in[0]  <== (1 -  bitify.out[0]) * 0x100000000 +  bitify.out[0] * 0x100000001;
    multipliers[0].in[1]  <== (1 -  bitify.out[1]) * 0x100000000 +  bitify.out[1] * 0x100000001;
    multipliers[1].in[1]  <== (1 -  bitify.out[2]) * 0x100000000 +  bitify.out[2] * 0x100000003;
    multipliers[2].in[1]  <== (1 -  bitify.out[3]) * 0x100000000 +  bitify.out[3] * 0x100000006;
    multipliers[3].in[1]  <== (1 -  bitify.out[4]) * 0x100000000 +  bitify.out[4] * 0x10000000b;
    multipliers[4].in[1]  <== (1 -  bitify.out[5]) * 0x100000000 +  bitify.out[5] * 0x100000016;
    multipliers[5].in[1]  <== (1 -  bitify.out[6]) * 0x100000000 +  bitify.out[6] * 0x10000002c;
    multipliers[6].in[1]  <== (1 -  bitify.out[7]) * 0x100000000 +  bitify.out[7] * 0x100000059;
    multipliers[7].in[1]  <== (1 -  bitify.out[8]) * 0x100000000 +  bitify.out[8] * 0x1000000b1;
    multipliers[8].in[1]  <== (1 -  bitify.out[9]) * 0x100000000 +  bitify.out[9] * 0x100000163;
    multipliers[9].in[1]  <== (1 - bitify.out[10]) * 0x100000000 + bitify.out[10] * 0x1000002c6;
    multipliers[10].in[1] <== (1 - bitify.out[11]) * 0x100000000 + bitify.out[11] * 0x10000058c;
    multipliers[11].in[1] <== (1 - bitify.out[12]) * 0x100000000 + bitify.out[12] * 0x100000b17;
    multipliers[12].in[1] <== (1 - bitify.out[13]) * 0x100000000 + bitify.out[13] * 0x10000162e;
    multipliers[13].in[1] <== (1 - bitify.out[14]) * 0x100000000 + bitify.out[14] * 0x100002c5d;
    multipliers[14].in[1] <== (1 - bitify.out[15]) * 0x100000000 + bitify.out[15] * 0x1000058b9;
    multipliers[15].in[1] <== (1 - bitify.out[16]) * 0x100000000 + bitify.out[16] * 0x10000b172;
    multipliers[16].in[1] <== (1 - bitify.out[17]) * 0x100000000 + bitify.out[17] * 0x1000162e5;
    multipliers[17].in[1] <== (1 - bitify.out[18]) * 0x100000000 + bitify.out[18] * 0x10002c5cc;
    multipliers[18].in[1] <== (1 - bitify.out[19]) * 0x100000000 + bitify.out[19] * 0x100058ba0;
    multipliers[19].in[1] <== (1 - bitify.out[20]) * 0x100000000 + bitify.out[20] * 0x1000b175f;
    multipliers[20].in[1] <== (1 - bitify.out[21]) * 0x100000000 + bitify.out[21] * 0x100162f39;
    multipliers[21].in[1] <== (1 - bitify.out[22]) * 0x100000000 + bitify.out[22] * 0x1002c605e;
    multipliers[22].in[1] <== (1 - bitify.out[23]) * 0x100000000 + bitify.out[23] * 0x10058c86e;
    multipliers[23].in[1] <== (1 - bitify.out[24]) * 0x100000000 + bitify.out[24] * 0x100b1afa6;
    multipliers[24].in[1] <== (1 - bitify.out[25]) * 0x100000000 + bitify.out[25] * 0x10163daa0;
    multipliers[25].in[1] <== (1 - bitify.out[26]) * 0x100000000 + bitify.out[26] * 0x102c9a3e7;
    multipliers[26].in[1] <== (1 - bitify.out[27]) * 0x100000000 + bitify.out[27] * 0x1059b0d31;
    multipliers[27].in[1] <== (1 - bitify.out[28]) * 0x100000000 + bitify.out[28] * 0x10b5586d0;
    multipliers[28].in[1] <== (1 - bitify.out[29]) * 0x100000000 + bitify.out[29] * 0x1172b83c8;
    multipliers[29].in[1] <== (1 - bitify.out[30]) * 0x100000000 + bitify.out[30] * 0x1306fe0a3;
    multipliers[30].in[1] <== (1 - bitify.out[31]) * 0x100000000 + bitify.out[31] * 0x16a09e668;
    multipliers[31].in[1] <== (1 - bitify.out[32]) * 0x100000000 + bitify.out[32] * 0x200000000;
    multipliers[32].in[1] <== (1 - bitify.out[33]) * 0x100000000 + bitify.out[33] * 0x400000000;
    multipliers[33].in[1] <== (1 - bitify.out[34]) * 0x100000000 + bitify.out[34] * 0x1000000000;
    multipliers[34].in[1] <== (1 - bitify.out[35]) * 0x100000000 + bitify.out[35] * 0x10000000000;
    multipliers[35].in[1] <== (1 - bitify.out[36]) * 0x100000000 + bitify.out[36] * 0x1000000000000;
    multipliers[36].in[1] <== (1 - bitify.out[37]) * 0x100000000 + bitify.out[37] * 0x10000000000000000;
    for (var i = 1; i < 37; i++) {
        multipliers[i].in[0] <== multipliers[i-1].out;
    }
    out <== multipliers[36].out;
}

template DifficultyTerm() {
    /*
        in: 32x32 fixedpt representing number in [0,1]
    */
    signal input in;
    /*
        out: 32x32 fixedpt representing difficulty = in^4 * (1-in)^2
    */
    signal output out;

    component lt1 = LessThan(128);
    lt1.in[0] <== 0x100000000; // 1
    lt1.in[1] <== in;
    lt1.out === 0;

    component in2 = FpMultiply()
    in2.in[0] <== in;
    in2.in[1] <== in;

    component in4 = FpMultiply()
    in4.in[0] <== in2.out;
    in4.in[1] <== in2.out;

    component oneMinusIn = FpSubtract();
    oneMinusIn.in[0] <== 0x100000000; // 1
    oneMinusIn.in[1] <== in;

    component oneMinusIn2 = FpMultiply()
    oneMinusIn2.in[0] <== oneMinusIn.out;
    oneMinusIn2.in[1] <== oneMinusIn.out;

    component difficulty = FpMultiply()
    difficulty.in[0] <== in4.out;
    difficulty.in[1] <== oneMinusIn2.out;

    out <== difficulty.out;
}

template DifficultyOneDimension() {
    /*
        in: 32-bit int, <= 5184
    */
    signal input in;
    /*
        out: 32x32 fixedpt representing difficulty: diff(x) + diff(x/3) + diff(x/9) + ..., where x = in/64
    */
    signal output out;

    component x0Fp = FpDivide();
    component x1Fp = FpDivide();
    component x2Fp = FpDivide();
    component x3Fp = FpDivide();
    component x4Fp = FpDivide();
    component x5Fp = FpDivide();

    x0Fp.in[0] <== in * 0x100000000;
    x0Fp.in[1] <== 64;
    x1Fp.in[0] <== x0Fp.out;
    x1Fp.in[1] <== 3;
    x2Fp.in[0] <== x1Fp.out;
    x2Fp.in[1] <== 3;
    x3Fp.in[0] <== x2Fp.out;
    x3Fp.in[1] <== 3;
    x4Fp.in[0] <== x3Fp.out;
    x4Fp.in[1] <== 3;
    x5Fp.in[0] <== x4Fp.out;
    x5Fp.in[1] <== 3;

    component x0FracFp = FpFrac();
    component x1FracFp = FpFrac();
    component x2FracFp = FpFrac();
    component x3FracFp = FpFrac();
    component x4FracFp = FpFrac();
    component x5FracFp = FpFrac();

    x0FracFp.in <== x0Fp.out;
    x1FracFp.in <== x1Fp.out;
    x2FracFp.in <== x2Fp.out;
    x3FracFp.in <== x3Fp.out;
    x4FracFp.in <== x4Fp.out;
    x5FracFp.in <== x5Fp.out;

    component diff0Fp = DifficultyTerm();
    component diff1Fp = DifficultyTerm();
    component diff2Fp = DifficultyTerm();
    component diff3Fp = DifficultyTerm();
    component diff4Fp = DifficultyTerm();
    component diff5Fp = DifficultyTerm();

    diff0Fp.in <== x0FracFp.out;
    diff1Fp.in <== x1FracFp.out;
    diff2Fp.in <== x2FracFp.out;
    diff3Fp.in <== x3FracFp.out;
    diff4Fp.in <== x4FracFp.out;
    diff5Fp.in <== x5FracFp.out;

    component add1Fp = FpAdd();
    component add2Fp = FpAdd();
    component add3Fp = FpAdd();
    component add4Fp = FpAdd();
    component add5Fp = FpAdd();

    add1Fp.in[0] <== diff0Fp.out;
    add1Fp.in[1] <== diff1Fp.out;

    add2Fp.in[0] <== add1Fp.out;
    add2Fp.in[1] <== diff2Fp.out;

    add3Fp.in[0] <== add2Fp.out;
    add3Fp.in[1] <== diff3Fp.out;

    add4Fp.in[0] <== add3Fp.out;
    add4Fp.in[1] <== diff4Fp.out;

    add5Fp.in[0] <== add4Fp.out;
    add5Fp.in[1] <== diff5Fp.out;

    out <== add5Fp.out;
}

template DifficultyTwoDimension() {
    /*
        in[0]: 32-bit int, <= 5184
        in[1]: 32-bit int, <= 5184
    */
    signal input in[2];
    /*
        out: 32x32 fixedpt representing difficulty
    */
    signal output out;

    component difficultyX = DifficultyOneDimension();
    component difficultyY = DifficultyOneDimension();

    difficultyX.in <== in[0];
    difficultyY.in <== in[1];

    out <== difficultyX.out + difficultyY.out;
}

template DifficultyInvProb() {
    /*
        in[0]: 32-bit int, <= 5184
        in[1]: 32-bit int, <= 5184
    */
    signal input in[2];
    /*
        out: int representing 1/probability of successful hash,
        calculated as 2^(12 + 243/8 * difficulty)
        (i.e. lowest difficulty 2^12, highest difficulty 2^20)
    */
    signal output out;

    component difficulty = DifficultyTwoDimension();
    difficulty.in[0] <== in[0];
    difficulty.in[1] <== in[1];

    component scaledDifficulty = FpMultiply();
    scaledDifficulty.in[0] <== difficulty.out;
    scaledDifficulty.in[1] <== 0x1e60000000; // 243/8

    component exponent = FpAdd();
    exponent.in[0] <== 0xc00000000; // 12
    exponent.in[1] <== scaledDifficulty.out;

    component twoToExponent = FpPow2();
    twoToExponent.in <== exponent.out;

    component floor = FpInt();
    floor.in <== twoToExponent.out;

    out <== floor.out;
}
