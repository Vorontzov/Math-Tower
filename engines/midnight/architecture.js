import { officeChair } from "./furnishings.js";
import { batchArchitecture } from "./static-geometry.js";
import * as T from "../../vendor/three.module.js";
import { box, mesh, rod, mat, ball } from "./actors.js";

// Metres. Permanent cores align through all 21 levels.
export const BUILDING = {
  width: 36,
  depth: 32,
  storey: 3.9,
  ceiling: 3.35,
  stairs: [
    { x: -9, z: 8.2, sign: 1, id: "A" },
    { x: 9, z: -8.2, sign: -1, id: "B" },
  ],
  lifts: { A: [-10, -7], B: [0, -9], C: [10, 4] },
};
const H = BUILDING.ceiling;

export function stairPath(id, ascending) {
  const c = BUILDING.stairs.find((c) => c.id === id) || BUILDING.stairs[0];
  const s = ascending ? 1 : -1,
    x = ascending ? -0.73 : 0.73;
  const points = [
    [0, 0, -0.6],
    [x, 0, 0.85],
    [x, 1.95 * s, 3.93],
    [x, 1.95 * s, 4.65],
    [-x, 1.95 * s, 4.65],
    [-x, 1.95 * s, 3.93],
    [-x, 3.9 * s, 0.85],
    [0, 3.9 * s, -0.6],
  ];
  return points.map(
    ([px, y, z]) => new T.Vector3(c.x + px * c.sign, y, c.z + z * c.sign),
  );
}
export function buildStairCore(root, c, colliders, roof = false) {
  const group = new T.Group();
  group.position.set(c.x, 0, c.z);
  group.rotation.y = c.sign === 1 ? 0 : Math.PI;
  root.add(group);
  const concrete = mat("#858981", 0.92),
    steel = mat("#525e61", 0.4, 0.7),
    dark = mat("#313c40");
  const wall = (x, y, z, w, h, d) => box(group, concrete, [x, y, z], [w, h, d]);
  // Two complete storeys around the current landing. 22 risers, 280 mm treads.
  wall(-1.68, roof ? -1.9 : 1.6, 2.9, 0.2, roof ? 10.6 : 11.7, 6);
  wall(1.68, roof ? -1.9 : 1.6, 2.9, 0.2, roof ? 10.6 : 11.7, 6);
  wall(0, roof ? -1.9 : 1.6, 5.8, 3.55, roof ? 10.6 : 11.7, 0.2);
  for (const dx of [-1.68, 1.68])
    colliders.push({ x: c.x + dx, z: c.z + c.sign * 2.9, w: 0.2, d: 6, h: 8 });
  colliders.push(
    { x: c.x, z: c.z + c.sign * 5.8, w: 3.55, d: 0.2, h: 8 },
    { x: c.x, z: c.z + c.sign * 2.6, w: 0.21, d: 3.1, h: 8, sight: false },
  );
  for (const dx of [-1.17, 1.17])
    colliders.push({
      x: c.x + dx,
      z: c.z - c.sign * 0.17,
      w: 0.99,
      d: 0.2,
      h: 8,
    });
  for (const base of roof ? [-3.9] : [-3.9, 0]) {
    box(group, concrete, [0, base - 0.1, 0.36], [3.2, 0.2, 1.35]);
    box(group, concrete, [0, base + 1.85, 4.65], [3.2, 0.2, 1.45]);
    box(group, concrete, [0, base + 3.8, 0.36], [3.2, 0.2, 1.35]);
    // Continuous reinforced-concrete soffits carry the closed-riser flights.
    // The slabs bear on the landing and side walls; treads do not float.
    for (const side of [-1, 1]) {
      const soffit = box(
        group,
        concrete,
        [side * 0.77, base + (side < 0 ? 0.9 : 2.85), 2.5],
        [1.6, 0.2, 3.7],
      );
      soffit.rotation.x = side * Math.atan2(1.95, 3.08);
    }
    for (let i = 0; i < 11; i++) {
      for (const side of [-1, 1]) {
        const y =
          base +
          (side === -1 ? ((i + 1) * 3.9) / 22 : 1.95 + ((11 - i) * 3.9) / 22);
        const z = 1.1 + i * 0.28;
        box(group, concrete, [side * 0.77, y - 0.095, z], [1.35, 0.19, 0.29]);
        box(
          group,
          steel,
          [side * 0.77, y + 0.006, z - 0.12],
          [1.34, 0.012, 0.035],
        );
        if (i % 3 === 0)
          rod(
            group,
            steel,
            [side * 0.13, y, z],
            [side * 0.13, y + 0.95, z],
            0.022,
          );
      }
    }
    for (const side of [-1, 1]) {
      const a = [side * 0.13, base + (side < 0 ? 0.95 : 4.85), 0.98],
        b = [side * 0.13, base + 2.9, 4.05];
      rod(group, steel, a, b, 0.033);
      rod(
        group,
        steel,
        [side * 1.49, a[1], a[2]],
        [side * 1.49, b[1], b[2]],
        0.033,
      );
    }
    // Guard the central landing edge; fire door has a proper frame and hinge.
    for (const dx of [-1.17, 1.17])
      wall(dx, base + 1.67, -0.17, 0.99, 3.35, 0.2);
    wall(0, base + 2.82, -0.17, 1.35, 1.06, 0.2);
    box(group, steel, [0, base + 2.26, -0.18], [1.4, 0.09, 0.24]);
    for (const dx of [-0.69, 0.69])
      box(group, steel, [dx, base + 1.12, -0.18], [0.07, 2.24, 0.24]);
    const hinge = new T.Group();
    hinge.position.set(-0.64, base, -0.18);
    hinge.rotation.y = -1.35;
    group.add(hinge);
    box(hinge, dark, [0.63, 1.1, 0], [1.26, 2.2, 0.055]);
    rod(hinge, steel, [0.12, 1.02, -0.05], [1.08, 1.02, -0.05], 0.025);
    const light = new T.PointLight("#c9dece", 7, 7, 2);
    light.position.set(0, base + 2.8, 3.8);
    group.add(light);
    box(
      group,
      new T.MeshStandardMaterial({
        color: "#c9d9cd",
        emissive: "#849d86",
        emissiveIntensity: 1,
      }),
      [0, base + 2.85, 5.65],
      [0.55, 0.18, 0.1],
    );
  }
  // Access is traversed along stairPath; colliders protect the open stairwell.
  if (roof) {
    wall(0, 3.4, 2.9, 3.6, 0.2, 6.1);
    for (const dx of [-1.17, 1.17]) wall(dx, 1.67, -0.17, 0.99, 3.35, 0.2);
    wall(0, 2.82, -0.17, 1.35, 1.06, 0.2);
  }
  if (roof) {
    const hinge = new T.Group();
    hinge.position.set(-0.64, 0, -0.18);
    group.add(hinge);
    box(hinge, dark, [0.63, 1.1, 0], [1.26, 2.2, 0.055]);
    rod(hinge, steel, [0.12, 1.02, -0.05], [1.08, 1.02, -0.05], 0.025);
    hinge.userData.dynamic = true;
    const doorCollider = {
      x: c.x,
      z: c.z - c.sign * 0.18,
      w: 1.3,
      d: 0.14,
      h: 2.2,
    };
    colliders.push(doorCollider);
    group.userData.roofDoor = {
      setOpen(open) {
        hinge.rotation.y = open ? -1.35 : 0;
        doorCollider.h = open ? 0 : 2.2;
      },
    };
  }
  return group;
}

