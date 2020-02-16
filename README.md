# darkforest

Dark Forest Game on Blockchain. Follow these steps in order to make things work:

# compile and deploy smart contracts to local blockchain

you need `truffle` and `ganache-cli` installed with `npm install -g`. if you are having troubles try `sudo npm install -g`.

then run `./local-deploy`. this compiles the solidity contracts with truffle, starts running a local blockchain with ganache-cli, and then deploy the contracts to the blockchain.

# client

remember to `npm install` in `./client` before trying to run the webapp with
`npm start`!

to interact with the webapp in browser, you need metamask. point metamask to `http://localhost:8545`, which is the port that `ganache-cli` defaults to when running the local blockchain. Also import the following private key as an account in your metamask: `0xD44C7963E9A89D4F8B64AB23E02E97B2E00DD57FCB60F316AC69B77135003AEF`. Our `ganache` blockchain which is started up by `local-deploy.sh` automatically puts in 100eth into this account.

make sure that you've run `./local-deploy` at least once before trying to run the webapp. this builds some necessary files.

whenever you run `./local-deploy` again, you'll need to `Reset Account` in MetaMask to clear old/stale transaction data.

# circom and snarkjs

if you are modifying anything SNARK-related, you may be interested in rebuilding circuits / redoing setup.

we depend on a few packages which handle snark-related build processes.

- global dependencies: first `npm install -g snarkjs` and `npm install -g circom` to install `snarkjs` and `circom` programs globally.
- local dependencies: then, run `npm install` in the `./client` directory. this ensures that you have a local copy of `circomlib` in `./node_modules`.

now you can run `./compile.sh` in `circuits/init` and `circuits/move` to rebuild `circuit.json`, `proving_key.json`, `verification_key.json`, and the `verifier.sol` solidity contract.

for your convenience, a sample `input.json` and `public.json` pair is also included for sanity test checks. `input.json` is a sample input, `public.json` is public parameters. `compile.sh` will create `witness.json` and `verification_key.json`, and print to the console verifying that the proof is generated and verifies properly.
