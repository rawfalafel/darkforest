const zkSnark = require("snarkjs");

const circuitDef = JSON.parse(fs.readFileSync("circuit.json", "utf8"));
const circuit = new zkSnark.Circuit(circuitDef);
