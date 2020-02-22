import mimcHash from './mimc';

function perlinHash(m, c, x, y): number {
  function get_final(x, y, xi, yi, w1, w2): [number, number] {
    const hash_x = mimcHash(xi, yi)
      .mod(m)
      .toJSNumber();
    const hash_y = mimcHash(hash_x, 50)
      .mod(m)
      .toJSNumber();
    const val1 = x - c * xi;
    const val2 = y - c * yi;
    const dot = val1 * hash_x + val2 * hash_y;
    const fin = w1 * w2 * dot;
    const den2 = hash_x * hash_x + hash_y * hash_y;
    return [fin, den2];
  }

  const x0 = Math.floor(x / c);
  const y0 = Math.floor(y / c);
  const x1 = x0 + 1;
  const y1 = y0 + 1;

  const wx0 = x - c * x0;
  const wy0 = y - c * y0;
  const wx1 = c - wx0;
  const wy1 = c - wy0;

  const final00 = get_final(x, y, x0, y0, wx1, wy1);
  const final10 = get_final(x, y, x1, y0, wx0, wy1);
  const final01 = get_final(x, y, x0, y1, wx1, wy0);
  const final11 = get_final(x, y, x1, y1, wx0, wy0);

  const fin = final00[0] + final10[0] + final01[0] + final11[0];
  return fin;
  /*
  console.log('Final ', fin * fin);

  var mo2 = m / 2;
  var d00 = mo2 * mo2 + mo2 * mo2;
  var c2 = c * c;
  var denominator = 2 * c2 * c2 * c2 * d00;
  console.log('Denominator: ', denominator);
  */
}

const perlin = (c, x, y) => perlinHash(2 ** 8, c, x, y);

export default perlin;
