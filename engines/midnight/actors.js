import * as T from "../../vendor/three.module.js";
import { GLTFLoader } from "../../vendor/addons/loaders/GLTFLoader.js";
import { clone as cloneSkeleton } from "../../vendor/addons/utils/SkeletonUtils.js";
import { groundedMaterial } from "./realism.js";
import { RoundedBoxGeometry } from "../../vendor/addons/geometries/RoundedBoxGeometry.js";

export const mat = groundedMaterial;
let humanAsset = null;
export async function loadHumanAsset() {
  humanAsset = await new GLTFLoader().loadAsync(
    new URL("../../assets/realism/operative.glb", import.meta.url).href,
  );
}
export function mesh(
  parent,
  geometry,
  material,
  pos = [0, 0, 0],
  scale = [1, 1, 1],
) {
  const m = new T.Mesh(geometry, material);
  m.position.set(...pos);
  m.scale.set(...scale);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
export const ball = (p, m, pos, s = [1, 1, 1]) =>
  mesh(p, new T.SphereGeometry(1, 20, 14), m, pos, s);
export const box = (p, m, pos, s) =>
  mesh(p, new RoundedBoxGeometry(1, 1, 1, 2, 0.018), m, pos, s);
export function rod(parent, material, a, b, r = 0.04) {
  const start = new T.Vector3(...a),
    end = new T.Vector3(...b),
    d = end.clone().sub(start);
  const o = mesh(
    parent,
    new T.CylinderGeometry(r, r, d.length(), 10),
    material,
    start.add(end).multiplyScalar(0.5).toArray(),
  );
  o.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize());
  return o;
}

