truffle compile --all
(
  sleep 2
  rm client/src/local_contract_addr.js
  printf "const contractAddress = '" > client/src/local_contract_addr.js
  truffle migrate --all | grep -m2 "contract address" | tail -n1 | cut -d'x' -f 2 | tr -d '\n' >> client/src/local_contract_addr.js
  printf "';\n\nexport { contractAddress }\n" >> client/src/local_contract_addr.js
) &
ganache-cli --account="0xD44C7963E9A89D4F8B64AB23E02E97B2E00DD57FCB60F316AC69B77135003AEF, 100000000000000000000"
