# darkforest
Dark Forest Game on Blockchain. Follow these steps in order to make things work:

# compile and deploy smart contracts to local blockchain
you need `truffle` and `ganache-cli` installed with `npm install -g`. if you are having troubles try `sudo npm install -g`.

then run `./local-deploy`. this compiles the solidity contracts with truffle, starts running a local blockchain with ganache-cli, and then deploy the contracts to the blockchain.

# get necessary packages
we depend on a few packages which handle snark-related computation. `npm install -g snarkjs` and `npm install -g circom` to install `snarkjs` and `circom` programs.

several of our compile scripts also use tools from the `websnark` and `circomlib` libraries. `npm install` in `./client` to make these available.

# generate zkSNARK keys
before the webapp works, you'll need to run `./compile.sh` in both `circuits/init` and `circuits/move`. This generates proving keys and puts them in the appropriate places in the project.

# client
remember to `npm install` in `./client`.

you should run `touch ./client/src/local_contract_addr.js` to create this gitignored file. this is a file that keeps the contract address of the DarkForestCore contract on your local blockchain. `./local-deploy` will automatically write to this file.

to interact with the webapp in browser, you need metamask. point metamask to `http://localhost:8545`, which is the port that `ganache-cli` defaults to when running the local blockchain.

whenever you run `./local-deploy` again, you'll need to `Reset Account` in MetaMask to clear old/stale transaction data.

you may want to create symlinks to the `build` (created by truffle) and `circuits` (holds circom circuits) folders, because files in `client/src` can only see files in `client/src` (i.e. a JS file in this directory cannot import from outside `client/src`). run:

`ln -sf ../../build .`

`ln -sf ../../circuits .`

# circom and snarkjs
if you are modifying anything SNARK-related, you may be interested in rebuilding circuits / redoing setup.

first, make sure to `npm install` in the root directory. this ensures that you have a local copy of `circomlib`.

then, run `./compile.sh` in `circuits/init` and `circuits/move` to rebuild `circuit.json`, `proving_key.json`, `verification_key.json`, and the `verifier.sol` solidity contract.

for your convenience, a sample `input.json` and `public.json` pair is also included for sanity test checks. `input.json` is a sample input, `public.json` is public parameters. `compile.sh` will create `witness.json` and `verification_key.json`, and print to the console verifying that the proof is generated and verifies properly. 
