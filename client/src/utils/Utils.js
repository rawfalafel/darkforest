import bigInt from "big-integer";

// largely taken from websnark/tools/buildwitness.js

function _writeUint32(h, val) {
  h.dataView.setUint32(h.offset, val, true);
  h.offset += 4;
}


function _writeBigInt(h, bi) {
  for (let i=0; i<8; i++) {
    const v = bigInt(bi).shiftRight(i*32).and(0xFFFFFFFF).toJSNumber();
    _writeUint32(h, v);
  }
}

function _calculateBuffLen(witness) {
  let size = 0;

  // beta2, delta2
  size += witness.length * 32;

  return size;
}

export const witnessObjToBuffer = (witness) => {
  const buffLen = _calculateBuffLen(witness);

  const buff = new ArrayBuffer(buffLen);

  const h = {
    dataView: new DataView(buff),
    offset: 0
  };

  for (let i=0; i<witness.length; i++) {
    _writeBigInt(h, witness[i]);
  }

  return buff;
};

// is this address a habitable planet?

export const isPlanet = locationId => {
  if (!locationId) return false;
  return bigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617')
    .divide(32).geq(bigInt(locationId));
};
