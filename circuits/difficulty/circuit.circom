include "../circomlib/circuits/comparators.circom"

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

template FpFrac() {
	/*
		in: 32x32 fixedpt
	*/
	signal input in;
	/*
		out: 32x32 fixedpt, represents fractional part of in
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

template Difficulty() {
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

template DifficultyPair() {
	/*
		in[0]: 32-bit int, <= 5184
		in[1]: 32-bit int, <= 5184
	*/
	signal input in[2];
	signal output out;

	component difficultyX = Difficulty();
	component difficultyY = Difficulty();

	difficultyX.in <== in[0];
	difficultyY.in <== in[1];

	out <== difficultyX.out + difficultyY.out;
}

component main = DifficultyPair();
