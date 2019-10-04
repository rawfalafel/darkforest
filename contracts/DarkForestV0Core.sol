pragma solidity ^0.5.8;

contract DarkForest {

    uint public p = 23;
    uint public q = 29;
    uint public m = p * q;
    uint public g = 465;
    uint public h = 553;
    uint private gInv = 175;
    uint private hInv = 392;

    uint hashGen = 191981998178538467192271372964660528157;
    uint hashPrime = 273389558745553615023177755634264971227;

    mapping (address => uint) public playerLocations;
    address[] public players;

    function _modExponentiation(uint _base, uint _exp, uint _modulus) private pure returns (uint) {
        if (_exp == 0) {
            return 1;
        } else if (_exp == 1) {
            return _base % _modulus;
        } else if (_exp % 2 == 0) {
            uint half = _modExponentiation(_base, _exp/2, _modulus);
            return (half * half) % _modulus;
        } else {
            uint half = _modExponentiation(_base, _exp/2, _modulus);
            return (((half * half) % _modulus) * _base) % _modulus;
        }
    }

    function _jankHash(uint[10] memory _arr) private view returns (uint) {
        uint sum = 0;
        for (uint i=0; i<10; i++) {
            sum += _arr[i];
        }
        return _modExponentiation(hashGen, sum, hashPrime);
    }

    function _pseudoRandomBits(uint[10] memory _arr) private view returns (uint[10] memory) {
        uint hash = _jankHash(_arr);
        uint[10] memory b;
        for (uint i=0; i<10; i++) {
            b[i] = (hash >> i) % 2;
        }
        return b;
    }

    function _verifyDlogProof(uint _y, uint _generator, uint _modulus, uint[10][2] memory _proof) private view returns (bool) {
        uint[10] memory t = _proof[0];
        uint[10] memory s = _proof[1];
        uint[10] memory b = _pseudoRandomBits(t);
        for (uint i=0; i<10; i++) {
            uint lhs = _modExponentiation(_generator, s[i], _modulus);
            uint rhs = (t[i] * (_y ** b[i])) % _modulus;
            if (lhs != rhs) {
                return false;
            }
        }
        return true;
    }

    function _validateProof(uint z, uint[10][2][2] memory proofs) private view returns (bool) {
        return (_verifyDlogProof(z%p, g, p, proofs[0]) && _verifyDlogProof(z%q, h, q, proofs[1]));
    }

    function initializePlayer(uint _r, uint[10][2][2] memory _proofs) public {
        address player = msg.sender;
        require(playerLocations[player] == 0); // player doesn't already have an account
        require(!_isOccupied(_r));
        require(_validateProof(_r, _proofs));
        players.push(player);
        playerLocations[player] = _r;
    }

    function _isOccupied(uint _r) private view returns (bool) {
        for (uint i = 0; i < players.length; i++) {
            if (_r == playerLocations[players[i]]) {
                return true;
            }
        }
        return false;
    }

    function move(int _a, int _b) public {
        address player = msg.sender;
        require(playerLocations[player] != 0); // player has account
        uint gMove = _a >= 0 ? _modExponentiation(g, uint(_a), m) : _modExponentiation(gInv, uint(-_a), m);
        uint hMove = _b >= 0 ? _modExponentiation(h, uint(_b), m) : _modExponentiation(hInv, uint(-_b), m);
        uint rNew = (playerLocations[msg.sender] * gMove * hMove) % m;
        require(!_isOccupied(rNew));
        playerLocations[player] = rNew;
    }

}
