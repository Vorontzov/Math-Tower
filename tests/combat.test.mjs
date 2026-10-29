import test from "node:test";
import assert from "node:assert/strict";
import * as T from "../vendor/three.module.js";
import {
  traceShot,
  shoveTarget,
  moveBody,
  updateThreat,
  clearSight,
  advanceDart,
  coverPositions,
  navigationPath,
} from "../engines/midnight/combat.js";
import { midnightTower as tower } from "../towers/tower-0001.js";
import {
  freshState,
  secureFloor,
  travelBlock,
  restoreState,
} from "../engines/midnight/state.js";
const actor = (x, z) => ({
  position: new T.Vector3(x, 0, z),
  rotation: { y: 0 },
  visible: true,
  userData: { stun: 0, hitRadius: 0.44 },
});

test("stun pistol hits only the first body in the aimed direction; turning is required", () => {
  const origin = { x: 0, y: 1.3, z: 0 },
    front = actor(0, 3),
    behind = actor(0, -2),
    farther = actor(0, 5),
    side = actor(2, 2);
  assert.equal(
    traceShot(origin, 0, [behind, side, farther, front], []).enemy,
    front,
  );
  assert.equal(traceShot(origin, Math.PI, [front, behind], []).enemy, behind);
  assert.equal(
    traceShot(origin, Math.PI / 2, [front, behind, side], []).enemy,
    null,
  );
  assert.equal(traceShot(origin, 0, [actor(0, 9)], []).enemy, null);
  front.userData.disabled = true;
  assert.equal(traceShot(origin, 0, [front, farther], []).enemy, farther);
});
test("walls, glass and tall cover stop shots and sight; a low bench does not stop a chest-high shot", () => {
  const origin = { x: 0, y: 1.3, z: 0 },
    target = actor(0, 5),
    wall = { x: 0, z: 2, w: 4, d: 0.15, h: 3 };
  const hit = traceShot(origin, 0, [target], [wall]);
  assert.equal(hit.enemy, null);
  assert.ok(hit.distance < 2);
  assert.equal(clearSight(origin, target.position, [wall]), false);
  assert.equal(
    traceShot(origin, 0, [target], [{ ...wall, h: 0.5 }]).enemy,
    target,
  );
  assert.equal(
    traceShot(origin, 0, [target], [{ ...wall, x: 4 }]).enemy,
    target,
  );
});
test("shove is a short frontal contact, not a radial stun", () => {
  const origin = { x: 0, z: 0 },
    front = actor(0, 1),
    rear = actor(0, -0.5);
  assert.equal(shoveTarget(origin, 0, [rear, front], []), front);
  assert.equal(shoveTarget(origin, Math.PI, [rear, front], []), rear);
  assert.equal(shoveTarget(origin, 0, [actor(0, 1.7), actor(1, 0)], []), null);
  assert.equal(
    shoveTarget(origin, 0, [front], [{ x: 0, z: 0.5, w: 2, d: 0.1, h: 3 }]),
    null,
  );
});
test("shove impulse moves an enemy back and cannot pass through a wall", () => {
  const e = actor(0, 1),
    wall = { x: 0, z: 2, w: 4, d: 0.1, h: 3 };
  e.userData.knockback = { x: 0, z: 12 };
  e.userData.stun = 1.15;
  for (let i = 0; i < 30; i++)
    updateThreat(e, { x: 0, y: 0, z: 0 }, 1 / 60, [wall]);
  assert.ok(e.position.z > 1.4 && e.position.z < 1.66, e.position.z);
  assert.ok(e.userData.stun > 0);
  assert.equal(e.userData.state, "stunned");
  const open = actor(0, 0);
  moveBody(open, 0, 100, [wall]);
  assert.ok(open.position.z < 1.7);
});
test("androids telegraph a locked dart shot, stop walking to aim, and cannot fire while stunned", () => {
  const e = actor(0, 7),
    p = { x: 0, z: 0, y: 0 };
  let r = updateThreat(e, p, 0.05, [], { early: true });
  assert.equal(e.userData.state, "aiming");
  assert.equal(r.speed, 0);
  for (let i = 0; i < 20; i++) {
    r = updateThreat(e, p, 0.05, [], { early: true });
    assert.equal(r.shot, undefined);
    assert.equal(r.speed, 0);
  }
  let shot;
  for (let i = 0; i < 10; i++) {
    r = updateThreat(e, p, 0.05, [], { early: true });
    shot ||= r.shot;
  }
  assert.ok(shot);
  assert.equal(shot.direction.z, -1);
  e.userData.stun = 4;
  for (let i = 0; i < 30; i++) {
    r = updateThreat(e, p, 0.05, []);
    assert.equal(r.shot, undefined);
    assert.equal(r.speed, 0);
  }
});
test("darts can be dodged and are stopped by the first wall even across a long frame", () => {
  const player = { x: 0, y: 0, z: 0 },
    dart = () => ({ x: 0, z: 5, direction: { x: 0, z: -1 }, remaining: 12 });
  assert.equal(advanceDart(dart(), 1, player, []).hit, true);
  assert.equal(advanceDart(dart(), 1, { ...player, x: 1 }, []).hit, false);
  const r = advanceDart(dart(), 1, player, [
    { x: 0, z: 2, w: 4, d: 0.2, h: 3 },
  ]);
  assert.equal(r.hit, false);
  assert.equal(r.done, true);
});
test("cover has a concealed hold point and exposed firing corner; patrols creep and pause", () => {
  const walls = [{ x: 0, z: 0, w: 2, d: 2, h: 2 }],
    player = { x: 0, z: 6, y: 0 },
    origin = { x: 0, z: -4 };
  const choices = coverPositions(player, origin, walls);
  assert.ok(choices.length);
  for (const c of choices) {
    assert.equal(clearSight(c.hide, player, walls), false);
    assert.equal(clearSight(c.peek, player, walls), true);
  }
  const path = navigationPath({ x: 0, z: -3 }, { x: 0, z: 3 }, walls);
  assert.ok(path.length > 6);
  assert.ok(path.some((p) => Math.abs(p.x) > 1.4));
  const e = actor(0, -4);
  e.userData.patrol = [
    { x: 0, z: -4 },
    { x: 3, z: -4 },
  ];
  let speed = 0;
  for (let i = 0; i < 100; i++) {
    const r = updateThreat(e, { x: 15, z: 14, y: 0 }, 0.05, []);
    speed = Math.max(speed, r.speed);
  }
  assert.ok(speed <= 0.49 && speed > 0.1);
});
test("roof and upper floors contain active threats; their objectives cannot be skipped by a lift", () => {
  for (let i = 0; i < 5; i++) assert.ok(tower.rooms[i].enemies > 0);
  const s = freshState(5);
  s.floor = 1;
  s.seen = ["arrival", "welcome"];
  assert.ok(travelBlock(s, 2, "lift", "A"));
  assert.equal(secureFloor(s, "routeReleased"), false);
  assert.equal(secureFloor(s, "receptionSecured"), true);
  assert.equal(travelBlock(s, 2, "lift", "A"), null);
  s.floor = 2;
  s.seen.push("number");
  assert.ok(travelBlock(s, 3));
  assert.equal(secureFloor(s, "routeReleased"), true);
  assert.equal(travelBlock(s, 3), null);
  const old = { ...freshState(5), floor: 7, visited: [0, 1, 2, 3, 4, 5, 6, 7] };
  const restored = restoreState(old);
  assert.equal(restored.flags.receptionSecured, true);
  assert.equal(restored.flags.routeReleased, true);
});

test("stairs and lifts preserve the physical shaft on arrival", async () => {
  const { travel } = await import("../engines/midnight/state.js");
  const s = freshState(7);
  s.floor = 8;
  assert.equal(travel(s, 7, "stairs", "B"), null);
  assert.deepEqual(s.position, { x: 9, z: -6.3 });
  assert.equal(travel(s, 6, "stairs", "A"), null);
  assert.deepEqual(s.position, { x: -9, z: 7.5 });
  s.floor = 5;
  assert.equal(travel(s, 3, "lift", "A"), null);
  assert.deepEqual(s.position, { x: -10, z: -5.4 });
});
