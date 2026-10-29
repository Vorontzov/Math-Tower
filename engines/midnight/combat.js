// Shared, deterministic combat geometry. Coordinates are horizontal metres.
// A shot hits the first body or solid surface along the facing direction.
export const STUN_RANGE = 8;
export const STUN_COOLDOWN = 1.25;
export const SHOVE_RANGE = 1.35;

export function rayWall(origin, direction, limit, colliders, height = 1.25) {
  let nearest = limit;
  for (const c of colliders) {
    if (c.h < height || c.sight === false) continue;
    let lo = 0,
      hi = nearest;
    for (const [axis, size] of [
      ["x", "w"],
      ["z", "d"],
    ]) {
      const min = c[axis] - c[size] / 2,
        max = c[axis] + c[size] / 2;
      if (Math.abs(direction[axis]) < 1e-8) {
        if (origin[axis] < min || origin[axis] > max) {
          hi = -1;
          break;
        }
      } else {
        const a = (min - origin[axis]) / direction[axis];
        const b = (max - origin[axis]) / direction[axis];
        lo = Math.max(lo, Math.min(a, b));
        hi = Math.min(hi, Math.max(a, b));
      }
    }
    if (hi >= lo && lo < nearest) nearest = Math.max(0, lo);
  }
  return nearest;
}
export function clearSight(a, b, colliders, height = 1.25) {
  const distance = Math.hypot(b.x - a.x, b.z - a.z);
  return (
    distance < 1e-6 ||
    rayWall(
      a,
      { x: (b.x - a.x) / distance, z: (b.z - a.z) / distance },
      distance,
      colliders,
      height,
    ) >=
      distance - 0.02
  );
}
export function traceShot(origin, yaw, enemies, colliders, range = STUN_RANGE) {
  const direction = { x: Math.sin(yaw), z: Math.cos(yaw) };
  let distance = rayWall(origin, direction, range, colliders, origin.y ?? 1.25),
    enemy = null;
  for (const e of enemies) {
    if (
      e.userData.disabled ||
      e.visible === false ||
      (origin.y ?? 1.25) > 2.15 ||
      (origin.y ?? 1.25) < 0.15
    )
      continue;
    const dx = e.position.x - origin.x,
      dz = e.position.z - origin.z;
    const along = dx * direction.x + dz * direction.z;
    const side = dx * direction.z - dz * direction.x;
    const radius = e.userData.hitRadius || 0.44;
    if (along < 0 || Math.abs(side) > radius) continue;
    const entry = Math.max(0, along - Math.sqrt(radius * radius - side * side));
    if (entry < distance) {
      distance = entry;
      enemy = e;
    }
  }
  return {
    enemy,
    distance,
    direction,
    end: {
      x: origin.x + direction.x * distance,
      z: origin.z + direction.z * distance,
    },
  };
}
export function shoveTarget(origin, yaw, enemies, colliders) {
  const forward = { x: Math.sin(yaw), z: Math.cos(yaw) };
  return (
    enemies
      .filter((e) => !e.userData.disabled && e.visible !== false)
      .map((e) => ({
        e,
        dx: e.position.x - origin.x,
        dz: e.position.z - origin.z,
        d: Math.hypot(e.position.x - origin.x, e.position.z - origin.z),
      }))
      .filter(
        (v) =>
          v.d <= SHOVE_RANGE &&
          v.d > 0.01 &&
          (v.dx * forward.x + v.dz * forward.z) / v.d > 0.65 &&
          clearSight(origin, v.e.position, colliders),
      )
      .sort((a, b) => a.d - b.d)[0]?.e || null
  );
}
export function moveBody(body, dx, dz, colliders, radius = 0.32) {
  const p = body.position;
  const blocked = (x, z) =>
    x < -13.1 ||
    x > 13.1 ||
    z < -10.5 ||
    z > 10.5 ||
    colliders.some(
      (c) =>
        c.h > 0.25 &&
        Math.abs(x - c.x) < c.w / 2 + radius &&
        Math.abs(z - c.z) < c.d / 2 + radius,
    );
  // Small steps keep fast rushes and shove impulses out of thin walls.
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.12));
  for (let i = 0; i < steps; i++) {
    if (!blocked(p.x + dx / steps, p.z)) p.x += dx / steps;
    if (!blocked(p.x, p.z + dz / steps)) p.z += dz / steps;
  }
}

