import { batchArchitecture } from "./static-geometry.js";
import * as T from "../../vendor/three.module.js";
import { GLTFLoader } from "../../vendor/addons/loaders/GLTFLoader.js";
import { clone as cloneSkeleton } from "../../vendor/addons/utils/SkeletonUtils.js";
import { groundedMaterial } from "./realism.js";
import { RoundedBoxGeometry } from "../../vendor/addons/geometries/RoundedBoxGeometry.js";

export const mat = groundedMaterial;
const humanAssets = {};
export async function loadHumanAsset() {
  const loader = new GLTFLoader();
  const assets = await Promise.all(
    ["explorer", "researcher", "mara", "android", "helicopter"].map((name) =>
      loader.loadAsync(
        new URL(`../../assets/realism/${name}.glb`, import.meta.url).href,
      ),
    ),
  );
  [
    humanAssets.explorer,
    humanAssets.researcher,
    humanAssets.mara,
    humanAssets.android,
    humanAssets.helicopter,
  ] = assets;
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
  if (humanAssets.explorer) animateExplorer(root, 0);
  return root;
}
export function animateExplorer(
  root,
  time,
  speed = 0,
  jump = 0,
  talking = false,
) {
  const humanAsset = humanAssets[root.userData.role || "explorer"];
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
    // Exported at 2.05 m, with the face and toes pointing along local +Z.
    // Keep that basis identical for idle, locomotion, companions and scenes.
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
    const headBone = model.getObjectByName("Bip01_Head");
    if (headBone) root.userData.head = headBone;
    const leftArm = model.getObjectByName("Bip01_L_UpperArm"),
      rightArm = model.getObjectByName("Bip01_R_UpperArm");
    if (leftArm && rightArm) root.userData.arms = [leftArm, rightArm];
  }
  const human = root.userData.human;
  if (human) {
    const walking = root.userData.role === "android" || root.userData.walking;
    const desired =
      speed > (walking ? 0.025 : 0.1) ? (walking ? "Walk" : "Run") : "Idle";
    if (walking && human.actions.Walk)
      human.actions.Walk.timeScale = Math.max(0.25, speed / 1.35);
    if (desired !== human.current) {
      human.actions[human.current]?.fadeOut(0.18);
      human.actions[desired]?.reset().fadeIn(0.18).play();
      human.current = desired;
    }
    if (human.actions.Run)
      human.actions.Run.timeScale = 1.25 * Math.max(0.65, speed);
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
  if (!humanAssets[role] || root.userData.role === role) return;
  const old = root.userData.human;
  if (old) {
    old.mixer.stopAllAction();
    root.remove(old.model);
    old.model.traverse((o) => {
      if (o.isSkinnedMesh) o.skeleton.dispose();
      o.geometry?.dispose();
      o.material?.dispose();
    });
  }
  root.userData.human = null;
  root.userData.role = role;
  animateExplorer(root, 0);
}

