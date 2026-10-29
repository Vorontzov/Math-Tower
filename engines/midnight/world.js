import * as T from "../../vendor/three.module.js";
import {
  mat,
  mesh,
  ball,
  box,
  rod,
  explorer,
  guidebot,
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
    gold = mat("#727c7a", 0.52, 0.65),
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
    for (const dx of [-1.2, 1.2])
      box(group, edge, [dx, 1.3, 0], [0.16, 2.6, 0.25]);
    box(group, edge, [0, 2.6, 0], [2.55, 0.18, 0.25]);
    const leaf = box(group, teal, [0, 1.2, 0.08], [2.2, 2.4, 0.12]);
    box(leaf, gold, [0.65, 0, 0.1], [0.32, 0.055, 0.065]);
    text(group, title, [0, 2.95, 0.1], 2.8, "#c7cfc8", 60);
    return { group, leaf };
  }
  box(roof, edge, [0, -0.5, 0], [30, 1, 24]);
  // Carry the roof down into a full facade so wide shots read as a building.
  box(roof, edge, [0, -33.5, 0], [29.6, 66, 23.6]);
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
  for (let floor = 0; floor < 17; floor++) {
    const y = -2.8 - floor * 3.9;
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
  // Roof plant, stair head and service door share the floor below's grid.
  for (const x of [4.2, 11.8]) box(roof, edge, [x, 1.75, -9.5], [0.4, 3.5, 4]);
  box(roof, edge, [8, 1.75, -11.3], [8, 3.5, 0.4]);
  for (const x of [5.45, 10.55])
    box(roof, edge, [x, 1.75, -7.6], [2.9, 3.5, 0.3]);
  box(roof, edge, [8, 3.1, -7.6], [2.4, 0.8, 0.3]);
  box(roof, stone, [8, 3.55, -9.5], [8.2, 0.2, 4.2]);
  const roofDoor = door(roof, 8, -7.45, "STAIR B / RESTRICTED");
  text(roof, "UNIVERSITY RESEARCH DIVISION", [8, 3.3, -7.38], 6, "#aeb8b7", 48);
  const roofConsole = new T.Group(); // Math instrument is owned by the active room.
  lamp(roof, 3.5, -7, 2.8);
  lamp(roof, 12.3, -7, 2.8);
  for (const x of [-13, 13]) lamp(roof, x, 8, 2.8);
  // The second fire stair reaches the same southwest corner on every floor.
  for (const x of [-10.6, -7.4])
    box(roof, edge, [x, 1.55, 9.8], [0.22, 3.1, 3.4]);
  box(roof, edge, [-9, 1.55, 11.3], [3.4, 3.1, 0.22]);
  box(roof, stone, [-9, 3.15, 9.8], [3.4, 0.2, 3.4]);
  const roofStairA = door(roof, -9, 8.2, "FIRE STAIR A");
  const roofDoors = [roofDoor, roofStairA];
  const obstacles = [
    { x: -9, z: 9.9, w: 3.4, d: 3.3, h: 3.3 },
    { x: 0, z: 2, w: 2.5, d: 1.3, h: 1.5 },
    { x: 3, z: -1, w: 1.3, d: 1.3, h: 1.5 },
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

  const player = explorer();
  scene.add(player);
  player.position.set(-6, 0, 4);
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
    roofDoor,
    roofDoors,
    roofConsole,
    obstacles,
    rain,
    rainData,
    resize,
    facadeLight,
    enter(room) {
      roof.visible = room === "roof";
      museum.visible = false;
      city.visible = room === "roof";
      scene.fog.density = room === "roof" ? 0.012 : 0.008;
      scene.background.set(room === "roof" ? "#10171c" : "#10191e");
    },
    animate(time, dt, room) {
      if (!heli.userData.damaged) {
        heli.userData.rotor.rotation.y += dt * 30;
        heli.userData.tailRotor.rotation.x += dt * 45;
      } else {
        heli.userData.rotor.rotation.y += dt * 1.5;
        heli.userData.tailRotor.rotation.x += dt * 2;
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
