// Exact rational arithmetic, deliberately limited to numeric free response.
// No eval, JavaScript expressions, silent rounding or probabilistic equivalence.
export function parseNumber(input) {
  if (typeof input !== 'string' && typeof input !== 'number') return null;
  let s = String(input).trim().replaceAll('−', '-');
  if (!s || s.length > 80) return null;
  if (s.includes(',')) {
    if (!/^[+-]?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) return null;
    s = s.replaceAll(',', '');
  }
  const mixed = /^([+-]?\d+)\s+(\d+)\s*\/\s*(\d+)$/.exec(s);
  if (mixed) {
    const whole = BigInt(mixed[1]), n = BigInt(mixed[2]), d = BigInt(mixed[3]);
    if (d === 0n || n >= d) return null;
    const negative = mixed[1].startsWith('-');
    return { n: whole * d + (negative ? -n : n), d };
  }
  const fraction = /^([+-]?\d+)\s*\/\s*([+-]?\d+)$/.exec(s);
  if (fraction) {
    let n = BigInt(fraction[1]), d = BigInt(fraction[2]);
    if (d === 0n) return null;
    if (d < 0n) { n = -n; d = -d; }
    return { n, d };
  }
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(s)) return null;
  const negative = s.startsWith('-');
  s = s.replace(/^[+-]/, '');
  const [whole, decimals = ''] = s.split('.');
  return { n: BigInt((whole || '0') + decimals) * (negative ? -1n : 1n), d: 10n ** BigInt(decimals.length) };
}
export function checkAnswer(input, expected) {
  const a = parseNumber(input), b = parseNumber(expected);
  if (!a) return { correct: false, format: false };
  return { correct: !!b && a.n * b.d === b.n * a.d, format: true };
}
