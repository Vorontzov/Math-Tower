import * as T from "../../vendor/three.module.js";
import {
  mat,
  mesh,
  ball,
  box,
  rod,
  explorer,
  guidebot,
  presence,
  setActorRole,
} from "./actors.js";
import { instituteShell, partition } from "./architecture.js";
import { midnightTower as tower } from "../../towers/tower-0001.js";

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
  world.enter(floor === 0 ? "roof" : "interior");
  const steel = mat("#4e5a5c", 0.6, 0.5),
    concrete = mat("#737975", 0.9),
    dark = mat("#202b30", 0.9),
    wood = mat("#62564a", 0.86),
    paper = mat("#bebeb1", 0.94);
  const indicator = new T.MeshStandardMaterial({
    color: "#a7c6ba",
    emissive: "#5d8c80",
    emissiveIntensity: 0.6,
  });
  function label(text, x, y, z, width = 3, color = "#bbc6c4") {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 128;
    const ctx = c.getContext("2d");
    ctx.font = "500 65px sans-serif";
    const size = Math.min(
      65,
      (65 * 990) / Math.max(1, ctx.measureText(text).width),
    );
    ctx.font = `500 ${size}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = color;
    ctx.fillText(text, 512, 64);
    const texture = new T.CanvasTexture(c);
    texture.colorSpace = T.SRGBColorSpace;
    return mesh(
      root,
      new T.PlaneGeometry(width, width / 8),
      new T.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
      }),
      [x, y, z],
    );
  }
  function block(x, z, w, d, h = 0.85, m = concrete) {
    const b = box(root, m, [x, h / 2, z], [w, h, d]);
    colliders.push({ x, z, w, d, h });
    return b;
  }
  function desk(x, z, w = 2.8) {
    box(root, wood, [x, 0.78, z], [w, 0.09, 1.1]);
    for (const dx of [-w / 2 + 0.12, w / 2 - 0.12])
      box(root, steel, [x + dx, 0.38, z], [0.08, 0.76, 0.95]);
    colliders.push({ x, z, w, d: 1.1, h: 0.85 });
    box(root, dark, [x + 0.45, 1.12, z - 0.1], [0.75, 0.46, 0.06]);
    box(root, steel, [x + 0.45, 0.91, z - 0.1], [0.06, 0.25, 0.06]);
    box(root, paper, [x - 0.7, 0.84, z + 0.1], [0.6, 0.025, 0.4]);
  }
  function shelf(x, z, w = 2.5) {
    block(x, z, w, 0.6, 2.2, steel);
    for (let j = 0; j < 4; j++) {
      box(root, dark, [x, 0.3 + j * 0.51, z + 0.31], [w - 0.12, 0.43, 0.025]);
      for (let k = 0; k < 5; k++)
        box(
          root,
          k % 2 ? paper : wood,
          [x - w / 2 + 0.27 + (k * (w - 0.4)) / 5, 0.3 + j * 0.51, z + 0.38],
          [(w - 0.5) / 5, 0.36, 0.2],
        );
    }
  }
  function cabinet(x, z) {
    block(x, z, 1.1, 0.7, 2.1, steel);
    for (let j = 0; j < 6; j++) {
      box(root, dark, [x, 0.35 + j * 0.27, z + 0.36], [0.83, 0.055, 0.02]);
    }
    box(root, paper, [x, 1.7, z + 0.37], [0.3, 0.16, 0.02]);
  }
  function screen(x, z, text, w = 3) {
    box(root, steel, [x, 0.65, z], [0.1, 1.3, 0.12]);
    box(root, steel, [x, 0.05, z], [1.1, 0.1, 0.6]);
    box(root, dark, [x, 1.7, z], [w, 1.3, 0.16]);
    label(text, x, 1.7, z + 0.1, w - 0.2);
  }
  function bench(x, z, w = 3) {
    block(x, z, w, 0.65, 0.48, wood);
    box(root, steel, [x, 0.85, z - 0.28], [w, 0.75, 0.08]);
  }
  function npc(kind, x, z) {
    const p = kind === "guidebot" ? guidebot() : explorer();
    p.position.set(x, 0, z);
    p.rotation.y = 0.4;
    if (kind === "researcher" || kind === "mara") setActorRole(p, kind);
    root.add(p);
    return p;
  }
  function panel(x, z, title) {
    const group = new T.Group();
    group.position.set(x, 0, z);
    root.add(group);
    box(group, steel, [0, 0.65, 0], [0.72, 1.3, 0.6]);
    box(group, dark, [0, 1.35, 0], [0.8, 0.12, 0.65]);
    box(group, indicator, [0, 1.42, 0.04], [0.62, 0.025, 0.43]);
    label(title, x, 1.95, z + 0.15, 2.5);
    return group;
  }
  function hazardPipe(x, z) {
    rod(root, steel, [x, 0, z], [x, 2.95, z], 0.13);
    const steam = mesh(
      root,
      new T.ConeGeometry(0.48, 1.7, 12),
      new T.MeshStandardMaterial({
        color: "#bac8c6",
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
      }),
      [x, 1, z + 0.6],
    );
    (features.steam ||= []).push(steam);
  }
  if (floor === 0) {
    colliders.push(...world.obstacles, { x: 8, z: -9.5, w: 8, d: 4, h: 3.5 });
    targets.push({
      kind: "stairs",
      core: "B",
      x: 8,
      z: -6.5,
      r: 2.2,
      destination: 1,
      label: "Enter the tower · Floor 17",
    });
    targets.push({
      kind: "stairs",
      core: "A",
      x: -9,
      z: 7,
      r: 1.8,
      destination: 1,
      label: "Stair A · enter Floor 17",
    });
  } else {
    instituteShell(root, colliders, label, floor, def.name);
    for (const [core, x, z] of [
      ["B", 9, -7.7],
      ["A", -9, 8],
    ])
      targets.push({
        kind: "stairwell",
        core,
        x,
        z,
        r: 1.8,
        label: `Fire stair ${core} · choose up or down`,
      });
  }
  switch (def.theme) {
    case "roof":
      break;
    case "reception":
      desk(0, -3, 4.4);
      bench(-7, 1);
      bench(6, 2);
      shelf(-6, -9);
      cabinet(4, -9);
      partition(root, colliders, 3, -0.5, 0.15, 3, { glass: true });
      for (const x of [-4, 4])
        partition(root, colliders, x, -5.5, 4, 0.12, { glass: true });
      screen(-4, -5.5, "SECURITY / CONNECTION LOST", 3);
      features.robot = npc("guidebot", -4, 2);
      features.robot.rotation.z = -0.2;
      features.security = panel(0, -1.7, "FIRE DOOR CONTROL");
      targets.push({
        kind: "security",
        id: "receptionSecured",
        x: 0,
        z: -0.3,
        r: 1.8,
        label: "Seal the roof stairwell · recover access badge",
      });
      break;
    case "lift-hall":
      partition(root, colliders, -3, -0.5, 0.18, 7, { glass: true });
      partition(root, colliders, 4, -0.5, 0.18, 7, { glass: true });
      bench(-7, 0);
      bench(7, 1);
      cabinet(-6, -6);
      features.number = label("16", -10, 3, -6.8, 1);
      features.extraNumber = label("19", -10, 3, -6.75, 1, "#d6bbb0");
      features.extraNumber.visible = false;
      features.security = panel(6, 3, "EMERGENCY STAIR RELEASE");
      targets.push({
        kind: "security",
        id: "routeReleased",
        x: 6,
        z: 4.2,
        r: 1.8,
        label: "Use the badge · release the emergency route",
      });
      break;
    case "numbers":
      for (const x of [-6, 0, 5]) {
        block(x, -2, 1.6, 1.4, 0.8, wood);
        screen(
          x,
          -2.4,
          ["0 · 1 · 1 · 2 · 3", "ARCHIVE 041", "SIGNAL / LOCKED"][
            [-6, 0, 5].indexOf(x)
          ],
          1.6,
        );
      }
      partition(root, colliders, -3, 2, 4, 0.16);
      desk(2, 3);
      break;
    case "museum": {
      // A mounted research demonstrator, fixed to a concrete plinth and gantry.
      block(0, -1, 3.6, 3.6, 0.65);
      features.mechanism = new T.Group();
      features.mechanism.position.set(0, 1.65, -1);
      root.add(features.mechanism);
      for (let i = 0; i < 3; i++) {
        const r = mesh(
          features.mechanism,
          new T.TorusGeometry(0.8 + i * 0.18, 0.045, 8, 48),
          steel,
        );
        r.rotation.x = i * 0.7;
        animations.push((t) => (r.rotation.y = t * 0.12 + i));
      }
      for (const x of [-2.2, 2.2]) {
        block(x, -1, 0.15, 0.15, 3.1, steel);
      }
      box(root, steel, [0, 3.05, -1], [4.5, 0.2, 0.2]);
      features.pendulum = new T.Group();
      features.pendulum.position.set(-4, 3, -2);
      root.add(features.pendulum);
      rod(features.pendulum, steel, [0, 0, 0], [0, -2.3, 0], 0.04);
      ball(features.pendulum, steel, [0, -2.3, 0], [0.4, 0.4, 0.4]);
      animations.push(
        (t) =>
          (features.pendulum.rotation.z = save.flags.sculpture
            ? Math.sin(t * 2.8) * 0.9
            : Math.sin(t * 0.6) * 0.06),
      );
      features.robot = npc("guidebot", -4, 2);
      shelf(-7, -9);
      shelf(5, -9);
      targets.push({
        kind: "release",
        x: -5,
        z: 1,
        r: 1.8,
        label: "Release the gantry counterweight · stagger pursuers",
      });
      break;
    }
    case "playroom":
      for (const x of [-5, 1, 6]) desk(x, 0, 2.4);
      shelf(-5, -6);
      screen(1, -5, "EVACUATION IN PROGRESS", 5);
      partition(root, colliders, -9, -1, 0.15, 5, { glass: true });
      break;
    case "power":
    case "generator":
    case "distribution":
      for (const x of [-6, -3, 2]) {
        cabinet(x, -4);
        box(root, dark, [x, 2.12, -4], [0.95, 0.03, 0.6]);
        rod(root, steel, [x, 2.2, -4], [x, 3, -4], 0.06);
      }
      rod(root, steel, [-7, 3, -4], [4, 3, -4], 0.12);
      hazardPipe(-4, 2.4);
      hazardPipe(4, 2.4);
      break;
    case "classroom":
      for (const x of [-5, 0, 5]) for (const z of [-2, 2]) desk(x, z, 2.4);
      screen(0, -6, "CORRESPONDENCE / TEST CANCELLED", 6);
      shelf(-11, -3);
      break;
    case "atrium":
      // The former "floating atrium" is an enclosed conference hall with a
      // supported lightwell exhibit, safe railings and service passageways.
      block(0, 0, 4, 5, 0.45, steel);
      for (const x of [-2.2, 2.2]) {
        rod(root, steel, [x, 0.4, -2.6], [x, 0.4, 2.6], 0.05);
        for (const z of [-2.6, 2.6])
          rod(root, steel, [x, 0.4, z], [x, 1.2, z], 0.04);
        rod(root, steel, [x, 1.2, -2.6], [x, 1.2, 2.6], 0.04);
      }
      screen(0, -5, "INSTITUTE EVACUATION / NO SIGNAL", 5);
      bench(-7, 1);
      bench(7, 1);
      break;
    case "archive":
      for (const x of [-6, 0, 6]) for (const z of [-4, 0]) shelf(x, z, 3);
      features.robot = npc("guidebot", -4, 3);
      features.fallen = block(-4, 3, 2.3, 0.7, 0.55, wood);
      features.fallen.rotation.z = 0.2;
      break;
    case "robotics":
      for (const x of [-6, 0, 6]) {
        desk(x, -3);
        const arm = new T.Group();
        arm.position.set(x, 0.85, -3);
        root.add(arm);
        rod(arm, steel, [0, 0, 0], [0, 0.8, 0], 0.12);
        rod(arm, steel, [0, 0.8, 0], [0.7, 1.3, 0], 0.09);
        box(arm, dark, [0.7, 1.3, 0], [0.18, 0.25, 0.25]);
        animations.push((t) => (arm.rotation.y = Math.sin(t * 0.35 + x) * 0.5));
      }
      partition(root, colliders, 0, 1, 6, 0.15, { glass: true });
      break;
    case "garden":
      for (const x of [-6, -1, 4])
        for (const z of [-3, 2]) {
          block(x, z, 1.8, 1.2, 0.5, concrete);
          for (let i = 0; i < 5; i++) {
            const sx = x - 0.65 + i * 0.3;
            rod(root, wood, [sx, 0.5, z], [sx, 1.7, z], 0.025);
            for (let j = 0; j < 4; j++) {
              const l = ball(
                root,
                mat("#536759"),
                [sx + Math.sin(j * 2) * 0.15, 0.8 + j * 0.23, z],
                [0.23, 0.06, 0.12],
              );
              l.rotation.z = j * 0.5;
            }
          }
        }
      break;
    case "impossible":
      desk(-5, 1);
      desk(5, 1);
      for (const x of [-6, 6]) cabinet(x, -5);
      // The anomaly is evidence on a monitor, not a physically infinite room.
      features.expansion = new T.Group();
      root.add(features.expansion);
      box(features.expansion, dark, [0, 1.7, -5], [4, 2, 0.16]);
      for (let i = 0; i < 9; i++)
        box(
          features.expansion,
          indicator,
          [-1.6 + i * 0.4, 1.7 + Math.sin(i) * 0.4, -4.9],
          [0.03, 0.25 + i * 0.06, 0.025],
        );
      label("SAME CORRIDOR. TWO DIFFERENT MEASUREMENTS.", 0, 2.9, -5, 5);
      break;
    case "observation":
      features.glass = partition(root, colliders, 0, -5, 12, 0.12, {
        glass: true,
      });
      desk(-5, 1);
      desk(4, 1);
      break;
    case "refuge":
      desk(2, -4);
      bench(-4, 1, 4);
      features.researcher = npc("researcher", -3, 2);
      shelf(5, -7);
      screen(-5, -5, "TEST DELAYED. NO. CANCEL IT.", 4);
      break;
    case "lift-car":
      features.ceiling = box(root, steel, [0, 2.65, -5], [3, 0.12, 2]);
      features.dent = ball(root, dark, [0, 2.62, -5], [0.6, 0.04, 0.5]);
      cabinet(-5, -3);
      bench(5, 1);
      break;
    case "lobby":
      desk(-4, -1, 4);
      bench(6, 3, 4);
      block(0, -2, 1.2, 1.2, 0.8);
      features.statue = box(root, steel, [0, 1.5, -2], [0.35, 1.4, 0.35]);
      features.alternate = box(root, steel, [0, 1.5, -2], [0.8, 1.4, 0.12]);
      features.alternate.visible = false;
      break;
    case "recording":
      desk(-4, 0);
      desk(4, 0);
      screen(0, -5, "CORRESPONDENCE TEST 07", 4);
      for (const x of [-2, 2]) {
        const p = npc(x > 0 ? "mara" : "researcher", x, -3);
        p.visible = false;
        (features.memoryActors ||= []).push(p);
      }
      break;
    case "apparatus": {
      block(0, -3, 5, 3, 0.4);
      features.portal = new T.Group();
      features.portal.position.set(0, 1.7, -3);
      root.add(features.portal);
      for (const x of [-2.4, 2.4])
        box(root, steel, [x, 1.8, -3], [0.3, 3, 0.8]);
      box(root, steel, [0, 3.25, -3], [5.1, 0.25, 0.8]);
      for (let i = 0; i < 3; i++) {
        const ring = mesh(
          features.portal,
          new T.TorusGeometry(1.1 + i * 0.17, 0.06, 8, 64),
          steel,
        );
        ring.rotation.y = i * 0.15;
        animations.push((t) => (ring.rotation.z = t * 0.1 * (i % 2 ? -1 : 1)));
      }
      features.inverted = new T.Group();
      features.inverted.position.set(0, 1.8, -3.2);
      features.inverted.rotation.z = Math.PI;
      root.add(features.inverted);
      for (let i = 0; i < 8; i++)
        box(
          features.inverted,
          indicator,
          [0, -0.85 + i * 0.21, 0],
          [0.8, 0.04, 0.5],
        );
      cabinet(-5, -4);
      cabinet(5, -4);
      break;
    }
  }
  for (const lift of tower.lifts.filter((l) => l.stops.includes(floor))) {
    const [x, z] = lift.position;
    if (floor === 0) {
      /* Public lift terminates in the enclosed roof plant. */ label(
        "LIFT A / ROOF PLANT",
        -10,
        2.6,
        -7,
        2.7,
      );
      box(root, steel, [-10, 1.3, -7], [2.6, 2.6, 0.5]);
      colliders.push({ x: -10, z: -7.3, w: 2.8, d: 1, h: 2.8 });
    }
    targets.push({
      kind: "lift",
      id: lift.id,
      x,
      z: z + 1.2,
      r: 1.7,
      label: `Call ${lift.id === "A" ? "public" : lift.id === "B" ? "research" : "freight"} lift ${lift.id}`,
    });
  }
  for (const g of tower.gates.filter((g) => g.floor === floor)) {
    const [x, z] = g.position;
    features[g.id] = panel(
      x,
      z,
      g.optional ? "SUPPLY LOCK" : "SYSTEM CALIBRATION",
    );
    targets.push({ id: g.id, kind: "math", x, z, r: 1.9, label: g.label });
  }
  // Existing short museum escalator routes now use enclosed stair connections;
  // no decorative escalators stop in midair inside a room.
  for (const e of tower.escalators.filter(
    (e) => e.from === floor || e.to === floor,
  )) {
    const up = e.to === floor;
    targets.push({
      kind: "escalator",
      x: 11,
      z: up ? 3.6 : -0.4,
      r: 1.5,
      destination: up ? e.from : e.to,
      label: "Gallery service stair · " + (up ? "up" : "down"),
    });
    box(root, steel, [12.6, 1.15, up ? 2.5 : -1.5], [0.18, 2.3, 2]);
    label("GALLERY STAIR", 11, 2.5, up ? 2.8 : -1.2, 2.5);
  }
  for (const o of tower.objects.filter(
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
    box(root, wood, [x, 0.6, z], [1.1, 1.2, 0.6]);
    box(root, paper, [x, 1.22, z], [0.75, 0.03, 0.4]);
    targets.push({
      kind: "record",
      id: o.id,
      x,
      z: z + 0.6,
      r: 1.6,
      label: o.title,
    });
  }
  for (const [i, pos] of (def.collect || []).entries()) {
    const group = new T.Group();
    group.position.set(pos[0], 0.25, pos[1]);
    root.add(group);
    box(group, dark, [0, 0, 0], [0.5, 0.25, 0.7]);
    box(group, paper, [0, 0.14, 0], [0.4, 0.02, 0.5]);
    box(group, indicator, [0, 0.16, 0.15], [0.22, 0.02, 0.025]);
    group.visible = !save.collected.includes(`${floor}:${i}`);
    collectibles.push({ group, id: `${floor}:${i}` });
  }
  if (def.object) {
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
    if (def.object === "allocation") panel(-4, 2, "10 POWER UNITS");
  }
  if (def.ladder) {
    for (const x of [10.6, 11.4])
      rod(root, steel, [x, 0, -0.3], [x, 3.3, -0.3], 0.035);
    for (let i = 0; i < 11; i++)
      rod(root, steel, [10.6, i * 0.3, -0.3], [11.4, i * 0.3, -0.3], 0.035);
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
    box(root, steel, [4, 1.2, -8], [2.6, 2.4, 0.16]);
    label("CAMPUS EXIT", 4, 2.75, -7.8, 3);
    targets.push({ kind: "exit", x: 4, z: -6.5, r: 1.8, label: "Campus exit" });
  }
  if (floor === 13 || floor === 20 || save.escape) {
    const p = presence();
    p.position.set(floor === 13 ? 0 : 6, 0, -7);
    p.visible = floor !== 13;
    root.add(p);
    features.watcher = p;
  }
  const sealed =
    (floor === 1 && save.flags.receptionSecured) ||
    (floor === 2 && save.flags.routeReleased);
  const count =
    save.flags.ventilation && floor >= 14 && !save.escape
      ? 0
      : Math.min(4, (def.enemies || 0) + (save.escape && floor >= 17 ? 2 : 0));
  const starts = def.threatPositions || [
    [-7, -4],
    [7, -2],
    [4, -6],
    [-5, 4],
  ];
  for (let i = 0; i < count; i++) {
    const e = presence();
    const [x, z] = starts[i % starts.length];
    e.position.set(x, 0, z);
    e.userData.home = { x, z };
    e.userData.patrol = [
      { x, z },
      { x: x > 0 ? x - 3 : x + 3, z: z + 3 },
    ];
    e.userData.phase = i * 1.3;
    e.userData.stun = 0;
    e.userData.grace = floor === 0 ? 5 : 2;
    e.userData.disabled = false;
    e.visible = true;
    root.add(e);
    enemies.push(e);
  }
  // A full-height rolling fire door visibly seals the danger when operated.
  if (floor === 1 || floor === 2) {
    const x = -9,
      z = 8.5;
    features.shutter = box(
      root,
      steel,
      [x, sealed ? 1.2 : 3.5, z],
      [2.6, 2.4, 0.12],
    );
  }
  if (save.flags.guidebot && features.fallen) {
    features.fallen.position.y = 2;
    features.robot.rotation.z = 0;
  }
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
      features.steam?.forEach((s, i) => {
        s.visible = (t + i * 2) % 6 > 4.3;
        s.scale.y = 0.8 + Math.sin(t * 7) * 0.1;
      });
      if (features.shutter) {
        const closed =
          (floor === 1 && save.flags.receptionSecured) ||
          (floor === 2 && save.flags.routeReleased);
        features.shutter.position.y = T.MathUtils.lerp(
          features.shutter.position.y,
          closed ? 1.2 : 3.5,
          Math.min(1, dt * 4),
        );
      }
    },
    dispose() {
      world.scene.remove(root);
      const gs = new Set(),
        ms = new Set(),
        ts = new Set();
      root.traverse((o) => {
        if (o.isSkinnedMesh) o.skeleton.dispose();
        if (o.geometry) gs.add(o.geometry);
        for (const m of Array.isArray(o.material) ? o.material : [o.material])
          if (m) {
            ms.add(m);
            if (m.map && !m.userData.sharedMaps) ts.add(m.map);
          }
      });
      gs.forEach((g) => g.dispose());
      ms.forEach((m) => m.dispose());
      ts.forEach((t) => t.dispose());
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
