pragma solidity ^0.5.8;

contract DarkForest {

    uint p = 23;
    uint q = 29;
    uint m = p * q;
    uint g = 5;
    uint h = 2;

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

    function _validateProof(uint r, string memory proof) private view returns (bool) {
        return true;
    }

    function initializePlayer(uint rInit, string memory proof) public {
        require(!_isOccupied(rInit));
        require(_validateProof(rInit, proof));
        players.push(msg.sender);
        playerLocations[msg.sender] = rInit;
    }

    function move(uint a, uint b) public {
        uint rNew = (playerLocations[msg.sender] * (g**a) * (h**b)) % m;
        require(!_isOccupied(rNew));
        playerLocations[msg.sender] = rNew;
    }

}
