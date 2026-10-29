import test from "node:test";
import assert from "node:assert/strict";
import * as T from "../vendor/three.module.js";
import { BUILDING, stairSurface } from "../engines/midnight/architecture.js";
import {
  TECHNIQUES,
  nextTechnique,
  martialTarget,
} from "../engines/midnight/martial.js";
import { restoreState, freshState } from "../engines/midnight/state.js";

test("both stairs have continuous 3.9 metre storeys, reversible flights and physical intermediate landings", () => {
  for (const c of BUILDING.stairs)
    for (const direction of [-1, 1]) {
      const x = direction > 0 ? -0.73 : 0.73;
      let previous = null,
        last = 0,
        completed = false;
      const local = [
        [x, 0.8],
        [x, 1],
        [x, 2],
        [x, 3],
        [x, 4.1],
        [x, 4.75],
        [0, 4.75],
        [-x, 4.75],
        [-x, 4.1],
        [-x, 3],
        [-x, 2],
        [-x, 1],
      ];
      for (const [px, z] of local) {
        const r = stairSurface(
          { x: c.x + px * c.sign, z: c.z + z * c.sign },
          previous,
        );
        assert.ok(r.context);
        previous = r.context;
        assert.ok(Math.abs(r.height - last) < 0.75);
        last = r.height;
        completed = r.completed || false;
      }
      assert.equal(completed, true);
      assert.ok(Math.abs(last - direction * 3.9) < 0.02);
      const mid = stairSurface(
        { x: c.x + x * c.sign, z: c.z + 3 * c.sign },
        { id: c.id, direction },
      );
      const back = stairSurface(
        { x: c.x + x * c.sign, z: c.z + 2 * c.sign },
        mid.context,
      );
      assert.ok(Math.abs(back.height) < Math.abs(mid.height));
    }
});
test("martial repertoire covers eight arts and never repeats inside a complete cycle", () => {
  const cycle = Array.from({ length: TECHNIQUES.length }, (_, i) =>
    nextTechnique(i, 17),
  );
  assert.equal(new Set(cycle.map((t) => t.style)).size, 12);
  for (const word of [
    "Kung fu",
    "Boxing",
    "Karate",
    "Capoeira",
    "Jiu-jitsu",
    "Muay Thai",
    "Sambo",
    "Pencak silat",
  ])
    assert.ok(cycle.some((t) => t.name.includes(word)));
  assert.equal(nextTechnique(0, 17), nextTechnique(12, 17));
  const e = (x, z) => ({
      position: new T.Vector3(x, 0, z),
      visible: true,
      userData: {},
    }),
    front = e(0, 1.5),
    rear = e(0, -0.5);
  assert.equal(
    martialTarget({ x: 0, y: 0, z: 0 }, 0, [rear, front], []),
    front,
  );
  assert.equal(
    martialTarget({ x: 0, y: 0, z: 0 }, 0, [rear, e(0, 2.2)], []),
    null,
  );
  assert.equal(
    martialTarget(
      { x: 0, y: 0, z: 0 },
      0,
      [front],
      [{ x: 0, z: 0.8, w: 2, d: 0.1, h: 2 }],
    ),
    null,
  );
  front.userData.disabled = true;
  assert.equal(martialTarget({ x: 0, y: 0, z: 0 }, 0, [front], []), null);
});
test("knockouts and repertoire progress survive reload; malformed records are discarded", () => {
  const s = {
    ...freshState(7),
    techniqueCount: 14,
    defeated: ["normal:0:0", "escape:20:2", "invalid", null],
  };
  const r = restoreState(s);
  assert.deepEqual(r.defeated, ["normal:0:0", "escape:20:2"]);
  assert.equal(r.techniqueCount, 14);
  assert.equal(restoreState({ ...s, techniqueCount: -4 }).techniqueCount, 0);
});

test("rough landing contacts the roof, rebounds without penetrating it and settles", async () => {
  const { landingMotion } = await import("../engines/midnight/weather.js");
  assert.ok(landingMotion(0).y > 6);
  assert.equal(landingMotion(0.74).contact, true);
  assert.equal(landingMotion(0.74).y, 0.01);
  assert.ok(landingMotion(0.79).y > 0.05);
  for (let i = 0; i <= 100; i++) assert.ok(landingMotion(i / 100).y >= 0.01);
  assert.ok(Math.abs(landingMotion(1).y - 0.01) < 0.001);
  assert.equal(landingMotion(1).roll, 0);
  assert.equal(landingMotion(1).pitch, 0);
  assert.equal(landingMotion(0.4, true).roll, 0);
});