export function liftCabin(parent, id, x, z) {
  const car = new T.Group();
  car.position.set(x, 0, z);
  parent.add(car);
  const steel = mat("#8a9290", 0.34, 0.7),
    dark = mat("#1d292d"),
    floor = mat("#444b4b", 0.72),
    lamp = new T.MeshStandardMaterial({
      color: "#e1e2d7",
      emissive: "#bfc4ba",
      emissiveIntensity: 1.1,
    });
  box(car, floor, [0, -0.06, -1.45], [2.6, 0.12, 2.9]);
  box(car, steel, [0, 1.3, -2.85], [2.7, 2.6, 0.12]);
  for (const sx of [-1, 1]) {
    box(car, steel, [sx * 1.3, 1.3, -1.45], [0.1, 2.6, 2.9]);
    rod(car, steel, [sx * 1.23, 0.95, -0.4], [sx * 1.23, 0.95, -2.65], 0.03);
  }
  box(car, steel, [0, 2.62, -1.45], [2.7, 0.12, 2.9]);
  box(car, lamp, [0, 2.55, -1.45], [1.4, 0.025, 1.8]);
  const light = new T.PointLight("#dce4d7", 11, 4, 2);
  light.position.set(0, 2.3, -1.45);
  car.add(light);
  box(car, dark, [1.235, 1.32, -0.48], [0.035, 0.65, 0.23]);
  for (let i = 0; i < 6; i++)
    ball(car, steel, [1.21, 1.55 - i * 0.075, -0.48], [0.025, 0.025, 0.025]);
  const displayCanvas = document.createElement("canvas");
  displayCanvas.width = 256;
  displayCanvas.height = 128;
  const displayContext = displayCanvas.getContext("2d"),
    displayTexture = new T.CanvasTexture(displayCanvas);
  displayTexture.colorSpace = T.SRGBColorSpace;
  const displayMaterial = new T.MeshBasicMaterial({ map: displayTexture });
  const frontDisplay = mesh(
    car,
    new T.PlaneGeometry(0.48, 0.24),
    displayMaterial,
    [0, 2.47, 0.12],
  );
  const cabinDisplay = mesh(
    car,
    new T.PlaneGeometry(0.48, 0.24),
    displayMaterial,
    [0, 2.3, -2.77],
  );
  const setFloor = (value) => {
    displayContext.fillStyle = "#10201d";
    displayContext.fillRect?.(0, 0, 256, 128);
    displayContext.fillStyle = "#c8e6ce";
    displayContext.textAlign = "center";
    displayContext.textBaseline = "middle";
    displayContext.font = "68px monospace";
    displayContext.fillText(value, 128, 64);
    displayTexture.needsUpdate = true;
  };
  setFloor(id);
  const doors = [];
  for (const sign of [-1, 1]) {
    const leaf = box(
      car,
      steel,
      [sign * 0.48, 1.16, 0.015],
      [0.95, 2.32, 0.065],
    );
    doors.push(leaf);
    box(car, steel, [sign * 1.12, 1.17, 0.03], [0.3, 2.34, 0.16]);
  }
  box(car, steel, [0, 2.41, 0.03], [2.6, 0.18, 0.16]);
  const indicator = box(car, lamp, [0, 2.39, 0.13], [0.3, 0.055, 0.02]);
  car.userData = {
    dynamic: true,
    setFloor,
    doors,
    indicator,
    setOpen(f) {
      doors.forEach(
        (d, i) => (d.position.x = (i ? 1 : -1) * (0.48 + f * 0.99)),
      );
    },
  };
  return car;
}

