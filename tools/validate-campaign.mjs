import { readdir } from 'node:fs/promises';
import { CATALOG, SCOPE, loadStage } from '../core/campaign.js';
import { validateStage } from '../core/schema.js';
for (const entry of CATALOG) {
  const stage = validateStage(await loadStage(entry.id));
  console.log(`${stage.id}: ${stage.gates.filter(g => !g.optional).length} required and ${stage.gates.filter(g => g.optional).length} optional math panels; reachable tower`);
}
const towers = (await readdir(new URL('../towers/', import.meta.url))).filter(f => f.endsWith('.js'));
const interludes = (await readdir(new URL('../interludes/', import.meta.url))).filter(f => f.endsWith('.js'));
if (towers.length !== 1 || towers[0] !== 'tower-0001.js' || interludes.length !== 0 || CATALOG.length !== 1) throw new Error('Current authorized scope is Tower 1 only.');
console.log(`Available: 1 Tower, 0 Interludes. Planned campaign: ${SCOPE.towers} Towers + ${SCOPE.interludes} Interludes = ${SCOPE.stages} stages.`);
