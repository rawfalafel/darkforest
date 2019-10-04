pragma solidity ^0.5.8;

contract DarkForest {

    uint public p = 23;
    uint public q = 29;
    uint public m = p * q;
    uint public g = 465;
    uint public h = 553;
    uint private gInv = 175;
    uint private hInv = 392;

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

    function uint2bytes(uint i) private pure returns (bytes memory){
        if (i == 0) return "0";
        uint j = i;
        uint length;
        while (j != 0){
            length++; j /= 10;
        }
        bytes memory bstr = new bytes(length);
        uint k = length - 1;
        while (i != 0){
            bstr[k--] = byte(uint8(48) + uint8(i % 10));
            i /= 10;
        }
        return bstr;
    }

    function uintArrToString(uint[10] memory _arr) private pure returns (string memory) {
        bytes[10] memory uints2bytes;
        for (uint i=0; i<10; i++) {
            uints2bytes[i] = uint2bytes(_arr[i]);
        }
        uint length = 22; // 2*10+2
        for (uint i=0; i<10; i++) {
            length += uints2bytes[i].length;
        }
        bytes memory bstr = new bytes(length);
        uint k=0;
        bstr[k++] = byte(uint8(91)); // "["
        for (uint i=0; i<10; i++) {
            bstr[k++] = byte(uint8(32)); // " "
            for (uint j=0; j<uints2bytes[i].length; j++) {
                bstr[k++] = uints2bytes[i][j];
            }
            bstr[k++] = byte(uint8(44)); // ","
        }
        bstr[k++] = byte(uint8(93)); // "]";
        return string(bstr);
    }

    function _randomBitsFromUintArr(uint[10] memory _arr) private pure returns (bool[256] memory) {
        string memory repr = uintArrToString(_arr);
        bytes32 hash = keccak256(abi.encodePacked(repr));
        bool[256] memory bits;
        for (uint i=0; i<32; i++) {
            byte elt = hash[i];
            for (uint bit=0; bit<8; bit++) {
                bits[i*8+bit] = ((elt >> bit) & 0x01 != 0);
            }
        }
        return bits;
    }

    function _verifyDlogProof(uint _y, uint _generator, uint _modulus, uint[10][2] memory _proof) private pure returns (bool) {
        uint[10] memory t = _proof[0];
        uint[10] memory s = _proof[1];
        bool[256] memory b = _randomBitsFromUintArr(t);
        for (uint i=0; i<10; i++) {
            uint lhs = _modExponentiation(_generator, s[i], _modulus);
            uint rhs = (b[i] ? _y : 1) * t[i]  % _modulus;
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