export function instituteShell(root, colliders, label, floor, name) {
  const concrete = mat("#747c7b", 0.93),
    plaster = mat("#b1b1a6", 0.92),
    steel = mat("#566363", 0.42, 0.6),
    dark = mat("#293438"),
    tile = mat(floor > 17 ? "#686b68" : "#92958d", 0.65);
  const wall = (x, z, w, d, h = H, m = plaster) => {
    box(root, m, [x, h / 2, z], [w, h, d]);
    colliders.push({ x, z, w, d, h });
  };
  const tiles = [];
  for (let x = -17.5; x < 18; x++)
    for (let z = -15.5; z < 16; z++) {
      if (
        BUILDING.stairs.some(
          (c) =>
            Math.abs(x - c.x) < 1.85 &&
            (z - c.z) * c.sign > -0.3 &&
            (z - c.z) * c.sign < 6.1,
        )
      )
        continue;
      tiles.push([x, -0.08, z]);
    }
  const inst = new T.InstancedMesh(
      new T.BoxGeometry(0.995, 0.16, 0.995),
      tile,
      tiles.length,
    ),
    mx = new T.Matrix4();
  tiles.forEach((v, i) => inst.setMatrixAt(i, mx.makeTranslation(...v)));
  inst.receiveShadow = true;
  root.add(inst);
  // Solid ceiling tiles above the occupied rooms, with holes for the stairs.
  const ceiling = new T.InstancedMesh(
    new T.BoxGeometry(0.995, 0.14, 0.995),
    plaster,
    tiles.length,
  );
  tiles.forEach((v, i) =>
    ceiling.setMatrixAt(i, mx.makeTranslation(v[0], H + 0.07, v[2])),
  );
  root.add(ceiling);
  root.userData.ceiling = ceiling;
  const glass = new T.MeshPhysicalMaterial({
    color: "#8aabb4",
    transparent: true,
    opacity: 0.22,
    roughness: 0.13,
    metalness: 0.2,
    side: T.DoubleSide,
    depthWrite: false,
  });
  // Real window apertures: opaque sill/lintel strips and masonry piers, glass between.
  for (const x of [-17.9, 17.9]) {
    wall(x, 0, 0.2, 32, 0.85);
    box(root, plaster, [x, 3.12, 0], [0.2, 0.46, 32]);
    for (let z = -16; z <= 16; z += 4) {
      wall(x, z, 0.22, 0.55);
      if (z === 16) continue;
      box(root, glass, [x, 1.97, z + 1.95], [0.045, 2.2, 3.35]);
      for (const y of [0.88, 2.0, 3.06])
        box(root, steel, [x, y, z + 1.95], [0.09, 0.045, 3.45]);
      box(root, steel, [x, 1.97, z + 1.95], [0.09, 2.2, 0.05]);
    }
    colliders.push({ x, z: 0, w: 0.2, d: 32, h: H });
  }
  wall(0, -15.9, 36, 0.2);
  wall(0, 15.9, 36, 0.2);
  for (const z of [-15.75, 15.75])
    box(root, steel, [0, 0.095, z], [35.6, 0.19, 0.045]);
  for (const x of [-12, 0, 12])
    for (const z of [-11, 7]) wall(x, z, 0.42, 0.42, H, concrete);
  // Recessed fixtures, ventilation grilles and sprinkler heads share a ceiling grid.
  const lightMat = new T.MeshStandardMaterial({
    color: "#e5e5d7",
    emissive: "#c7c9bb",
    emissiveIntensity: 1.4,
  });
  for (const x of [-12, -5, 3, 12])
    for (const z of [-10, -3, 5, 12]) {
      if (
        BUILDING.stairs.some(
          (c) => Math.abs(x - c.x) < 3 && (z - c.z) * c.sign > 0,
        )
      )
        continue;
      box(root, steel, [x, 3.32, z], [1.25, 0.06, 0.6]);
      box(root, lightMat, [x, 3.28, z], [1.16, 0.025, 0.5]);
      if ((x === -5 || x === 12) && (z === -10 || z === 5)) {
        const lamp = new T.PointLight("#d9e4d9", 22, 18, 2);
        lamp.position.set(x, 3.02, z);
        root.add(lamp);
      }
      box(root, dark, [x + 1.7, 3.32, z], [0.6, 0.04, 0.6]);
      for (let i = 0; i < 6; i++)
        box(
          root,
          steel,
          [x + 1.7, 3.28, z - 0.25 + i * 0.1],
          [0.58, 0.02, 0.025],
        );
      rod(
        root,
        steel,
        [x - 0.9, 3.35, z + 0.7],
        [x - 0.9, 3.22, z + 0.7],
        0.018,
      );
    }
  label(name.toUpperCase(), -5, 2.65, -11.4, 5, "#cbd0c8");
  root.userData.lifts = {};
  for (const [id, [x, z]] of Object.entries(BUILDING.lifts)) {
    wall(x - 1.52, z - 1.55, 0.26, 3.5);
    wall(x + 1.52, z - 1.55, 0.26, 3.5);
    wall(x, z - 3.24, 3.3, 0.2);
    for (const sign of [-1, 1]) wall(x + sign * 1.23, z, 0.6, 0.3);
    box(root, concrete, [x, 2.92, z], [3.3, 0.86, 0.3]);
    const car = liftCabin(root, id, x, z);
    root.userData.lifts[id] = car;
    car.userData.setFloor(floor > 17 ? "B" + (floor - 17) : String(18 - floor));
    // Closed landing doors are solid; transport animates them before entry.
    const doorCollider = { x, z, w: 3.3, d: 0.28, h: 2.45 };
    colliders.push(doorCollider);
    car.userData.collider = doorCollider;
    box(root, dark, [x + 1.72, 1.15, z + 0.13], [0.12, 0.28, 0.06]);
    ball(root, steel, [x + 1.72, 1.19, z + 0.17], [0.035, 0.035, 0.025]);
    label("LIFT " + id, x, 2.8, z + 0.18, 1.5, "#c4cfca");
  }
  for (const c of BUILDING.stairs) {
    buildStairCore(root, c, colliders);
    label("FIRE STAIR " + c.id, c.x, 2.65, c.z - c.sign * 0.25, 2.3, "#bbd5c6");
  }
  // Washrooms are a usable side wing, with a 1.2 m door opening, cubicles and plumbing.
  wall(14.4, -1, 0.16, 8);
  wall(16.1, -5, 3.4, 0.16);
  wall(16.9, 3, 1.8, 0.16);
  wall(14.65, 3, 0.5, 0.16);
  box(root, plaster, [15.4, 2.83, 3], [1.2, 1.04, 0.16]);
  box(root, steel, [14.8, 1.1, 3.55], [0.06, 2.2, 1.12]);
  rod(root, steel, [14.84, 1.02, 3.4], [14.84, 1.02, 3.65], 0.023);
  label("WASHROOM", 15.6, 2.52, 3.12, 1.6, "#d3d6c9");
  const porcelain = new T.MeshPhysicalMaterial({
    color: "#d5d8d0",
    roughness: 0.18,
    clearcoat: 1,
  });
  for (const z of [-3.8, -1.7]) {
    box(root, steel, [16.2, 0.99, z], [0.06, 1.98, 1.9]);
    box(root, steel, [16.9, 0.99, z + 0.95], [1.4, 1.98, 0.055]);
    ball(root, porcelain, [17.18, 0.41, z], [0.26, 0.22, 0.38]);
    box(root, porcelain, [17.5, 0.68, z], [0.2, 0.58, 0.48]);
    mesh(root, new T.TorusGeometry(0.22, 0.035, 8, 24), porcelain, [
      17.1,
      0.59,
      z,
    ]).rotation.x = Math.PI / 2;
    colliders.push({ x: 17.25, z, w: 0.85, d: 0.85, h: 0.8 });
  }
  box(root, porcelain, [15, 0.82, 0.7], [0.8, 0.15, 1.6]);
  colliders.push({ x: 15, z: 0.7, w: 0.8, d: 1.6, h: 0.9 });
  for (const z of [0.2, 1.2]) {
    const basin = mesh(
      root,
      new T.SphereGeometry(
        0.3,
        24,
        12,
        0,
        Math.PI * 2,
        Math.PI / 2,
        Math.PI / 2,
      ),
      porcelain,
      [15, 0.89, z],
      [1, 0.5, 1],
    );
    rod(root, steel, [14.75, 0.9, z], [14.75, 1.12, z], 0.025);
    rod(root, steel, [14.75, 1.12, z], [14.98, 1.12, z], 0.025);
    rod(root, steel, [15, 0.75, z], [15, 0.38, z], 0.04);
  }
  box(
    root,
    new T.MeshPhysicalMaterial({
      color: "#a6b8b7",
      metalness: 1,
      roughness: 0.055,
    }),
    [14.51, 1.66, 0.7],
    [0.03, 0.9, 1.8],
  );
  box(root, dark, [14.55, 1.25, 2], [0.2, 0.28, 0.22]);
  // A separate staff room off the corridor: full walls, a real doorway and furniture.
  wall(-13.65, -4.3, 0.16, 11);
  wall(-13.65, 6, 0.16, 6.4);
  wall(-15.8, -9.8, 4.4, 0.16);
  wall(-15.8, 9.2, 4.4, 0.16);
  box(root, plaster, [-13.65, 2.83, 2], [0.16, 1.04, 1.6]);
  box(root, steel, [-14.25, 1.1, 1.22], [1.2, 2.2, 0.06]);
  rod(root, steel, [-14.85, 1.04, 1.17], [-14.65, 1.04, 1.17], 0.022);
  const wood = mat("#605b50", 0.85);
  for (const z of [-6, -2, 6]) {
    box(root, wood, [-16, 0.76, z], [1.8, 0.08, 0.8]);
    for (const dx of [-0.78, 0.78])
      for (const dz of [-0.3, 0.3])
        rod(
          root,
          steel,
          [-16 + dx, 0, z + dz],
          [-16 + dx, 0.72, z + dz],
          0.027,
        );
    officeChair(root, -16, z + 1, Math.PI);
    box(root, dark, [-16, 1.05, z - 0.12], [0.6, 0.4, 0.045]);
    rod(root, steel, [-16, 0.8, z - 0.12], [-16, 0.92, z - 0.12], 0.027);
    colliders.push({ x: -16, z, w: 1.8, d: 0.8, h: 0.82 });
  }
  // Normal fire-safety furniture, mounted on the wall, not floating signposts.
  for (const x of [-4, 6]) {
    box(root, steel, [x, 1.3, 15.72], [0.5, 0.8, 0.16]);
    rod(root, mat("#70382f"), [x, 0.98, 15.5], [x, 1.55, 15.5], 0.12);
    box(root, dark, [x + 1.2, 1.2, 15.7], [0.08, 0.13, 0.04]);
  }
  batchArchitecture(root);
}

