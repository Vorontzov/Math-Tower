export function hash(text) {
  let h = 2166136261;
  for (const c of String(text)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function random(seed) {
  let state = seed >>> 0;
  return (a, b) => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return a + Math.floor(state / 4294967296 * (b - a + 1));
  };
}
const step = (prompt, answer) => ({ prompt, answer: String(answer) });
const problem = (prompt, answer, steps, hint, skill) => ({ prompt, answer: String(answer), steps, hint, skill, unit: '' });
export function generate(topic, seed) {
  const r = random(seed);
  const a = r(4, 9), b = r(2, 8);
  switch (topic) {
    case 'add': return problem(`${a} + ${b} = ?`, a + b,
      [step(`Start at ${a}. Add 1. What number do you reach?`, a + 1), step(`Now add the remaining ${b - 1}. What is the total?`, a + b)], 'Addition combines two amounts. Count on, or split one amount into smaller parts.', 'Addition');
    case 'subtract': {
      const total = a + b;
      return problem(`${total} − ${b} = ?`, a,
        [step(`Subtract 1 from ${total}. What remains?`, total - 1), step(`Subtract the remaining ${b - 1}. What remains now?`, a)], 'Subtract in smaller steps, or find the missing number that adds back to the total.', 'Subtraction');
    }
    case 'compare': return problem(`Two emergency routes are ${a * 10} m and ${a * 10 + b * 5} m long. Type the length of the shorter route.`, a * 10,
      [step(`How many metres longer is the ${a * 10 + b * 5} m route?`, b * 5), step('Type the shorter route’s length in metres.', a * 10)], 'Compare the distances. The shorter route uses fewer metres.', 'Comparing quantities');
    case 'missing': return problem(`${a} + ? = ${a + b}`, b,
      [step(`What is ${a + b} − ${a}?`, b)], 'Undo addition with subtraction.', 'Missing addends');
    case 'missing-start': return problem(`? − ${b} = ${a}`, a + b,
      [step(`Add ${b} back to ${a}. What was the starting number?`, a + b)], 'To recover the starting amount, add back what was removed.', 'Inverse operations');
    case 'difference': return problem(`A relay needs ${a + b} power units. It has ${a}. How many more units does it need?`, b,
      [step(`Subtract the available ${a} units from the required ${a + b}.`, b)], 'Find the difference between the required amount and the available amount.', 'Differences');
    case 'two-step': {
      const c = r(2, a);
      return problem(`${a} + ${b} − ${c} = ?`, a + b - c,
        [step(`First calculate ${a} + ${b}.`, a + b), step(`Now subtract ${c} from your result.`, a + b - c)], 'Addition and subtraction have the same priority. Work from left to right.', 'Two-step arithmetic');
    }
    case 'fraction': {
      const denominator = r(3, 9), used = r(1, denominator - 1);
      return problem(`A battery was full. You use ${used}/${denominator} of its charge. What fraction remains?`, `${denominator - used}/${denominator}`,
        [step(`The whole contains ${denominator} equal parts. After using ${used}, how many parts remain?`, denominator - used), step(`Write the remaining fraction using ${denominator} as the denominator. Equivalent fractions are accepted.`, `${denominator - used}/${denominator}`)], 'Write one whole with the same denominator, then subtract the used parts.', 'Fraction subtraction');
    }
    case 'percent': {
      const total = r(3, 12) * 10, percent = r(1, 5) * 10;
      return problem(`Restore ${percent}% of a ${total}-unit reserve. How many units is that?`, total * percent / 100,
        [step(`Find 10% of ${total} by dividing by 10.`, total / 10), step(`Multiply that result by ${percent / 10} to find ${percent}%.`, total * percent / 100)], 'Find 10% first, then scale to the requested percentage.', 'Percentages');
    }
    case 'equation': {
      const x = r(2, 12), coefficient = r(2, 7), offset = r(3, 15), total = coefficient * x + offset;
      return problem(`Solve ${coefficient}x + ${offset} = ${total}. Type the value of x.`, x,
        [step(`Subtract ${offset} from both sides. What is ${total} − ${offset}?`, coefficient * x), step(`Divide your result by ${coefficient}. What is x?`, x)], 'Undo the addition first, then undo multiplication. Apply the same operation to both sides.', 'Two-step equations');
    }
    default: throw new Error(`Unsupported topic: ${topic}`);
  }
}
