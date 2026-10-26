import { CATALOG, loadStage, nextStageId, isAvailable } from './campaign.js';
import { validateStage } from './schema.js';
import { createStorage, freshSave } from './storage.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { getProblem, validateCustomBank } from '../math/bank.js';
import { progressFor, submit } from '../math/guided-solutions.js';

const $ = id => document.getElementById(id);
let browserStorage;
try { browserStorage = window.localStorage; } catch { browserStorage = { getItem() { throw new Error('Storage unavailable'); }, setItem() { throw new Error('Storage unavailable'); } }; }
const storage = createStorage(browserStorage), audio = createAudio();
let save = storage.read(), stage = null, engine = null, view = 'home', challenge = null, customBank = null, loading = false;
if (save?.bankId === 'custom') {
  try { save.customBank = validateCustomBank(save.customBank); customBank = save.customBank; }
  catch { save = null; $('global-status').textContent = 'The saved custom bank is invalid. Import a valid bank or start with Foundations.'; }
}
const modalOpen = () => !!document.querySelector('dialog[open]');
const active = () => view === 'play' && !!engine && !modalOpen() && !loading;
const input = createInput(active), canvas = $('scene'), ctx = canvas.getContext('2d');
const engineLoaders = { tower: () => import('../engines/tower.js') };
function closeDialogs() { for (const dialog of document.querySelectorAll('dialog[open]')) dialog.close(); }
function show(id) { input.clear(); $(id).showModal(); }
function focusScene() { input.clear(); canvas.focus({ preventScroll: true }); }
function say(message) { $('message').textContent = message; }
function persist() {
  if (!save) return;
  if (engine) save.stageState = engine.snapshot();
  if (!storage.write(save)) {
    $('save-status').textContent = 'Session only · browser storage unavailable';
    $('global-status').textContent = 'Browser storage is unavailable. You can keep playing, but this expedition will not survive closing the page.';
  }
}
function appendCustomOption() {
  $('bank').querySelector('[value="custom"]')?.remove();
  if (customBank) { const option = document.createElement('option'); option.value = 'custom'; option.textContent = `Custom · ${customBank.title}`; $('bank').append(option); }
}
function renderHome() {
  appendCustomOption();
  if (save) $('bank').value = save.bankId;
  $('resume').hidden = !save;
  $('resume').textContent = save?.finished ? 'Revisit your Tower →' : 'Continue expedition →';
  $('new-run').textContent = save ? 'New expedition' : 'Enter Math Tower →';
  $('save-summary').textContent = save ? `${save.finished ? 'Tower 1 completed' : 'Expedition in progress'} · ${save.record.length} panels solved · saved in this browser` : 'Math from the first door. No countdown while you calculate.';
  $('stage-list').replaceChildren();
  for (const entry of CATALOG) {
    const li = document.createElement('li'); li.className = entry.kind;
    const label = document.createElement('span'), title = document.createElement('h3'), detail = document.createElement('p');
    label.textContent = `${entry.kind.toUpperCase()} ${Number(entry.id.split('-')[1])}${save?.completed.includes(entry.id) ? ' · COMPLETED' : ''}`;
    title.textContent = entry.title; detail.textContent = entry.subtitle;
    li.append(label, title, detail); $('stage-list').append(li);
  }
}
function home() {
  persist(); closeDialogs(); input.clear(); view = 'home'; $('play').hidden = true; $('home').hidden = false; renderHome();
}
async function startStage(showBrief = true) {
  if (loading || !save) return;
  loading = true; input.clear(); closeDialogs();
  try {
    const data = validateStage(await loadStage(save.stageId));
    const module = await engineLoaders[data.engine]();
    stage = data;
    engine = module.createEngine(stage, save.stageState, {
      input, challenge: openMath, complete: finishStage, say,
      sound: kind => audio.play(kind), flag: (name, value = true) => { save.flags[name] = value; }, hasFlag: name => save.flags[name] === true,
      encounter: openEncounter,
    });
    view = 'play'; $('home').hidden = true; $('play').hidden = false;
    $('stage-kind').textContent = `TOWER ${Number(stage.id.split('-')[1])} / ${stage.location}`;
    $('stage-title').textContent = stage.title;
    document.documentElement.style.setProperty('--mint', stage.accent);
    say('Find the illuminated panels. The objective above the scene shows the next required destination.');
    if (showBrief) {
      $('brief-kind').textContent = `TOWER ${Number(stage.id.split('-')[1])} · ${stage.location}`;
      $('brief-title').textContent = stage.title; $('brief-copy').textContent = stage.brief;
      $('brief-controls').textContent = 'Move: ← → · Jump: Space · Lift / stairs: ↑ ↓ · Use: E · Stun: X · Shove: C';
      show('brief-dialog');
    } else focusScene();
    persist();
  } catch (error) {
    $('global-status').textContent = `Could not load the adventure: ${error.message}. Refresh to retry.`;
    view = 'home'; $('play').hidden = true; $('home').hidden = false;
  } finally { loading = false; }
}
function newRun() {
  engine = null; challenge = null;
  save = freshSave($('bank').value, $('bank').value === 'custom' ? customBank : null);
  persist(); startStage();
}
function openMath(gate) {
  if (modalOpen()) return;
  const key = `${stage.id}/${gate.id}`, problem = getProblem(save, stage.id, gate);
  challenge = { gate, key, problem, progress: progressFor(save, key, problem) };
  $('math-label').textContent = gate.label; $('math-skill').textContent = problem.skill;
  $('math-question').textContent = problem.prompt;
  $('math-hint').hidden = true; $('math-hint').textContent = problem.hint;
  $('math-feedback').textContent = ''; $('answer').removeAttribute('aria-invalid');
  paintMath(); show('math-dialog');
  if (!challenge.progress.solved) $('answer').focus(); else $('unlock').focus();
  persist();
}
function paintMath() {
  const { problem, progress } = challenge;
  $('guide').hidden = !progress.guided;
  $('checked-steps').replaceChildren();
  if (progress.guided) {
    $('guide-position').textContent = progress.solved ? 'ALL STEPS CHECKED' : `STEP ${progress.checked.length + 1} OF ${problem.steps.length}`;
    for (let i = 0; i < progress.checked.length; i++) {
      const item = document.createElement('li'); item.textContent = `${problem.steps[i].prompt} ✓ ${progress.checked[i]}`; $('checked-steps').append(item);
    }
    $('step-prompt').textContent = progress.solved ? 'You worked through every calculation.' : problem.steps[progress.checked.length].prompt;
  }
  $('answer-form').hidden = progress.solved;
  $('answer-label').textContent = progress.guided ? 'This step’s answer' : 'Your answer';
  $('answer').value = progress.draft;
  $('work-through').hidden = progress.guided || progress.solved;
  $('show-hint').hidden = progress.solved;
  $('unlock').hidden = !progress.solved;
  $('close-math').hidden = progress.solved;
}
$('answer').addEventListener('input', () => { if (challenge) { challenge.progress.draft = $('answer').value; persist(); } });
$('answer-form').addEventListener('submit', event => {
  event.preventDefault(); if (!challenge || challenge.progress.solved) return;
  const result = submit(challenge.problem, challenge.progress, $('answer').value);
  $('answer').setAttribute('aria-invalid', String(!result.correct));
  if (!result.correct) {
    $('math-feedback').textContent = result.format ? 'Not quite. Take another look, or work through one step at a time. There is no penalty.' : 'Use a number, decimal or fraction. Leave out words and units.';
    $('answer').select();
  } else {
    $('math-feedback').textContent = result.complete ? 'Calculation verified. The way is ready.' : 'That step is correct. Now try the next one.';
    paintMath(); if (result.complete) $('unlock').focus(); else $('answer').focus();
  }
  persist();
});
$('show-hint').addEventListener('click', () => { $('math-hint').hidden = false; $('answer').focus(); });
$('work-through').addEventListener('click', () => {
  if (!challenge) return;
  challenge.progress.guided = true; challenge.progress.draft = '';
  $('math-feedback').textContent = 'Each correct calculation reveals the next step.';
  paintMath(); $('answer').focus(); persist();
});
$('unlock').addEventListener('click', () => {
  if (!challenge?.progress.solved) return;
  const { gate, progress, problem, key } = challenge;
  if (!save.record.some(r => r.key === key)) save.record.push({ key, skill: problem.skill, assisted: progress.guided, attempts: progress.attempts });
  save.record = save.record.slice(-100);
  $('math-dialog').close(); engine.finishGate(gate); challenge = null; persist(); focusScene();
});
function closeMath() { persist(); $('math-dialog').close(); challenge = null; focusScene(); }
$('close-math').addEventListener('click', closeMath);
$('math-dialog').addEventListener('cancel', e => { e.preventDefault(); closeMath(); });