// Every animated human asset has the same +Z forward basis.
export function faceMovement(actor, dx, dz) {
  if (Math.hypot(dx, dz) > 1e-8) actor.rotation.y = Math.atan2(dx, dz);
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
// Eight articulated legs, two body segments and small reflective eyes.
// Geometry is built at its actual size; attacks never inflate the creature.
export function skitter() {
  const root = new T.Group(),
    body = new T.Group();
  root.add(body);
  const shell = mat("#514438", 0.82, 0.03),
    joint = mat("#352e28", 0.76),
    marking = mat("#786751", 0.88),
    eye = new T.MeshPhysicalMaterial({
      color: "#171b19",
      roughness: 0.12,
      clearcoat: 1,
    });
  const abdomen = ball(body, shell, [0, 0.68, -0.5], [0.56, 0.44, 0.78]);
  abdomen.rotation.x = -0.12;
  ball(body, joint, [0, 0.58, 0.12], [0.24, 0.23, 0.28]);
  ball(body, shell, [0, 0.6, 0.48], [0.43, 0.3, 0.49]);
  // Subtle dorsal markings, without exposed mouth parts or gore.
  for (let i = 0; i < 4; i++) {
    const m = ball(
      body,
      marking,
      [0, 1.065 - i * 0.018, -0.28 - i * 0.17],
      [0.22 - i * 0.024, 0.012, 0.055],
    );
    m.rotation.x = -0.12;
  }
  for (const side of [-1, 1]) {
    ball(body, eye, [side * 0.12, 0.79, 0.915], [0.04, 0.035, 0.027]);
    for (const x of [0.065, 0.21])
      ball(body, eye, [side * x, 0.675, 0.926], [0.022, 0.021, 0.017]);
    ball(body, eye, [side * 0.305, 0.78, 0.75], [0.025, 0.022, 0.02]);
    const palp = ball(
      body,
      joint,
      [side * 0.18, 0.43, 0.93],
      [0.07, 0.06, 0.17],
    );
    palp.rotation.y = side * 0.2;
  }
  const hairs = [];
  for (let i = 0; i < 140; i++) {
    const angle = i * 2.39996,
      v = (i + 0.5) / 140,
      normal = new T.Vector3(
        Math.cos(angle) * Math.sqrt(1 - v * v),
        v,
        Math.sin(angle) * Math.sqrt(1 - v * v),
      ),
      start = new T.Vector3(
        normal.x * 0.565,
        0.68 + normal.y * 0.445,
        -0.5 + normal.z * 0.78,
      ),
      end = start.clone().addScaledVector(normal, 0.025 + (i % 5) * 0.004);
    hairs.push(...start.toArray(), ...end.toArray());
  }
  const hairGeo = new T.BufferGeometry();
  hairGeo.setAttribute("position", new T.Float32BufferAttribute(hairs, 3));
  body.add(
    new T.LineSegments(
      hairGeo,
      new T.LineBasicMaterial({
        color: "#8b7860",
        transparent: true,
        opacity: 0.38,
      }),
    ),
  );
  const legs = [];
  for (const side of [-1, 1])
    for (let i = 0; i < 4; i++) {
      const hip = new T.Vector3(side * 0.32, 0.59, 0.72 - i * 0.27),
        knee = new T.Vector3(
          side * [0.91, 1.24, 1.28, 1.03][i],
          [1.02, 1.1, 1.04, 0.92][i],
          [1.12, 0.48, -0.44, -1.08][i],
        ),
        foot = new T.Vector3(
          side * [1.4, 1.78, 1.8, 1.48][i],
          0.045,
          [1.6, 0.67, -0.68, -1.65][i],
        );
      const segments = [0.065, 0.045, 0.021].map((radius, j) =>
        mesh(
          root,
          new T.CylinderGeometry(radius * 0.63, radius, 1, 10),
          j === 0 ? shell : joint,
        ),
      );
      const knuckle = ball(root, shell, knee.toArray(), [0.059, 0.059, 0.059]);
      legs.push({
        hip,
        knee,
        foot,
        segments,
        knuckle,
        side,
        index: i,
        phase: ((i + (side > 0 ? 1 : 0)) % 2) * Math.PI,
      });
    }
  root.userData = {
    legs,
    body,
    phase: 0,
    stun: 0,
    gait: 0,
    last: null,
    contactRadius: 0.98,
  };
  animateSkitter(root, 0, 0);
  return root;
}
const segmentUp = new T.Vector3(0, 1, 0);
export function animateSkitter(
  root,
  time,
  speed = 0,
  windup = false,
  stunned = false,
) {
  const data = root.userData;
  if (!data.body || !data.legs?.length) return;
  const dt =
    data.last === null ? 0 : Math.max(0, Math.min(0.1, time - data.last));
  data.last = time;
  data.gait += dt * (speed > 0 ? 4 + speed * 1.9 : 0);
  data.body.position.y = windup ? -0.12 : Math.sin(time * 1.8) * 0.012;
  data.body.rotation.x = windup ? -0.12 : 0;
  for (const leg of data.legs) {
    const phase = data.gait + leg.phase,
      lift = stunned ? 0 : speed > 0 ? Math.max(0, Math.sin(phase)) * 0.19 : 0,
      stride = stunned ? 0 : speed > 0 ? Math.cos(phase) * 0.22 : 0,
      foot = leg.foot.clone(),
      knee = leg.knee.clone(),
      hip = leg.hip.clone();
    foot.y += lift;
    foot.z += stride;
    knee.z += stride * 0.45;
    knee.y += lift * 0.3;
    if (windup) {
      hip.y -= 0.12;
      knee.y -= 0.08;
      if (leg.index === 0) {
        foot.y += 0.38;
        foot.z -= 0.18;
      }
    }
    const ankle = knee.clone().lerp(foot, 0.76);
    ankle.x += leg.side * 0.1;
    const points = [hip, knee, ankle, foot];
    leg.segments.forEach((m, i) => {
      const direction = points[i + 1].clone().sub(points[i]);
      m.position
        .copy(points[i])
        .add(points[i + 1])
        .multiplyScalar(0.5);
      m.scale.y = direction.length();
      m.quaternion.setFromUnitVectors(segmentUp, direction.normalize());
    });
    leg.knuckle.position.copy(knee);
  }
}

export function helicopter() {
  const root = new T.Group(),
    model = humanAssets.helicopter.scene.clone(true);
  root.add(model);
  model.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = !o.material.transparent;
      o.receiveShadow = true;
      o.material.userData.sharedMaps = true;
      if (o.material.name.includes("glass")) {
        o.material = o.material.clone();
        o.material.depthWrite = false;
        o.material.opacity = 0.19;
        o.material.side = T.DoubleSide;
      }
    }
  });
  const rotor = model.getObjectByName("MainRotor") || new T.Group();
  rotor.userData.dynamic = true;
  const tailBlades = model.getObjectByName("ec135_Tblade");
  const tailRotor = new T.Group();
  tailRotor.userData.dynamic = true;
  root.add(tailRotor);
  if (tailBlades) {
    root.updateMatrixWorld(true);
    const center = new T.Box3()
      .setFromObject(tailBlades)
      .getCenter(new T.Vector3());
    tailRotor.position.copy(root.worldToLocal(center));
    tailRotor.updateMatrixWorld(true);
    tailRotor.attach(tailBlades);
  }
  batchArchitecture(model);
  const pilot = explorer();
  pilot.name = "Pilot / visible cockpit crew";
  pilot.userData.human?.model.traverse((o) => {
    if (o.material?.name === "Clothing") o.material.color.set("#485a66");
  });
  pilot.scale.setScalar(0.82);
  pilot.position.set(-0.43, 0.46, 1.67);
  root.add(pilot);
  const trim = mat("#292e2e"),
    fabric = mat("#404742", 0.96);
  for (const x of [-0.43, 0.43]) {
    box(root, fabric, [x, 1.1, 1.57], [0.47, 0.15, 0.53]);
    box(root, fabric, [x, 1.5, 1.28], [0.47, 0.7, 0.15]);
  }
  for (const x of [-0.14, 0.14])
    ball(pilot, trim, [x, 1.93, -0.015], [0.045, 0.07, 0.06]);
  rod(pilot, trim, [-0.14, 1.94, 0], [0, 2.04, 0], 0.018);
  rod(pilot, trim, [0, 2.04, 0], [0.14, 1.94, 0], 0.018);
  rod(pilot, trim, [-0.14, 1.91, 0.02], [-0.06, 1.83, 0.14], 0.012);
  const cockpit = new T.PointLight("#b8d5c4", 2.5, 2.7, 2);
  cockpit.position.set(-0.25, 1.8, 2.15);
  root.add(cockpit);
  const landingLight = new T.SpotLight(
    "#e7ede5",
    45,
    28,
    Math.PI / 5,
    0.6,
    1.5,
  );
  landingLight.position.set(0, 0.95, 2.65);
  landingLight.target.position.set(0, -1, 10);
  root.add(landingLight, landingLight.target);
  const posePilot = () => {
    animateExplorer(pilot, 0);
    poseArm(pilot, "R", [-0.28, 1.08, 0.55], [-0.5, 1.1, 0.1]);
    poseArm(pilot, "L", [0.25, 1.02, 0.45], [0.48, 1.1, 0.1]);
    poseLimb(
      pilot,
      ["Bip01_L_Thigh", "Bip01_L_Calf", "Bip01_L_Foot"],
      [0.14, 0.12, 0.43],
      [0.2, 0.8, 0.65],
    );
    poseLimb(
      pilot,
      ["Bip01_R_Thigh", "Bip01_R_Calf", "Bip01_R_Foot"],
      [-0.14, 0.12, 0.43],
      [-0.2, 0.8, 0.65],
    );
  };
  posePilot();
  root.userData = {
    rotor,
    tailRotor,
    pilot,
    landingLight,
    posePilot,
    rotorSpeed: 30,
  };
  return root;
}