export function updateThreat(
  enemy,
  player,
  dt,
  colliders,
  { noise = null, early = false, escape = false } = {},
) {
  const s = enemy.userData,
    p = enemy.position;
  if (s.disabled) return { speed: 0, attack: false };
  if (s.knockback) {
    moveBody(enemy, s.knockback.x * dt, s.knockback.z * dt, colliders);
    const drag = Math.exp(-8 * dt);
    s.knockback.x *= drag;
    s.knockback.z *= drag;
  }
  s.stun = Math.max(0, (s.stun || 0) - dt);
  if (s.stun > 0) {
    s.state = "stunned";
    s.windup = 0;
    return { speed: 0, attack: false };
  }
  s.grace = Math.max(0, (s.grace || 0) - dt);
  const distance = Math.hypot(player.x - p.x, player.z - p.z);
  const sight =
    distance < (early ? 10 : 12) && clearSight(p, player, colliders);
  if (sight) {
    s.alert = 5;
    s.lastKnown = { x: player.x, z: player.z };
  } else {
    s.alert = Math.max(0, (s.alert || 0) - dt);
    if (noise && Math.hypot(noise.x - p.x, noise.z - p.z) < 12) {
      s.alert = 4;
      s.lastKnown = { ...noise };
    }
  }
  s.attackCooldown = Math.max(0, (s.attackCooldown || 0) - dt);
  if (s.windup > 0) {
    s.state = "winding";
    s.windup -= dt;
    if (s.windup <= 0) {
      s.rush = 0.32;
      s.state = "rushing";
      s.attackCooldown = early ? 2.4 : 1.8;
    }
    return { speed: 0, attack: false };
  }
  if (s.rush > 0) {
    s.rush -= dt;
    s.state = "rushing";
    moveBody(enemy, s.charge.x * dt * 4.5, s.charge.z * dt * 4.5, colliders);
    const contact =
      Math.hypot(player.x - p.x, player.z - p.z) < 0.9 && player.y < 0.65;
    if (contact) {
      s.rush = 0;
      return { speed: 1, attack: true };
    }
    return { speed: 1, attack: false };
  }
  if (sight && distance < 2.1 && !s.grace && !s.attackCooldown) {
    s.windup = early ? 1.05 : 0.75;
    s.charge = {
      x: (player.x - p.x) / (distance || 1),
      z: (player.z - p.z) / (distance || 1),
    };
    s.state = "winding";
    enemy.rotation.y = Math.atan2(s.charge.x, s.charge.z);
    return { speed: 0, attack: false };
  }
  const patrol = s.patrol || [{ x: p.x, z: p.z }];
  s.patrolIndex ||= 0;
  const target =
    s.alert > 0 && s.lastKnown
      ? s.lastKnown
      : patrol[s.patrolIndex % patrol.length];
  const dx = target.x - p.x,
    dz = target.z - p.z,
    d = Math.hypot(dx, dz);
  if (d < 0.45) {
    if (s.alert <= 0) s.patrolIndex++;
    return { speed: 0, attack: false };
  }
  const speed = s.grace
    ? 0
    : s.alert > 0
      ? escape
        ? 2
        : early
          ? 1.15
          : 1.6
      : 0.65;
  const before = { x: p.x, z: p.z };
  moveBody(enemy, (dx / d) * dt * speed, (dz / d) * dt * speed, colliders);
  const moved = Math.hypot(p.x - before.x, p.z - before.z);
  if (moved > 0.0001)
    enemy.rotation.y = Math.atan2(p.x - before.x, p.z - before.z);
  s.state = s.alert > 0 ? "pursuing" : "patrolling";
  return { speed: dt ? moved / dt / 3 : 0, attack: false };
}