export function explorer() {
  const root = new T.Group(),
    body = new T.Group();
  root.add(body);
  const teal = mat("#207f89"),
    dark = mat("#1b293a"),
    skin = mat("#dbaa7d"),
    hair = mat("#1c222d"),
    gold = mat("#dca33e"),
    white = mat("#fff4dc"),
    rubber = mat("#39434c");
  ball(body, teal, [0, 1.18, 0], [0.39, 0.52, 0.25]);
  box(body, gold, [0, 1.25, -0.27], [0.47, 0.58, 0.23]);
  for (const x of [-0.24, 0.24]) {
    rod(body, gold, [x, 0.95, 0.18], [x, 1.55, 0.16], 0.033);
    ball(body, gold, [x, 0.96, 0.2], [0.055, 0.08, 0.04]);
  }
  const head = new T.Group();
  head.position.set(0, 1.91, 0);
  body.add(head);
  ball(head, skin, [0, 0, 0], [0.38, 0.4, 0.33]);
  ball(head, hair, [0, 0.2, -0.045], [0.4, 0.29, 0.34]);
  for (let i = 0; i < 7; i++) {
    const h = ball(
      head,
      hair,
      [-0.32 + i * 0.1, 0.29 + Math.sin(i * 2) * 0.06, 0.12],
      [0.13, 0.19, 0.2],
    );
    h.rotation.z = -0.3 + i * 0.1;
  }
  const eyes = [];
  for (const x of [-0.15, 0.15]) {
    ball(head, skin, [x * 2.55, -0.02, 0], [0.08, 0.13, 0.09]);
    const eye = ball(head, white, [x, 0.02, 0.294], [0.105, 0.125, 0.05]);
    eyes.push(eye);
    ball(head, dark, [x + 0.015, 0.02, 0.335], [0.05, 0.076, 0.028]);
    ball(head, white, [x + 0.035, 0.055, 0.36], [0.019, 0.025, 0.01]);
    rod(head, hair, [x - 0.09, 0.18, 0.3], [x + 0.075, 0.2, 0.31], 0.027);
  }
  ball(head, skin, [0, -0.08, 0.34], [0.065, 0.065, 0.065]);
  const mouth = ball(
    head,
    mat("#804b40"),
    [0, -0.22, 0.28],
    [0.08, 0.025, 0.025],
  );
  const arms = [],
    legs = [];
  for (const side of [-1, 1]) {
    const arm = new T.Group();
    arm.position.set(side * 0.39, 1.48, 0);
    body.add(arm);
    ball(arm, teal, [side * 0.05, -0.23, 0], [0.15, 0.3, 0.15]);
    ball(arm, skin, [side * 0.06, -0.51, 0.025], [0.12, 0.14, 0.12]);
    arms.push(arm);
    const leg = new T.Group();
    leg.position.set(side * 0.19, 0.82, 0);
    body.add(leg);
    ball(leg, dark, [0, -0.27, 0], [0.15, 0.33, 0.16]);
    ball(leg, rubber, [0, -0.66, 0.1], [0.17, 0.12, 0.25]);
    box(leg, white, [0, -0.74, 0.1], [0.3, 0.055, 0.42]);
    legs.push(leg);
  }
  root.userData = { body, head, arms, legs, eyes, mouth };
  if (humanAsset) animateExplorer(root, 0);
  return root;
}
export function animateExplorer(
  root,
  time,
  speed = 0,
  jump = 0,
  talking = false,
) {
  if (humanAsset && !root.userData.human) {
    const model = cloneSkeleton(humanAsset.scene);
    model.traverse((o) => {
      if (o.isMesh) {
        o.geometry = o.geometry.clone();
        o.material = o.material.clone();
        o.material.userData.sharedMaps = true;
        o.castShadow = true;
        o.receiveShadow = true;
        o.frustumCulled = false;
        if (o.material.name.includes("Visor")) {
          o.material.metalness = 0.5;
          o.material.roughness = 0.22;
        }
      }
    });
    // This authored asset is 1.83 m tall. A fixed physical scale avoids measuring
    // uninitialized cloned skin matrices before the first renderer update.
    model.scale.multiplyScalar(1.15);
    model.updateMatrixWorld(true);
    model.traverse((o) => {
      if (o.isSkinnedMesh) {
        o.skeleton.update();
        o.boundingBox = null;
      }
    });

    root.userData.body.visible = false;
    root.add(model);
    const mixer = new T.AnimationMixer(model),
      actions = {};
    for (const clip of humanAsset.animations)
      actions[clip.name] = mixer.clipAction(clip);
    actions.Idle?.play();
    root.userData.human = {
      model,
      mixer,
      actions,
      current: "Idle",
      last: time,
    };
    const headBone = model.getObjectByName("mixamorigHead");
    if (headBone) root.userData.head = headBone;
    const leftArm = model.getObjectByName("mixamorigLeftArm"),
      rightArm = model.getObjectByName("mixamorigRightArm");
    if (leftArm && rightArm) root.userData.arms = [leftArm, rightArm];
  }
  const human = root.userData.human;
  if (human) {
    const desired = speed > 0.1 ? "Run" : "Idle";
    if (desired !== human.current) {
      human.actions[human.current]?.fadeOut(0.18);
      human.actions[desired]?.reset().fadeIn(0.18).play();
      human.current = desired;
    }
    human.mixer.update(Math.min(0.06, Math.max(0, time - human.last)));
    human.last = time;
    human.model.rotation.x = jump > 0.1 ? -0.12 : 0;
    if (talking) root.userData.head.rotation.y += Math.sin(time * 2) * 0.04;
    const strike = Math.max(
      0,
      1 - (time - (root.userData.strikeStart ?? -100)) / 0.35,
    );
    if (strike > 0)
      root.userData.arms[1].rotation.x -= Math.sin(strike * Math.PI) * 1.1;
    return;
  }
  const { body, head, arms, legs, eyes, mouth } = root.userData;
  const stride = Math.sin(time * 11) * Math.min(speed, 1);
  body.position.y = Math.abs(stride) * 0.06;
  head.rotation.y = Math.sin(time * 0.8) * 0.08;
  arms.forEach((a, i) => (a.rotation.x = (i ? 1 : -1) * stride * 0.7));
  legs.forEach((l, i) => (l.rotation.x = (i ? -1 : 1) * stride * 0.65));
  eyes.forEach((e) => (e.scale.y = 0.125));
  mouth.scale.y = talking ? 0.04 : 0.025;
}

