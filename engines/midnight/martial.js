import * as T from "../../vendor/three.module.js";
import { poseLimb } from "./actors.js";
import { clearSight, moveBody } from "./combat.js";
// A deliberately theatrical, non-graphic repertoire. These are game animations,
// not instructional demonstrations. Every entry has a distinct pose sequence.
export const TECHNIQUES = Object.freeze([
  {
    name: "Kung fu · crane counter",
    style: "crane",
    line: "Apparently the crane is not in the employee handbook.",
  },
  {
    name: "Boxing · three-piece combination",
    style: "boxing",
    line: "Left. Right. Technical support.",
  },
  {
    name: "Karate · spinning back kick",
    style: "backkick",
    line: "Please restart your security department.",
  },
  {
    name: "Capoeira · crescent wheel",
    style: "wheel",
    line: "The orientation seminar did not cover this.",
  },
  {
    name: "Jiu-jitsu · shoulder throw",
    style: "throw",
    line: "Your access request has been redirected.",
  },
  {
    name: "Muay Thai · rising knee",
    style: "knee",
    line: "A brief meeting with the knee department.",
  },
  {
    name: "Sambo · leg reap",
    style: "reap",
    line: "A small adjustment to your balance sheet.",
  },
  {
    name: "Pencak silat · low spiral sweep",
    style: "sweep",
    line: "The floor would like a word.",
  },
  {
    name: "Kung fu · butterfly kick",
    style: "butterfly",
    line: "One moment. I have always wanted to try that.",
  },
  {
    name: "Karate · leaping side kick",
    style: "sidekick",
    line: "Express delivery. Signature unnecessary.",
  },
  {
    name: "Boxing · slip and uppercut",
    style: "uppercut",
    line: "Have you tried turning it off and lying down?",
  },
  {
    name: "Capoeira · turning heel",
    style: "heel",
    line: "An entirely unnecessary flourish. Worth it.",
  },
]);
export function nextTechnique(index, seed = 0) {
  return TECHNIQUES[((index || 0) + Math.abs(seed | 0)) % TECHNIQUES.length];
}
export function martialTarget(player, yaw, enemies, colliders) {
  return (
    enemies
      .filter((e) => !e.userData.disabled && e.visible !== false)
      .map((e) => {
        const dx = e.position.x - player.x,
          dz = e.position.z - player.z,
          d = Math.hypot(dx, dz);
        return {
          e,
          d,
          dot: (dx * Math.sin(yaw) + dz * Math.cos(yaw)) / (d || 1),
        };
      })
      .filter(
        (v) =>
          v.d < 1.85 &&
          v.d > 0.05 &&
          v.dot > 0.42 &&
          Math.abs(v.e.position.y - player.y) < 0.55 &&
          clearSight(player, v.e.position, colliders),
      )
      .sort((a, b) => a.d - b.d)[0]?.e || null
  );
}
const arm = (root, side, target, bend) =>
  poseLimb(
    root,
    [`Bip01_${side}_UpperArm`, `Bip01_${side}_Forearm`, `Bip01_${side}_Hand`],
    target,
    bend,
  );
const leg = (root, side, target, bend) =>
  poseLimb(
    root,
    [`Bip01_${side}_Thigh`, `Bip01_${side}_Calf`, `Bip01_${side}_Foot`],
    target,
    bend,
  );