// Manufactured android: articulated ceramic shells, exposed servos and optical sensors.
export function presence() {
  const root = explorer();
  setActorRole(root, "android");
  root.name = "Institute security android";
  root.userData.kind = "presence";
  root.userData.hitRadius = 0.4;
  root.userData.state = "scanning";
  equipStunGun(root);
  const laser = new T.Line(
    new T.BufferGeometry().setFromPoints([
      new T.Vector3(),
      new T.Vector3(0, 0, 7),
    ]),
    new T.LineBasicMaterial({
      color: "#d48952",
      transparent: true,
      opacity: 0.35,
    }),
  );
  root.add(laser);
  root.userData.laser = laser;
  laser.visible = false;
  return root;
}
export function animatePresence(root, time, speed = 0) {
  animateExplorer(root, time, speed);
  const s = root.userData;
  s.aiming = s.state === "aiming";
  if (s.human) {
    s.human.model.rotation.x = s.stun > 0 ? 0.16 : speed > 0.025 ? 0.055 : 0;
    if (s.stun > 0) s.head.rotation.z = 0.18;
  }
  poseCombat(root, time);
  if (s.laser) {
    s.laser.visible = s.aiming && s.stun <= 0;
    s.laser.position
      .copy(s.weapon.gun.position)
      .add(new T.Vector3(0, 0.02, 0.35));
  }
}

