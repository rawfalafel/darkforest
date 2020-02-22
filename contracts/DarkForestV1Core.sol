pragma solidity ^0.5.8;
pragma experimental ABIEncoderV2;
import "./Verifier.sol";
import "./ABDKMath64x64.sol";

contract DarkForestV1 is Verifier {
    using ABDKMath64x64 for *;

    uint8 constant VERSION = 1;
    bool gamePaused = false;
    bool gameEnded = false;

    uint public xSize = 8192;
    uint public ySize = 8192;
    uint public planetRarity = 8192;
    uint public nPlanetTypes = 12;
    uint public totalCap = 0;
    uint[12] public defaultCapacity = [0, 100000, 150000, 500000, 1500000, 5000000, 15000000, 40000000, 100000000, 200000000, 350000000, 500000000];
    uint[12] public defaultGrowth = [1670, 2500, 3330, 5000, 6670, 8330, 10000, 11670, 13330, 15000, 16670]; // max growth rate, achieved at 50% population, in milliPop per second
    uint[12] public defaultHardiness = [50, 100, 200, 400, 800, 1600, 3200, 5000, 7200, 10000, 12000];
    uint[12] public defaultStalwartness = [900, 800, 700, 600, 500, 400, 300, 200, 100, 75, 50];
    address payable owner = 0xe8170282c5Bc6E7c5b2d984Cd5D897a05E0AFAFb;

    uint256 constant LOCATION_ID_UB = 21888242871839275222246405745257275088548364400416034343698204186575808495617;

    modifier onlyOwner {
        require(
            msg.sender == owner,
            "Only owner can call this function."
        );
        _;
    }

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
        bool coordinatesRevealed;
        uint x;
        uint y;
    }

    struct PlanetMetadata {
        uint locationId;
        address owner;
        uint8 version;
        bool destroyed;
        mapping(uint => QueuedArrival) pending;
        uint pendingCount;
        bool exists;
        bytes32 entropySource;
    }

    struct QueuedArrival {
        uint departureTime;
        uint arrivalTime;
        address player;
        uint oldLoc;
        uint newLoc;
        uint maxDist;
        uint shipsMoved;
    }

    event PlayerInitialized(address player, uint loc);
    event PlanetDestroyed(uint loc);
    event ArrivalQueued(QueuedArrival arrival);

    uint[] public planetIds;
    mapping (uint => Planet) public planets;
    mapping (uint => PlanetMetadata) public planetMetadatas;
    address[] public playerIds;
    mapping (address => bool) public playerInitialized;
    // TODO: how to query all planets owned by player?
    mapping (address => uint) public nPlayerTransactions;

    function toBytes(uint256 x) private pure returns (bytes memory b) {
        b = new bytes(32);
        assembly { mstore(add(b, 32), x) }
    }

    // (1/x)y distribution. Not ready yet.
    // function getMultiplier(uint8 _rand) private pure returns (int128) {
    //     return ABDKMath64x64.divu(100, (uint256(_rand) + 10));
    // }

    // Uniform distribution
    function getMultiplierInPercent(uint8 _rand) private pure returns (uint) {
        return 100 + ((_rand % 32) - 16);
    }

    function perturbValue(uint _baseVal, uint8 _rand) private pure returns (uint) {
        //return ABDKMath64x64.mulu(getMultiplier(_rand), _baseVal);
        return _baseVal * getMultiplierInPercent(_rand) / 100;
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

    function getBalance() public view returns (uint) {
        return (address(this)).balance;
    }

    function locationIdValid(uint _loc) private view returns (bool) {
        return (_loc < (LOCATION_ID_UB / planetRarity));
    }

    function initializePlanet(uint _loc, address _player, uint _population) private {
        require (locationIdValid(_loc));
        bytes32 entropy = blockhash(block.number - 1);
        PlanetType planetType = getPlanetType(_loc);
        Planet memory newPlanet;
        newPlanet.locationId = _loc;
        newPlanet.owner = _player;
        newPlanet.planetType = planetType;
        newPlanet.capacity = perturbValue(defaultCapacity[uint(planetType)], uint8(entropy[0]));
        newPlanet.growth = perturbValue(defaultGrowth[uint(planetType)], uint8(entropy[1]));
        newPlanet.hardiness = perturbValue(defaultHardiness[uint(planetType)], uint8(entropy[2]));
        newPlanet.stalwartness = perturbValue(defaultStalwartness[uint(planetType)], uint8(entropy[3]));
        newPlanet.population = _population;
        newPlanet.lastUpdated = now;
        newPlanet.coordinatesRevealed = false;
        planets[_loc] = newPlanet;

        PlanetMetadata memory newPlanetMetadata;
        newPlanetMetadata.locationId = _loc;
        newPlanetMetadata.owner = _player;
        newPlanetMetadata.version = VERSION;
        newPlanetMetadata.destroyed = false;
        newPlanetMetadata.exists = true;
        newPlanetMetadata.entropySource = entropy;
        planetMetadatas[_loc] = newPlanetMetadata;

        planetIds.push(_loc);
        totalCap += newPlanet.capacity;
    }

    function updatePopulation(uint _locationId, uint targetTime) private {
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
        uint time_elapsed = targetTime - planet.lastUpdated;

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

    }

    function initializePlayer(
        uint[2] memory _a,
        uint[2][2] memory _b,
        uint[2] memory _c,
        uint[1] memory _input
    ) public {
        require (!gamePaused && !gameEnded);
        require(verifyInitProof(_a, _b, _c, _input));
        address player = msg.sender;
        uint loc = _input[0];
        require(!playerInitialized[player]); // player doesn't have account
        require (!planetIsInitialized(loc)); // loc was never owned

        playerIds.push(player);
        playerInitialized[player] = true;
        initializePlanet(loc, player, 25000);
        nPlayerTransactions[player] = 1;

        emit PlayerInitialized(player, loc);
    }

    function moveShipsDecay(uint shipsMoved, uint hardiness, uint dist) private pure returns (uint) {
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

    function move (
        uint[2] memory _a,
        uint[2][2] memory _b,
        uint[2] memory _c,
        uint[4] memory _input
    ) public {
        QueuedArrival memory arrival = generateArrivalObject(_a, _b, _c, _input);
        executeReadyArrivals(planetMetadatas[arrival.oldLoc]);
        executeDeparture(arrival);

        if (!planetIsInitialized(arrival.newLoc)) {
            initializePlanet(arrival.newLoc, address(0), 0);
        }

        executeReadyArrivals(planetMetadatas[arrival.newLoc]);
        enqueueArrivalOnPlanet(planetMetadatas[arrival.newLoc], arrival);

        nPlayerTransactions[player] += 1;
    }

    function executeReadyArrivals(PlanetMetadata storage _p) internal {
        while (true) {
            uint idx;
            bool found;
            (found, idx) = findNextReadyArrival(_p);

            if (!found) break;

            arrive(_p.pending[idx]);
            delete _p.pending[idx];
        }
    }

    function getArrival(uint _planetLoc, uint _arrivalIdx) public view returns (QueuedArrival memory) {
        return planetMetadatas[_planetLoc].pending[_arrivalIdx];
    }

    function findNextReadyArrival(PlanetMetadata storage _p) internal returns (bool, uint) {
        uint earliestTime = now;
        uint earliestIndex = 0;
        bool found = false;
        for (uint i = 0; i < _p.pendingCount; i++) {
            if (_p.pending[i].arrivalTime != 0 && _p.pending[i].arrivalTime <= earliestTime) {
                earliestTime = _p.pending[i].arrivalTime;
                earliestIndex = i;
                found = true;
            }
        }

        return (found, earliestIndex);
    }

    function updatePlanet(uint _locationId, uint targetTime) internal {
        updatePopulation(_locationId, targetTime);
        planets[_locationId].lastUpdated = targetTime;
    }

    function generateArrivalObject(
        uint[2] memory _a,
        uint[2][2] memory _b,
        uint[2] memory _c,
        uint[4] memory _input
    ) internal returns (QueuedArrival memory arrival) {
        require (!gamePaused && !gameEnded);
        // check proof validity
        uint[3] memory moveCheckproofInput;
        for (uint i = 0; i < 3; i++) {
            moveCheckproofInput[i] = _input[i];
        }
        moveCheckproof(_a, _b, _c, moveCheckproofInput);

        arrival.departureTime = now;
        arrival.arrivalTime = now + 15 seconds;
        arrival.player = msg.sender;
        arrival.oldLoc = _input[0];
        arrival.newLoc = _input[1];
        arrival.maxDist = _input[2];
        arrival.shipsMoved = _input[3];
    }

    function executeDeparture (QueuedArrival memory arrival) internal {
        require(playerInitialized[arrival.player]); // player exists
        require(ownerIfOccupiedElseZero(arrival.oldLoc) == arrival.player); // planet at oldLoc is occupied by player
        require(!planetMetadatas[arrival.oldLoc].destroyed);
        updatePlanet(arrival.oldLoc, now);

        require(planets[arrival.oldLoc].population >= arrival.shipsMoved); // player can move at most as many ships as exist on oldLoc
        planets[arrival.oldLoc].population -= arrival.shipsMoved;
    }

    function arrive(QueuedArrival memory arrival) internal {
        require(!planetMetadatas[arrival.newLoc].destroyed);
        updatePlanet(arrival.newLoc, arrival.arrivalTime);

        if (!planetIsInitialized(arrival.newLoc)) {
            initializePlanet(arrival.newLoc, arrival.player, 0);
        }

        uint shipsLanded = moveShipsDecay(arrival.shipsMoved, planets[arrival.oldLoc].hardiness, arrival.maxDist);

        if (!planetIsOccupied(arrival.newLoc)) {
            // colonizing an uninhabited planet
            planets[arrival.newLoc].owner = arrival.player;
            planets[arrival.newLoc].population += shipsLanded;
            if (planets[arrival.newLoc].population > planets[arrival.newLoc].capacity) {
                planets[arrival.newLoc].population = planets[arrival.newLoc].capacity;
            }
        } else if (ownerIfOccupiedElseZero(arrival.newLoc) == arrival.player) {
            // moving forces between my planets
            planets[arrival.newLoc].population += shipsLanded;
        } else {
            // attacking enemy
            if (planets[arrival.newLoc].population > (shipsLanded * 100 / planets[arrival.newLoc].stalwartness)) {
                // attack reduces target planet's garrison but doesn't conquer it
                planets[arrival.newLoc].population -= (shipsLanded * 100 / planets[arrival.newLoc].stalwartness);
            } else {
                // conquers planet
                planets[arrival.newLoc].owner = arrival.player;
                planets[arrival.newLoc].population = shipsLanded - (planets[arrival.newLoc].population * planets[arrival.newLoc].stalwartness / 100);
            }
        }
    }

    function enqueueArrivalOnPlanet(PlanetMetadata storage _p, QueuedArrival memory arrival) internal {
        for (uint i = 0; i < _p.pendingCount; i++) {
            if (_p.pending[i].arrivalTime == 0) {
                _p.pending[i] = arrival;
                emit ArrivalQueued(arrival);
                return;
            }
        }
        _p.pendingCount += 1;
        _p.pending[_p.pendingCount - 1] = arrival;
        emit ArrivalQueued(arrival);
    }

/*
    function cashOut(uint loc) external {
        require(msg.sender == planets[loc].owner);
        require(!planetMetadatas[loc].destroyed);

        updatePlanet(loc, now);
        planetMetadatas[loc].destroyed = true;
        uint oldCapacity = planets[loc].capacity;
        uint toWithdraw = (address(this)).balance * planets[loc].population / totalCap;
        totalCap -= oldCapacity;
        msg.sender.transfer(toWithdraw);

        emit PlanetDestroyed(loc);
    }
    */

    // admin functions
    function setOwner(address newOwner) external onlyOwner {
        require(newOwner != address(0));
        owner = address(uint160(newOwner));
    }

    function pauseGame() external onlyOwner {
        require(!gamePaused && !gameEnded);
        gamePaused = true;
    }

    function resumeGame() external onlyOwner {
        require(gamePaused && !gameEnded);
        gamePaused = false;
    }

    function endGame() external onlyOwner {
        require(gamePaused && !gameEnded);
        gameEnded = true;
        uint oldBalance = (address(this)).balance;
        for (uint i = 0; i < planetIds.length; i++) {
            Planet memory planet = planets[planetIds[i]];
            PlanetMetadata memory planetMetadata = planetMetadatas[planetIds[i]];
            if (planet.owner != address(0) && planet.owner == planetMetadata.owner && !planetMetadata.destroyed) {
                address payable ownerPayable = address(uint160(planet.owner));
                ownerPayable.transfer(oldBalance * planet.capacity / totalCap);
            }
        }
    }
}
