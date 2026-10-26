import { clamp, text, rect, person, robot } from '../core/draw.js';

export function createEngine(stage, restored, api) {
  const n = stage.floors.length, floorY = f => 160 + f * stage.floorHeight;
  const validDone = (Array.isArray(restored?.done) ? restored.done : []).filter(id => stage.gates.some(g => g.id === id));
  const done = new Set(validDone);
  const startFloor = Number.isInteger(restored?.floor) ? clamp(restored.floor, 0, n - 1) : 0;
  const player = { x: Number.isFinite(restored?.x) ? clamp(restored.x, 50, stage.width - 50) : 110, floor: startFloor, y: floorY(startFloor), vy: 0, direction: 1, invulnerable: 2 };
  let hearts = [1, 2, 3].includes(restored?.hearts) ? restored.hearts : 3;
  let cameraY = Math.max(0, player.y - 230), cameraX = 0, time = 0, cooldown = 0, transit = null, finished = false;
  const seen = new Set(Array.isArray(restored?.seen) ? restored.seen.filter(f => Number.isInteger(f) && f >= 0 && f < n) : []), bullets = [];
  const enemies = stage.enemies.map((e, i) => ({ ...e, direction: i % 2 ? -1 : 1, stun: 0 }));
  const lifts = stage.lifts.map(l => ({ ...l, y: floorY(l.stops[0]), target: l.stops[0], riding: false }));
  const required = stage.gates.filter(g => !g.optional);
  const allDone = () => required.every(g => done.has(g.id));
  const liftPowered = l => (!l.unlock || done.has(l.unlock)) && (!l.unlockFlag || api.hasFlag(l.unlockFlag));
  const nearbyGate = () => stage.gates.find(g => g.floor === player.floor && Math.abs(g.x - player.x) < 55 && !done.has(g.id));
  const nearestStairs = () => stage.stairs.find(s => Math.abs(s.x - player.x) < 45 && player.floor >= s.from && player.floor <= s.to);
  function hurt() {
    if (player.invulnerable > 0) return;
    hearts--; player.invulnerable = 2.5; player.x = clamp(player.x - player.direction * 40, 50, stage.width - 50);
    if (hearts <= 0) {
      hearts = 3; player.invulnerable = 5;
      player.x = stage.stairs.find(s => player.floor >= s.from && player.floor <= s.to)?.x || 110;
      api.say('A safe landing. Your equipment recovers; every solved panel stays open.');
    }
  }
  function moveFloor(delta) {
    if (transit || lifts.some(l => l.riding)) return;
    const stairs = nearestStairs();
    if (stairs && player.floor + delta >= stairs.from && player.floor + delta <= stairs.to) {
      transit = { target: player.floor + delta, start: player.y, elapsed: 0 };
      player.vy = 0; return;
    }
    const escalator = stage.escalators?.find(e => Math.abs(e.x - player.x) < 40 && (delta === 1 ? e.from === player.floor : e.to === player.floor));
    if (escalator) { transit = { target: delta === 1 ? escalator.to : escalator.from, start: player.y, elapsed: 0 }; player.vy = 0; return; }
    const lift = lifts.find(l => Math.abs(l.x - player.x) < 45 && l.stops.includes(player.floor));
    if (!lift) { api.say('Use ↑ / ↓ at a marked stair landing or lift.'); return; }
    if (!liftPowered(lift)) { api.say('This lift needs power. The marked stairs remain open.'); return; }
    if (Math.abs(lift.y - floorY(player.floor)) > 3) {
      lift.target = player.floor; api.say(`Lift ${lift.id} called. Wait for it, then press ↑ or ↓ to ride.`); return;
    }
    const index = lift.stops.indexOf(player.floor), destination = lift.stops[index + delta];
    if (destination === undefined) { api.say('End of this lift’s route. Try the stairs or another lift.'); return; }
    lift.target = destination; lift.riding = true; player.x = lift.x; player.vy = 0;
  }
  function interact() {
    if (transit || lifts.some(l => l.riding)) return;
    const gate = nearbyGate();
    if (gate) {
      const missing = gate.requires?.find(id => !done.has(id));
      if (missing) { const target = stage.gates.find(g => g.id === missing); api.say(`Restore ${target.label} on Floor ${stage.floors[target.floor]} first.`); return; }
      api.challenge(gate); return;
    }
    if (player.floor === stage.exit.floor && Math.abs(player.x - stage.exit.x) < 65) {
      if (allDone()) { finished = true; api.complete(); }
      else api.say(`${required.filter(g => !done.has(g.id)).length} required panels remain. Consult the objective above the Tower.`);
      return;
    }
    const object = stage.objects?.find(o => o.floor === player.floor && Math.abs(o.x - player.x) < 44);
    if (object) { api.encounter(object); return; }
    api.say('Stand beside a glowing panel or the escape lift, then press E.');
  }
  return {
    update(dt, input) {
      if (finished) return;
      time += dt; cooldown = Math.max(0, cooldown - dt); player.invulnerable = Math.max(0, player.invulnerable - dt);
      if (!seen.has(player.floor)) {
        seen.add(player.floor); if (stage.notes[player.floor]) api.say(stage.notes[player.floor]);
      }
      for (const lift of lifts) {
        const destination = floorY(lift.target), step = Math.sign(destination - lift.y) * Math.min(Math.abs(destination - lift.y), 390 * dt);
        lift.y += step;
        if (lift.riding) {
          player.x = lift.x; player.y = lift.y;
          if (Math.abs(destination - lift.y) < 1) { player.floor = lift.target; lift.riding = false; }
        }
      }
      if (transit) {
        transit.elapsed += dt; const t = Math.min(1, transit.elapsed / .35);
        player.y = transit.start + (floorY(transit.target) - transit.start) * t;
        if (t === 1) { player.floor = transit.target; transit = null; }
      } else if (!lifts.some(l => l.riding)) {
        const direction = Number(input.down('right')) - Number(input.down('left'));
        if (direction) { player.direction = direction; player.x = clamp(player.x + direction * 235 * dt, 45, stage.width - 45); }
        if (input.tap('jump') && player.y >= floorY(player.floor) - 1) player.vy = -385;
        player.vy += 1100 * dt; player.y += player.vy * dt;
        if (player.y >= floorY(player.floor)) { player.y = floorY(player.floor); player.vy = 0; }
        if (input.tap('up')) moveFloor(-1);
        else if (input.tap('down')) moveFloor(1);
        if (input.tap('interact')) { interact(); return; }
        if (input.down('stun') && cooldown === 0) {
          bullets.push({ x: player.x + player.direction * 22, y: player.y - 29, direction: player.direction, floor: player.floor, life: 1 }); cooldown = .32; api.sound('pulse');
        }
        if (input.tap('shove') && cooldown === 0) {
          for (const e of enemies) if (e.floor === player.floor && Math.abs(e.x - player.x) < 70) { e.stun = 5; e.x = clamp(e.x + player.direction * 55, 80, stage.width - 80); }
          cooldown = .45;
        }
      }
      for (const e of enemies) {
        e.stun = api.hasFlag('ventilation') && e.floor >= 14 ? 1 : Math.max(0, e.stun - dt);
        if (!e.stun) {
          e.x += e.direction * e.speed * dt;
          if (e.x > stage.width - 170 || e.x < 350) e.direction *= -1;
          if (!transit && !lifts.some(l => l.riding) && e.floor === player.floor && Math.abs(e.x - player.x) < 26 && floorY(player.floor) - player.y < 32) hurt();
        }
      }
      for (const bullet of bullets) {
        bullet.x += bullet.direction * 700 * dt; bullet.life -= dt;
        for (const e of enemies) if (e.floor === bullet.floor && Math.abs(bullet.x - e.x) < 22 && Math.abs(bullet.y - (floorY(e.floor) - 22)) < 30 && bullet.life > 0) { e.stun = 5; bullet.life = 0; }
      }
      for (let i = bullets.length - 1; i >= 0; i--) if (bullets[i].life <= 0) bullets.splice(i, 1);
      cameraY += (clamp(player.y - 250, 0, floorY(n - 1) - 400) - cameraY) * Math.min(1, dt * 7);
      cameraX += (clamp(player.x - 525, 0, Math.max(0, stage.width - 1050)) - cameraX) * Math.min(1, dt * 7);
    },
    render(ctx, width, height) {
      rect(ctx, 0, 0, width, height, '#0b1722');
      ctx.save(); ctx.translate(-cameraX, -cameraY);
      const first = Math.max(0, Math.floor((cameraY - 160) / stage.floorHeight));
      for (let f = first; f < Math.min(n, first + 7); f++) {
        const y = floorY(f), basement = stage.floors[f].startsWith('B');
        rect(ctx, 35, y - stage.floorHeight + 10, stage.width - 70, stage.floorHeight - 12, basement ? '#17242b' : f % 2 ? '#192a36' : '#1c303c');
        for (let x = 110; x < stage.width - 100; x += 180) {
          rect(ctx, x, y - 115, 68, 67, '#11202d');
          if (!basement) {
            rect(ctx, x + 3, y - 112, 62, 61, '#243c50');
            rect(ctx, x + 32, y - 113, 2, 65, '#536574');
            for (let j = 0; j < 3; j++) rect(ctx, x + 8 + j * 18, y - 65 + (j % 2) * 8, 7, 12, '#53675f');
          } else { rect(ctx, x, y - 101, 68, 5, '#485c60'); rect(ctx, x + 45, y - 115, 5, 67, '#485c60'); }
        }
        rect(ctx, 35, y, stage.width - 70, 9, '#435660'); rect(ctx, 35, y + 9, stage.width - 70, 4, '#09151f');
        text(ctx, stage.floors[f], 53, y - 88, stage.accent, 23);
        text(ctx, basement ? 'RESTRICTED RESEARCH' : f < 3 ? 'EXECUTIVE WING' : f < 10 ? 'MUSEUM & EDUCATION' : 'LABORATORIES', 52, y - 22, '#718e9b', 10);
        for (const stairs of stage.stairs) if (f >= stairs.from && f <= stairs.to) {
          for (let i = 0; i < 5; i++) rect(ctx, stairs.x - 24 + i * 10, y - 8 - i * 9, 12, 8 + i * 9, '#627b83');
          text(ctx, '↑ ↓', stairs.x, y - 66, '#b3c8c6', 15, 'center');
        }
        for (const e of stage.escalators || []) if (f === e.from) {
          for (let i = 0; i < 6; i++) rect(ctx, e.x - 30 + i * 10, y - 4 - i * 6, 12, 4, '#c5aa73');
          text(ctx, 'ESC ↑↓', e.x, y - 54, '#d0b879', 10, 'center');
        }
      }
      for (const lift of lifts) {
        const top = floorY(lift.stops[0]), bottom = floorY(lift.stops.at(-1));
        rect(ctx, lift.x - 42, top - 110, 84, bottom - top + 111, '#0a1721');
        rect(ctx, lift.x - 35, top - 110, 2, bottom - top + 110, '#475e68');
        rect(ctx, lift.x + 33, top - 110, 2, bottom - top + 110, '#475e68');
        for (const f of lift.stops) if (floorY(f) > cameraY - 50 && floorY(f) < cameraY + height + 140) {
          const y = floorY(f); rect(ctx, lift.x - 42, y, 84, 8, '#6b898c');
          text(ctx, `LIFT ${lift.id}`, lift.x, y - 118, '#809ca6', 10, 'center');
          text(ctx, liftPowered(lift) ? '↑ ↓' : 'OFF', lift.x, y - 94, stage.accent, 12, 'center');
        }
        rect(ctx, lift.x - 30, lift.y - 85, 60, 85, '#496269'); rect(ctx, lift.x - 24, lift.y - 79, 48, 73, '#233d48');
        rect(ctx, lift.x - 30, lift.y - 6, 60, 6, stage.accent);
      }
      for (const object of stage.objects || []) {
        const y = floorY(object.floor);
        if (y < cameraY - 30 || y > cameraY + height + 120) continue;
        if (object.id === 'researcher') person(ctx, object.x, y, -1, 0);
        else if (object.id === 'guidebot') robot(ctx, object.x, y, '#e9b970', 0);
        else { rect(ctx, object.x - 13, y - 42, 26, 32, '#566d72'); text(ctx, 'i', object.x, y - 20, '#eee0b1', 19, 'center'); }
        if (Math.abs(object.x - player.x) < 44 && object.floor === player.floor) text(ctx, 'E · Inspect', object.x, y - 76, '#e9b970', 12, 'center');
      }
      for (const f of [13, 20]) {
        const y = floorY(f); if (y < cameraY || y > cameraY + height + 120) continue;
        rect(ctx, stage.width - 42, y - 99, 17, 99, '#0a151e');
        ctx.fillStyle = '#0a151e'; ctx.beginPath(); ctx.arc(stage.width - 34, y - 106, 13, 0, Math.PI * 2); ctx.fill();
      }
      for (const g of stage.gates) {
        const y = floorY(g.floor); if (y < cameraY - 40 || y > cameraY + height + 150) continue;
        const solved = done.has(g.id), color = solved ? '#617b78' : g.optional ? '#d9b574' : stage.accent;
        rect(ctx, g.x - 28, y - 83, 56, 83, '#0e202b');
        ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.strokeRect(g.x - 28, y - 83, 56, 83);
        rect(ctx, g.x - 19, y - 66, 38, 24, '#28464b'); text(ctx, solved ? '✓' : '?', g.x, y - 47, color, 22, 'center');
        text(ctx, g.optional ? 'BONUS' : 'PANEL', g.x, y - 94, color, 10, 'center');
        if (Math.abs(g.x - player.x) < 70 && player.floor === g.floor) text(ctx, solved ? 'OPEN' : 'E · ' + g.label, g.x, y - 113, '#edf1da', 12, 'center');
      }
      const ey = floorY(stage.exit.floor);
      rect(ctx, stage.exit.x - 32, ey - 100, 64, 100, allDone() ? '#346255' : '#2d3a43');
      text(ctx, allDone() ? 'EXIT · E' : 'SEALED', stage.exit.x, ey - 112, allDone() ? stage.accent : '#9aabb3', 13, 'center');
      for (const e of enemies) {
        const y = floorY(e.floor); if (y < cameraY - 50 || y > cameraY + height + 90) continue;
        if (e.kind === 'guidebot') robot(ctx, e.x, y, e.stun ? '#6b777b' : '#e9b970', time);
        else {
          const c = e.stun ? '#66787c' : '#bc8eaa'; rect(ctx, e.x - 14, y - 23, 28, 16, c);
          for (const d of [-1, 1]) for (let i = 0; i < 3; i++) rect(ctx, e.x + d * (12 + i * 5), y - 12 + (i % 2) * 4, 5, 9, c);
          rect(ctx, e.x + e.direction * 6, y - 21, 4, 4, '#f6dba2');
        }
        if (e.stun) text(ctx, 'STUNNED', e.x, y - 45, '#91b8be', 9, 'center');
      }
      for (const b of bullets) rect(ctx, b.x - 7, b.y - 2, 14, 4, '#a4fff1');
      person(ctx, player.x, player.y, player.direction, time * (api.input.down('left') || api.input.down('right') ? 1 : 0), player.invulnerable > 0, player.vy !== 0);
      if (api.hasFlag('researcher-rescued') && !api.hasFlag('researcher-waiting')) person(ctx, player.x - player.direction * 58, player.y, player.direction, time * .5);
      if (done.has('qed') || api.hasFlag('qed')) robot(ctx, player.x - player.direction * 43, player.y - 30, stage.accent, time);
      ctx.restore();
      rect(ctx, width - 17, 22, 4, height - 44, '#344953');
      rect(ctx, width - 19, 22 + player.floor / (n - 1) * (height - 50), 8, 8, stage.accent);
    },
    finishGate(gate) {
      done.add(gate.id); if (gate.reward === 'heal') hearts = 3;
      if (gate.reward === 'battery') api.flag('battery');
      if (gate.reward === 'escape') {
        player.invulnerable = api.hasFlag('battery') ? 12 : 4;
        enemies.push({ floor: 20, x: 80, kind: 'skitter', speed: 95, direction: 1, stun: 0 }, { floor: 19, x: 100, kind: 'skitter', speed: 85, direction: 1, stun: 0 });
      }
      if (gate.reward === 'qed') api.flag('qed');
      api.say(gate.message || 'Panel restored.'); api.sound('solve');
    },
    encounterResult(object, choice) {
      if (Number.isInteger(choice.destination)) { player.floor = choice.destination; player.y = floorY(player.floor); player.vy = 0; }
      if (object.id === 'guidebot' && choice.flag) api.say('“Thank you. Please remain in the museum until your responsible adult arrives.”');
      if (object.id === 'allocation' && choice.flag) {
        api.flag('freight', choice.flag === 'freight'); api.flag('ventilation', choice.flag === 'ventilation');
        api.say(`Allocation stored: ${choice.cost} of 10 units. ${choice.flag === 'freight' ? 'Freight Lift C is online.' : 'Lower-floor patrols are cleared by ventilation.'}`);
      }
      if (object.id === 'researcher' && choice.flag) {
        api.flag('researcher-rescued', choice.flag === 'researcher-rescued'); api.flag('researcher-waiting', choice.flag === 'researcher-waiting');
      }
    },
    status() {
      const target = required.find(g => !done.has(g.id));
      return { place: `FLOOR ${stage.floors[player.floor]}`, hearts, progress: `${required.filter(g => done.has(g.id)).length}/${required.length}`, objective: target ? `${target.label} · Floor ${stage.floors[target.floor]}` : `${stage.exit.label} · Floor ${stage.floors[stage.exit.floor]} · E`, hint: nearbyGate() ? 'E · Open math panel' : '↑ ↓ at stairs / lifts · E at panels · X stun' };
    },
    snapshot() { return { floor: player.floor, x: player.x, hearts, done: [...done], seen: [...seen] }; },
  };
}
