# darkforest
Dark Forest Game on Blockchain

# testing and deploy (smart contracts)
you need `truffle` and `ganache-cli` installed with `npm install -g`. if you are having troubles try `sudo npm install -g`.

then run `./local-deploy`. this compiles the solidity contracts with truffle, starts running a local blockchain with ganache-cli, and then deploy the contracts to the blockchain.

# client
remember to `npm install` in `./client`
you should run `touch ./client/src/local_contract_addr.js` to create this gitignored file. this is a file that keeps the contract address of the DarkForestCore contract on your local blockchain.

to interact with the webapp in browser, you need metamask. point metamask to `http://localhost:8545`, which is the port that `ganache-cli` defaults to when running the local blockchain.

whenever you run `./local-deploy` again, you'll need to `Reset Account` in MetaMask to clear old/stale transaction data.

# circom and snarkjs
you probably need circom and snarkjs (more to come)
