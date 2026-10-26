import test from 'node:test';
import assert from 'node:assert/strict';
import { SCOPE, CATALOG, stageId, stagePosition, nextStageId, isAvailable, loadStage } from '../core/campaign.js';
import { validateStage } from '../core/schema.js';
import { checkAnswer, parseNumber } from '../math/answer-checker.js';
import { generate } from '../math/generators.js';
import { getProblem, validateCustomBank } from '../math/bank.js';
import { progressFor, submit } from '../math/guided-solutions.js';
import { freshSave, decodeSave, createStorage } from '../core/storage.js';
import { createEngine } from '../engines/tower.js';
const stage = await loadStage('tower-0001');

test('campaign reserves exactly 1,999 alternating stages, but only Tower 1 is playable', async () => {
  let id = 'tower-0001', count = 0, towers = 0, interludes = 0;
  while (id) { assert.equal(stagePosition(id), count++); id.startsWith('tower') ? towers++ : interludes++; id = nextStageId(id); }
  assert.deepEqual({ towers, interludes, stages: count }, SCOPE);
  assert.equal(CATALOG.length, 1); assert.equal(isAvailable('interlude-0001'), false);
  assert.throws(() => stageId('interlude', 1000)); assert.throws(() => stagePosition('tower-0000'));
  await assert.rejects(loadStage('tower-0002'), /not been authored/);
});
test('tower topology validates all 21 floors, gate prerequisites, and optional supplies', () => {
  assert.equal(validateStage(stage), stage); assert.equal(stage.floors.length, 21);
  assert.equal(stage.gates.filter(g => !g.optional).length, 9); assert.equal(stage.gates.filter(g => g.optional).length, 3);
  const invalid = structuredClone(stage); invalid.stairs = invalid.stairs.slice(0, 1);
  assert.throws(() => validateStage(invalid), /unreachable/);
  const cycle = structuredClone(stage); cycle.gates[0].requires = ['override'];
  assert.throws(() => validateStage(cycle), /circular/);
});
test('numeric checker accepts exact equivalence and rejects invalid or approximate answers', () => {
  for (const [input, answer] of [['2/4', '.5'], ['0.50', '1/2'], ['−12', '-12'], ['1,000.25', '4001/4'], ['-2 1/2', '-5/2'], ['1/-2', '-0.5'], ['  7 ', '7']]) assert.equal(checkAnswer(input, answer).correct, true, input);
  for (const input of ['', '1/0', 'NaN', 'Infinity', '1,2', '2+3', '<script>', 'five', '1 4/3']) assert.equal(parseNumber(input), null, input);
  assert.equal(checkAnswer('0.333', '1/3').correct, false); assert.equal(checkAnswer('3', '4').correct, false);
});
test('10,000 generated problems agree with independent arithmetic and all guided steps', () => {
  const topics = ['add', 'subtract', 'compare', 'missing', 'missing-start', 'difference', 'two-step', 'fraction', 'percent', 'equation'];
  for (const topic of topics) for (let seed = 0; seed < 1000; seed++) {
    const p = generate(topic, seed), numbers = p.prompt.match(/\d+/g).map(Number); let answer;
    switch (topic) {
      case 'add': answer = numbers[0] + numbers[1]; break;
      case 'subtract': answer = numbers[0] - numbers[1]; break;
      case 'compare': answer = Math.min(...numbers); break;
      case 'missing': answer = numbers[1] - numbers[0]; break;
      case 'missing-start': answer = numbers[0] + numbers[1]; break;
      case 'difference': answer = numbers[0] - numbers[1]; break;
      case 'two-step': answer = numbers[0] + numbers[1] - numbers[2]; break;
      case 'fraction': answer = `${numbers[1] - numbers[0]}/${numbers[1]}`; break;
      case 'percent': answer = numbers[0] * numbers[1] / 100; break;
      case 'equation': answer = (numbers[2] - numbers[1]) / numbers[0]; break;
    }
    assert.equal(checkAnswer(String(answer), p.answer).correct, true, `${topic}/${seed}`);
    assert.equal(checkAnswer(p.steps.at(-1).answer, p.answer).correct, true);
    // Intermediate step arithmetic is also independently derived from prompt numbers.
    if (p.steps.length === 2) {
      const first = { add: numbers[0] + 1, subtract: numbers[0] - 1, compare: numbers[1] - numbers[0], 'two-step': numbers[0] + numbers[1], fraction: numbers[1] - numbers[0], percent: numbers[1] / 10, equation: numbers[2] - numbers[1] }[topic];
      assert.equal(checkAnswer(String(first), p.steps[0].answer).correct, true, `step/${topic}/${seed}`);
    }
  }
});
test('worked solutions cannot skip a step, and checked input survives reload', () => {
  const save = freshSave(), p = generate('equation', 22), progress = progressFor(save, 'test', p);
  progress.guided = true;
  assert.equal(submit(p, progress, '99999').complete, false); assert.equal(progress.checked.length, 0);
  assert.equal(submit(p, progress, p.steps[0].answer).complete, false);
  const restored = progressFor(JSON.parse(JSON.stringify(save)), 'test', p);
  assert.equal(restored.checked.length, 1); assert.equal(restored.solved, false);
  assert.equal(submit(p, restored, p.steps[1].answer).complete, true);
  const invalid = progressFor({ math: { bad: { guided: true, solved: true, checked: ['wrong'] } } }, 'bad', p);
  assert.equal(invalid.solved, false); assert.equal(invalid.checked.length, 0);
});
test('bank substitution is deterministic and custom numeric banks require checked solutions', () => {
  const save = freshSave('readiness', null, 42), gate = stage.gates[0];
  assert.deepEqual(getProblem(save, stage.id, gate), getProblem(save, stage.id, gate));
  assert.notEqual(getProblem(save, stage.id, gate).skill, 'Addition');
  const custom = validateCustomBank({ version: 1, title: 'Practice', items: [{ id: 'half', prompt: 'One half plus one half?', answer: '1', hint: 'Use equal parts.', steps: [{ prompt: 'How many halves?', answer: '2' }, { prompt: 'How many wholes?', answer: '1' }] }] });
  assert.equal(getProblem(freshSave('custom', custom), stage.id, gate).answer, '1');
  custom.items[0].steps[1].answer = '5'; assert.throws(() => validateCustomBank(custom), /final step/);
});
test('storage failures stay playable and corrupt saves are rejected or sanitized', () => {
  const s = createStorage({ getItem() { throw Error(); }, setItem() { throw Error(); } });
  assert.equal(s.read(), null); assert.equal(s.write(freshSave()), false); assert.equal(s.available, false);
  for (const text of ['{bad', 'null', '{}', JSON.stringify({ ...freshSave(), stageId: 'tower-0999' })]) assert.equal(decodeSave(text), null);
  const saved = freshSave(); saved.record = [null, 'bad']; assert.deepEqual(decodeSave(JSON.stringify(saved)).record, []);
});

