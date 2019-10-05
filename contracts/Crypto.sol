pragma solidity ^0.5.8;

contract Crypto {

    uint constant PARALLELS = 10;

    function _modExponentiation(uint _base, uint _exp, uint _modulus) internal pure returns (uint) {
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

    function _uint2bytes(uint i) private pure returns (bytes memory){
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

    function _uintArrToString(uint[PARALLELS] memory _arr) private pure returns (string memory) {
        bytes[PARALLELS] memory byteReprs;
        for (uint i=0; i<PARALLELS; i++) {
            byteReprs[i] = _uint2bytes(_arr[i]);
        }
        uint length = 2*PARALLELS + 2;
        for (uint i=0; i<PARALLELS; i++) {
            length += byteReprs[i].length;
        }
        bytes memory bstr = new bytes(length);
        uint k=0;
        bstr[k++] = byte(uint8(91)); // "["
        for (uint i=0; i<PARALLELS; i++) {
            bstr[k++] = byte(uint8(32)); // " "
            for (uint j=0; j<byteReprs[i].length; j++) {
                bstr[k++] = byteReprs[i][j];
            }
            bstr[k++] = byte(uint8(44)); // ","
        }
        bstr[k++] = byte(uint8(93)); // "]";
        return string(bstr);
    }

    function _randomBitsFromUintArr(uint[PARALLELS] memory _arr) private pure returns (bool[256] memory) {
        string memory repr = _uintArrToString(_arr);
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

    function _verifyDlogProof(uint _y, uint _generator, uint _modulus, uint[PARALLELS][2] memory _proof) internal pure returns (bool) {
        uint[PARALLELS] memory t = _proof[0];
        uint[PARALLELS] memory s = _proof[1];
        bool[256] memory b = _randomBitsFromUintArr(t);
        for (uint i=0; i<PARALLELS; i++) {
            uint lhs = _modExponentiation(_generator, s[i], _modulus);
            uint rhs = (b[i] ? _y : 1) * t[i]  % _modulus;
            if (lhs != rhs) {
                return false;
            }
        }
        return true;
    }

}