// Analytic two-bone arm pose, applied after the native body animation.
// Targets are in actor-local metres and work with any normalized human rig.
function poseArm(root, side, handTarget, bendTarget) {
  poseLimb(
    root,
    [`Bip01_${side}_UpperArm`, `Bip01_${side}_Forearm`, `Bip01_${side}_Hand`],
    handTarget,
    bendTarget,
  );
}
export function poseLimb(root, names, handTarget, bendTarget) {
  const model = root.userData.human?.model;
  if (!model) return;
  const upper = model.getObjectByName(names[0]),
    fore = model.getObjectByName(names[1]),
    hand = model.getObjectByName(names[2]);
  if (!upper || !fore || !hand) return;
  root.updateMatrixWorld(true);
  const a = upper.getWorldPosition(new T.Vector3()),
    b = fore.getWorldPosition(new T.Vector3()),
    c = hand.getWorldPosition(new T.Vector3());
  const goal = root.localToWorld(new T.Vector3(...handTarget)),
    bend = root.localToWorld(new T.Vector3(...bendTarget));
  const l1 = a.distanceTo(b),
    l2 = b.distanceTo(c),
    dir = goal.clone().sub(a),
    d = Math.max(0.01, Math.min(l1 + l2 - 0.005, dir.length()));
  dir.normalize();
  goal.copy(a).addScaledVector(dir, d);
  const projection = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const normal = bend.sub(a).addScaledVector(dir, -bend.dot(dir)).normalize();
  const elbow = a
    .clone()
    .addScaledVector(dir, projection)
    .addScaledVector(
      normal,
      Math.sqrt(Math.max(0, l1 * l1 - projection * projection)),
    );
  function aim(bone, child, target) {
    root.updateMatrixWorld(true);
    const start = bone.getWorldPosition(new T.Vector3()),
      current = child.getWorldPosition(new T.Vector3()).sub(start).normalize(),
      desired = target.clone().sub(start).normalize();
    const delta = new T.Quaternion().setFromUnitVectors(current, desired),
      world = bone.getWorldQuaternion(new T.Quaternion());
    const parent = bone.parent.getWorldQuaternion(new T.Quaternion()).invert();
    bone.quaternion.copy(parent.multiply(delta.multiply(world)));
    root.updateMatrixWorld(true);
  }
  aim(upper, fore, elbow);
  aim(fore, hand, goal);
}
export function equipStunGun(root) {
  const gun = new T.Group();
  gun.name = "Stun pistol";
  const polymer = mat("#20272a", 0.85),
    yellow = mat("#b5a368", 0.7),
    steel = mat("#676f70", 0.35, 0.6);
  box(gun, polymer, [0, 0, 0.13], [0.13, 0.13, 0.32]);
  box(gun, yellow, [0, 0.015, 0.13], [0.136, 0.075, 0.21]);
  const grip = box(gun, polymer, [0, -0.13, 0.035], [0.1, 0.22, 0.12]);
  grip.rotation.x = -0.23;
  box(gun, steel, [0, 0.045, 0.31], [0.1, 0.07, 0.045]);
  for (const x of [-0.033, 0.033])
    rod(gun, steel, [x, 0.02, 0.31], [x, 0.02, 0.35], 0.009);
  box(gun, polymer, [0, -0.09, 0.16], [0.08, 0.025, 0.16]);
  box(gun, polymer, [0, -0.055, 0.22], [0.07, 0.09, 0.02]);
  const muzzle = new T.Object3D();
  muzzle.position.set(0, 0.02, 0.36);
  gun.add(muzzle);
  const flash = ball(
    gun,
    new T.MeshBasicMaterial({
      color: "#d5eeff",
      transparent: true,
      opacity: 0,
    }),
    [0, 0.02, 0.36],
    [0.07, 0.06, 0.13],
  );
  root.add(gun);
  root.userData.weapon = { gun, muzzle, flash };
  return gun;
}
export function poseCombat(root, time) {
  const weapon = root.userData.weapon;
  if (!weapon) return;
  const shove = Math.max(
    0,
    1 - (time - (root.userData.shoveStart ?? -100)) / 0.42,
  );
  const recoil = Math.max(
    0,
    1 - (time - (root.userData.fireStart ?? -100)) / 0.2,
  );
  const human = root.userData.human;
  if (human) {
    // Keep the pistol visible in a low-ready stance; raise to shoulder level
    // while aiming or shooting. Both hands visibly reach towards the target.
    const ready = root.userData.aiming || recoil > 0;
    poseArm(
      root,
      "R",
      [-0.27, ready ? 1.43 : 1.12, (ready ? 0.68 : 0.42) - recoil * 0.07],
      [-0.52, 1.12, 0.1],
    );
    if (ready) poseArm(root, "L", [-0.17, 1.37, 0.58], [0.35, 1.1, 0.1]);
    if (shove > 0) {
      const extend = Math.sin((1 - shove) * Math.PI);
      poseArm(root, "L", [0.16, 1.34, 0.3 + extend * 0.62], [0.45, 1.15, 0.2]);
    }
    const hand = human.model.getObjectByName("Bip01_R_Hand");
    if (hand) {
      root.updateMatrixWorld(true);
      weapon.gun.position.copy(
        root.worldToLocal(hand.getWorldPosition(new T.Vector3())),
      );
    }
  } else weapon.gun.position.set(-0.28, 1.3, 0.5);
  weapon.gun.rotation.set(
    root.userData.aiming ? -(root.userData.aimPitch || 0) : 0.12,
    0,
    0,
  );
  weapon.flash.material.opacity = recoil * 0.9;
}
