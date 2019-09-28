const prime = BigInt("273389558745553615023177755634264971227");
const gen = BigInt("191981998178538467192271372964660528157");
const PARALLELS = 100;

function bigExponentiate(base, exp, mod) {
    // base: BigInt
    // exp: int
    // mod: BigInt
    if (exp == 0) {
        return BigInt(1);
    } else if (exp == 1) {
        return base % mod;
    } else if (exp % 2 == 0) {
        const half = bigExponentiate(base, exp/2, mod);
        return (half * half) % mod;
    } else {
        const half = bigExponentiate(base, Math.floor(exp/2), mod);
        return (half * half * base) % mod;
    }
}

function jankHash(arr) {
    // arr: array[int]
    const s = arr.reduce((a,b) => (a+b), 0);
    return bigExponentiate(gen, s, prime);
}

function pseudoRandomBits(t) {
    // t: array[int]
    // return: array[int] of bits
    // pseudorandom [b1,...,bPARALLELS] from [t1,...,tPARALLELS]
    const H = jankHash(t);
    var b = [];
    for (var i=0; i<PARALLELS; i++) {
        const pow2 = (BigInt(2) ** BigInt(i));
        b.push(((H & pow2) > BigInt(0)) ? 1 : 0);
    }
    return b;
}

function dLogProof(x, g, p) {
    // x: int, in [p-1]
    // g: int, generator mod p
    // p: int, prime
    // return: [array[int], array[int]], each of length PARALLELS
    // ZK proof of knowledge of x such that g^x = y mod p
    var r = [];
    for (var i=0; i<PARALLELS; i++) {
        r.push(Math.floor(Math.random()*(p-1)));
    }
    const gBig = BigInt(g);
    const pBig = BigInt(p);
    var t = r.map(ri => Number(bigExponentiate(gBig, ri, pBig)));
    var b = pseudoRandomBits(t);
    var s = [];
    for (var i=0; i<PARALLELS; i++) {
        s.push(r[i] + b[i]*x);
    }
    return [t,s];
}

function verifyDlogProof(y, g, p, proof) {
    // y: int, in [p]*
    // g: int, generator mod p
    // p: int, prime
    // proof: [array[int],array[int]] of length PARALLELS
    // Verify ZK proof (t,s) of knowledge x such that g^x = y mod p
    const t = proof[0];
    const s = proof[1];
    const b = pseudoRandomBits(t);
    const gBig = BigInt(g);
    const yBig = BigInt(y);
    const pBig = BigInt(p);
    const oneBig = BigInt(1);
    for (var i=0; i<PARALLELS; i++) {
        const lhs = bigExponentiate(gBig, s[i], pBig);
        const rhs = ((b[i] == 1 ? yBig : oneBig) * BigInt(t[i])) % pBig;
        if (lhs != rhs) {
            return false;
        }
    }
    return true;
}

function testOneDimension() {
    const p=31;
    const g=3;
    const x=17;
    const y=22;
    // Let's prove we know x such that g^x = y mod p
    proof = dLogProof(x, g, p);
    goodResult = verifyDlogProof(y, g, p, proof);
    console.log('This should be true: ' + goodResult);
    badResult = verifyDlogProof(23, g, p, proof);
    console.log('This should be false: ' + badResult);
}

function twoDimDLogProof(x, y, g, h, p, q) {
    // x: int, in [p-1]
    // y: int, in [q-1]
    // g: int, generator mod p and 1 mod q
    // h: int, generator mod q and 1 mod p
    // p: int, prime
    // q: int, prime
    // return: [array[int], array[int], array[int], array[int]], each of length PARALLELS
    // ZK proofs of knowledge of x, y such that g^xh^y = z mod pq
    proof1 = dLogProof(x, g%p, p);
    proof2 = dLogProof(y, h%q, q);
    return [proof1, proof2]
}

function verifyTwoDimLogProof(z, g, h, p, q, proofs) {
    // z: int, in [pq]*
    // g: int, generator mod p and 1 mod q
    // h: int, generator mod q and 1 mod p
    // p: int, prime
    // q: int, prime
    // Verify ZK proofs of knowledge of x, y such that g^xh^y = z
    return verifyDlogProof(z%p, g, p, proofs[0]) && verifyDlogProof(z%q, h, q, proofs[1]);
}

function testTwoDimension() {
    const p = 23;
    const q = 31;
    const g = 559; // 7 mod 23, 1 mod 31
    const h = 323; // 1 mod 23, 13 mod 31
    const x = 15;
    const y = 17;
    const z = 451;
    // Let's prove we know x,y such that g^xh^y = z mod pq
    proofs = twoDimDLogProof(x, y, g, h, p, q);
    goodResult = verifyTwoDimLogProof(z, g, h, p, q, proofs);
    console.log('This should be true: ' + goodResult);
    badResult = verifyTwoDimLogProof(163, g, h, p, q, proofs);
    console.log('This should be false: ' + badResult);
}
