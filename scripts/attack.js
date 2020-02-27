const util = require("util");
const fs = require("fs");

const readFile = util.promisify(fs.readFile);

const zkSnark = require("snarkjs");

const { unstringifyBigInts } = require("./stringifybigint");
const mimcHash = require("./mimc");
const bigInt = require("./bigint");

const DarkForestV1 = artifacts.require("DarkForestV1");

module.exports = async function(callback) {
    try {
        await run(callback);
    } catch (err) {
        console.error(err);
        callback();
    }
}

async function run(callback) {
    const accounts = (await web3.eth.getAccounts())

    const myAddress = accounts[0].toLowerCase().substring(2);
    console.log("myAddress", myAddress);

    const darkForest = await DarkForestV1.at("0x17ef2966276db136fcdb8b17f1d977a0b4819d82");

    // console.log("nPlanets", await darkForest.getNPlanets());

    const moveCircuitJSON = JSON.parse(await readFile("./circuits/move/circuit.json", "utf8"));
    const moveCircuit = new zkSnark.Circuit(moveCircuitJSON);
    const pk = unstringifyBigInts(JSON.parse(await readFile("./circuits/move/proving_key.json", "utf8")));
    const vk = unstringifyBigInts(JSON.parse(await readFile("./circuits/move/verification_key.json", "utf8")));

    const move = new Move(moveCircuit, pk, vk);

    const planets = JSON.parse(await readFile("./scripts/planets.json", "utf8"));

    const myPlanets = planets.filter(planet => planet.owner == myAddress);

    const unoccuppiedPlanets = planets.filter(planet => planet.coords && !planet.owner);

    // Find unoccuppied planets within a radius of 100
    const planetPairs = [];
    
    myPlanets.forEach(planet => {
        const closePlanet = unoccuppiedPlanets.find(compPlanet => {
            return isCloserThan(planet, compPlanet, 10000);
        });

        if (closePlanet) {
            planetPairs.push([planet, closePlanet]);
        }
    });

    planetPairs.slice(0, 1).forEach(pairs => {
        console.log("generating proof");
        const shipsMoved = Math.floor(pairs[0].population * 0.5);
        const { proof, publicSignals } = move.generateProof(pairs[0], pairs[1], shipsMoved);
        console.log("verifyProof", proof, publicSignals);
        console.log("isValid", move.verifyProof(proof, publicSignals));
    });
    
    callback();
    /*
    JSON.stringify(Object.keys(gameManager.planetLocationMap).map(planetId => {
        if (gameManager.planets[planetId]) {
            return Object.assign({}, gameManager.planetLocationMap[planetId], gameManager.planets[planetId]);
        }

        return gameManager.planetLocationMap[planetId];
    }));
    */
}

function isCloserThan(p1, p2, distSquared) {
    return Math.pow(p1.coords.x - p2.coords.x, 2) + Math.pow(p1.coords.y - p2.coords.y, 2) < distSquared;
}

class Move {
    constructor(circuit, pk, vk) {
        this.circuit = circuit;
        this.pk = pk;
        this.vk = vk;
    }

    generateProof(fromP, toP, shipsMoved) {
        fromP.coords = { x: 19, y: 26 };
        toP.coords = { x: 25, y: 16 };
        const distMax = 26;
        const input = {
            x1: bigInt(fromP.coords.x),
            y1: bigInt(fromP.coords.y),
            x2: bigInt(toP.coords.x),
            y2: bigInt(toP.coords.y),
            distMax: bigInt(distMax)
        };

        const witness = this.circuit.calculateWitness(input);

        // Why does prod include shipsMoved as public input?
        const publicSignals = [
            mimcHash(fromP.coords.x, fromP.coords.y),
            mimcHash(toP.coords.x, toP.coords.y),
            distMax,
            shipsMoved
        ];

        // Why does this return publicSignals?
        const { proof } = zkSnark.groth.genProof(this.pk, witness);
        return { proof, publicSignals };
    }

    verifyProof(proof, publicSignals) {
        return zkSnark.groth.isValid(this.vk, proof, publicSignals);
    }
}