pragma solidity ^0.5.8;
import "./Crypto.sol";
import "./Verifier.sol";

contract DarkForest is Crypto, Verifier {

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

    function newInitialize(
        uint[2] memory _a,
        uint[2] memory _a_p,
        uint[2][2] memory _b,
        uint[2] memory _b_p,
        uint[2] memory _c,
        uint[2] memory _c_p,
        uint[2] memory _h,
        uint[2] memory _k,
        uint[1] memory _input
    ) public {
        require(verifyInitProof(_a, _a_p, _b, _b_p, _c, _c_p, _h, _k, _input));
        address player = msg.sender;
        uint loc = _input[0];
        // require player doesn't have account
        // require loc not occupied
        // players.push(player)
        // playerLocations[player] = loc
    }

    function newMove(
        uint[2] memory _a,
        uint[2] memory _a_p,
        uint[2][2] memory _b,
        uint[2] memory _b_p,
        uint[2] memory _c,
        uint[2] memory _c_p,
        uint[2] memory _h,
        uint[2] memory _k,
        uint[3] memory _input
    ) public {
        require(verifyMoveProof(_a, _a_p, _b, _b_p, _c, _c_p, _h, _k, _input));
        address player = msg.sender;
        uint oldLoc = _input[0];
        uint newLoc = _input[1];
        uint maxDist = _input[2];
        // require player has account
        // require player at oldLoc
        // require newLoc empty
        // playerLocations[player] = newLoc
    }

}
