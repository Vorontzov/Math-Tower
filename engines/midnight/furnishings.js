import * as T from "../../vendor/three.module.js";
import { box, ball, rod, mat, mesh } from "./actors.js";
import { batchArchitecture } from "./static-geometry.js";
export function officeChair(parent, x, z, yaw = 0) {
  const g = new T.Group();
  g.position.set(x, 0, z);
  g.rotation.y = yaw;
  parent.add(g);
  const fabric = mat("#394545", 0.94),
    steel = mat("#717a7a", 0.4, 0.7),
    rubber = mat("#242a2b", 0.9);
  box(g, fabric, [0, 0.49, 0], [0.53, 0.12, 0.5]);
  const back = box(g, fabric, [0, 0.85, -0.24], [0.51, 0.6, 0.1]);
  back.rotation.x = -0.1;
  rod(g, steel, [0, 0.12, 0], [0, 0.47, 0], 0.045);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2,
      x = Math.sin(a) * 0.31,
      z = Math.cos(a) * 0.31;
    rod(g, steel, [0, 0.13, 0], [x, 0.08, z], 0.022);
    const wheel = mesh(
      g,
      new T.CylinderGeometry(0.045, 0.045, 0.045, 12),
      rubber,
      [x, 0.05, z],
    );
    wheel.rotation.z = Math.PI / 2;
  }
  for (const x of [-0.31, 0.31]) {
    rod(g, steel, [x, 0.48, -0.15], [x, 0.71, -0.15], 0.025);
    box(g, rubber, [x, 0.72, 0], [0.085, 0.055, 0.34]);
  }
  batchArchitecture(g);
  return g;
}
export function computerDetails(parent, x, z) {
  const dark = mat("#262d2f"),
    ivory = mat("#9fa39d"),
    metal = mat("#687477", 0.4, 0.5);
  box(parent, dark, [x, 0.846, z + 0.27], [0.48, 0.035, 0.16]);
  for (let row = 0; row < 4; row++)
    for (let col = 0; col < 12; col++)
      box(
        parent,
        ivory,
        [x - 0.215 + col * 0.039, 0.868, z + 0.215 + row * 0.035],
        [0.031, 0.009, 0.024],
      );
  ball(parent, dark, [x + 0.39, 0.86, z + 0.28], [0.055, 0.025, 0.08]);
  box(parent, dark, [x - 0.75, 0.86, z + 0.25], [0.23, 0.055, 0.2]);
  const receiver = box(
    parent,
    metal,
    [x - 0.75, 0.905, z + 0.25],
    [0.26, 0.055, 0.07],
  );
  receiver.rotation.y = 0.15;
  const mug = mesh(
    parent,
    new T.CylinderGeometry(0.045, 0.038, 0.1, 16, 1, true),
    ivory,
    [x - 0.4, 0.9, z + 0.05],
  );
  const handle = mesh(parent, new T.TorusGeometry(0.035, 0.009, 6, 12), ivory, [
    x - 0.345,
    0.9,
    z + 0.05,
  ]);
}
