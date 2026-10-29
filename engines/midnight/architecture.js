import * as T from "../../vendor/three.module.js";
import { box, mesh, rod, mat } from "./actors.js";

// One structural grid for the whole institute. Floors are stacked, with the
// same two enclosed fire stairs and three fixed shafts at every landing.
export const BUILDING = {
  width: 28,
  depth: 23,
  storey: 3.9,
  ceiling: 3.35,
  stairs: [
    { x: -9, z: 9.9, up: true },
    { x: 9, z: -9.8, up: false },
  ],
  lifts: { A: [-10, -7], B: [0, -9], C: [10, 4] },
};

export function instituteShell(root, colliders, label, floor, name) {
  const concrete = mat("#636b6b", 0.94),
    plaster = mat("#818782", 0.94),
    steel = mat("#454e51", 0.52, 0.55),
    floorMat = mat(floor > 17 ? "#555b5a" : "#656c6b", 0.8),
    dark = mat("#151e23");
  const structural = (x, z, w, d, h = BUILDING.ceiling) => {
    box(root, concrete, [x, h / 2, z], [w, h, d]);
    colliders.push({ x, z, w, d, h });
  };
  const tiles = [];
  for (let x = -13.5; x < 14; x++)
    for (let z = -11; z <= 11; z++) {
      if ((x > 7 && x < 11 && z < -8) || (x > -11 && x < -7 && z > 8)) continue;
      tiles.push([x, -0.08, z]);
    }
  const inst = new T.InstancedMesh(
      new T.BoxGeometry(0.995, 0.16, 0.995),
      floorMat,
      tiles.length,
    ),
    matrix = new T.Matrix4();
  tiles.forEach((v, i) => inst.setMatrixAt(i, matrix.makeTranslation(...v)));
  inst.receiveShadow = true;
  root.add(inst);
  box(root, concrete, [0, 1.65, -11.6], [28, 3.3, 0.25]);
  box(root, plaster, [-14, 1.65, 0], [0.25, 3.3, 23]);
  // The camera-facing walls are cut at sill height. The perimeter structure,
  // window mullions and lintels still show the complete, enclosed floor plan.
  box(root, concrete, [14, 0.4, 0], [0.25, 0.8, 23]);
  box(root, concrete, [0, 0.28, 11.6], [28, 0.56, 0.25]);
  for (const x of [-13.75, 13.75])
    box(root, steel, [x, 3.3, 0], [0.32, 0.24, 23]);
  box(root, steel, [0, 3.3, -11.4], [28, 0.24, 0.35]);
  for (const x of [-12, 0, 12])
    for (const z of [-10.6, 5.5]) {
      structural(x, z, 0.4, 0.4, 3.35);
      box(root, concrete, [x, 3.28, z], [1, 0.25, 0.6]);
    }
  for (const z of [-8, -4, 0, 4, 8]) {
    if (floor < 18) {
      box(
        root,
        new T.MeshPhysicalMaterial({
          color: "#536775",
          roughness: 0.23,
          metalness: 0.25,
          transparent: true,
          opacity: 0.2,
        }),
        [-13.85, 1.9, z],
        [0.035, 1.9, 2.8],
      );
      for (const y of [1, 2.9])
        box(root, steel, [-13.8, y, z], [0.1, 0.06, 2.9]);
      for (const dz of [-1.4, 0, 1.4])
        box(root, steel, [-13.8, 1.95, z + dz], [0.1, 1.9, 0.05]);
    } else rod(root, steel, [-13.7, 2.9, z - 1.8], [-13.7, 2.9, z + 1.8], 0.08);
  }
  const lamp = new T.MeshStandardMaterial({
    color: "#e3e3d4",
    emissive: "#b5bba9",
    emissiveIntensity: 1.1,
  });
  for (const z of [-5, 5.5])
    box(root, concrete, [0, 3.35, z], [24, 0.22, 0.32]);
  for (const x of [-6, 6]) box(root, steel, [x, 3.32, 0], [0.34, 0.16, 17]);
  for (const x of [-6, 6])
    for (const z of [-5, 4]) {
      box(root, steel, [x, 3.1, z], [2.5, 0.12, 0.3]);
      box(root, lamp, [x, 3.02, z], [2.3, 0.025, 0.22]);
      rod(root, steel, [x, 3.1, z], [x, 3.35, z], 0.025);
    }
  for (const x of [-6, 5]) {
    box(root, steel, [x, 2.2, -11.42], [1.1, 1.4, 0.25]);
    for (let i = 0; i < 5; i++)
      box(root, dark, [x, 1.85 + i * 0.17, -11.26], [0.75, 0.045, 0.04]);
  }
  label(name.toUpperCase(), -5, 2.75, -11.4, 7, "#cad0cb");
  // Normal 2.35 m doors in shaft walls, at invariant coordinates.
  for (const [id, [x, z]] of Object.entries(BUILDING.lifts)) {
    const shaftDepth = id === "C" ? 3.3 : 11.5 + z;
    structural(x, z - shaftDepth / 2, 3.1, shaftDepth);
    box(root, steel, [x, 3.34, z - shaftDepth / 2], [3.2, 0.14, shaftDepth]);
    box(root, steel, [x, 1.18, z], [1.95, 2.36, 0.15]);
    box(root, dark, [x, 1.18, z + 0.085], [0.025, 2.34, 0.025]);
    box(root, dark, [x + 1.2, 1.2, z + 0.08], [0.16, 0.26, 0.08]);
    label("LIFT " + id, x, 2.75, z + 0.12, 1.8, "#c4ccca");
  }
  for (const { x, z, up } of BUILDING.stairs) {
    // Side walls and a far wall enclose two opposing half-flights and a landing.
    for (const dx of [-1.6, 1.6]) structural(x + dx, z, 0.18, 3.4);
    structural(x, z + (up ? 1.6 : -1.6), 3.3, 0.18);
    const startZ = up ? 8.7 : -8.2,
      sign = up ? 1 : -1;
    for (let i = 0; i < 10; i++) {
      const y = (i + 1) * 0.195 * (up ? 1 : -1);
      box(
        root,
        concrete,
        [x - 0.72, y - 0.08, startZ + sign * i * 0.28],
        [1.25, 0.16, 0.29],
      );
      box(
        root,
        steel,
        [x - 0.72, y + 0.01, startZ + sign * i * 0.28 - sign * 0.1],
        [1.24, 0.025, 0.045],
      );
    }
    box(root, concrete, [x, up ? 1.9 : -2.05, z + sign * 1.1], [3, 0.18, 0.7]);
    for (let i = 0; i < 10; i++)
      box(
        root,
        concrete,
        [
          x + 0.72,
          (up ? 1 : -1) * (2.05 + i * 0.195),
          z + sign * (0.7 - i * 0.28),
        ],
        [1.25, 0.16, 0.29],
      );
    rod(
      root,
      steel,
      [x - 1.35, 0.95, startZ],
      [x - 1.35, (up ? 1.95 : -1.95) + 0.95, startZ + sign * 2.7],
      0.035,
    );
    const entranceZ = up ? 8.45 : -8.05;
    box(root, steel, [x, 2.5, entranceZ], [3.25, 0.2, 0.18]);
    const leaf = box(
      root,
      steel,
      [x + 1.32, 1.17, entranceZ + (up ? 0.55 : -0.55)],
      [0.09, 2.34, 1.25],
    );
    // No movement or bullets through a transport aperture; E traverses its
    // real stair connection. The landing itself remains accessible.
    colliders.push({ x, z: up ? 9.3 : -9.3, w: 3.25, d: 1.1, h: 4 });
    label(
      up ? "FIRE STAIR A" : "FIRE STAIR B",
      x,
      2.75,
      up ? 8.65 : -8.05,
      3,
      "#b8c4b9",
    );
    const lamp = box(
      root,
      new T.MeshStandardMaterial({
        color: "#8ea69b",
        emissive: "#4b6a5d",
        emissiveIntensity: 0.5,
      }),
      [x, 2.5, up ? 8.7 : -8.1],
      [0.5, 0.16, 0.04],
    );
  }
}

export function partition(
  root,
  colliders,
  x,
  z,
  w,
  d,
  { glass = false, height = 2.9 } = {},
) {
  const material = glass
    ? new T.MeshPhysicalMaterial({
        color: "#749095",
        transparent: true,
        opacity: 0.16,
        roughness: 0.25,
        metalness: 0.05,
      })
    : mat("#7a817d", 0.96);
  const wall = box(root, material, [x, height / 2, z], [w, height, d]);
  // Glazing blocks people and darts, even though it allows visibility.
  colliders.push({ x, z, w, d, h: height });
  const frame = mat("#4d5757", 0.6, 0.5);
  for (const y of [0.12, height])
    box(root, frame, [x, y, z], [w + 0.06, 0.06, d + 0.06]);
  if (w > d)
    for (const dx of [-w / 2, w / 2])
      box(root, frame, [x + dx, height / 2, z], [0.055, height, d + 0.05]);
  else
    for (const dz of [-d / 2, d / 2])
      box(root, frame, [x, height / 2, z + dz], [w + 0.05, height, 0.055]);
  return wall;
}