function harness(restored = null) {
  const held = new Set(), pressed = new Set(), flags = {};
  const h = { challenge: null, complete: false, message: '', encounter: null, flags };
  const input = { down: k => held.has(k), tap: k => pressed.has(k) };
  h.engine = createEngine(stage, restored, { input, challenge: g => { h.challenge = g; }, complete: () => { h.complete = true; }, say: m => { h.message = m; }, sound() {}, flag: (n, v = true) => { flags[n] = v; }, hasFlag: n => flags[n] === true, encounter: o => { h.encounter = o; } });
  h.tick = (seconds = 1 / 60) => { for (let i = 0; i < Math.ceil(seconds * 60); i++) { h.engine.update(1 / 60, input); pressed.clear(); } };
  h.tap = k => { pressed.add(k); h.tick(); };
  h.walk = x => {
    for (let i = 0; i < 2000; i++) {
      const actual = h.engine.snapshot().x;
      if (Math.abs(x - actual) < 4) { held.clear(); return; }
      held.clear(); held.add(actual < x ? 'right' : 'left'); held.add('stun'); h.tick();
    }
    assert.fail(`Could not walk to ${x}`);
  };
  h.toFloor = target => {
    for (let i = 0; i < 30 && h.engine.snapshot().floor !== target; i++) {
      const f = h.engine.snapshot().floor, down = f < target;
      h.walk((down ? f >= 17 : f > 17) ? 1010 : 900); h.tap(down ? 'down' : 'up'); h.tick(.5);
    }
    assert.equal(h.engine.snapshot().floor, target);
  };
  return h;
}
test('entire Tower 1 can be traversed, gated, escaped and restored using actual engine controls', () => {
  const h = harness();
  for (const gate of stage.gates.filter(g => !g.optional)) {
    h.toFloor(gate.floor); h.walk(gate.x); h.tap('interact');
    assert.equal(h.challenge?.id, gate.id); h.challenge = null; h.engine.finishGate(gate);
  }
  assert.equal(h.complete, false); assert.equal(h.engine.status().progress, '9/9');
  h.toFloor(stage.exit.floor); h.walk(stage.exit.x); h.tap('interact'); assert.equal(h.complete, true);
  const resumed = harness(h.engine.snapshot()); assert.equal(resumed.engine.status().progress, '9/9');
});
test('basement override refuses skipped required mathematics and lobby remains sealed', () => {
  const h = harness({ floor: 20, x: 250 }); h.tap('interact'); assert.equal(h.challenge, null); assert.match(h.message, /Roof access/);
  const lobby = harness({ floor: 17, x: 1090 }); lobby.tap('interact'); assert.equal(lobby.complete, false); assert.match(lobby.message, /required panels/);
});
test('lift power, calls, rides and power allocations work without bypassing the budget', () => {
  const h = harness({ floor: 6, x: 680 }); h.tap('down'); assert.match(h.message, /needs power/);
  h.engine.finishGate(stage.gates.find(g => g.id === 'power')); h.tap('down'); assert.match(h.message, /called/);
  h.tick(3); h.tap('down'); h.tick(2); assert.equal(h.engine.snapshot().floor, 8);
  const allocation = stage.objects.find(o => o.id === 'allocation');
  h.engine.encounterResult(allocation, allocation.choices[0]); assert.equal(h.flags.freight, true); assert.equal(h.flags.ventilation, false);
  h.engine.encounterResult(allocation, allocation.choices[1]); assert.equal(h.flags.freight, false); assert.equal(h.flags.ventilation, true);
});
test('optional ladder shortcut, rescues and malformed checkpoint recovery', () => {
  const h = harness({ floor: 10, x: 1080, done: 'invalid', seen: null }); h.tap('interact'); assert.equal(h.encounter.id, 'ladder');
  h.engine.encounterResult(h.encounter, h.encounter.choices[0]); assert.equal(h.engine.snapshot().floor, 12);
  const researcher = stage.objects.find(o => o.id === 'researcher'); h.engine.encounterResult(researcher, researcher.choices[0]); assert.equal(h.flags['researcher-rescued'], true);
  h.engine.encounterResult(researcher, researcher.choices[1]); assert.equal(h.flags['researcher-rescued'], false);
});
