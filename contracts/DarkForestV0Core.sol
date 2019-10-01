pragma solidity ^0.5.8;

contract DarkForest {

    uint public p = 23;
    uint public q = 29;
    uint public m = p * q;
    uint public g = 465;
    uint public h = 553;

    uint hashGen = 191981998178538467192271372964660528157;
    uint hashPrime = 273389558745553615023177755634264971227;

    function _modExponentiation(uint base, uint exp, uint modulus) private pure returns (uint) {
        if (exp == 0) {
            return 1;
        } else if (exp == 1) {
            return base;
        } else if (exp % 2 == 0) {
            uint half = _modExponentiation(base, exp/2, modulus);
            return (half * half) % modulus;
        } else {
            uint half = _modExponentiation(base, exp/2, modulus);
            return (((half * half) % modulus) * base) % modulus;
        }
    }

    function _jankHash(uint[100] memory arr) private view returns (uint) {
        uint sum = 0;
        for (uint i=0; i<100; i++) {
            sum += arr[i];
        }
        return _modExponentiation(hashGen, sum, hashPrime);
    }

    function _pseudoRandomBits(uint[100] memory arr) private view returns (uint[100] memory) {
        uint hash = _jankHash(arr);
        uint[100] memory b;
        for (uint i=0; i<100; i++) {
            b[i] = (hash >> i) % 2;
        }
        return b;
    }

    function _verifyDlogProof(uint y, uint generator, uint modulus, uint[100][2] memory proof) private view returns (bool) {
        uint[100] memory t = proof[0];
        uint[100] memory s = proof[1];
        uint[100] memory b = _pseudoRandomBits(t);
        for (uint i=0; i<100; i++) {
            uint lhs = _modExponentiation(generator, s[i], modulus);
            uint rhs = t[i] * (y ** b[i]) % modulus;
            if (lhs != rhs) {
                return false;
            }
        }
        return true;
    }

    function _validateProof(uint z, uint[100][2][2] memory proofs) private view returns (bool) {
        return (_verifyDlogProof(z%p, g, p, proofs[0]) && _verifyDlogProof(z%q, h, q, proofs[1]));
    }

    function initializePlayer(uint rInit, uint[100][2][2] memory proof) public {
        require(!_isOccupied(rInit));
        require(_validateProof(rInit, proof));
        players.push(msg.sender);
        playerLocations[msg.sender] = rInit;
    }

    mapping (address => uint) public playerLocations;
    address[] public players;

    function _isOccupied(uint r) private view returns (bool) {
        for (uint i = 0; i < players.length; i++) {
            if (r == playerLocations[players[i]]) {
                return false;
            }
        }
        return true;
    }

    function move(uint a, uint b) public {
        uint rNew = (playerLocations[msg.sender] * (g**a) * (h**b)) % m;
        require(!_isOccupied(rNew));
        playerLocations[msg.sender] = rNew;
    }

    function dummyFn() public pure returns (uint) {
        return 3;
    }

}
