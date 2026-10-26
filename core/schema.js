import { stagePosition } from './campaign.js';
export function validateStage(stage) {
  const fail = message => { throw new Error(`${stage.id || 'stage'}: ${message}`); };
  stagePosition(stage.id);
  if (!stage.title || !stage.brief || !stage.ending) fail('missing story fields');
  if (stage.kind !== stage.id.split('-')[0]) fail('kind does not match ID');
  if (!Array.isArray(stage.gates) || !stage.gates.length) fail('every adventure requires math');
  const ids = new Set();
  for (const gate of stage.gates) {
    if (!gate.id || ids.has(gate.id)) fail('gate IDs must be unique');
    ids.add(gate.id);
    if (!gate.label || !gate.socket?.topic) fail('each gate needs a label and math socket');
  }
  if (!stage.gates.some(g => !g.optional)) fail('at least one required math gate');
  if (stage.kind === 'tower') {
    if (stage.engine !== 'tower' || !Array.isArray(stage.floors) || stage.floors.length < 2) fail('invalid tower geometry');
    if (new Set(stage.floors).size !== stage.floors.length) fail('duplicate floor labels');
    if (stage.width < 960 || stage.width > 2400 || stage.floorHeight < 110 || stage.floorHeight > 200) fail('unsupported geometry');
    const validFloor = f => Number.isInteger(f) && f >= 0 && f < stage.floors.length;
    const validX = x => Number.isFinite(x) && x >= 50 && x <= stage.width - 50;
    const edges = stage.floors.map(() => new Set());
    for (const stairs of stage.stairs) {
      if (!validX(stairs.x) || !validFloor(stairs.from) || !validFloor(stairs.to) || stairs.to <= stairs.from) fail('invalid staircase');
      for (let f = stairs.from; f < stairs.to; f++) { edges[f].add(f + 1); edges[f + 1].add(f); }
    }
    // A safe stair route must remain possible without power or optional rewards.
    const reached = new Set([0]);
    const queue = [0];
    for (const f of queue) for (const next of edges[f]) if (!reached.has(next)) { reached.add(next); queue.push(next); }
    if (reached.size !== stage.floors.length) fail('a floor is unreachable without a lift');
    for (const lift of stage.lifts) {
      if (!validX(lift.x) || lift.stops.length < 2 || lift.stops.some(f => !validFloor(f)) || new Set(lift.stops).size !== lift.stops.length) fail('invalid lift stops');
      if (lift.stops.some((f, i) => i > 0 && f <= lift.stops[i - 1])) fail('lift stops must be sorted top to bottom');
      if (lift.unlock && !ids.has(lift.unlock)) fail('lift power gate does not exist');
    }
    for (const gate of stage.gates) {
      if (!validFloor(gate.floor) || !validX(gate.x)) fail('gate outside tower');
      if (gate.requires?.some(id => id === gate.id || !ids.has(id))) fail('gate prerequisite missing or self-referential');
    }
    const visiting = new Set(), visited = new Set();
    const visit = id => {
      if (visiting.has(id)) fail('circular gate prerequisites');
      if (visited.has(id)) return;
      visiting.add(id); for (const parent of stage.gates.find(g => g.id === id).requires || []) visit(parent);
      visiting.delete(id); visited.add(id);
    };
    for (const id of ids) visit(id);
    for (const e of stage.escalators || []) if (!validFloor(e.from) || !validFloor(e.to) || e.to !== e.from + 1 || !validX(e.x)) fail('invalid escalator');
    for (const object of stage.objects || []) if (!validFloor(object.floor) || !validX(object.x)) fail('object outside tower');
    if (!validFloor(stage.exit.floor) || !validX(stage.exit.x)) fail('exit outside tower');
  } else {
    if (stage.engine !== 'runner' || !['foot', 'bicycle'].includes(stage.vehicle) || stage.length < 1000) fail('unsupported interlude');
    let previous = 0;
    for (const gate of stage.gates) {
      if (gate.at <= previous || gate.at >= stage.length || gate.optional) fail('interlude gates must be ordered and required');
      previous = gate.at;
    }
  }
  return stage;
}
