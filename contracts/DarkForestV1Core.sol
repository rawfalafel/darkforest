pragma solidity ^0.5.8;
import "./Verifier.sol";

contract DarkForestV1 is Verifier {

    uint256 constant UINT256_MAX = ~uint256(0);
    uint8 constant VERSION = 1;

    uint public maxX = 999;
    uint public maxY = 999;
    uint difficulty = 1000;
    uint capacity = 100000; // in milliPopulation
    uint growth = 1000; // maximum growth rate, achieved at milliPops = 50000, in milliPopulation per second

    struct Planet {
        uint locationId;
        uint units;
        uint lastUpdated;
        address owner;
        bool coordinatesRevealed;
        int x;
        int y;
        uint8 version;
    }

    event PlayerInitialized(address player, uint loc);
    event PlayerMoved(address player, uint oldLoc, uint newLoc, uint maxDist);

    uint[] public planetIds;
    mapping (uint => Planet) public planets;
    address[] public playerIds;
    mapping (address => bool) public playerInitialized;
    mapping (address => uint[]) public playerPlanetMap;

    function planetIsInitialized(uint _r) private view returns (bool) {
        return !(planets[_r].locationId == 0);
    }

    function planetIsOccupied(uint _r) private view returns (bool) {
        return !(planets[_r].owner == address(0)) || planets[_r].units == 0;
    }

    function getNPlanets() public view returns (uint) {
        return planetIds.length;
    }

    function getNPlayers() public view returns (uint) {
        return playerIds.length;
    }

    function updateUnits(planet) public view returns (uint) {
        
    }

    function initializePlayer(
        uint[2] memory _a,
        uint[2][2] memory _b,
        uint[2] memory _c,
        uint[1] memory _input
    ) public {
        require(verifyInitProof(_a, _b, _c, _input));
        address player = msg.sender;
        uint loc = _input[0];
        require(!playerInitialized[player]); // player doesn't have account
        require (!planetIsInitialized(loc)); // loc was never owned

        playerIds.push(player);
        playerInitialized[player] = loc;
        Planet homePlanet = Planet(loc, 100, block.number, player, false, 0, 0, 1);
        planets[homePlanet.locationId] = homePlanet;
        planetIds.push(homePlanet.locationId);
        playerPlanetMap[player] = [homePlanet.locationId];

        emit PlayerInitialized(player, loc);
    }

    function move(
        uint[2] memory _a,
        uint[2][2] memory _b,
        uint[2] memory _c,
        uint[4] memory _input
    ) public {
        require(verifyMoveProof(_a, _b, _c, _input));
        address player = msg.sender;
        uint oldLoc = _input[0];
        uint newLoc = _input[1];
        uint maxDist = _input[2];
        uint maxDist = _input[3];
        require(playerInitialized[player]);
        require(planets[oldLoc].owner == player);

        require(playerLocations[player] == oldLoc); // player at oldLoc
        require(!planetIsOccupied(newLoc)); // newLoc empty

        playerLocations[player] = newLoc;

        emit PlayerMoved(player, oldLoc, newLoc, maxDist);
    }

}
