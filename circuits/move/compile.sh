#!/bin/bash
echo "compiling circuit to snarkjs..." &&
date &&
circom circuit.circom &&
echo "generating public and verification keys..." &&
date &&
snarkjs setup &&
echo "calculating witness..." &&
date &&
snarkjs calculatewitness &&
echo "generating proof..." &&
date &&
snarkjs proof &&
echo "verifying proof..." &&
date &&
snarkjs verify &&
echo "compiling smart contract..." &&
date &&
snarkjs generateverifier &&
echo "done!" &&
date