export function poseTechnique(root, move, time) {
  const f = T.MathUtils.clamp((time - move.start) / 1.15, 0, 1),
    strike = Math.sin(f * Math.PI),
    snap = Math.pow(Math.sin(f * Math.PI), 2),
    m = root.userData.human?.model;
  if (!m) return;
  const style = move.technique.style;
  m.rotation.set(0, 0, 0);
  m.position.set(0, 0, 0);
  arm(root, "R", [-0.25, 1.5, 0.38], [-0.48, 1.35, 0.1]);
  arm(root, "L", [0.25, 1.5, 0.38], [0.48, 1.35, 0.1]);
  if (style === "boxing" || style === "uppercut") {
    const hit =
      style === "boxing" ? Math.max(0, Math.sin(f * Math.PI * 5)) : snap;
    m.rotation.y = Math.sin(f * Math.PI * 4) * 0.13;
    arm(
      root,
      "R",
      [
        -0.18,
        style === "uppercut" ? 1.0 + snap * 0.55 : 1.47,
        0.3 + hit * 0.62,
      ],
      [-0.5, 1.22, 0.3],
    );
    arm(
      root,
      "L",
      [
        0.18,
        1.43,
        0.3 +
          (style === "boxing"
            ? Math.max(0, -Math.sin(f * Math.PI * 5)) * 0.55
            : 0),
      ],
      [0.5, 1.2, 0.3],
    );
  } else if (style === "throw" || style === "reap") {
    m.rotation.y = snap * 0.65;
    m.rotation.x = snap * 0.25;
    m.position.y = -snap * 0.12;
    arm(
      root,
      "R",
      [-0.2, 1.35 + snap * 0.25, 0.4 + strike * 0.2],
      [-0.6, 1.1, 0.2],
    );
    arm(root, "L", [0.18, 1.3 + snap * 0.3, 0.5], [0.6, 1.1, 0.1]);
    leg(
      root,
      "R",
      [-0.2 - snap * 0.32, 0.1, 0.05 + snap * 0.75],
      [-0.3, 0.65, 0.4],
    );
  } else if (style === "sweep") {
    m.position.y = -snap * 0.48;
    m.rotation.y = f * Math.PI * 2;
    m.rotation.x = snap * 0.2;
    leg(root, "R", [-0.3 - snap * 0.5, 0.16, snap * 0.95], [-0.4, 0.5, 0.4]);
    arm(root, "L", [0.5, 0.6, 0.3], [0.45, 1.1, 0.2]);
  } else if (style === "wheel" || style === "butterfly") {
    m.position.y = strike * (style === "wheel" ? 0.55 : 0.65);
    m.rotation.z = (style === "wheel" ? 1 : -1) * Math.sin(f * Math.PI) * 1.25;
    m.rotation.y = f * Math.PI * 2;
    leg(
      root,
      "R",
      [-0.3 - snap * 0.65, 0.4 + snap * 0.65, 0.2 + snap * 0.7],
      [-0.4, 0.7, 0.6],
    );
    leg(
      root,
      "L",
      [0.25 + snap * 0.55, 0.15 + snap * 0.6, -snap * 0.65],
      [0.3, 0.7, -0.4],
    );
    arm(root, "L", [0.55, 0.6, 0.2], [0.5, 1.2, 0.1]);
    arm(root, "R", [-0.7, 1.7, 0], [-0.6, 1.4, 0]);
  } else if (style === "knee") {
    leg(
      root,
      "R",
      [-0.2, 0.25 + snap * 0.5, 0.2 + snap * 0.55],
      [-0.2, 1.25, 0.7],
    );
    arm(root, "L", [0.2, 1.5, 0.6], [0.5, 1.3, 0.2]);
    arm(root, "R", [-0.2, 1.5, 0.6], [-0.5, 1.3, 0.2]);
  } else {
    const spin = ["backkick", "heel"].includes(style);
    m.rotation.y = spin ? f * Math.PI * 2 : 0;
    m.position.y = style === "sidekick" ? strike * 0.36 : 0;
    m.rotation.x = -snap * 0.18;
    const height = style === "crane" ? 1.15 : style === "heel" ? 1.6 : 1.3;
    leg(
      root,
      "R",
      [
        -0.18 + snap * (style === "sidekick" ? -0.4 : 0),
        0.12 + snap * height,
        0.05 + snap * 1.05,
      ],
      [-0.28, 0.85, 0.7],
    );
    if (style === "crane") {
      arm(root, "L", [0.7, 1.8, 0.15], [0.5, 1.6, 0]);
      arm(root, "R", [-0.7, 1.8, 0.15], [-0.5, 1.6, 0]);
    }
  }
  if (root.userData.weapon) root.userData.weapon.gun.visible = false;
}
export function animateKnockout(enemy, time, colliders) {
  const s = enemy.userData;
  if (s.knockedAt === undefined) return;
  const f = T.MathUtils.clamp((time - s.knockedAt) / 0.7, 0, 1),
    model = s.human?.model;
  if (!model) return;
  if (f < 1 && s.fallDirection)
    moveBody(
      enemy,
      s.fallDirection.x * 0.018,
      s.fallDirection.z * 0.018,
      colliders,
    );
  const lift = s.throwDown ? Math.sin(f * Math.PI) * 0.5 : 0;
  model.rotation.x = (-Math.PI / 2) * T.MathUtils.smoothstep(f, 0, 1);
  model.rotation.z = s.throwDown ? Math.sin(f * Math.PI) * 0.4 : 0;
  model.position.y = 0.18 * f + lift;
  if (s.weapon) s.weapon.gun.visible = false;
  if (s.laser) s.laser.visible = false;
}
