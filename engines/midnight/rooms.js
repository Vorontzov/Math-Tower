import * as T from "../../vendor/three.module.js";
import {
  mat,
  mesh,
  ball,
  box,
  rod,
  explorer,
  guidebot,
  skitter,
  setActorRole,
} from "./actors.js";
import { midnightTower as tower } from "../../towers/tower-0001.js";

// Rooms are constructed on demand. Leaving a floor disposes its GPU resources.
export function buildRoom(world, floor, save) {
  const def = tower.rooms[floor],
    root = new T.Group(),
    colliders = [],
    animations = [],
    targets = [],
    doors = [],
    enemies = [],
    collectibles = [],
    features = {};
  world.scene.add(root);
  world.enter(floor === 0 ? "roof" : floor === 4 ? "museum" : "interior");
  world.museumConsole.visible = false;
  world.exitDoor.group.visible = false;
  world.enemies.forEach((e) => (e.visible = false));
  world.shards.forEach((e) => (e.visible = false));
  world.robot.visible = false;
  const gold = mat(def.accent, 0.32, 0.65),
    stone = mat("#3c5861", 0.5, 0.25),
    dark = mat("#152b38"),
    ivory = mat("#dacfb4"),
    teal = mat("#2c6971"),
    wood = mat("#72533c"),
    red = mat("#a25749");
  const instrumentTint = new T.Color(def.accent).lerp(
    new T.Color("#aeb7b7"),
    0.78,
  );
  const glow = new T.MeshStandardMaterial({
    color: instrumentTint,
    emissive: instrumentTint,
    emissiveIntensity: 0.38,
  });
  const cyan = new T.MeshStandardMaterial({
    color: "#9ebdbb",
    emissive: "#4e797b",
    emissiveIntensity: 0.55,
  });
  const violet = new T.MeshStandardMaterial({
    color: "#94a8b1",
    emissive: "#566c80",
    emissiveIntensity: 0.45,
  });
  function label(text, x, y, z, width = 4, color = def.accent) {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 160;
    const ctx = c.getContext("2d");
    ctx.font = "500 75px sans-serif";
    const size = Math.min(
      75,
      (75 * 980) / Math.max(1, ctx.measureText(text).width),
    );
    ctx.font = `500 ${size}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = color;
    ctx.fillText(text, 512, 80);
    const texture = new T.CanvasTexture(c);
    texture.colorSpace = T.SRGBColorSpace;
    return mesh(
      root,
      new T.PlaneGeometry(width, (width * 160) / 1024),
      new T.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
      }),
      [x, y, z],
    );
  }
  function block(x, z, w, d, h = 1, color = stone) {
    const b = box(root, color, [x, h / 2, z], [w, h, d]);
    colliders.push({ x, z, w, d, h });
    return b;
  }
  function pillar(x, z, height = 6) {
    mesh(root, new T.CylinderGeometry(0.3, 0.4, height, 12), ivory, [
      x,
      height / 2,
      z,
    ]);
    mesh(root, new T.CylinderGeometry(0.6, 0.6, 0.18, 12), gold, [
      x,
      height,
      z,
    ]);
  }
  function ring(x, y, z, r = 2, material = gold) {
    return mesh(root, new T.TorusGeometry(r, 0.065, 10, 60), material, [
      x,
      y,
      z,
    ]);
  }
  function crystal(x, y, z, s = 0.6, material = cyan) {
    return mesh(root, new T.OctahedronGeometry(s), material, [x, y, z]);
  }
  function light(x, z) {
    ball(root, glow, [x, 3, z], [0.14, 0.24, 0.14]);
    rod(root, gold, [x, 0, z], [x, 3, z], 0.04);
  }
  function cabinet(x, z, height = 3) {
    block(x, z, 2, 0.8, height, wood);
    for (let j = 0; j < 4; j++) {
      box(root, gold, [x, 0.5 + j * 0.65, z + 0.43], [1.9, 0.06, 0.08]);
      for (let k = 0; k < 7; k++)
        box(
          root,
          [red, teal, ivory][(j + k) % 3],
          [x - 0.75 + k * 0.24, 0.77 + j * 0.65, z + 0.42],
          [0.17, 0.4, 0.12],
        );
    }
  }
  function desk(x, z) {
    block(x, z, 2.4, 1, 0.85, wood);
    box(root, gold, [x, 0.9, z], [2.6, 0.1, 1.1]);
    box(root, ivory, [x + 0.2, 1, z + 0.1], [0.8, 0.05, 0.5]);
  }
  function arch(x, z, r = 3) {
    const a = ring(x, 4, z, r);
    a.geometry.dispose();
    a.geometry = new T.TorusGeometry(r, 0.1, 8, 40, Math.PI);
    for (const s of [-1, 1]) pillar(x + s * r, z, 4);
  }
  function machine(x, z) {
    block(x, z, 1.5, 1.3, 2.5, teal);
    for (let i = 0; i < 3; i++) {
      const disk = mesh(
        root,
        new T.CylinderGeometry(0.33, 0.33, 0.1, 20),
        gold,
        [x, 1 + i * 0.5, z + 0.7],
      );
      disk.rotation.x = Math.PI / 2;
      ball(root, cyan, [x + 0.5, 1 + i * 0.5, z + 0.73], [0.06, 0.06, 0.03]);
    }
  }
  function instrument(g) {
    const [x, z] = g.position,
      group = new T.Group();
    group.position.set(x, 0, z);
    root.add(group);
    box(group, dark, [0, 0.7, 0], [0.7, 1.4, 0.65]);
    box(group, gold, [0, 1.4, 0], [0.95, 0.15, 0.78]);
    const screen = box(
      group,
      save.solved.includes(g.id) ? glow : cyan,
      [0, 1.5, 0.07],
      [0.7, 0.05, 0.5],
    );
    screen.rotation.x = 0.2;
    const halo = mesh(
      group,
      new T.TorusGeometry(0.42, 0.025, 8, 40),
      save.solved.includes(g.id) ? glow : cyan,
      [0, 2, 0],
    );
    animations.push((t) => (halo.rotation.y = t * 0.8));
    label(g.optional ? "OPTIONAL CACHE" : "CALIBRATION", x, 2.8, z, 2.8);
    targets.push({ id: g.id, kind: "math", x, z, r: 1.9, label: g.label });
    features[g.id] = group;
  }
  function door(x, z, title, kind, destination) {
    const g = new T.Group();
    g.position.set(x, 0, z);
    root.add(g);
    for (const s of [-1, 1]) box(g, gold, [s * 1.5, 2, 0], [0.15, 4, 0.3]);
    box(g, gold, [0, 4, 0], [3.2, 0.15, 0.3]);
    const leaf = box(g, teal, [0, 1.9, 0], [2.8, 3.8, 0.15]);
    for (let i = 0; i < 4; i++)
      box(g, stone, [0, 0.12 + i * 0.12, 1.8 - i * 0.35], [2.7, 0.22, 0.4]);
    label(title, x, 4.6, z + 0.2, 3.8);
    doors.push({ leaf, base: 1.9 });
    targets.push({
      id: kind + destination,
      kind,
      x,
      z: z + 1.3,
      r: 1.8,
      destination,
      label: title,
    });
    return g;
  }
  function npc(kind, x, z) {
    const p = kind === "guidebot" ? guidebot() : explorer();
    p.position.set(x, 0, z);
    p.rotation.y = 0.4;
    if (kind === "researcher") {
      p.scale.setScalar(1.08);
      p.userData.body.children[0].material = ivory;
      setActorRole(p, "researcher");
    }
    root.add(p);
    return p;
  }

  if (floor !== 0 && floor !== 4) {
    box(root, dark, [0, -0.4, 0], [29, 0.8, 24]);
    const positions = [[], []];
    for (let x = -13; x <= 13; x += 2)
      for (let z = -11; z <= 11; z += 2)
        positions[(x + z) % 4 === 0 ? 0 : 1].push([x, 0, z]);
    positions.forEach((list, i) => {
      const tiles = new T.InstancedMesh(
          new T.BoxGeometry(1.97, 0.04, 1.97),
          mat(i ? "#4c565b" : "#555e62", 0.42, 0.25),
          list.length,
        ),
        matrix = new T.Matrix4();
      list.forEach((p, j) =>
        tiles.setMatrixAt(j, matrix.makeTranslation(...p)),
      );
      tiles.receiveShadow = true;
      root.add(tiles);
    });
    if (def.theme === "impossible") {
      for (const x of [-10, 10]) box(root, dark, [x, 4, -12], [8, 8, 0.3]);
    } else box(root, dark, [0, 4, -12], [29, 8, 0.3]);
    box(root, dark, [-14.5, 3, 0], [0.3, 6, 24]);
    const nearWall = box(root, dark.clone(), [14.5, 3, 0], [0.3, 6, 24]);
    nearWall.material.transparent = true;
    nearWall.material.opacity = 0.18;
    nearWall.material.depthWrite = false;
    // Architectural details stay at the perimeter, clear of playable routes.
    const steel = mat("#626e72", 0.46, 0.7),
      panel = mat(floor > 17 ? "#343c3e" : "#596369", 0.85),
      lightStrip = new T.MeshStandardMaterial({
        color: "#d1d7ce",
        emissive: "#a7b7b8",
        emissiveIntensity: 1.3,
      });
    box(root, steel, [0, 0.2, -11.78], [28.6, 0.3, 0.06]);
    for (const x of [-14.29, 14.29])
      box(root, steel, [x, 0.2, 0], [0.06, 0.3, 23.6]);
    for (const x of [-12, -8, -4, 0, 4, 8, 12]) {
      if (def.theme !== "impossible" || Math.abs(x) > 6) {
        box(root, panel, [x, 3.5, -11.82], [3.92, 5.9, 0.04]);
        box(root, steel, [x, 6.55, -11.65], [3.9, 0.25, 0.32]);
        box(root, lightStrip, [x, 6.52, -11.42], [2.4, 0.08, 0.03]);
      }
    }
    for (const y of [5.1, 5.36])
      rod(root, steel, [-14.1, y, -11.6], [-14.1, y, 11.5], 0.055);
    // Vented switchgear, warning plate and a wall-mounted service conduit.
    box(root, steel, [-13, 2.1, -11.56], [1.1, 1.8, 0.35]);
    for (let j = 0; j < 6; j++)
      box(root, dark, [-13, 1.7 + j * 0.16, -11.36], [0.72, 0.045, 0.03]);
    rod(root, steel, [-13, 3, -11.55], [-13, 6.4, -11.55], 0.06);
    for (const x of [-13, 13]) {
      box(root, gold, [x, 0.035, 0], [0.05, 0.03, 23]);
      pillar(x, -9);
      pillar(x, 6);
      light(x * 0.9, 3);
    }
    label(def.name.toUpperCase(), 2, 7.1, -11.65, 8, "#aeb9bc");
    label(
      tower.floors[floor].startsWith("B")
        ? tower.floors[floor]
        : "FLOOR " + tower.floors[floor],
      -11,
      6.8,
      -11.7,
      3,
    );
  }
  // Geometry and interactive identity differ by room, not just by palette.
  switch (def.theme) {
    case "roof":
      colliders.push(...world.obstacles, { x: 8, z: -9, w: 10, d: 3, h: 6 });
      world.roofConsole.visible = false;
      targets.push({
        kind: "stairs",
        x: 8,
        z: -6.5,
        r: 2.2,
        destination: 1,
        label: "Enter reception · Floor 17",
      });
      break;
    case "reception":
      desk(0, -3);
      for (const x of [-6, 5]) {
        cabinet(x, -9, 2);
        arch(x, -10, 2);
      }
      features.robot = npc("guidebot", -4, 2);
      features.robot.rotation.z = -0.2;
      label("WELCOME TO THE MUSEUM", 0, 3, -3, 6);
      break;
    case "lift-hall":
      for (const x of [-5, 5]) {
        block(x, 0, 1.5, 4, 0.6, ivory);
        arch(x, -6, 2);
      }
      features.number = label("16", -10, 4.8, -6.6, 2);
      features.extraNumber = label("19", -10, 4.8, -6.5, 2, "#cda1ff");
      features.extraNumber.visible = false;
      break;
    case "numbers":
      for (let i = 0; i < 5; i++) {
        const x = -6 + i * 3;
        block(x, -3, 1, 1, 0.6, teal);
        label(["0", "1", "π", "∞", "φ"][i], x, 2, -3, 2.8);
        const r = ring(x, 2, -3, 0.85);
        animations.push((t) => (r.rotation.y = t * 0.3 + i));
      }
      desk(-4, 3);
      break;
    case "museum":
      colliders.push({ x: 0, z: -1, w: 5.6, d: 5.6, h: 8 });
      features.robot = npc("guidebot", -4, 2);
      features.mechanism = world.core;
      targets.push({
        kind: "release",
        x: -5,
        z: 1,
        r: 1.8,
        label: "Release the hanging sculpture",
      });
      break;
    case "playroom":
      for (let i = 0; i < 7; i++) {
        const x = -7 + i * 2,
          z = Math.sin(i) * 2;
        block(x, z, 1.1, 1.1, 0.5 + (i % 3) * 0.25, [teal, red, gold][i % 3]);
        label(String(i + 1), x, 1.6, z, 1);
      }
      const mobile = new T.Group();
      root.add(mobile);
      for (let i = 0; i < 5; i++)
        crystal(
          -6 + i * 3,
          5 + Math.sin(i),
          -5,
          0.6,
          [glow, cyan, violet][i % 3],
        );
      arch(0, -8, 4);
      break;
    case "power":
    case "generator":
    case "distribution": {
      for (const x of [-6, -2, 2]) machine(x, -4);
      for (let i = 0; i < 3; i++) {
        const z = -3 + i * 3;
        rod(root, gold, [-11, 4, z], [11, 4, z], 0.13);
        const turbine = ring(-5 + i * 5, 2, z, 1.3);
        for (let j = 0; j < 5; j++) {
          const vane = box(
            turbine,
            ivory,
            [Math.cos(j * 1.25) * 0.65, Math.sin(j * 1.25) * 0.65, 0],
            [1, 0.14, 0.1],
          );
          vane.rotation.z = j * 1.25;
        }
        animations.push(
          (t) =>
            (turbine.rotation.z =
              t * (save.solved.includes("power") ? 1.3 : 0.15)),
        );
      }
      features.steam = [];
      for (const x of [-4, 4]) {
        const steam = mesh(
          root,
          new T.ConeGeometry(0.65, 2.7, 10),
          new T.MeshStandardMaterial({
            color: "#b9dfe0",
            transparent: true,
            opacity: 0.25,
            depthWrite: false,
          }),
          [x, 1.4, 3],
        );
        features.steam.push(steam);
      }
      break;
    }
    case "classroom":
      for (const x of [-5, 0, 5]) for (const z of [-2, 2]) desk(x, z);
      box(root, teal, [0, 3.5, -8], [8, 3, 0.2]);
      label("A QUESTION IS A DOOR", 0, 3.6, -7.8, 7);
      cabinet(-11, -3, 3);
      break;
    case "atrium": {
      const voidBox = block(0, 0, 5.2, 7, 0.1, dark);
      voidBox.material = mat("#071622");
      for (const x of [-3, 3]) {
        rod(root, gold, [x, 0.9, -4], [x, 0.9, 4], 0.05);
        for (const z of [-4, 0, 4])
          rod(root, gold, [x, 0, z], [x, 0.9, z], 0.04);
      }
      for (let i = 0; i < 8; i++) {
        const p = crystal(
          Math.cos(i * 0.8) * 5,
          4 + i * 0.25,
          Math.sin(i * 0.8) * 4,
          0.5,
        );
        animations.push((t) => (p.rotation.y = t * 0.5 + i));
      }
      arch(0, -7, 6);
      break;
    }
    case "archive":
      for (const x of [-6, 0, 6]) for (const z of [-4, 0]) cabinet(x, z, 3.5);
      features.robot = npc("guidebot", -4, 3);
      features.fallen = block(-4, 3, 2.3, 0.7, 0.55, wood);
      features.fallen.rotation.z = 0.2;
      break;
    case "robotics":
      for (const x of [-6, 0, 6]) {
        block(x, -3, 2, 2, 0.5, ivory);
        const arm = new T.Group();
        arm.position.set(x, 0.5, -3);
        root.add(arm);
        rod(arm, gold, [0, 0, 0], [0, 2, 0], 0.18);
        rod(arm, ivory, [0, 2, 0], [1.7, 2.8, 0], 0.12);
        ball(arm, cyan, [1.7, 2.8, 0], [0.2, 0.2, 0.2]);
        animations.push((t) => (arm.rotation.y = Math.sin(t * 0.7 + x) * 0.9));
      }
      label("DO NOT ACTIVATE", 0, 5, -8, 6);
      break;
    case "garden":
      for (let i = 0; i < 12; i++) {
        const angle = i * 2.4,
          r = 0.9 + Math.sqrt(i) * 1.6,
          x = Math.cos(angle) * r,
          z = Math.sin(angle) * r;
        block(x, z, 0.8, 0.8, 0.35, wood);
        const plant = new T.Group();
        plant.position.set(x, 0.4, z);
        root.add(plant);
        rod(plant, wood, [0, 0, 0], [0, 1.8, 0], 0.05);
        for (let j = 0; j < 5; j++) {
          const leaf = ball(
            plant,
            mat(j % 2 ? "#659b77" : "#88b58d"),
            [Math.sin(j * 2) * 0.45, 0.6 + j * 0.25, Math.cos(j * 2) * 0.3],
            [0.42, 0.16, 0.25],
          );
          leaf.rotation.z = j * 0.5;
        }
      }
      arch(0, -8, 6);
      break;
    case "impossible": {
      features.expansion = new T.Group();
      root.add(features.expansion);
      for (let i = 0; i < 12; i++) {
        const z = -5 - i * 3,
          r = 2 + i * 0.45;
        const frame = mesh(
          features.expansion,
          new T.TorusGeometry(r, 0.08, 8, 4),
          gold,
          [0, 3 + i * 0.25, z],
        );
        frame.rotation.z = Math.PI / 4 + i * 0.08;
      }
      for (let i = 0; i < 8; i++) {
        const p = crystal(
          Math.sin(i * 2) * 4,
          2 + i * 0.5,
          -4 - i * 3,
          0.6,
          violet,
        );
        animations.push((t) => (p.rotation.z = t * 0.3 + i));
      }
      block(-5, 1, 2, 2, 0.8, teal);
      block(5, 1, 2, 2, 0.8, teal);
      break;
    }
    case "observation": {
      const glass = mesh(
        root,
        new T.BoxGeometry(12, 5, 0.1),
        new T.MeshPhysicalMaterial({
          color: "#7e9cab",
          transparent: true,
          opacity: 0.2,
          roughness: 0.2,
          metalness: 0.5,
        }),
        [0, 2.5, -5],
      );
      features.glass = glass;
      for (const x of [-6, 0, 6]) rod(root, gold, [x, 0, -5], [x, 5, -5], 0.04);
      break;
    }
    case "refuge":
      desk(2, -4);
      block(-4, 1, 4, 1, 0.5, wood);
      features.researcher = npc("researcher", -3, 2);
      label("TEST DELAYED. NO. CANCEL IT.", 0, 4, -8, 8);
      break;
    case "lift-car": {
      box(root, teal, [0, 2.6, -1], [7, 5.2, 0.2]);
      for (const x of [-3.5, 3.5]) box(root, stone, [x, 2.6, 1], [0.2, 5.2, 4]);
      const ceiling = box(root, ivory, [0, 5.2, 1], [7, 0.16, 4]);
      features.ceiling = ceiling;
      features.dent = ball(root, dark, [0, 5.1, 1], [1, 0.05, 0.8]);
      label("RESEARCH LIFT B", 0, 4.2, -0.8, 5);
      break;
    }
    case "lobby": {
      arch(0, -7, 5);
      block(0, -2, 2.4, 2.4, 0.55, ivory);
      features.statue = crystal(0, 2, -2, 1.35, gold);
      features.alternate = mesh(
        root,
        new T.TorusKnotGeometry(0.8, 0.22, 64, 10),
        violet,
        [0, 2, -2],
      );
      features.alternate.visible = false;
      for (const x of [-6, 6]) block(x, 3, 4, 1, 0.6, wood);
      break;
    }
    case "recording": {
      desk(-4, 0);
      desk(4, 0);
      const model = ring(0, 3, -4, 2.3, violet);
      animations.push((t) => (model.rotation.y = t * 0.2));
      for (const x of [-2, 2]) {
        const scientist = npc("researcher", x, -3);
        scientist.visible = false;
        (features.memoryActors ||= []).push(scientist);
      }
      label("CORRESPONDENCE TEST 07", 0, 5.5, -7, 7);
      break;
    }
    case "apparatus": {
      block(0, -3, 6, 5, 0.3, dark);
      features.portal = new T.Group();
      features.portal.position.set(0, 4, -4);
      root.add(features.portal);
      for (let i = 0; i < 3; i++) {
        const r = mesh(
          features.portal,
          new T.TorusGeometry(3 + i * 0.35, 0.1, 10, 100),
          i % 2 ? violet : gold,
        );
        r.rotation.y = i * 0.25;
        animations.push((t) => (r.rotation.z = t * (i % 2 ? -0.13 : 0.13)));
      }
      const inverted = new T.Group();
      inverted.rotation.z = Math.PI;
      inverted.position.set(0, 5, -5);
      root.add(inverted);
      for (let i = 0; i < 8; i++) {
        box(inverted, stone, [0, i * 0.75, 0], [3, 0.12, 2]);
        for (const x of [-1.3, 1.3])
          box(inverted, gold, [x, i * 0.75 + 0.35, 0], [0.1, 0.7, 2]);
      }
      features.inverted = inverted;
      break;
    }
  }

  if (floor !== 0 && floor < 20)
    door(9, -9, `DOWN · ${tower.floors[floor + 1]}`, "stairs", floor + 1);
  if (floor > 0) {
    const stairs = new T.Group();
    root.add(stairs);
    for (let i = 0; i < 6; i++)
      box(stairs, stone, [-9, 0.1 + i * 0.13, 8 - i * 0.35], [2.6, 0.2, 0.4]);
    label(`UP · ${tower.floors[floor - 1]}`, -9, 2.8, 7, 3);
    targets.push({
      kind: "stairs",
      x: -9,
      z: 8,
      r: 1.9,
      destination: floor - 1,
      label: `Climb to ${tower.floors[floor - 1]}`,
    });
  }
  for (const lift of tower.lifts.filter((l) => l.stops.includes(floor))) {
    const [x, z] = lift.position;
    box(root, teal, [x, 1.8, z], [2.4, 3.6, 0.2]);
    for (const dx of [-1.2, 1.2])
      box(root, gold, [x + dx, 1.8, z + 0.15], [0.08, 3.8, 0.1]);
    label("LIFT " + lift.id, x, 4, z + 0.15, 2.6);
    targets.push({
      kind: "lift",
      id: lift.id,
      x,
      z: z + 1.2,
      r: 1.7,
      label: `Call ${lift.id === "A" ? "public" : lift.id === "B" ? "research" : "freight"} lift ${lift.id}`,
    });
  }
  for (const gate of tower.gates.filter((g) => g.floor === floor))
    instrument(gate);
  for (const escalator of tower.escalators.filter(
    (e) => e.from === floor || e.to === floor,
  )) {
    const up = escalator.to === floor,
      z = up ? 3 : -1,
      steps = new T.Group();
    root.add(steps);
    for (let i = 0; i < 9; i++)
      box(steps, stone, [11, 0.08 + i * 0.1, z - i * 0.27], [1.6, 0.15, 0.3]);
    for (const x of [10, 12])
      rod(root, gold, [x, 0.8, z + 0.3], [x, 1.8, z - 2.5], 0.05);
    animations.push((t) =>
      steps.children.forEach(
        (s, i) =>
          (s.position.y =
            0.08 + ((((i + (up ? -t : t) * 1.5) % 9) + 9) % 9) * 0.1),
      ),
    );
    targets.push({
      kind: "escalator",
      x: 11,
      z: z + 0.6,
      r: 1.5,
      destination: up ? escalator.from : escalator.to,
      label: "Ride escalator " + (up ? "up" : "down"),
    });
  }
  for (const object of tower.objects.filter(
    (o) =>
      o.floor === floor &&
      !["guidebot", "ladder", "allocation", "researcher"].includes(o.id),
  )) {
    const [x, z] =
      floor === 0
        ? [-1, 6]
        : floor === 2
          ? [4, 3]
          : floor === 12
            ? [-4, 4]
            : floor === 18
              ? [-8, -5]
              : [5, 4];
    box(root, wood, [x, 0.7, z], [1.1, 1.4, 0.6]);
    box(root, ivory, [x, 1.45, z], [0.85, 0.06, 0.5]);
    ball(root, glow, [x, 2, z], [0.07, 0.07, 0.07]);
    targets.push({
      kind: "record",
      id: object.id,
      x,
      z: z + 0.6,
      r: 1.6,
      label: object.title,
    });
  }
  for (const [i, pos] of (def.collect || []).entries()) {
    const group = new T.Group();
    group.position.set(pos[0], 0.25, pos[1]);
    root.add(group);
    box(group, dark, [0, 0, 0], [0.65, 0.3, 0.9]);
    box(group, ivory, [0, 0.16, 0], [0.5, 0.025, 0.65]);
    const indicator = box(group, cyan, [0, 0.18, 0.24], [0.3, 0.025, 0.05]);
    group.rotation.y = i * 0.7;
    group.visible = !save.collected.includes(`${floor}:${i}`);
    collectibles.push({ group, id: `${floor}:${i}` });
    animations.push((t) => {
      indicator.visible = Math.sin(t * 2 + i) > -0.8;
    });
  }
  if (def.object)
    targets.push({
      kind: "object",
      id: def.object,
      x: def.object === "researcher" ? -3 : -4,
      z: def.object === "guidebot" ? 3 : 2,
      r: 2,
      label:
        def.object === "guidebot"
          ? "Free the trapped Guidebot"
          : def.object === "researcher"
            ? "Talk to the researcher"
            : "Allocate ten power units",
    });
  if (def.object === "allocation") {
    machine(-4, 2);
    label("10 POWER UNITS", -4, 3.6, 2, 3);
  }
  if (def.ladder) {
    for (let i = 0; i < 12; i++)
      rod(root, gold, [11, i * 0.3, 0], [12, i * 0.3, 0], 0.04);
    targets.push({
      kind: "ladder",
      x: 11,
      z: 1,
      r: 1.8,
      destination: 12,
      label: "Maintenance shaft · Floor 6",
    });
  }
  if (def.exit) {
    door(4, -8, "CAMPUS EXIT", "exit", null);
    targets.at(-1).x = 4;
    targets.at(-1).z = -6.5;
  }
  if (floor === 13 || floor === 20 || save.escape) {
    const watcher = explorer();
    watcher.scale.set(1.1, 1.7, 0.8);
    watcher.position.set(floor === 13 ? 0 : 6, 0, -7);
    watcher.traverse((o) => {
      if (o.isMesh) o.material = mat("#0b1421", 0.8);
    });
    root.add(watcher);
    features.watcher = watcher;
    watcher.visible = floor !== 13;
  }
  const count =
    save.flags.ventilation && floor >= 14 && !save.escape
      ? 0
      : Math.min(6, (def.enemies || 0) + (save.escape && floor >= 17 ? 3 : 0));
  for (let i = 0; i < count; i++) {
    const kind =
        (floor === 10 || floor === 14) && i === 0 ? "guidebot" : "skitter",
      e = kind === "guidebot" ? guidebot() : skitter();
    e.position.set([-7, 7, 4, -5, 5, 0][i], 0, [-4, -2, -6, 4, 4, 6][i]);
    e.userData.kind = kind;
    e.userData.phase = i * 1.3;
    e.userData.stun = 0;
    root.add(e);
    enemies.push(e);
  }
  if (save.flags.guidebot && features.fallen) {
    features.fallen.position.y = 2;
    features.robot.rotation.z = 0;
  }
  if (save.flags.sculpture && floor === 4) world.pendulum.rotation.z = 1.4;
  return {
    root,
    def,
    floor,
    targets,
    colliders,
    doors,
    enemies,
    collectibles,
    features,
    animate(t, dt) {
      animations.forEach((fn) => fn(t, dt));
      features.robot &&
        (features.robot.userData.head.rotation.z = Math.sin(t) * 0.1);
      if (features.steam)
        features.steam.forEach((s, i) => {
          s.visible = (t + i * 2) % 6 > 4.3;
          s.scale.y = 0.6 + Math.sin(t * 7) * 0.1;
        });
    },
    dispose() {
      world.scene.remove(root);
      const geometries = new Set(),
        materials = new Set(),
        textures = new Set();
      root.traverse((o) => {
        if (o.isSkinnedMesh) o.skeleton.dispose();
        if (o.geometry) geometries.add(o.geometry);
        for (const m of Array.isArray(o.material) ? o.material : [o.material])
          if (m) {
            materials.add(m);
            if (m.map && !m.userData.sharedMaps) textures.add(m.map);
          }
      });
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
    },
  };
}

export function buildCampus(world) {
  world.enter("interior");
  world.city.visible = !world.nightSky;
  if (world.nightSky) {
    world.scene.background = world.nightSky;
    world.scene.backgroundIntensity = 0.6;
  }
  const root = new T.Group();
  world.scene.add(root);
  const stone = mat("#385363"),
    gold = mat("#d7bc7d", 0.35, 0.7);
  box(root, stone, [0, -0.3, 0], [40, 0.5, 30]);
  const tower = new T.Group();
  tower.position.set(0, 0, -22);
  root.add(tower);
  for (let i = 0; i < 22; i++) {
    box(tower, stone, [0, i * 1.2, 0], [6, 1.14, 4]);
    for (const x of [-2, 0, 2])
      box(tower, gold, [x, i * 1.2 + 0.5, 2.02], [0.4, 0.6, 0.04]);
  }
  const moon = ball(
    root,
    new T.MeshBasicMaterial({ color: "#b2d4e3" }),
    [-19, 24, -35],
    [2, 2, 2],
  );
  moon.castShadow = false;
  return {
    root,
    tower,
    dispose() {
      world.scene.remove(root);
      root.traverse((o) => {
        o.geometry?.dispose();
        o.material?.dispose();
      });
    },
  };
}
