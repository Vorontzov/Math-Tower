import { checkAnswer } from './answer-checker.js';
export function progressFor(save, key, problem) {
  const old = save.math[key];
  const progress = { guided: old?.guided === true, checked: [], draft: typeof old?.draft === 'string' ? old.draft.slice(0, 80) : '', attempts: Number.isInteger(old?.attempts) ? Math.max(0, old.attempts) : 0, solved: old?.solved === true };
  if (Array.isArray(old?.checked)) {
    for (let i = 0; i < Math.min(old.checked.length, problem.steps.length); i++) {
      if (!checkAnswer(old.checked[i], problem.steps[i].answer).correct) break;
      progress.checked.push(old.checked[i]);
    }
  }
  // An incomplete guided path cannot count as a completed solution.
  if (progress.guided && progress.checked.length < problem.steps.length) progress.solved = false;
  save.math[key] = progress;
  return progress;
}
export function submit(problem, progress, input) {
  if (progress.solved) return { correct: true, complete: true };
  const expected = progress.guided ? problem.steps[progress.checked.length]?.answer : problem.answer;
  const result = checkAnswer(input, expected);
  progress.attempts++;
  if (!result.correct) return { ...result, complete: false };
  if (progress.guided) progress.checked.push(input.trim());
  progress.solved = !progress.guided || progress.checked.length === problem.steps.length;
  progress.draft = '';
  return { ...result, complete: progress.solved };
}
