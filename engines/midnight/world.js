import { batchArchitecture } from "./static-geometry.js";
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

import { BUILDING, buildStairCore, liftCabin } from "./architecture.js";
import { createStorm } from "./weather.js";

export function createWorld(canvas) {
  const renderer = new T.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
  });
  const gl = renderer.getContext(),
    debug = gl.getExtension("WEBGL_debug_renderer_info");
  const software =
    debug &&
    /swiftshader|llvmpipe|software/i.test(
      gl.getParameter(debug.UNMASKED_RENDERER_WEBGL),
    );
  renderer.setPixelRatio(software ? 0.65 : Math.min(devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  const scene = new T.Scene();
  scene.background = new T.Color("#101d30");
  scene.fog = new T.FogExp2("#14253a", 0.012);
  const camera = new T.PerspectiveCamera(62, 1, 0.065, 180);
  camera.position.set(19, 17, 24);
  scene.add(new T.HemisphereLight("#a8dcff", "#25394e", 2));
  const key = new T.DirectionalLight("#ffdfaa", 3);
  key.position.set(-8, 18, 10);
  key.castShadow = true;
  key.shadow.mapSize.set(software ? 512 : 1536, software ? 512 : 1536);
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

  // Carry the roof down into a full facade so wide shots read as a building.
  for (const x of [-17.8, 17.8])
    box(roof, edge, [x, -33.5, 0], [0.35, 66, 31.6]);
  for (const z of [-15.8, 15.8])
    box(roof, edge, [0, -33.5, z], [35.6, 66, 0.35]);
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
    const y = -1.95 - floor * 3.9;
    for (const z of [-15.99, 15.99])
      for (let col = 0; col < 14; col++)
        frontWindows[(floor * 7 + col) % 9 === 0 ? 1 : 0].push([
          -15.6 + col * 2.4,
          y,
          z,
        ]);
    for (const x of [-17.99, 17.99])
      for (let col = 0; col < 12; col++)
        sideWindows[(floor * 11 + col) % 13 === 0 ? 1 : 0].push([
          x,
          y,
          -13.7 + col * 2.5,
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
      roofTiles.push([x, -0.075, z]);
    }
  instances(roof, stone, [0.995, 0.15, 0.995], roofTiles);
  const obstacles = [];
  for (const x of [-17.7, 17.7]) {
    box(roof, edge, [x, 0.65, 0], [0.3, 1.3, 32]);
    box(roof, gold, [x, 1.33, 0], [0.36, 0.08, 32]);
    obstacles.push({ x, z: 0, w: 0.3, d: 32, h: 1.35 });
  }
  for (const z of [-15.7, 15.7]) {
    box(roof, edge, [0, 0.65, z], [36, 1.3, 0.3]);
    obstacles.push({ x: 0, z, w: 36, d: 0.3, h: 1.3 });
  }
  const pad = mesh(
    roof,
    new T.RingGeometry(5.35, 5.43, 96),
    ivory,
    [-6, 0.007, -1],
  );
  pad.rotation.x = -Math.PI / 2;
  for (const x of [-7, -5]) box(roof, ivory, [x, 0.004, -1], [0.13, 0.006, 3]);
  box(roof, ivory, [-6, 0.004, -1], [2, 0.006, 0.13]);
  const stairDoors = BUILDING.stairs.map(
    (c) => buildStairCore(roof, c, obstacles, true).userData.roofDoor,
  );
  const roofDoors = stairDoors,
    roofDoor = { group: new T.Group() },
    roofConsole = new T.Group();
  text(
    roof,
    "RESEARCH DIVISION / STAIR B",
    [9, 2.6, -7.94],
    3.2,
    "#c7cfc8",
    54,
  );
  text(roof, "FIRE STAIR A", [-9, 2.6, 7.94], 2, "#c7cfc8", 54);
  const car = liftCabin(roof, "A", -10, -7);
  roof.userData.lifts = { A: car };
  car.userData.setFloor("18");
  for (const x of [-11.55, -8.45]) {
    box(roof, stone, [x, 1.75, -8.6], [0.25, 3.5, 3.5]);
    obstacles.push({ x, z: -8.6, w: 0.25, d: 3.5, h: 3.5 });
  }
  box(roof, stone, [-10, 1.75, -10.3], [3.35, 3.5, 0.2]);
  box(roof, stone, [-10, 3.55, -8.6], [3.5, 0.2, 3.6]);
  for (const sign of [-1, 1]) {
    box(roof, stone, [-10 + sign * 1.23, 1.75, -7], [0.6, 3.5, 0.3]);
    obstacles.push({ x: -10 + sign * 1.23, z: -7, w: 0.6, d: 0.3, h: 3.5 });
  }
  const doorCollider = { x: -10, z: -7, w: 3.3, d: 0.28, h: 2.45 };
  obstacles.push(doorCollider);
  car.userData.collider = doorCollider;
  for (const o of [
    { x: 0, z: 2, w: 2.5, d: 1.3, h: 1.5 },
    { x: 3, z: -1, w: 1.3, d: 1.3, h: 1.5 },
    { x: 4, z: 7, w: 2.5, d: 1.5, h: 1.8 },
  ]) {
    obstacles.push(o);
    box(roof, teal, [o.x, o.h / 2, o.z], [o.w, o.h, o.d]);
    for (let i = 0; i < 9; i++)
      box(
        roof,
        gold,
        [o.x, o.h * 0.2 + i * 0.1, o.z + o.d / 2 + 0.015],
        [o.w * 0.85, 0.035, 0.03],
      );
    const fan = mesh(roof, new T.CylinderGeometry(0.4, 0.4, 0.06, 24), dark, [
      o.x,
      o.h + 0.04,
      o.z,
    ]);
    for (let i = 0; i < 4; i++) {
      const blade = box(
        roof,
        gold,
        [o.x, o.h + 0.08, o.z],
        [0.65, 0.015, 0.06],
      );
      blade.rotation.y = (i * Math.PI) / 4;
    }
  }
  for (const x of [-16, 16]) lamp(roof, x, 7, 2.8);
  lamp(roof, 6, -7, 2.8);
  batchArchitecture(roof);
  const heli = helicopter();
  heli.position.set(-6, 0.01, -1);
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
  const storm = createStorm(roof),
    rain = storm.rain,
    rainData = storm.data;

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
      const desired = heli.userData.damaged ? 0 : 34;
      heli.userData.rotorSpeed = T.MathUtils.damp(
        heli.userData.rotorSpeed,
        desired,
        0.32,
        dt,
      );
      heli.userData.rotor.rotation.y += dt * heli.userData.rotorSpeed;
      heli.userData.tailRotor.rotation.x += dt * heli.userData.rotorSpeed * 4;
      heli.userData.posePilot();
      if (room === "roof") storm.update(time, dt, heli);
    },
  };
}
