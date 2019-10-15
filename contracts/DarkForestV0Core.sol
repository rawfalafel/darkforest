pragma solidity ^0.5.8;
import "./Crypto.sol";
import "./Verifier.sol";

contract DarkForest is Crypto, Verifier {

    uint public maxX = 30;
    uint public maxY = 30;

    mapping (address => uint) public playerLocations;
    address[] public players;

    function _isOccupied(uint _r) private view returns (bool) {
        for (uint i = 0; i < players.length; i++) {
            if (_r == playerLocations[players[i]]) {
                return true;
            }
        }
        return false;
    }

    function getNPlayers() public view returns (uint) {
        return players.length;
    }

    function initializePlayer(
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
        require(playerLocations[player] == 0); // player doesn't have account
        require (!_isOccupied(loc)); // loc not occupied
        players.push(player);
        playerLocations[player] = loc;
    }

    function move(
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
        require(oldLoc != 0); // player has account
        require(playerLocations[player] == oldLoc); // player at oldLoc
        require(!_isOccupied(newLoc)); // newLoc empty
        playerLocations[player] = newLoc;
    }

}
