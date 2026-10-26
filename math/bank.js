import foundations from './banks/foundations.js';
import readiness from './banks/readiness.js';
import { hash, generate } from './generators.js';
import { parseNumber, checkAnswer } from './answer-checker.js';
export const BANKS = [foundations, readiness];
export function validateCustomBank(data) {
  if (!data || data.version !== 1 || typeof data.title !== 'string' || !data.title.trim() || data.title.length > 80 || !Array.isArray(data.items) || !data.items.length || data.items.length > 200) throw new Error('Use version 1, a title, and 1–200 questions.');
  const ids = new Set();
  const short = (x, size) => typeof x === 'string' && x.trim().length > 0 && x.length <= size;
  for (const q of data.items) {
    if (!short(q.id, 80) || ids.has(q.id)) throw new Error('Each question needs a unique ID.');
    ids.add(q.id);
    if (!short(q.prompt, 600) || !short(q.answer, 80) || !parseNumber(q.answer) || !short(q.hint, 400)) throw new Error(`${q.id}: provide a prompt, numeric answer and hint.`);
    if (!Array.isArray(q.steps) || !q.steps.length || q.steps.length > 8) throw new Error(`${q.id}: provide 1–8 checked solution steps.`);
    for (const step of q.steps) if (!short(step.prompt, 400) || !short(step.answer, 80) || !parseNumber(step.answer)) throw new Error(`${q.id}: invalid solution step.`);
    if (!checkAnswer(q.steps.at(-1).answer, q.answer).correct) throw new Error(`${q.id}: the final step must produce the question’s answer.`);
    if (q.topic !== undefined && !short(q.topic, 80)) throw new Error(`${q.id}: invalid topic.`);
  }
  // Return only supported data. Imported strings are rendered with textContent.
  return { version: 1, title: data.title, items: data.items.map(q => ({ id: q.id, prompt: q.prompt, answer: q.answer, hint: q.hint, topic: q.topic || 'custom', steps: q.steps.map(s => ({ prompt: s.prompt, answer: s.answer })) })) };
}
export function getProblem(save, stageId, gate) {
  const seed = hash(`${save.seed}/${stageId}/${gate.id}/${save.bankId}`);
  if (save.bankId === 'custom') {
    const items = save.customBank.items;
    const matching = items.filter(q => q.topic === gate.socket.topic);
    const pool = matching.length ? matching : items;
    return { ...pool[seed % pool.length], skill: 'Custom practice', unit: '' };
  }
  const bank = BANKS.find(b => b.id === save.bankId);
  if (!bank) throw new Error('Unknown question bank');
  return generate(bank.resolve(gate.socket, seed), seed);
}
