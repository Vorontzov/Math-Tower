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
  helicopter,
} from "./actors.js";

export function createWorld(canvas) {
  const renderer = new T.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.65));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  const scene = new T.Scene();
  scene.background = new T.Color("#101d30");
  scene.fog = new T.FogExp2("#14253a", 0.012);
  const camera = new T.PerspectiveCamera(45, 1, 0.1, 180);
  camera.position.set(19, 17, 24);
  scene.add(new T.HemisphereLight("#a8dcff", "#25394e", 2));
  const key = new T.DirectionalLight("#ffdfaa", 3);
  key.position.set(-8, 18, 10);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, {
    left: -22,
    right: 22,
    top: 22,
    bottom: -22,
    near: 1,
    far: 70,
  });
  key.shadow.bias = -0.0005;
  scene.add(key);
  const fill = new T.DirectionalLight("#75d9ff", 1.9);
  fill.position.set(15, 9, -15);
  scene.add(fill);
  const roof = new T.Group(),
    museum = new T.Group();
  scene.add(roof, museum);
  museum.visible = false;
  const stone = mat("#466178", 0.65, 0.25),
    edge = mat("#1c3146", 0.55, 0.3),
    gold = mat("#c89e59", 0.32, 0.65),
    ivory = mat("#ded8be"),
    dark = mat("#0e2635"),
    teal = mat("#23525e", 0.42, 0.2);
  const glow = new T.MeshStandardMaterial({
    color: "#d4cfb7",
    emissive: "#b7ad8e",
    emissiveIntensity: 0.6,
  });
  const cool = new T.MeshStandardMaterial({
    color: "#a7bbbf",
    emissive: "#58868b",
    emissiveIntensity: 0.7,
  });
  function instances(parent, material, size, positions) {
    const group = new T.InstancedMesh(
        new T.BoxGeometry(...size),
        material,
        positions.length,
      ),
      matrix = new T.Matrix4();
    positions.forEach((p, i) =>
      group.setMatrixAt(i, matrix.makeTranslation(...p)),
    );
    group.receiveShadow = true;
    parent.add(group);
    return group;
  }
  function text(parent, str, pos, width = 3, color = "#f3d69b", size = 80) {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 256;
    const ctx = c.getContext("2d");
    ctx.fillStyle = color;
    ctx.font = `600 ${size}px Georgia`;
    if (ctx.measureText(str).width > 980)
      ctx.font = `600 ${Math.floor((size * 980) / ctx.measureText(str).width)}px Georgia`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(str, 512, 128);
    const tex = new T.CanvasTexture(c);
    tex.colorSpace = T.SRGBColorSpace;
    const m = new T.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
    });
    return mesh(parent, new T.PlaneGeometry(width, width / 4), m, pos);
  }
  function lamp(parent, x, z, height = 3) {
    rod(parent, gold, [x, 0, z], [x, height, z], 0.055);
    ball(parent, glow, [x, height, z], [0.16, 0.22, 0.16]);
    const l = new T.PointLight("#ffd297", 10, 7, 2);
    l.position.set(x, height - 0.2, z);
    parent.add(l);
  }
  function door(parent, x, z, title) {
    const group = new T.Group();
    group.position.set(x, 0, z);
    parent.add(group);
    for (const s of [-1, 1]) {
      box(group, edge, [s * 1.65, 2.2, -0.25], [0.4, 4.4, 0.6]);
      box(group, gold, [s * 1.65, 2.2, 0.13], [0.15, 4.5, 0.2]);
    }
    box(group, edge, [0, 4.35, -0.25], [3.6, 0.4, 0.6]);
    box(group, gold, [0, 4.4, 0.13], [3.5, 0.15, 0.2]);
    const leaf = box(group, teal, [0, 2, 0.15], [2.9, 4, 0.22]);
    for (let i = 0; i < 4; i++)
      box(leaf, gold, [0, (i - 1.5) * 0.2, 0.6], [0.8, 0.015, 0.1]);
    text(group, title, [0, 5, 0.1], 4);
    return { group, leaf };
  }
  function consoleProp(parent, x, z) {
    const g = new T.Group();
    g.position.set(x, 0, z);
    parent.add(g);
    box(g, edge, [0, 0.65, 0], [0.65, 1.3, 0.55]);
    const top = box(g, gold, [0, 1.35, 0], [0.9, 0.16, 0.7]);
    top.rotation.x = 0.2;
    const screen = box(g, cool, [0, 1.45, 0.07], [0.64, 0.04, 0.43]);
    screen.rotation.x = 0.2;
    const halo = mesh(
      g,
      new T.TorusGeometry(0.5, 0.025, 8, 48),
      cool,
      [0, 2.1, 0],
    );
    g.userData.halo = halo;
    return g;
  }
  box(roof, edge, [0, -0.5, 0], [30, 1, 24]);
  // Carry the roof down into a full facade so wide shots read as a building.
  box(roof, edge, [0, -31, 0], [29.6, 60, 23.6]);
  const facadeGlass = mat("#202e37", 0.19, 0.7),
    facadeLight = new T.MeshStandardMaterial({
      color: "#b8b39c",
      emissive: "#8b8063",
      emissiveIntensity: 0.32,
      roughness: 0.35,
      metalness: 0.25,
    }),
    frontWindows = [[], []],
    sideWindows = [[], []];
  for (let floor = 0; floor < 18; floor++) {
    const y = -2.8 - floor * 3.3;
    for (const z of [-11.82, 11.82])
      for (let col = 0; col < 12; col++)
        frontWindows[(floor * 7 + col) % 9 === 0 ? 1 : 0].push([
          -13.2 + col * 2.4,
          y,
          z,
        ]);
    for (const x of [-14.82, 14.82])
      for (let col = 0; col < 9; col++)
        sideWindows[(floor * 11 + col) % 13 === 0 ? 1 : 0].push([
          x,
          y,
          -10 + col * 2.5,
        ]);
  }
  for (let i = 0; i < 2; i++) {
    instances(
      roof,
      i ? facadeLight : facadeGlass,
      [1.75, 2.1, 0.04],
      frontWindows[i],
    );
    instances(
      roof,
      i ? facadeLight : facadeGlass,
      [0.04, 2.1, 1.75],
      sideWindows[i],
    );
  }
  const roofTiles = [];
  for (let x = -14; x < 15; x += 2)
    for (let z = -11; z < 12; z += 2) roofTiles.push([x, 0.005, z]);
  instances(roof, stone, [1.96, 0.05, 1.96], roofTiles);
  for (const x of [-14.6, 14.6]) {
    box(roof, edge, [x, 0.65, 0], [0.35, 1.3, 23.5]);
    box(roof, gold, [x, 1.33, 0], [0.38, 0.08, 23.5]);
  }
  box(roof, edge, [0, 0.65, -11.6], [29.4, 1.3, 0.35]);
  box(roof, edge, [0, 0.65, 11.6], [29.4, 1.3, 0.35]);
  const pad = mesh(
    roof,
    new T.TorusGeometry(4.2, 0.07, 8, 80),
    gold,
    [-6, 0.08, -1],
  );
  pad.rotation.x = -Math.PI / 2;
  for (const x of [-7, -5]) box(roof, ivory, [x, 0.08, -1], [0.14, 0.02, 3]);
  box(roof, ivory, [-6, 0.08, -1], [2, 0.02, 0.14]);
  for (const x of [4.9, 11.1]) box(roof, edge, [x, 2.8, -9.4], [2.8, 5.6, 3]);
  box(roof, edge, [8, 5, -9.4], [3.5, 1.2, 3]);
  box(roof, dark, [8, 2, -11], [3.5, 4, 0.2]);
  const roofDoor = door(roof, 8, -7.8, "MUSEUM ACCESS");
  text(roof, "M A T H   T O W E R", [8, 5.9, -7.7], 7, "#d6b779", 64);
  const roofConsole = consoleProp(roof, 5, -6.4);
  lamp(roof, 3, -7, 3.5);
  lamp(roof, 12, -7, 3.5);
  lamp(roof, -13, 8);
  lamp(roof, 13, 8);
  const obstacles = [
    { x: 0, z: 2, w: 2.5, d: 1.3, h: 0.7 },
    { x: 3, z: -1, w: 1.3, d: 1.3, h: 0.9 },
  ];
  for (const o of obstacles) {
    box(roof, teal, [o.x, o.h / 2, o.z], [o.w, o.h, o.d]);
    for (let i = 0; i < 3; i++)
      box(
        roof,
        gold,
        [o.x + (i - 1) * 0.3, o.h + 0.02, o.z],
        [0.07, 0.03, o.d],
      );
  }
  const heli = helicopter();
  heli.position.set(-6, 0.5, -1);
  heli.rotation.y = 0.4;
  roof.add(heli);
  const city = new T.Group();
  scene.add(city);
  const windows = [];
  for (let i = 0; i < 44; i++) {
    const angle = (i / 44) * Math.PI * 2,
      r = 39 + (i % 5) * 6,
      h = 4 + ((i * 13) % 18),
      x = Math.cos(angle) * r,
      z = Math.sin(angle) * r;
    box(
      city,
      mat(i % 2 ? "#182a3d" : "#26394b"),
      [x, -16 + h / 2, z],
      [3 + (i % 3), h, 4],
    );
    for (let j = 0; j < Math.floor(h / 2); j++)
      for (let k = 0; k < 2; k++)
        windows.push([x - 0.7 + k * 1.4, -15 + j * 2, z + 2.02]);
  }
  instances(city, glow, [0.45, 0.6, 0.02], windows);
  ball(
    city,
    new T.MeshBasicMaterial({ color: "#d7eff8" }),
    [-35, 29, -65],
    [3, 3, 3],
  );
  const rainData = new Float32Array(600 * 6);
  for (let i = 0; i < 600; i++) {
    const x = ((i * 17.17) % 44) - 22,
      y = (i * 1.33) % 28,
      z = ((i * 9.31) % 40) - 20;
    rainData.set([x, y, z, x - 0.12, y - 0.65, z + 0.04], i * 6);
  }
  const rainGeo = new T.BufferGeometry();
  rainGeo.setAttribute("position", new T.BufferAttribute(rainData, 3));
  const rain = new T.LineSegments(
    rainGeo,
    new T.LineBasicMaterial({
      color: "#a4b4be",
      transparent: true,
      opacity: 0.22,
    }),
  );
  roof.add(rain);
  const wet = new T.MeshPhysicalMaterial({
    color: "#26353e",
    metalness: 0.4,
    roughness: 0.08,
    clearcoat: 1,
    transparent: true,
    opacity: 0.52,
  });
  for (let i = 0; i < 12; i++) {
    const outline = new T.Shape();
    for (let j = 0; j <= 36; j++) {
      const angle = (j / 36) * Math.PI * 2,
        radius =
          0.85 +
          Math.sin(angle * 3 + i) * 0.09 +
          Math.sin(angle * 7 - i) * 0.06,
        x = Math.cos(angle) * radius,
        y = Math.sin(angle) * radius;
      if (j === 0) outline.moveTo(x, y);
      else outline.lineTo(x, y);
    }
    const puddle = mesh(
      roof,
      new T.ShapeGeometry(outline),
      wet,
      [-11 + ((i * 3.31) % 23), 0.041, -8 + ((i * 4.13) % 17)],
      [1.1 + (i % 3) * 0.6, 0.5 + (i % 2) * 0.4, 1],
    );
    puddle.rotation.x = -Math.PI / 2;
    puddle.rotation.z = i * 0.7;
    puddle.castShadow = false;
  }

  // One dimensional room: floor, colonnade, suspended machinery and clear routes.
  box(museum, edge, [0, -0.4, 0], [30, 0.8, 26]);
  const lightTiles = [],
    darkTiles = [];
  for (let x = -14; x < 15; x += 2)
    for (let z = -12; z < 13; z += 2)
      ((x + z) % 4 === 0 ? lightTiles : darkTiles).push([x, 0, z]);
  instances(museum, mat("#596165", 0.36, 0.35), [1.96, 0.04, 1.96], lightTiles);
  instances(museum, mat("#50595e", 0.36, 0.35), [1.96, 0.04, 1.96], darkTiles);
  for (const x of [-12, 12])
    box(museum, gold, [x, 0.035, 0], [0.06, 0.025, 25]);
  for (const z of [-10, 10])
    box(museum, gold, [0, 0.035, z], [28, 0.025, 0.06]);
  box(museum, dark, [-4, 5, -12.8], [22, 10, 0.6]);
  box(museum, dark, [13, 5, -12.8], [4, 10, 0.6]);
  box(museum, dark, [9, 7.5, -12.8], [4, 5, 0.6]);
  box(museum, dark, [-15, 4, 0], [0.5, 8, 26]);
  box(museum, dark, [15, 4, 0], [0.5, 8, 26]);
  for (const x of [-13, -8, -3, 3, 13]) {
    box(museum, teal, [x, 4, -12.35], [3, 7, 0.2]);
    for (const s of [-1, 1])
      box(museum, gold, [x + s * 1.48, 4, -12.1], [0.08, 7, 0.08]);
    text(
      museum,
      ["π", "∞", "Σ", "√", "△"][[-13, -8, -3, 3, 13].indexOf(x)],
      [x, 6, -12],
      2.2,
    );
  }
  // The opening door reveals an actual deep set, with inverted floating geometry.
  box(museum, teal, [9, -0.1, -20], [4, 0.2, 18]);
  box(museum, dark, [6.9, 3, -20], [0.2, 6, 18]);
  box(museum, dark, [11.1, 3, -20], [0.2, 6, 18]);
  for (let i = 0; i < 6; i++) {
    for (const x of [7.1, 10.9])
      box(museum, gold, [x, 2.8, -13 - i * 2.4], [0.07, 5.6, 0.08]);
    box(museum, gold, [9, 5.6, -13 - i * 2.4], [4, 0.08, 0.08]);
    const shape = mesh(museum, new T.OctahedronGeometry(0.45), cool, [
      9 + Math.sin(i) * 0.6,
      2.8 + Math.cos(i) * 1.1,
      -15 - i * 2,
    ]);
    shape.rotation.z = i * 0.6;
  }
  for (const x of [-13, 13])
    for (const z of [-9, -2, 5]) {
      mesh(museum, new T.CylinderGeometry(0.35, 0.45, 6, 12), ivory, [x, 3, z]);
      mesh(museum, new T.CylinderGeometry(0.6, 0.6, 0.2, 12), gold, [
        x,
        5.95,
        z,
      ]);
      lamp(museum, x * 0.95, z, 3.4);
    }
  for (const z of [-9, -2, 5]) {
    const arch = mesh(
      museum,
      new T.TorusGeometry(13, 0.13, 8, 64, Math.PI),
      gold,
      [0, 6, z],
    );
    arch.scale.y = 0.42;
    rod(museum, gold, [-13, 6, z], [13, 6, z], 0.04);
  }
  text(
    museum,
    "THE GEOMETRY OF THE IMPOSSIBLE",
    [0, 9, -12.3],
    12,
    "#eed9ad",
    62,
  );
  box(museum, edge, [0, 0.2, -1], [5, 0.4, 5]);
  const mechanism = new T.Group();
  mechanism.position.set(0, 3.5, -1);
  museum.add(mechanism);
  const rings = [];
  for (let i = 0; i < 3; i++) {
    const ring = mesh(
      mechanism,
      new T.TorusGeometry(2.2 + i * 0.32, 0.075, 12, 100),
      gold,
    );
    ring.rotation.set(i * 0.9, 0.3 + i * 0.7, 0);
    rings.push(ring);
  }
  const core = mesh(mechanism, new T.IcosahedronGeometry(0.85, 0), cool);
  core.material = new T.MeshStandardMaterial({
    color: "#72c9d2",
    emissive: "#3ca8ae",
    emissiveIntensity: 0.8,
    metalness: 0.7,
    roughness: 0.2,
    flatShading: true,
  });
  rod(museum, gold, [0, 5, -1], [0, 11, -1], 0.04);
  const pendulum = new T.Group();
  pendulum.position.set(-5, 9, -2);
  museum.add(pendulum);
  rod(pendulum, gold, [0, 0, 0], [0, -6, 0], 0.04);
  ball(pendulum, gold, [0, -6, 0], [0.6, 0.6, 0.6]);
  for (let i = 0; i < 7; i++) {
    const x = (i % 2 ? 1 : -1) * (5 + i * 0.8),
      z = -5 + i;
    const poly = mesh(
      museum,
      i % 2 ? new T.OctahedronGeometry(0.6) : new T.IcosahedronGeometry(0.6),
      i % 2 ? gold : ivory,
      [x, 5.3 + (i % 3), z],
    );
    poly.rotation.set(i, i * 0.7, 0);
    rod(museum, gold, [x, poly.position.y + 0.5, z], [x, 11, z], 0.018);
  }
  const exitDoor = door(museum, 9, -10.5, "LOWER GALLERIES");
  const museumConsole = consoleProp(museum, 6.5, -8);
  const robot = guidebot();
  robot.position.set(-4, 0, 2);
  robot.rotation.y = 0.5;
  museum.add(robot);
  const enemies = [
    [-7, -4],
    [7, -2],
    [3, -6],
  ].map(([x, z], i) => {
    const e = skitter();
    e.position.set(x, 0, z);
    e.userData.phase = i * 1.3;
    museum.add(e);
    return e;
  });
  const shards = [
    [8, 6],
    [-10, -6],
    [4, -7],
  ].map(([x, z]) => {
    const g = new T.Group();
    g.position.set(x, 1.1, z);
    museum.add(g);
    mesh(g, new T.OctahedronGeometry(0.27), cool);
    const ring = mesh(g, new T.TorusGeometry(0.44, 0.018, 6, 40), gold);
    ring.rotation.x = 0.8;
    return g;
  });
  const player = explorer();
  scene.add(player);
  player.position.set(-6, 0, 4);
  const pulse = mesh(
    scene,
    new T.TorusGeometry(1, 0.04, 8, 64),
    new T.MeshBasicMaterial({
      color: "#9efde9",
      transparent: true,
      opacity: 0,
    }),
    [0, 0.6, 0],
  );
  pulse.rotation.x = -Math.PI / 2;
  const resize = () => {
    const w = canvas.clientWidth,
      h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  return {
    renderer,
    scene,
    camera,
    roof,
    museum,
    city,
    player,
    heli,
    robot,
    enemies,
    shards,
    rings,
    core,
    pendulum,
    roofDoor,
    exitDoor,
    roofConsole,
    museumConsole,
    obstacles,
    rain,
    rainData,
    pulse,
    resize,
    enter(room) {
      roof.visible = room === "roof";
      museum.visible = room === "museum";
      city.visible = room === "roof";
      scene.fog.density = room === "roof" ? 0.012 : 0.018;
      scene.background.set(room === "roof" ? "#10171c" : "#142028");
    },
    animate(time, dt, room) {
      heli.userData.rotor.rotation.y += dt * 30;
      heli.userData.tailRotor.rotation.x += dt * 45;
      heli.position.y = 0.5 + Math.sin(time * 2) * 0.035;
      rings.forEach((r, i) => {
        r.rotation.y += dt * (0.15 + i * 0.09);
        r.rotation.z += dt * 0.07;
      });
      core.rotation.y = time * 0.3;
      pendulum.rotation.z = Math.sin(time * 0.9) * 0.35;
      robot.userData.head.rotation.z = Math.sin(time) * 0.1;
      shards.forEach((s, i) => {
        s.rotation.y = time;
        s.position.y = 1.1 + Math.sin(time * 2 + i) * 0.14;
      });
      for (const p of [roofConsole, museumConsole]) {
        p.userData.halo.rotation.y = time * 0.8;
        p.userData.halo.position.y = 2.1 + Math.sin(time * 2) * 0.1;
      }
      if (room === "roof") {
        for (let i = 1; i < rainData.length; i += 6) {
          rainData[i] -= dt * 15;
          if (rainData[i] < 0) rainData[i] = 25;
          rainData[i + 3] = rainData[i] - 0.65;
        }
        rain.geometry.attributes.position.needsUpdate = true;
      }
    },
  };
}
