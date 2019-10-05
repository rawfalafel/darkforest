pragma solidity ^0.5.8;
import "./Crypto.sol";

contract DarkForest is Crypto {

    uint public p = 23;
    uint public q = 29;
    uint public m = p * q;
    uint public g = 465;
    uint public h = 553;
    uint private gInv = 175;
    uint private hInv = 392;

    mapping (address => uint) public playerLocations;
    address[] public players;

    function _validateProof(uint z, uint[PARALLELS][2][2] memory proofs) private view returns (bool) {
        return (_verifyDlogProof(z%p, g, p, proofs[0]) && _verifyDlogProof(z%q, h, q, proofs[1]));
    }

    function initializePlayer(uint _r, uint[PARALLELS][2][2] memory _proofs) public {
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

    function getNPlayers() public view returns (uint) {
        return players.length;
    }

}