export function partition(
  root,
  colliders,
  x,
  z,
  w,
  d,
  { glass = false, height = 3.35 } = {},
) {
  const material = glass
    ? new T.MeshPhysicalMaterial({
        color: "#749095",
        transparent: true,
        opacity: 0.2,
        roughness: 0.2,
        metalness: 0.1,
        side: T.DoubleSide,
      })
    : mat("#91958c", 0.95);
  const wall = box(root, material, [x, height / 2, z], [w, height, d]);
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

// A continuous walking surface, not a floor-change button. The same two flights
// can be entered, reversed midway, or crossed at their intermediate landing.
export function stairSurface(position, previous = null) {
  const c = BUILDING.stairs.find(
    (c) =>
      Math.abs(position.x - c.x) < 1.5 &&
      (position.z - c.z) * c.sign > 0.75 &&
      (position.z - c.z) * c.sign < 5.65,
  );
  if (!c) return { height: 0, context: null };
  const x = (position.x - c.x) * c.sign,
    z = (position.z - c.z) * c.sign;
  const context =
    previous?.id === c.id
      ? { ...previous }
      : { id: c.id, direction: x < 0 ? 1 : -1 };
  const outbound = x < 0 === context.direction > 0,
    f = T.MathUtils.clamp((z - 0.98) / 3.08, 0, 1);
  const height =
    z > 4.06
      ? context.direction * 1.95
      : context.direction * (outbound ? f * 1.95 : 3.9 - f * 1.95);
  const completed = !outbound && z < 1.03;
  return { height, context, completed };
}
