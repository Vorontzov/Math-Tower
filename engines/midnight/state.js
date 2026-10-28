import { midnightTower as tower } from "../../towers/tower-0001.js";
import { getProblem } from "../../math/bank.js";
import { progressFor } from "../../math/guided-solutions.js";

export const SAVE_KEY = "mathTower.midnight.tower1.v2";
export const required = tower.gates.filter((g) => !g.optional);
export function freshState(seed, bankId = "readiness") {
  return {
    version: 2,
    seed,
    bankId,
    floor: 0,
    position: { x: -6, z: 4 },
    health: 3,
    math: {},
    solved: [],
    collected: [],
    visited: [0],
    seen: [],
    flags: {},
    escape: false,
    complete: false,
    pendingFilm: null,
  };
}
export function restoreState(value) {
  if (
    !value ||
    value.version !== 2 ||
    !Number.isInteger(value.seed) ||
    !["foundations", "readiness"].includes(value.bankId)
  )
    return null;
  const s = freshState(value.seed, value.bankId);
  s.floor = Number.isInteger(value.floor)
    ? Math.max(0, Math.min(20, value.floor))
    : 0;
  s.health = Number.isInteger(value.health)
    ? Math.max(1, Math.min(3, value.health))
    : 3;
  s.math =
    value.math && typeof value.math === "object" && !Array.isArray(value.math)
      ? value.math
      : {};
  // Revalidate saved learning before accepting a solved mechanism.
  for (const g of tower.gates)
    if (Array.isArray(value.solved) && value.solved.includes(g.id)) {
      const p = progressFor(s, g.id, getProblem(s, tower.id, g));
      if (p.solved) s.solved.push(g.id);
    }
  s.collected = Array.isArray(value.collected)
    ? [
        ...new Set(
          value.collected.filter((id) => ["4:0", "4:1", "4:2"].includes(id)),
        ),
      ]
    : [];
  s.visited = Array.isArray(value.visited)
    ? [
        ...new Set([
          0,
          ...value.visited.filter(
            (n) => Number.isInteger(n) && n >= 0 && n <= 20,
          ),
        ]),
      ]
    : [0];
  s.seen = Array.isArray(value.seen)
    ? [...new Set(value.seen.filter((id) => tower.films[id]))]
    : [];
  const validFlags = [
    "guidebot",
    "researcher",
    "researcherWaiting",
    "freight",
    "ventilation",
    "supplies",
    "battery",
    "sculpture",
  ];
  for (const flag of validFlags) s.flags[flag] = value.flags?.[flag] === true;
  if (s.flags.freight) s.flags.ventilation = false;
  s.flags.battery = s.flags.battery && s.solved.includes("battery");
  s.flags.supplies = s.flags.supplies && s.solved.includes("supplies");
  s.escape =
    value.escape === true && required.every((g) => s.solved.includes(g.id));
  s.complete =
    value.complete === true &&
    s.escape &&
    s.floor === 17 &&
    s.seen.includes("ending");
  if (
    value.position &&
    Number.isFinite(value.position.x) &&
    Number.isFinite(value.position.z)
  )
    s.position = {
      x: Math.max(-12, Math.min(12, value.position.x)),
      z: Math.max(-10, Math.min(10, value.position.z)),
    };
  else s.position = s.floor === 0 ? { x: -6, z: 4 } : { x: -8, z: 7 };
  const allowed = [tower.rooms[s.floor].entry];
  if (s.floor === 6 && s.solved.includes("power")) allowed.push("power");
  if (s.floor === 20 && s.escape) allowed.push("escape");
  if (s.floor === 17 && s.escape) allowed.push("ending");
  if (s.floor === 15) allowed.push("rescue", "waiting");
  if (s.floor === 9 && s.flags.guidebot) allowed.push("freed");
  if (
    typeof value.pendingFilm === "string" &&
    allowed.includes(value.pendingFilm)
  )
    s.pendingFilm = value.pendingFilm;
  return s;
}
export function currentGate(s) {
  return tower.gates.find(
    (g) => g.floor === s.floor && !g.optional && !s.solved.includes(g.id),
  );
}
export function travelBlock(s, destination, kind = "stairs", liftId = null) {
  if (!Number.isInteger(destination) || destination < 0 || destination > 20)
    return "That landing does not exist.";
  if (kind === "stairs" && Math.abs(destination - s.floor) !== 1)
    return "Use the next stair landing.";
  if (kind === "ladder" && !(s.floor === 10 && destination === 12))
    return "This shaft connects Floor 8 to Floor 6.";
  if (
    kind === "escalator" &&
    !tower.escalators.some(
      (e) =>
        (e.from === s.floor && e.to === destination) ||
        (e.to === s.floor && e.from === destination),
    )
  )
    return "That escalator does not connect these floors.";
  if (!["stairs", "ladder", "lift", "escalator"].includes(kind))
    return "Unknown transport.";
  if (kind === "lift") {
    const lift = tower.lifts.find((l) => l.id === liftId);
    if (
      !lift ||
      !lift.stops.includes(s.floor) ||
      !lift.stops.includes(destination)
    )
      return "This lift does not serve that landing.";
    if (lift.unlock && !s.solved.includes(lift.unlock))
      return "Restore research power on Floor 12 first.";
    if (lift.unlockFlag && !s.flags.freight)
      return "Allocate power to freight on Floor 4 first.";
  }
  if (destination > s.floor && !s.escape) {
    for (let i = s.floor; i < destination; i++) {
      const gate = tower.gates.find(
        (g) => g.floor === i && !g.optional && !s.solved.includes(g.id),
      );
      if (gate)
        return `Restore ${gate.label.toLowerCase()} on ${tower.floors[i].startsWith("B") ? tower.floors[i] : "Floor " + tower.floors[i]} first.`;
      if (tower.rooms[i].requiredCollect && s.collected.length < 3)
        return "Recover all three memory fragments in the kinetic gallery.";
      const film = tower.rooms[i].entry;
      if (film && !s.seen.includes(film))
        return `Investigate ${tower.rooms[i].name.toLowerCase()} first.`;
    }
  }
  return null;
}
export function travel(s, destination, kind = "stairs", liftId = null) {
  const reason = travelBlock(s, destination, kind, liftId);
  if (reason) return reason;
  s.floor = destination;
  s.position = { x: -8, z: 7 };
  if (!s.visited.includes(destination)) s.visited.push(destination);
  return null;
}
export function activate(s, id) {
  const gate = tower.gates.find((g) => g.id === id);
  if (!gate || gate.floor !== s.floor) return false;
  if ((gate.requires || []).some((id) => !s.solved.includes(id))) return false;
  const p = progressFor(s, id, getProblem(s, tower.id, gate));
  if (!p.solved) return false;
  if (!s.solved.includes(id)) s.solved.push(id);
  if (id === "supplies") {
    s.health = 3;
    s.flags.supplies = true;
  }
  if (id === "battery") s.flags.battery = true;
  if (id === "override")
    s.escape = required.every((g) => s.solved.includes(g.id));
  return true;
}
export function canEscape(s) {
  return (
    s.floor === 17 && s.escape && required.every((g) => s.solved.includes(g.id))
  );
}