export function setActorRole(root, role) {
  const human = root.userData.human;
  if (!human) return;
  human.model.traverse((o) => {
    if (o.isMesh && !o.material.name.includes("Visor")) {
      o.material.color.set(role === "researcher" ? "#b7b9ad" : "#576067");
      o.material.roughness = 0.85;
    }
  });
}

export function guidebot() {
  const g = new T.Group(),
    paint = mat("#777f7f", 0.72, 0.35),
    metal = mat("#343d43", 0.5, 0.7),
    rubber = mat("#171d20"),
    lens = new T.MeshStandardMaterial({
      color: "#91afad",
      emissive: "#345958",
      emissiveIntensity: 0.6,
      roughness: 0.15,
      metalness: 0.5,
    });
  box(g, metal, [0, 0.24, 0], [0.78, 0.28, 0.75]);
  box(g, paint, [0, 0.83, 0], [0.6, 0.95, 0.45]);
  for (const x of [-0.42, 0.42])
    for (const z of [-0.25, 0.25]) {
      const wheel = mesh(
        g,
        new T.CylinderGeometry(0.23, 0.23, 0.13, 20),
        rubber,
        [x, 0.24, z],
      );
      wheel.rotation.z = Math.PI / 2;
    }
  const head = new T.Group();
  head.position.y = 1.5;
  g.add(head);
  box(head, paint, [0, 0, 0], [0.55, 0.32, 0.4]);
  box(head, rubber, [0, 0, 0.21], [0.45, 0.2, 0.03]);
  const eye = mesh(
    head,
    new T.CylinderGeometry(0.075, 0.075, 0.07, 24),
    lens,
    [0.1, 0, 0.26],
  );
  eye.rotation.x = Math.PI / 2;
  const arms = [];
  for (const x of [-0.36, 0.36]) {
    const arm = new T.Group();
    arm.position.set(x, 1.1, 0);
    g.add(arm);
    rod(arm, metal, [0, 0, 0], [x * 0.3, -0.4, 0.08], 0.045);
    box(arm, metal, [x * 0.3, -0.42, 0.1], [0.14, 0.09, 0.18]);
    arms.push(arm);
  }
  rod(g, metal, [0, 1.64, 0], [0, 1.9, 0], 0.012);
  ball(
    g,
    new T.MeshStandardMaterial({
      color: "#af7852",
      emissive: "#784522",
      emissiveIntensity: 0.6,
    }),
    [0, 1.92, 0],
    [0.035, 0.04, 0.035],
  );
  g.userData = { head, arms };
  return g;
}
export function skitter() {
  const g = new T.Group(),
    ink = mat("#172338", 0.3, 0.35),
    cyan = new T.MeshStandardMaterial({
      color: "#c2b49a",
      emissive: "#8d6841",
      emissiveIntensity: 0.8,
    });
  ball(g, ink, [0, 0.37, 0], [0.43, 0.27, 0.49]);
  ball(g, ink, [0, 0.5, 0.34], [0.3, 0.25, 0.3]);
  for (const x of [-0.13, 0.13])
    ball(g, cyan, [x, 0.55, 0.6], [0.025, 0.03, 0.02]);
  const legs = [];
  for (const s of [-1, 1])
    for (let i = 0; i < 3; i++) {
      const leg = new T.Group();
      leg.position.set(s * 0.23, 0.28, (i - 1) * 0.28);
      g.add(leg);
      rod(leg, ink, [0, 0, 0], [s * 0.42, 0.2, -0.1], 0.055);
      rod(leg, ink, [s * 0.42, 0.2, -0.1], [s * 0.62, -0.23, 0.1], 0.045);
      legs.push(leg);
    }
  g.userData = { legs, phase: 0, stun: 0 };
  return g;
}

