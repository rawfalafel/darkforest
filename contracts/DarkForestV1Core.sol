pragma solidity ^0.5.8;
pragma experimental ABIEncoderV2;
import "./Verifier.sol";
import "./ABDKMath64x64.sol";

contract DarkForestV1 is Verifier {
    using ABDKMath64x64 for *;

    uint8 constant VERSION = 1;

    uint public xSize = 2048;
    uint public ySize = 2048;
    uint public planetRarity = 4096;
    uint public nPlanetTypes = 12;
    uint[12] public defaultCapacity = [0, 100000, 150000, 500000, 1500000, 5000000, 15000000, 40000000, 100000000, 200000000, 350000000, 500000000];
    uint[12] public defaultGrowth = [16700, 25000, 33300, 50000, 66700, 83300, 100000, 116700, 133300, 150000, 166700]; // max growth rate, achieved at 50% population, in milliPop per second
    uint[12] public defaultHardiness = [50, 100, 200, 400, 800, 1600, 3200, 5000, 7200, 10000, 12000];
    uint[12] public defaultStalwartness = [900, 800, 700, 600, 500, 400, 300, 200, 100, 75, 50];

    uint256 constant LOCATION_ID_UB = 21888242871839275222246405745257275088548364400416034343698204186575808495617;

    enum PlanetType {
        None,
        LittleAsteroid,
        BigAsteroid,
        BrownDwarf,
        RedDwarf,
        WhiteDwarf,
        YellowStar,
        BlueStar,
        SubGiant,
        Giant,
        SuperGiant,
        HyperGiant
    }

    struct Planet {
        uint locationId;
        address owner;

        PlanetType planetType;
        uint capacity;
        uint growth;
        uint hardiness;
        uint stalwartness;
        uint population;
        uint lastUpdated;
    }

    struct PlanetMetadata {
        uint locationId;
        address owner;

        bool coordinatesRevealed;
        uint x;
        uint y;

        uint8 version;
    }

    event PlayerInitialized(address player, uint loc, Planet planet);
    event PlayerMoved(address player, uint oldLoc, uint newLoc, uint maxDist, uint shipsMoved, Planet fromPlanet, Planet toPlanet);

    uint[] public planetIds;
    mapping (uint => Planet) public planets;
    mapping (uint => PlanetMetadata) public planetMetadatas;
    address[] public playerIds;
    mapping (address => bool) public playerInitialized;
    // TODO: how to query all planets owned by player?

    function toBytes(uint256 x) private pure returns (bytes memory b) {
        b = new bytes(32);
        assembly { mstore(add(b, 32), x) }
    }

    function getPlanetType(uint _loc) private pure returns (PlanetType) {
        bytes memory b = toBytes(_loc);
        uint planetTypeUInt;
        for (uint i = 4; i < 7; i++) {
            planetTypeUInt = planetTypeUInt + uint(uint8(b[i])) * (2**(8 * (6 - i)));
        }
        if (planetTypeUInt < 8) {
            return PlanetType.HyperGiant;
        } else if (planetTypeUInt < 64) {
            return PlanetType.SuperGiant;
        } else if (planetTypeUInt < 512) {
            return PlanetType.Giant;
        } else if (planetTypeUInt < 2048) {
            return PlanetType.SubGiant;
        } else if (planetTypeUInt < 8192) {
            return PlanetType.BlueStar;
        } else if (planetTypeUInt < 32768) {
            return PlanetType.YellowStar;
        } else if (planetTypeUInt < 131072) {
            return PlanetType.WhiteDwarf;
        } else if (planetTypeUInt < 524288) {
            return PlanetType.RedDwarf;
        } else if (planetTypeUInt < 2097152) {
            return PlanetType.BrownDwarf;
        } else if (planetTypeUInt < 8388608) {
            return PlanetType.BigAsteroid;
        } else if (planetTypeUInt < 16777216) {
            return PlanetType.LittleAsteroid;
        }
        return PlanetType.None;
    }

    function planetIsInitialized(uint _loc) private view returns (bool) {
        return !(planets[_loc].locationId == 0);
    }

    function planetIsOccupied(uint _loc) private view returns (bool) {
        return !(planets[_loc].owner == address(0)) || planets[_loc].population != 0;
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

    function locationIdValid(uint _loc) private view returns (bool) {
        return (_loc < (LOCATION_ID_UB / planetRarity));
    }

    function initializePlanet(uint _loc, address _player, uint _population) private {
        require (locationIdValid(_loc));
        PlanetType planetType = getPlanetType(_loc);
        Planet memory newPlanet;
        newPlanet.locationId = _loc;
        newPlanet.owner = _player;
        newPlanet.planetType = planetType;
        newPlanet.capacity = defaultCapacity[uint(planetType)];
        newPlanet.growth = defaultGrowth[uint(planetType)];
        newPlanet.hardiness = defaultHardiness[uint(planetType)];
        newPlanet.stalwartness = defaultStalwartness[uint(planetType)];
        newPlanet.population = _population;
        newPlanet.lastUpdated = now;
        planets[_loc] = newPlanet;

        PlanetMetadata memory newPlanetMetadata;
        newPlanetMetadata.locationId = _loc;
        newPlanetMetadata.owner = _player;
        newPlanetMetadata.coordinatesRevealed = false;
        newPlanetMetadata.version = 1;
        planetMetadatas[_loc] = newPlanetMetadata;

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
        initializePlanet(loc, player, 25000);

        emit PlayerInitialized(player, loc, planets[loc]);
    }

    function moveShipsDecay(uint shipsMoved, uint hardiness, uint dist) private view returns (uint) {
        int128 decayRatio = ABDKMath64x64.divu(hardiness, hardiness + dist);
        return ABDKMath64x64.mulu(decayRatio, shipsMoved);
    }

    function moveCheckproof(
        uint[2] memory _a,
        uint[2][2] memory _b,
        uint[2] memory _c,
        uint[3] memory _input
    ) private view {
        uint[3] memory input012;
        for (uint i=0; i<input012.length; i++) {
            input012[i] = _input[i];
        }
        require(verifyMoveProof(_a, _b, _c, input012));
    }

    function move(
        uint[2] memory _a,
        uint[2][2] memory _b,
        uint[2] memory _c,
        uint[4] memory _input
    ) public {
        // check proof validity
        uint[3] memory moveCheckproofInput;
        for (uint i = 0; i < 3; i++) {
            moveCheckproofInput[i] = _input[i];
        }
        moveCheckproof(_a, _b, _c, moveCheckproofInput);

        address player = msg.sender;
        uint oldLoc = _input[0];
        uint newLoc = _input[1];
        uint maxDist = _input[2];
        uint shipsMoved = _input[3];

        require(playerInitialized[player]); // player exists
        require(ownerIfOccupiedElseZero(oldLoc) == player); // planet at oldLoc is occupied by player

        updatePopulation(oldLoc);
        updatePopulation(newLoc);
        require(planets[oldLoc].population >= shipsMoved); // player can move at most as many ships as exist on oldLoc

        if (!planetIsOccupied(newLoc)) {
            // colonizing an uninhabited planet
            if (!planetIsInitialized(newLoc)) {
                initializePlanet(newLoc, player, 0);
            }
            planets[oldLoc].population -= shipsMoved;
            uint shipsLanded = moveShipsDecay(shipsMoved, planets[oldLoc].hardiness, maxDist);
            planets[newLoc].population += shipsLanded;
            if (planets[newLoc].population > planets[newLoc].capacity) {
                planets[newLoc].population = planets[newLoc].capacity;
            }
        } else if (ownerIfOccupiedElseZero(newLoc) == player) {
            // moving forces between my planets
            planets[oldLoc].population -= shipsMoved;
            uint shipsLanded = moveShipsDecay(shipsMoved, planets[oldLoc].hardiness, maxDist);
            planets[newLoc].population += shipsLanded;
        } else {
            // attacking enemy
            planets[oldLoc].population -= shipsMoved;
            uint shipsLanded = moveShipsDecay(shipsMoved, planets[oldLoc].hardiness, maxDist);

            if (planets[newLoc].population > (shipsLanded * 100 / planets[newLoc].stalwartness)) {
                // attack reduces target planet's garrison but doesn't conquer it
                planets[newLoc].population -= (shipsLanded * 100 / planets[newLoc].stalwartness);
            } else {
                // conquers planet
                planets[newLoc].owner = player;
                planets[newLoc].population = shipsLanded - (planets[newLoc].population * planets[newLoc].stalwartness / 100);
            }
        }
        emit PlayerMoved(player, oldLoc, newLoc, maxDist, shipsMoved, planets[oldLoc], planets[newLoc]);
    }
}
