#!/bin/bash

if [ "$EUID" -ne 0 ]
  then echo "Please run with sudo privileges"
  exit
fi

# compile all contracts
truffle compile --all

# copy compiled contract jsons into client/src
CONTRACT_JSONS=./build/contracts/*
rm -rf ./client/src/contracts
mkdir ./client/src/contracts
for f in $CONTRACT_JSONS
do
  cp "$f" ./client/src/contracts
done

# copy circuits into client/src/circuits
rm -rf ./client/src/circuits/move/ &&
mkdir -p ./client/src/circuits/move/ &&
cp ./circuits/move/circuit.json ./client/src/circuits/move/ &&
rm -rf ./client/src/circuits/init/ &&
mkdir -p ./client/src/circuits/init/ &&
cp ./circuits/init/circuit.json ./client/src/circuits/init/ &&
rm -rf ./client/src/circuits/init_new/ &&
mkdir -p ./client/src/circuits/init_new/ &&
cp ./circuits/init_new/circuit.json ./client/src/circuits/init_new/ &&

# deploy core contract, and get its address, and write to a js file accessible in client/src.
# sleep 1 ensures this happens AFTER ganache-cli is run
(
  sleep 1
  rm client/src/utils/local_contract_addr.ts
  printf "const contractAddress = '" > client/src/utils/local_contract_addr.ts
  truffle migrate --all | grep -m2 "contract address" | tail -n1 | cut -d'x' -f 2 | tr -d '\n' >> client/src/utils/local_contract_addr.ts
  printf "';\n\nexport { contractAddress }\n" >> client/src/utils/local_contract_addr.ts
) &

# start up local blockchain with ganache-cli
ganache-cli --account="0xD44C7963E9A89D4F8B64AB23E02E97B2E00DD57FCB60F316AC69B77135003AEF, 100000000000000000000" --account="0x523170AAE57904F24FFE1F61B7E4FF9E9A0CE7557987C2FC034EACB1C267B4AE, 100000000000000000000" --gasLimit="0xffffff" --blockTime=3
