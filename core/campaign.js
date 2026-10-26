// IDs remain stable when the authored catalog grows. No generated filler levels.
export const SCOPE = Object.freeze({ towers: 1000, interludes: 999, stages: 1999 });
export function stageId(kind, number) {
  const limit = kind === 'tower' ? SCOPE.towers : kind === 'interlude' ? SCOPE.interludes : 0;
  if (!Number.isInteger(number) || number < 1 || number > limit) throw new RangeError('Invalid campaign position');
  return `${kind}-${String(number).padStart(4, '0')}`;
}
export function stagePosition(id) {
  const match = /^(tower|interlude)-(\d{4})$/.exec(id);
  if (!match || stageId(match[1], Number(match[2])) !== id) throw new RangeError('Invalid stage ID');
  return 2 * (Number(match[2]) - 1) + (match[1] === 'interlude' ? 1 : 0);
}
export function nextStageId(id) {
  stagePosition(id);
  const [kind, n] = id.split('-');
  if (kind === 'tower' && Number(n) === SCOPE.towers) return null;
  return kind === 'tower' ? stageId('interlude', Number(n)) : stageId('tower', Number(n) + 1);
}
export const CATALOG = Object.freeze([
  { id: 'tower-0001', title: 'The Night Everything Went Wrong', subtitle: '18 floors + 3 basements', kind: 'tower' },
]);
const LOADERS = {
  'tower-0001': () => import('../towers/tower-0001.js'),
};
export async function loadStage(id) {
  stagePosition(id);
  if (!LOADERS[id]) throw new Error('This adventure has not been authored yet.');
  return (await LOADERS[id]()).default;
}
export const isAvailable = id => Object.hasOwn(LOADERS, id);
