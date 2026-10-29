import test from "node:test";
import assert from "node:assert/strict";
import * as T from "../vendor/three.module.js";
import { midnightTower as tower } from "../towers/tower-0001.js";
import {
  freshState,
  restoreState,
  travel,
  travelBlock,
  activate,
  canEscape,
  required,
  secureFloor,
} from "../engines/midnight/state.js";
import { getProblem } from "../math/bank.js";
import { progressFor, submit } from "../math/guided-solutions.js";
import { buildRoom } from "../engines/midnight/rooms.js";

function solve(s, g) {
  const p = getProblem(s, tower.id, g),
    progress = progressFor(s, g.id, p);
  progress.guided = true;
  for (const step of p.steps)
    assert.equal(submit(p, progress, step.answer).correct, true);
  assert.equal(activate(s, g.id), true);
}
test("3D Tower descends all 21 floors, solves 9 required and 3 optional systems, and returns to the lobby", () => {
  const s = freshState(715, "readiness");
  assert.equal(tower.rooms.length, 21);
  assert.equal(new Set(tower.rooms.map((r) => r.theme)).size, 21);
  for (let i = 0; i < 21; i++) {
    assert.equal(s.floor, i);
    const film = tower.rooms[i].entry;
    if (film) s.seen.push(film);
    const gates = tower.gates.filter((g) => g.floor === i);
    if (gates.some((g) => !g.optional) && i < 20)
      assert.ok(travelBlock(s, i + 1));
    if (i === 1) {
      assert.ok(travelBlock(s, 2));
      assert.equal(secureFloor(s, "receptionSecured"), true);
    }
    if (i === 2) {
      assert.ok(travelBlock(s, 3));
      assert.equal(secureFloor(s, "routeReleased"), true);
    }
    if (i === 4) {
      assert.ok(travelBlock(s, 5));
      s.collected = ["4:0", "4:1", "4:2"];
    }
    for (const g of gates) solve(s, g);
    if (i < 20) assert.equal(travel(s, i + 1), null);
  }
  assert.equal(s.escape, true);
  assert.equal(canEscape(s), false);
  assert.equal(s.solved.length, 12);
  for (const floor of [19, 18, 17]) assert.equal(travel(s, floor), null);
  assert.equal(canEscape(s), true);
  s.seen.push("ending");
  s.complete = true;
  const restored = restoreState(JSON.parse(JSON.stringify(s)));
  assert.equal(restored.complete, true);
  assert.equal(restored.visited.length, 21);
  assert.equal(restored.flags.battery, true);
});
test("lifts and the maintenance shaft cannot bypass math or mandatory story; freight needs power", () => {
  const s = freshState(5);
  s.seen.push("arrival");
  assert.ok(travelBlock(s, 2, "lift", "A"));
  solve(s, tower.gates[0]);
  assert.ok(travelBlock(s, 2, "lift", "A"));
  assert.equal(travel(s, 1, "lift", "A"), null);
  s.seen.push("welcome");
  assert.equal(secureFloor(s, "receptionSecured"), true);
  assert.equal(travel(s, 2, "lift", "A"), null);
  s.floor = 6;
  assert.ok(travelBlock(s, 8, "lift", "B"));
  solve(
    s,
    tower.gates.find((g) => g.id === "power"),
  );
  assert.equal(travelBlock(s, 8, "lift", "B"), null);
  s.floor = 10;
  assert.ok(travelBlock(s, 12, "ladder"));
  solve(
    s,
    tower.gates.find((g) => g.id === "lab"),
  );
  assert.equal(travelBlock(s, 12, "ladder"), null);
  s.floor = 19;
  assert.ok(travelBlock(s, 17, "lift", "C"));
  s.flags.freight = true;
  assert.equal(travelBlock(s, 17, "lift", "C"), null);
});
test("override, corrupt saves and interrupted film recovery preserve the learning gate", () => {
  const s = freshState(4);
  s.floor = 20;
  s.seen.push("breach");
  const g = tower.gates.find((g) => g.id === "override"),
    p = getProblem(s, tower.id, g);
  submit(p, progressFor(s, g.id, p), p.answer);
  assert.equal(activate(s, g.id), false);
  assert.equal(canEscape(s), false);
  const bad = {
    ...s,
    escape: true,
    complete: true,
    pendingFilm: "ending",
    solved: ["override"],
    health: -9,
  };
  const clean = restoreState(bad);
  assert.equal(clean.escape, false);
  assert.equal(clean.complete, false);
  assert.equal(clean.pendingFilm, null);
  assert.equal(clean.health, 1);
  s.floor = 12;
  s.pendingFilm = "impossible";
  assert.equal(restoreState(s).pendingFilm, "impossible");
  assert.equal(restoreState({ version: 1 }), null);
});
test("all 21 rendered rooms have reachable stairs, instruments, choices and collectibles", () => {
  // CanvasTexture needs only a canvas-like source to inspect geometry without WebGL.
  globalThis.document = {
    createElement() {
      return {
        width: 0,
        height: 0,
        getContext() {
          return {
            measureText: (t) => ({ width: t.length * 40 }),
            fillText() {},
          };
        },
      };
    },
  };
  const s = freshState(1),
    world = {
      scene: new T.Scene(),
      roof: new T.Group(),
      enter() {},
      museumConsole: {},
      roofConsole: {},
      exitDoor: { group: {} },
      enemies: [],
      shards: [],
      robot: {},
      core: new T.Group(),
      pendulum: new T.Group(),
      obstacles: [
        { x: 0, z: 2, w: 2.5, d: 1.3, h: 0.7 },
        { x: 3, z: -1, w: 1.3, d: 1.3, h: 0.9 },
      ],
    };
  for (let floor = 0; floor < 21; floor++) {
    s.floor = floor;
    const r = buildRoom(world, floor, s),
      step = 0.5,
      start = floor === 0 ? [-6, 4] : [-8, 7];
    const blocked = (x, z) =>
      x < -17 ||
      x > 17 ||
      z < -15 ||
      z > 15 ||
      r.colliders.some(
        (o) =>
          o.h > 0 &&
          Math.abs(x - o.x) < o.w / 2 + 0.3 &&
          Math.abs(z - o.z) < o.d / 2 + 0.3,
      );
    const queue = [start],
      seen = new Set([start.join(",")]);
    for (let i = 0; i < queue.length; i++) {
      const [x, z] = queue[i];
      for (const [dx, dz] of [
        [step, 0],
        [-step, 0],
        [0, step],
        [0, -step],
      ]) {
        const next = [x + dx, z + dz],
          key = next.join(",");
        if (!blocked(...next) && !seen.has(key)) {
          seen.add(key);
          queue.push(next);
        }
      }
    }
    for (const t of r.targets.filter(
      (t) => !t.label.includes("cabin floor controls"),
    ))
      assert.ok(
        queue.some(([x, z]) => Math.hypot(x - t.x, z - t.z) < t.r - 0.1),
        `Floor ${tower.floors[floor]} target ${t.label} must be reachable`,
      );
    for (const { group, id } of r.collectibles)
      assert.ok(
        queue.some(
          ([x, z]) =>
            Math.hypot(x - group.position.x, z - group.position.z) < 0.9,
        ),
        `Fragment ${id} reachable`,
      );
    assert.ok(r.root.children.length > 5);
    r.dispose();
    assert.equal(world.scene.children.length, 0);
  }
  delete globalThis.document;
});
test("every authored shot has a valid duration and camera, with all thirteen major beats represented", () => {
  for (const name of [
    "arrival",
    "welcome",
    "number",
    "skitters",
    "power",
    "impossible",
    "watcher",
    "researcher",
    "dent",
    "lobby",
    "recording",
    "breach",
    "ending",
  ])
    assert.ok(tower.films[name]?.length);
  for (const shots of Object.values(tower.films))
    for (const shot of shots) {
      assert.ok(shot.seconds > 0);
      for (const vector of [shot.camera, shot.target, shot.end])
        assert.ok(vector.length === 3 && vector.every(Number.isFinite));
    }
  assert.equal(required.length, 9);
});