function openEncounter(object) {
  $('encounter-title').textContent = object.title;
  $('encounter-copy').textContent = object.text;
  $('encounter-choices').replaceChildren();
  const choices = object.choices || [{ label: 'Keep exploring', flag: object.id }];
  for (const choice of choices) {
    const button = document.createElement('button'); button.className = 'secondary'; button.textContent = choice.label;
    button.addEventListener('click', () => { if (choice.flag) save.flags[choice.flag] = true; engine.encounterResult?.(object, choice); $('encounter-dialog').close(); persist(); focusScene(); });
    $('encounter-choices').append(button);
  }
  show('encounter-dialog');
}
function finishStage() {
  if (!save.completed.includes(stage.id)) save.completed.push(stage.id);
  const next = nextStageId(stage.id);
  save.finished = !isAvailable(next);
  persist();
  $('result-title').textContent = 'Tower 1 complete.';
  $('result-copy').textContent = stage.ending;
  const records = save.record.filter(r => r.key.startsWith(stage.id + '/'));
  $('result-math').textContent = `${records.length} panels solved · ${records.filter(r => r.assisted).length} with guided calculations. Your expedition is saved. Campus Sprint and the next Towers are not implemented yet.`;
  $('next-stage').hidden = !isAvailable(next);
  if (isAvailable(next)) $('next-stage').textContent = `Continue to ${CATALOG.find(s => s.id === next).title} →`;
  show('result-dialog');
}
$('next-stage').addEventListener('click', () => {
  const next = nextStageId(stage.id); if (!isAvailable(next)) return;
  engine = null; save.stageId = next; save.stageState = null; persist(); startStage();
});
$('new-run').addEventListener('click', () => { if (save) show('restart-dialog'); else newRun(); });
$('confirm-new').addEventListener('click', newRun);
$('cancel-new').addEventListener('click', () => $('restart-dialog').close());
$('resume').addEventListener('click', () => startStage(false));
$('begin').addEventListener('click', () => { $('brief-dialog').close(); focusScene(); });
$('brief-dialog').addEventListener('cancel', e => { e.preventDefault(); $('brief-dialog').close(); focusScene(); });
function pause() { if (active()) { persist(); show('pause-dialog'); } }
$('pause').addEventListener('click', pause);
$('unpause').addEventListener('click', () => { $('pause-dialog').close(); focusScene(); });
$('pause-dialog').addEventListener('cancel', e => { e.preventDefault(); $('pause-dialog').close(); focusScene(); });
for (const id of ['home-button', 'pause-home', 'result-home']) $(id).addEventListener('click', home);
$('result-dialog').addEventListener('cancel', e => { e.preventDefault(); home(); });
$('sound').addEventListener('click', () => {
  try { const enabled = audio.toggle(); $('sound').textContent = enabled ? 'Sound on' : 'Sound off'; $('sound').setAttribute('aria-pressed', String(enabled)); }
  catch { $('sound').textContent = 'Sound unavailable'; }
  focusScene();
});
window.addEventListener('keydown', e => {
  if (e.key.toLowerCase() === 'p' && !/INPUT|TEXTAREA/.test(e.target.tagName)) { if ($('pause-dialog').open) { $('pause-dialog').close(); focusScene(); } else pause(); }
  if (e.key === 'Escape' && active()) { e.preventDefault(); pause(); }
});
document.addEventListener('visibilitychange', () => { if (document.hidden) { persist(); pause(); } });
window.addEventListener('blur', () => { persist(); pause(); });
window.addEventListener('pagehide', persist);
$('bank-file').addEventListener('change', async event => {
  const file = event.target.files[0]; if (!file) return;
  try {
    if (file.size > 200000) throw new Error('Keep the JSON bank below 200 KB.');
    customBank = validateCustomBank(JSON.parse(await file.text())); appendCustomOption(); $('bank').value = 'custom';
    $('import-status').textContent = `${customBank.items.length} questions loaded. Start a new expedition to use this bank.`;
  } catch (error) { $('import-status').textContent = `Could not import: ${error.message}`; }
  event.target.value = '';
});
$('bank').addEventListener('change', () => { $('bank-description').textContent = save ? 'A new expedition uses this selection. Continue keeps your saved bank and calculations.' : 'The adventure stays the same. Choose the practice that fits you.'; });
let last = performance.now(), autosave = 0, hud = '';
function frame(now) {
  const dt = Math.min(.04, (now - last) / 1000); last = now;
  if (engine && view === 'play') {
    if (active()) { engine.update(dt, input); autosave += dt; if (autosave > 3) { persist(); autosave = 0; } }
    engine.render(ctx, 1050, 600);
    const status = engine.status(), signature = JSON.stringify(status);
    if (signature !== hud) {
      hud = signature; $('place').textContent = status.place; $('health').textContent = status.hearts ? '♥ '.repeat(status.hearts).trim() : '';
      $('progress').textContent = `${status.progress} PANELS`; $('objective').textContent = status.objective; $('hint').textContent = status.hint;
    }
  }
  input.endFrame(); requestAnimationFrame(frame);
}
renderHome(); requestAnimationFrame(frame);
if (!storage.available) $('global-status').textContent = 'Browser storage is unavailable. This expedition will stay in this session only.';
