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
export function traceShot(
  origin,
  yaw,
  enemies,
  colliders,
  range = STUN_RANGE,
  pitch = 0,
) {
  const direction = { x: Math.sin(yaw), z: Math.cos(yaw), y: Math.tan(pitch) };
  let distance = rayWall(origin, direction, range, colliders, origin.y ?? 1.25),
    enemy = null;
  for (const e of enemies) {
    if (e.userData.disabled || e.visible === false) continue;
    const dx = e.position.x - origin.x,
      dz = e.position.z - origin.z;
    const along = dx * direction.x + dz * direction.z;
    const side = dx * direction.z - dz * direction.x;
    const radius = e.userData.hitRadius || 0.44;
    if (along < 0 || Math.abs(side) > radius) continue;
    const entry = Math.max(0, along - Math.sqrt(radius * radius - side * side));
    const height = (origin.y ?? 1.25) + entry * direction.y - e.position.y;
    if (entry < distance && height > 0.15 && height < 2.15) {
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
      y: (origin.y ?? 1.25) + direction.y * distance,
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
    x < -17.25 ||
    x > 17.25 ||
    z < -15.25 ||
    z > 15.25 ||
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

// Local navigation on a 0.6 m grid. Paths are recomputed only when goals change
// or geometry blocks the direct route; cover and projectiles use the same solids.
function free(p, colliders, radius = 0.4) {
  return (
    Math.abs(p.x) < 17.2 &&
    Math.abs(p.z) < 15.2 &&
    !colliders.some(
      (c) =>
        c.h > 0.25 &&
        Math.abs(p.x - c.x) < c.w / 2 + radius &&
        Math.abs(p.z - c.z) < c.d / 2 + radius,
    )
  );
}
export function navigationPath(start, goal, colliders) {
  const step = 0.6,
    node = (p) => [Math.round(p.x / step), Math.round(p.z / step)],
    key = (x, z) => `${x},${z}`;
  const [sx, sz] = node(start),
    [gx, gz] = node(goal),
    queue = [[sx, sz]],
    seen = new Map([[key(sx, sz), null]]);
  let found = null;
  for (let i = 0; i < queue.length && i < 3500; i++) {
    const [x, z] = queue[i];
    if (Math.hypot(x - gx, z - gz) < 1.5) {
      found = [x, z];
      break;
    }
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx,
        nz = z + dz,
        k = key(nx, nz);
      if (!seen.has(k) && free({ x: nx * step, z: nz * step }, colliders)) {
        seen.set(k, [x, z]);
        queue.push([nx, nz]);
      }
    }
  }
  if (!found) return [];
  const path = [];
  let n = found;
  while (n) {
    path.unshift({ x: n[0] * step, z: n[1] * step });
    n = seen.get(key(...n));
  }
  path.shift();
  if (free(goal, colliders)) path.push({ ...goal });
  return path;
}
export function coverPositions(player, origin, colliders) {
  const choices = [];
  for (const c of colliders) {
    if (c.h < 1.4 || c.w > 8 || c.d > 8) continue;
    for (const sign of [-1, 1])
      for (const axis of ["x", "z"]) {
        const other = axis === "x" ? "z" : "x",
          size = axis === "x" ? "w" : "d",
          otherSize = axis === "x" ? "d" : "w";
        for (const edge of [-1, 1]) {
          const hide = { x: c.x, z: c.z },
            peek = { x: c.x, z: c.z };
          hide[axis] += sign * (c[size] / 2 + 0.62);
          hide[other] += edge * Math.max(0, c[otherSize] / 2 - 0.4);
          peek[axis] = hide[axis];
          peek[other] += edge * (c[otherSize] / 2 + 0.8);
          const range = Math.hypot(hide.x - player.x, hide.z - player.z);
          if (
            range < 3 ||
            range > 13 ||
            !free(hide, colliders) ||
            !free(peek, colliders) ||
            clearSight(hide, player, colliders) ||
            !clearSight(peek, player, colliders)
          )
            continue;
          choices.push({
            hide,
            peek,
            score:
              Math.hypot(hide.x - origin.x, hide.z - origin.z) +
              Math.abs(range - 7) * 0.45,
          });
        }
      }
  }
  return choices.sort((a, b) => a.score - b.score);
}
export function updateThreat(
  enemy,
  player,
  dt,
  colliders,
  { noise = null, early = false, escape = false, stairCore = null } = {},
) {
  const s = enemy.userData,
    p = enemy.position;
  const still = { speed: 0, attack: false };
  if (s.disabled) return still;
  s.clock = (s.clock || 0) + dt;
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
    s.cover = null;
    s.path = null;
    return still;
  }
  s.grace = Math.max(0, (s.grace || 0) - dt);
  s.attackCooldown = Math.max(0, (s.attackCooldown || 0) - dt);
  if (
    s.stairGuard &&
    (stairCore?.id !== s.stairGuard || stairCore?.direction !== -1)
  ) {
    s.state = "scanning";
    s.windup = 0;
    return still;
  }
  const distance = Math.hypot(player.x - p.x, player.z - p.z),
    sight = distance < 14 && clearSight(p, player, colliders);
  if (sight) {
    s.alert = 9;
    s.lastKnown = { x: player.x, z: player.z };
  } else {
    s.alert = Math.max(0, (s.alert || 0) - dt);
    if (noise && Math.hypot(noise.x - p.x, noise.z - p.z) < 14) {
      s.alert = 7;
      s.lastKnown = { ...noise };
    }
  }
  const face = () => {
    enemy.rotation.y = Math.atan2(player.x - p.x, player.z - p.z);
  };
  // Lock the aim before firing. A moving explorer can dodge a visible dart.
  if (s.windup > 0) {
    s.state = "aiming";
    s.windup -= dt;
    if (s.windup > 0.35) {
      face();
      s.aim = { x: Math.sin(enemy.rotation.y), z: Math.cos(enemy.rotation.y) };
    }
    if (!sight) {
      s.windup = 0;
      s.attackCooldown = 0.5;
      return still;
    }
    if (s.windup <= 0) {
      s.attackCooldown = early ? 3.5 : escape ? 2.1 : 2.7;
      s.hideUntil = s.clock + 1.4;
      s.state = "retreating";
      return { ...still, shot: { direction: { ...s.aim } } };
    }
    return still;
  }
  if (s.grace) return still;
  const go = (target, speed, state) => {
    if (!target) return still;
    const goalKey = `${target.x.toFixed(1)},${target.z.toFixed(1)}`;
    if (s.goalKey !== goalKey || !s.path || s.clock > (s.repath || 0)) {
      s.goalKey = goalKey;
      s.path = navigationPath(p, target, colliders);
      s.repath = s.clock + 2;
    }
    while (
      s.path.length &&
      Math.hypot(p.x - s.path[0].x, p.z - s.path[0].z) < 0.18
    )
      s.path.shift();
    const next = s.path[0];
    if (!next) return still;
    const dx = next.x - p.x,
      dz = next.z - p.z,
      d = Math.hypot(dx, dz),
      before = { x: p.x, z: p.z };
    moveBody(
      enemy,
      (dx / (d || 1)) * Math.min(d, dt * speed),
      (dz / (d || 1)) * Math.min(d, dt * speed),
      colliders,
    );
    const moved = Math.hypot(p.x - before.x, p.z - before.z);
    s.state = state;
    if (moved > 0.0001)
      enemy.rotation.y = Math.atan2(p.x - before.x, p.z - before.z);
    return { speed: dt ? moved / dt : 0, attack: false };
  };
  if (s.stairGuard) {
    face();
    s.state = "watching";
    if (sight && !s.attackCooldown) {
      s.state = "aiming";
      s.windup = 1.5;
      s.aim = { x: Math.sin(enemy.rotation.y), z: Math.cos(enemy.rotation.y) };
    }
    return still;
  }
  if (s.alert > 0) {
    if (!s.cover || s.clock > (s.coverUntil || 0)) {
      s.cover = coverPositions(s.lastKnown, p, colliders)[0] || null;
      s.coverUntil = s.clock + 8;
      s.hideUntil = s.clock + 0.9;
      s.coverReached = false;
    }
    if (s.cover) {
      const h = s.cover.hide;
      if (!s.coverReached || s.clock < (s.hideUntil || 0)) {
        if (Math.hypot(p.x - h.x, p.z - h.z) > 0.25)
          return go(h, 0.95, "seeking-cover");
        if (!s.coverReached) {
          s.coverReached = true;
          s.hideUntil = s.clock + 1.25;
        }
        s.state = "hiding";
        face();
        return still;
      }
      if (Math.hypot(p.x - s.cover.peek.x, p.z - s.cover.peek.z) > 0.25)
        return go(s.cover.peek, 0.65, "peeking");
    }
    if (sight && !s.attackCooldown && distance > 1) {
      s.state = "aiming";
      s.windup = early ? 1.35 : 1.05;
      face();
      s.aim = { x: Math.sin(enemy.rotation.y), z: Math.cos(enemy.rotation.y) };
      return still;
    }
    if (s.cover) {
      s.state = "hiding";
      face();
      return still;
    }
    if (sight && distance < 3) {
      const away = {
        x: p.x + ((p.x - player.x) / (distance || 1)) * 2,
        z: p.z + ((p.z - player.z) / (distance || 1)) * 2,
      };
      if (free(away, colliders)) return go(away, 0.8, "retreating");
    }
    if (!sight) return go(s.lastKnown, 0.65, "searching");
    s.state = "watching";
    face();
    return still;
  }
  s.cover = null;
  const patrol = s.patrol || [{ x: p.x, z: p.z }];
  s.patrolIndex ||= 0;
  const target = patrol[s.patrolIndex % patrol.length];
  if (s.clock < (s.pauseUntil || 0)) {
    s.state = "scanning";
    return still;
  }
  if (Math.hypot(target.x - p.x, target.z - p.z) < 0.4) {
    s.patrolIndex++;
    s.pauseUntil = s.clock + 2.2;
    s.state = "scanning";
    return still;
  }
  return go(target, 0.48, "creeping");
}

// Swept dart segment: solid walls win if they are encountered before the body.
export function advanceDart(dart, dt, player, colliders) {
  const travel = Math.min(dart.remaining, dt * 12),
    wall = rayWall(dart, dart.direction, travel, colliders, 1.35);
  const dx = player.x - dart.x,
    dz = player.z - dart.z,
    along = dx * dart.direction.x + dz * dart.direction.z,
    side = dx * dart.direction.z - dz * dart.direction.x;
  const yAtBody =
    (dart.y ?? 1.35) + Math.max(0, along) * (dart.direction.y || 0);
  const hit =
    Math.abs(yAtBody - ((player.y || 0) + 1.2)) < 0.7 &&
    along >= -0.3 &&
    along <= wall + 0.3 &&
    Math.abs(side) < 0.34 &&
    clearSight(dart, player, colliders, 1.35);
  dart.x += dart.direction.x * wall;
  dart.z += dart.direction.z * wall;
  dart.remaining -= travel;
  return { hit, done: hit || wall < travel - 0.001 || dart.remaining <= 0 };
}