export function helicopter() {
  const g = new T.Group(),
    navy = mat("#233b47", 0.45, 0.5),
    glass = new T.MeshPhysicalMaterial({
      color: "#172b38",
      roughness: 0.12,
      metalness: 0.5,
      clearcoat: 1,
      side: T.DoubleSide,
    }),
    brass = mat("#777e7c", 0.3, 0.6),
    black = mat("#18222b");
  ball(g, navy, [0, 1, 0], [1.25, 0.95, 2]);
  ball(g, navy, [0, 0.82, 1.32], [1.05, 0.65, 0.95]);
  function pane(points) {
    const geo = new T.BufferGeometry();
    geo.setAttribute(
      "position",
      new T.Float32BufferAttribute(points.flat(), 3),
    );
    geo.setIndex([0, 1, 2, 0, 2, 3]);
    geo.computeVertexNormals();
    mesh(g, geo, glass);
    for (let i = 0; i < 4; i++)
      rod(g, black, points[i], points[(i + 1) % 4], 0.035);
  }
  pane([
    [-0.94, 1.04, 2],
    [0.94, 1.04, 2],
    [0.7, 1.84, 1.2],
    [-0.7, 1.84, 1.2],
  ]);
  rod(g, black, [0, 1.04, 2.02], [0, 1.84, 1.22], 0.045);
  for (const side of [-1, 1]) {
    pane([
      [side * 1.22, 1, -0.65],
      [side * 1.22, 1, 0.65],
      [side * 0.93, 1.79, 0.75],
      [side * 0.93, 1.79, -0.65],
    ]);
    pane([
      [side * 1.16, 1, 0.73],
      [side * 0.94, 1.04, 2],
      [side * 0.7, 1.84, 1.2],
      [side * 0.93, 1.79, 0.83],
    ]);
    rod(g, brass, [side * 1.24, 0.75, -0.4], [side * 1.24, 0.75, -0.1], 0.035);
    rod(g, black, [side * 1.2, 0.35, -0.8], [side * 1.2, 1.05, -0.8], 0.023);
    ball(g, navy, [side * 0.56, 1.9, -0.4], [0.32, 0.27, 1]);
    const exhaust = mesh(
      g,
      new T.CylinderGeometry(0.17, 0.17, 0.35, 16),
      black,
      [side * 0.56, 1.9, -1.35],
    );
    exhaust.rotation.x = Math.PI / 2;
    ball(
      g,
      new T.MeshStandardMaterial({
        color: side < 0 ? "#944741" : "#7e9e8a",
        emissive: side < 0 ? "#8b2015" : "#367c56",
        emissiveIntensity: 1,
      }),
      [side * 1.22, 1, -0.9],
      [0.06, 0.05, 0.06],
    );
  }
  rod(g, black, [0, 1.75, -1.3], [0, 2.65, -1.8], 0.018);
  rod(g, black, [0, 0.3, 1.3], [0, -0.2, 1.45], 0.02);
  rod(g, navy, [0, 1.2, -1.3], [0, 1.7, -5], 0.22);
  box(g, navy, [0, 2.15, -4.6], [0.12, 1.4, 0.8]);
  for (const x of [-1, 1]) {
    rod(g, black, [x, 0.2, -1], [x, -0.35, -1], 0.07);
    rod(g, black, [x, 0.2, 1], [x, -0.35, 1], 0.07);
    rod(g, brass, [x, -0.4, -1.8], [x, -0.4, 1.9], 0.07);
  }
  rod(g, black, [0, 1.8, 0], [0, 2.7, 0], 0.12);
  const rotor = new T.Group();
  rotor.position.y = 2.7;
  g.add(rotor);
  box(rotor, black, [0, 0, 0], [9, 0.055, 0.18]);
  box(rotor, black, [0, 0, 0], [0.18, 0.055, 9]);
  const tailRotor = new T.Group();
  tailRotor.position.set(0.2, 1.8, -4.8);
  g.add(tailRotor);
  box(tailRotor, black, [0, 0, 0], [0.04, 1.5, 0.1]);
  box(tailRotor, black, [0, 0, 0], [0.04, 0.1, 1.5]);
  g.userData.tailRotor = tailRotor;
  g.userData.rotor = rotor;
  return g;
}
