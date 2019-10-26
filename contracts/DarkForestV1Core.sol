pragma solidity ^0.5.8;
import "./Verifier.sol";
import "./ABDKMath64x64.sol";

contract DarkForestV1 is Verifier {
    using ABDKMath64x64 for *;

    uint256 constant UINT256_MAX = ~uint256(0);
    uint8 constant VERSION = 1;

    uint public maxX = 999;
    uint public maxY = 999;
    uint difficulty = 1000;
    uint capacity = 100000; // in milliPopulation
    uint growth = 1000; // maximum growth rate, achieved at milliPops = 50000, in milliPopulation per second

    uint256 constant LOCATION_ID_UB = 21888242871839275222246405745257275088548364400416034343698204186575808495617;

    struct Planet {
        uint locationId;
        address owner;

        uint capacity;
        uint growth;
        uint population;
        uint lastUpdated;

        bool coordinatesRevealed;
        uint x;
        uint y;

        uint8 version;
    }

    event PlayerInitialized(address player, uint loc);
    event PlayerMoved(address player, uint oldLoc, uint newLoc, uint maxDist, uint shipsMoved);

    uint[] public planetIds;
    mapping (uint => Planet) public planets;
    address[] public playerIds;
    mapping (address => bool) public playerInitialized;
    // TODO: how to query all planets owned by player?

    function planetIsInitialized(uint _loc) private view returns (bool) {
        return !(planets[_loc].locationId == 0);
    }

    function planetIsOccupied(uint _loc) private view returns (bool) {
        return !(planets[_loc].owner == address(0)) || planets[_loc].population == 0;
    }

    function ownerIfOccupiedElseZero(uint _loc) private view returns (address) {
        return planetIsOccupied(_loc) ? planets[_loc].owner : address(0);
    }

    function getNPlanets() public view returns (uint) {
        return planetIds.length;
    }

    function getNPlayers() public view returns (uint) {
        return playerIds.length;
    }

    function getPlanetsOfPlayer(address _player) public view returns (Planet[] memory) {
        Planet[] memory planetsOfPlayer;
        for (uint i=0; i<planetIds.length; i++) {
            uint locationId = planetIds[i];
            if (ownerIfOccupiedElseZero(locationId) == _player) {
                planetsOfPlayer[planetsOfPlayer.length] = planets[locationId];
            }
        }
        return planetsOfPlayer;
    }

    function locationIdValid(uint _loc) private view returns (bool) {
        return (_loc < (LOCATION_ID_UB / difficulty));
    }

    function initializePlanet(uint _loc, address _player, uint _population) private {
        require (locationIdValid(_loc));
        planets[_loc] = Planet(_loc, _player, capacity, growth, _population, now, false, 0, 0, 1);
        planetIds.push(_loc);
    }

    function updatePopulation(uint _locationId) private {
        // logistic growth: in T time, population p1 increases to population
        // p2 = capacity / (1 + e^{-4 * growth * T / capacity} * ((capacity / p1) - 1))
        if (!planetIsOccupied(_locationId)) {
            return;
        }
        Planet storage planet = planets[_locationId];
        // check for div by zero
        if (planet.population == 0) {
            return;
        }
        uint time_elapsed = now - planet.lastUpdated;

        // 1
        int128 one = ABDKMath64x64.fromUInt(1);

        // e^{-4 * growth * T / capacity}
        uint exponent_num_abs = 4 * planet.growth * time_elapsed;
        int128 exponent = ABDKMath64x64.neg(ABDKMath64x64.divu(exponent_num_abs, planet.capacity));
        int128 e_to_power_of_exponent = ABDKMath64x64.exp(exponent);

        // (capacity / p1) - 1
        int128 inv_pop_ratio = ABDKMath64x64.divu(planet.capacity, planet.population);
        int128 inv_pop_ratio_minus_one = ABDKMath64x64.sub(inv_pop_ratio, one);

        // denominator
        int128 exp_times_ratio = ABDKMath64x64.mul(e_to_power_of_exponent, inv_pop_ratio_minus_one);
        int128 denominator = ABDKMath64x64.add(one, exp_times_ratio);

        // numerator
        int128 numerator = ABDKMath64x64.fromUInt(planet.capacity);

        // new population
        uint64 new_pop = ABDKMath64x64.toUInt(ABDKMath64x64.div(numerator, denominator));
        planet.population = uint (new_pop);

        planet.lastUpdated = now;
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
        playerInitialized[player] = true;
        initializePlanet(loc, player, 100);

        emit PlayerInitialized(player, loc);
    }

    function moveShipsDecay(uint shipsMoved) private pure returns (uint) {
        // TODO: implement decay. Will need to take distance as param.
        return shipsMoved;
    }

    function moveCheckproof(
        uint[2] memory _a,
        uint[2][2] memory _b,
        uint[2] memory _c,
        uint[4] memory _input
    ) private view {
        uint[3] memory input012;
        for (uint i=0; i<input012.length; i++) {
            input012[i] = _input[i];
        }
        require(verifyMoveProof(_a, _b, _c, input012));
    }

    function moveCommon(
        uint[4] memory _input
    ) private {
        // preliminary checks to ensure the move is not illegal
        address player = msg.sender;
        uint oldLoc = _input[0];
        uint newLoc = _input[1];
        uint shipsMoved = _input[3];

        require(playerInitialized[player]); // player exists
        require(ownerIfOccupiedElseZero(oldLoc) == player); // planet at oldLoc is occupied by player

        updatePopulation(oldLoc);
        updatePopulation(newLoc);
        require(planets[oldLoc].population >= shipsMoved); // player can move at most as many ships as exist on oldLoc
    }

    function moveUninhabited(
        uint[2] memory _a,
        uint[2][2] memory _b,
        uint[2] memory _c,
        uint[4] memory _input
    ) public {
        moveCheckproof(_a, _b, _c, _input);
        moveCommon(_input);

        address player = msg.sender;
        uint oldLoc = _input[0];
        uint newLoc = _input[1];
        uint maxDist = _input[2];
        uint shipsMoved = _input[3];

        // planet at newLoc not occupied
        require(!planetIsOccupied(newLoc));
        if (!planetIsInitialized(newLoc)) {
            initializePlanet(newLoc, player, 0);
        }
        planets[oldLoc].population -= shipsMoved;
        uint shipsLanded = moveShipsDecay(shipsMoved);
        planets[newLoc].population += shipsLanded;
        if (planets[newLoc].population > planets[newLoc].capacity) {
            planets[newLoc].population = planets[newLoc].capacity;
        }

        emit PlayerMoved(player, oldLoc, newLoc, maxDist, shipsMoved);
    }

    function moveFriendly(
        uint[4] memory _input
    ) public {
        moveCommon(_input);

        address player = msg.sender;
        uint oldLoc = _input[0];
        uint newLoc = _input[1];
        uint maxDist = _input[2];
        uint shipsMoved = _input[3];

        // planet at newLoc is occupied by player
        require(ownerIfOccupiedElseZero(newLoc) == player);

        planets[oldLoc].population -= shipsMoved;
        uint shipsLanded = moveShipsDecay(shipsMoved);
        planets[newLoc].population += shipsLanded;
        if (planets[newLoc].population > planets[newLoc].capacity) {
            planets[newLoc].population = planets[newLoc].capacity;
        }
        emit PlayerMoved(player, oldLoc, newLoc, maxDist, shipsMoved);
    }

    function moveEnemy(
        uint[2] memory _a,
        uint[2][2] memory _b,
        uint[2] memory _c,
        uint[4] memory _input
    ) public {
        moveCheckproof(_a, _b, _c, _input);
        moveCommon(_input);

        address player = msg.sender;
        uint oldLoc = _input[0];
        uint newLoc = _input[1];
        uint maxDist = _input[2];
        uint shipsMoved = _input[3];

        // planet at newLoc is owned by a player other than this one
        address enemyOwner = ownerIfOccupiedElseZero(newLoc);
        require (enemyOwner != address(0) && enemyOwner != player);

        planets[oldLoc].population -= shipsMoved;
        uint shipsLanded = moveShipsDecay(shipsMoved);

        // TODO: maybe want to implement additional defender's advantage.
        // Currently ships annihilate 1 to 1
        // (though attacking ships have already undergone decay)
        if (planets[newLoc].population <= shipsLanded) {
            // attack reduces target planet's garrison but doesn't conquer it
            planets[newLoc].population -= shipsLanded;
        } else {
            planets[newLoc].owner = player;
            planets[newLoc].population = shipsLanded - planets[newLoc].population;
        }

        planets[newLoc].population += shipsMoved;

        emit PlayerMoved(player, oldLoc, newLoc, maxDist, shipsMoved);
    }

}
