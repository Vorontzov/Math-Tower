import * as T from "../../vendor/three.module.js";
import { createWorld } from "./world.js";
import { buildRoom, buildCampus } from "./rooms.js";
import {
  animateExplorer,
  animatePresence,
  equipStunGun,
  poseCombat,
  faceMovement,
  explorer,
  box,
  mat,
  loadHumanAsset,
  setActorRole,
} from "./actors.js";
import { groundLighting } from "./realism.js";
import { createSound } from "./audio.js";
import { midnightTower as adventure } from "../../towers/tower-0001.js";
import { getProblem } from "../../math/bank.js";
import { progressFor, submit } from "../../math/guided-solutions.js";
import {
  SAVE_KEY,
  freshState,
  restoreState,
  currentGate,
  travelBlock,
  travel,
  activate,
  required,
  secureFloor,
  canEscape,
} from "./state.js";

import {
  traceShot,
  shoveTarget,
  updateThreat,
  moveBody,
  STUN_RANGE,
  STUN_COOLDOWN,
  rayWall,
} from "./combat.js";

const $ = (id) => document.getElementById(id),
  keys = new Set(),
  sound = createSound();
let world;
try {
  $("begin").disabled = true;
  $("begin").textContent = "Preparing the institute…";
  await loadHumanAsset();
  world = createWorld($("world"));
  await groundLighting(world);
  $("begin").disabled = false;
  $("begin").textContent = "Begin the investigation →";
} catch (error) {
  $("error").hidden = false;
  $("error-copy").textContent =
    "This 3D adventure needs WebGL. Try an up-to-date browser with graphics acceleration enabled. " +
    error.message;
}
if (world) start();

function start() {
  let save = readSave(),
    mode = "title",
    room = null,
    film = null,
    ride = null,
    campus = null,
    companion = null;
  let time = 0,
    last = performance.now(),
    saveClock = 0,
    toastClock = 0,
    vy = 0,
    protection = 0,
    shotCooldown = 0,
    shoveCooldown = 0,
    companionCooldown = 0,
    shotTime = 0,
    noise = null,
    priorMode = "play",
    question = null,
    progress = null,
    activeGate = null;
  let reduced = matchMedia("(prefers-reduced-motion: reduce)").matches,
    voice = false;
  const cameraTarget = new T.Vector3(),
    lookTarget = new T.Vector3(),
    look = new T.Vector3(0, 2, 0);
  equipStunGun(world.player);
  const shotLine = new T.Line(
    new T.BufferGeometry().setFromPoints([new T.Vector3(), new T.Vector3()]),
    new T.LineBasicMaterial({
      color: "#d6edee",
      transparent: true,
      opacity: 0,
    }),
  );
  const aimLine = new T.Line(
    new T.BufferGeometry().setFromPoints([new T.Vector3(), new T.Vector3()]),
    new T.LineBasicMaterial({
      color: "#a7c1b5",
      transparent: true,
      opacity: 0.36,
    }),
  );
  const aimMark = new T.Mesh(
    new T.RingGeometry(0.12, 0.17, 24),
    new T.MeshBasicMaterial({
      color: "#adc9b9",
      side: T.DoubleSide,
      transparent: true,
      opacity: 0.75,
    }),
  );
  aimMark.rotation.x = -Math.PI / 2;
  world.scene.add(shotLine, aimLine, aimMark);
  room = buildRoom(world, 1, freshState(1));
  world.player.position.set(4, 0, 5);
  world.player.rotation.y = 0.6;
  $("reduced-motion").checked = reduced;
  $("continue").hidden = !save;
  $("continue").textContent = save?.complete
    ? "View your completed expedition"
    : "Continue expedition";
  function readSave() {
    try {
      return restoreState(JSON.parse(localStorage.getItem(SAVE_KEY)));
    } catch {
      return null;
    }
  }
  function persist() {
    if (!save) return;
    if (mode !== "title" && !film?.replay && !campus) {
      const p =
        film?.originalPosition ||
        ride?.originalPosition ||
        world.player.position;
      save.position = { x: p.x, z: p.z };
    }
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(save));
      $("save-warning").textContent = "";
    } catch {
      $("save-warning").textContent =
        "Browser storage is unavailable. This expedition remains playable, but progress lasts only for this session.";
    }
  }
  function toast(text) {
    $("toast").textContent = text;
    toastClock = 5;
    $("toast").style.opacity = 1;
  }
  function setMode(value) {
    mode = value;
    keys.clear();
    aimLine.visible = aimMark.visible = value === "play";
    shotLine.visible = value === "play";
    $("title-screen").hidden = value !== "title";
    $("hud").hidden = !["play", "math", "pause", "choice"].includes(value);
    $("cinema").hidden = !["film", "travel"].includes(value);
    $("skip").hidden = value === "travel";
    $("touch").hidden = value !== "play";
    $("prompt").hidden = true;
  }
  const floorName = (i) =>
    adventure.floors[i].startsWith("B")
      ? adventure.floors[i]
      : "Floor " + adventure.floors[i];
  function objective() {
    if (save.escape)
      return save.floor === 17
        ? "The campus doors are open. Escape through the lobby."
        : "Return to the lobby on Floor 1. Use stairs or restored freight power.";
    if (save.floor === 0 && !save.solved.includes("roof"))
      return "Someone is on the roof. Reach the access terminal and get inside.";
    if (save.floor === 1 && !save.flags.receptionSecured)
      return "Reach the security desk. Seal the roof stairwell and recover the emergency badge.";
    if (save.floor === 2 && !save.flags.routeReleased)
      return "Avoid the patrols. Use the badge on the emergency release beside the east corridor.";
    if (room.def.requiredCollect && save.collected.length < 3)
      return "Recover the three recorder cartridges. Face the pursuers before firing.";
    const gate = currentGate(save);
    if (gate) return "Restore " + gate.label.toLowerCase() + ".";
    if (
      save.floor === 15 &&
      !save.flags.researcher &&
      !save.flags.researcherWaiting
    )
      return "Speak to the researcher, then continue toward B3.";
    return (
      "Explore, then find the stairs down to " +
      floorName(Math.min(20, save.floor + 1)) +
      "."
    );
  }
  function updateHud() {
    if (!save) return;
    $("location").textContent =
      floorName(save.floor) + " · " + adventure.rooms[save.floor].name;
    $("hearts").textContent = Array.from({ length: 3 }, (_, i) =>
      i < save.health ? "◆" : "◇",
    ).join(" ");
    $("hearts").setAttribute("aria-label", `${save.health} of 3 hearts`);
    $("gate-progress").textContent =
      `${required.filter((g) => save.solved.includes(g.id)).length} / 9 systems`;
    $("inventory").textContent = [
      save.collected.length ? `${save.collected.length}/3 fragments` : "",
      save.flags.battery ? "Battery shield" : "",
      save.flags.receptionSecured ? "Emergency badge" : "",
      save.flags.researcher ? "Researcher with you" : "",
    ]
      .filter(Boolean)
      .join(" · ");
    $("objective").textContent = objective();
  }
  function disposeCompanion() {
    if (!companion) return;
    world.scene.remove(companion);
    companion.traverse((o) => {
      if (o.isSkinnedMesh) o.skeleton.dispose();
      o.geometry?.dispose();
      o.material?.dispose();
    });
    companion = null;
  }
  function loadFloor(index, position = null) {
    room?.dispose();
    campus?.dispose();
    campus = null;
    disposeCompanion();
    room = buildRoom(world, index, save);
    sound.setRoom(index === 0 ? "roof" : "museum");
    world.player.visible = true;
    world.player.position.set(
      position?.x ?? (index === 0 ? -6 : -8),
      0,
      position?.z ?? (index === 0 ? 4 : 7),
    );
    // New structural walls may overlap a position saved in an older layout.
    if (blocked(world.player.position.x, world.player.position.z, 0))
      world.player.position.set(index === 0 ? -6 : -8, 0, index === 0 ? 4 : 7);
    world.player.rotation.y = 0.6;
    vy = 0;
    shotTime = 0;
    noise = null;
    shotLine.material.opacity = 0;
    protection = save.flags.battery && save.escape ? 8 : 2.5;
    if (save.flags.researcher && index !== 15) {
      companion = explorer();
      setActorRole(companion, "researcher");
      companion.scale.setScalar(1.08);
      companion.userData.body.children[0].material = mat("#d8d0b6");
      companion.position
        .copy(world.player.position)
        .add(new T.Vector3(-1.3, 0, 1));
      world.scene.add(companion);
    }
    if (index === 0)
      world.roofDoors.forEach(
        (d) => (d.leaf.position.y = save.solved.includes("roof") ? 3.65 : 1.2),
      );
    updateHud();
  }
  function offerEntry() {
    const name = adventure.rooms[save.floor].entry;
    if (name && !save.seen.includes(name)) runFilm(name);
    else {
      setMode("play");
      $("world").focus();
    }
  }
  function launch(resume = false) {
    sound.start();
    save =
      resume && save
        ? save
        : freshState(
            crypto.getRandomValues(new Uint32Array(1))[0],
            $("bank").value,
          );
    $("bank").value = save.bankId;
    loadFloor(save.floor, save.position);
    if (save.complete) {
      showComplete();
      return;
    }
    setMode("play");
    persist();
    if (save.pendingFilm) runFilm(save.pendingFilm);
    else offerEntry();
  }
  $("begin").onclick = () => {
    if (save && !save.complete)
      choice(
        "A new expedition",
        "This replaces your current complete-Tower save. Your earlier opening-study save is kept separately.",
        [
          { label: "Start a new expedition", action: () => launch(false) },
          { label: "Continue current expedition", action: () => launch(true) },
        ],
        true,
      );
    else launch(false);
  };
  $("continue").onclick = () => launch(true);
  function toggleVoice() {
    voice = sound.toggleVoice();
    $("voice").textContent = voice ? "Voice on" : "Voice off";
    $("voice").setAttribute("aria-pressed", String(voice));
    $("spoken-start").checked = voice;
  }
  $("voice").onclick = toggleVoice;
  $("spoken-start").onchange = () => {
    if ($("spoken-start").checked !== voice) toggleVoice();
  };
  $("sound").onclick = () => {
    const on = sound.toggle();
    $("sound").textContent = on ? "Sound on" : "Sound off";
    $("sound").setAttribute("aria-pressed", String(on));
  };

  const filmFloors = {
    arrival: 0,
    welcome: 1,
    number: 2,
    skitters: 4,
    power: 6,
    impossible: 12,
    watcher: 13,
    researcher: 15,
    dent: 16,
    lobby: 17,
    recording: 19,
    breach: 20,
    escape: 20,
    ending: 17,
    rescue: 15,
    waiting: 15,
    freed: 9,
  };
  function runFilm(name, replay = false) {
    if (!adventure.films[name]) return;
    const originalPosition = world.player.position.clone();
    if (replay) loadFloor(filmFloors[name] ?? save.floor);
    film = {
      name,
      replay,
      shots: adventure.films[name],
      index: 0,
      elapsed: 0,
      announced: -1,
      originalPosition,
    };
    if (!replay) {
      save.pendingFilm = name;
      persist();
    }
    setMode("film");
    sound.silence();
    $("world").focus();
    if (["welcome", "skitters", "freed"].includes(name))
      world.player.position.set(-1.5, 0, 4);
    if (["researcher", "rescue", "waiting"].includes(name))
      world.player.position.set(-1, 0, 3.7);
    if (name === "dent") world.player.position.set(0, 0, 1.7);
    if (name === "ending") {
      campus = buildCampus(world);
      room.root.visible = false;
      world.player.position.set(0, 0, 1);
      if (companion) companion.position.set(-2, 0, 2);
    }
  }
  function finishFilm() {
    if (!film) return;
    const { name, replay, originalPosition } = film;
    film = null;
    sound.silence();
    world.player.visible = true;
    world.heli.position.y = 0.5;
    world.heli.rotation.z = 0;
    world.heli.userData.damaged = true;
    world.facadeLight.emissiveIntensity = 0.05;
    world.renderer.toneMappingExposure = 1.08;
    if (replay) {
      loadFloor(save.floor, save.position);
      if (save.complete) showComplete();
      else {
        setMode("play");
        $("world").focus();
      }
      return;
    }
    if (!save.seen.includes(name)) save.seen.push(name);
    save.pendingFilm = null;
    if (name === "ending") {
      save.complete = true;
      persist();
      showComplete();
      return;
    }
    world.player.position.copy(originalPosition);
    room.enemies.forEach((e) => {
      e.visible = !e.userData.disabled;
      if (e.userData.home)
        e.position.set(e.userData.home.x, 0, e.userData.home.z);
    });
    room.features.memoryActors?.forEach((p) => (p.visible = false));
    if (room.features.watcher && save.floor === 13)
      room.features.watcher.visible = false;
    if (room.features.extraNumber) room.features.extraNumber.visible = false;
    if (room.features.number) room.features.number.visible = true;
    if (room.features.robot)
      room.features.robot.rotation.z = name === "welcome" ? -0.35 : 0;
    setMode("play");
    updateHud();
    persist();
    $("world").focus();
    if (name === "arrival")
      toast(
        "Face the figure and press X to fire. Q turns around. Reach the door terminal; math pauses danger.",
      );
    if (name === "skitters")
      toast(
        "Recover the three recorders. X fires ahead; Q turns around; C pushes an opponent in arm’s reach.",
      );
    if (name === "escape")
      toast(
        save.flags.battery
          ? "Your emergency battery is shielding you. Get back to the lobby!"
          : "The seals are open. Return through B2 and B1 to the lobby!",
      );
  }
  $("skip").onclick = finishFilm;
  function filmFrame(dt) {
    const shot = film.shots[film.index];
    if (film.announced !== film.index) {
      film.announced = film.index;
      $("speaker").textContent = shot.speaker;
      $("line").textContent = shot.line;
      sound.say(shot.line, shot.speaker);
      if (
        ["dent", "alarm", "swarm", "blackout", "landing"].includes(shot.action)
      )
        sound.tone("hurt");
    }
    film.elapsed += dt;
    const duration = Math.max(
        shot.seconds,
        shot.line.trim().split(/\s+/).filter(Boolean).length * 0.43 + 0.6,
      ),
      f = T.MathUtils.smoothstep(film.elapsed / duration, 0, 1);
    cameraTarget.fromArray(shot.camera);
    if (!reduced) cameraTarget.lerp(new T.Vector3(...shot.end), f);
    world.camera.position.copy(cameraTarget);
    look.fromArray(shot.target);
    world.camera.lookAt(look);
    world.player.visible = !["landing", "approach", "blackout"].includes(
      shot.action,
    );
    animateExplorer(world.player, time, 0, 0, shot.speaker === "THE EXPLORER");
    const features = room.features;
    poseCombat(world.player, time);
    world.renderer.toneMappingExposure =
      shot.action === "blackout" ? 0.35 : 1.08;
    if (film.name === "arrival") {
      const threat = room.enemies[0];
      if (threat) {
        threat.visible = ["roof-threat", "equip", "handoff"].includes(
          shot.action,
        );
        animatePresence(threat, time, 0.15);
        threat.rotation.y = Math.atan2(
          -6 - threat.position.x,
          4 - threat.position.z,
        );
      }
      world.player.userData.weapon.gun.visible = ["equip", "handoff"].includes(
        shot.action,
      );
    } else world.player.userData.weapon.gun.visible = true;
    if (shot.action === "blackout") {
      world.facadeLight.emissiveIntensity = 0;
      world.heli.position.y = 8 - f * 2;
      world.heli.rotation.z = reduced ? 0 : Math.sin(f * 7) * 0.19;
    }
    if (shot.action === "roof-threat") {
      const e = room.enemies[0];
      if (e) e.position.z = -5 - f * 0.8;
    }
    if (shot.action === "approach") {
      world.heli.userData.damaged = false;
      world.facadeLight.emissiveIntensity = 0.5;
      world.heli.position.y = 11 + Math.sin(time) * 0.15;
    }
    if (shot.action === "landing") {
      world.heli.position.y = 0.5 + (1 - f) * 11;
      world.heli.rotation.z = reduced ? 0 : Math.sin(f * 20) * (1 - f) * 0.14;
      if (f > 0.8) world.heli.userData.damaged = true;
    }
    if (shot.action === "greeting" && features.robot)
      features.robot.userData.arms[0].rotation.z =
        -0.8 + Math.sin(time * 5) * 0.3;
    if (shot.action === "collapse" && features.robot)
      features.robot.rotation.z = -f * 0.55;
    if (shot.action === "number" && features.number) {
      features.extraNumber.visible = f > 0.3 && f < 0.7;
      features.number.visible = !features.extraNumber.visible;
    }
    if (shot.action === "pursuit")
      room.enemies.forEach((e, i) => {
        e.rotation.y = Math.atan2(
          world.player.position.x - e.position.x,
          world.player.position.z - e.position.z,
        );
        animatePresence(e, time, 0.3);
      });
    if (shot.action === "expand" && features.expansion)
      features.expansion.rotation.y = Math.sin(f * Math.PI) * 0.04;
    if (shot.action === "memory" && features.memoryActors)
      features.memoryActors.forEach((p, i) => {
        p.visible = true;
        animateExplorer(
          p,
          time,
          0,
          0,
          (shot.speaker === "MARA VOSS") === Boolean(i),
        );
        p.userData.arms[0].rotation.x = -0.6 + Math.sin(time * 2) * 0.15;
      });
    if (["researcher", "react"].includes(shot.action) && features.researcher) {
      animateExplorer(
        features.researcher,
        time,
        0,
        0,
        shot.speaker === "RESEARCHER",
      );
      features.researcher.userData.head.rotation.z = -0.15;
      features.researcher.userData.arms[1].rotation.x = -0.35;
    }
    if (features.watcher) {
      if (shot.action === "watcher") features.watcher.visible = true;
      if (shot.action === "vanish") features.watcher.visible = false;
      if (shot.action === "swarm") {
        features.watcher.visible = true;
        features.watcher.position.z = -7 + f * 2;
      }
    }
    if (shot.action === "dent" && features.dent) {
      features.dent.scale.y = 0.05 + f * 0.65;
      features.ceiling.position.y = 2.65 - f * 0.12;
    }
    if (shot.action === "shift" && features.statue) {
      features.statue.visible = f < 0.3 || f > 0.7;
      features.alternate.visible = !features.statue.visible;
      features.alternate.rotation.y = time * 0.8;
    }
    if (shot.action === "swarm")
      room.enemies.forEach((e, i) => {
        e.position.set(-3 + i * 2.2, 0, -4 + f * 4);
        animatePresence(e, time, 0.6);
      });
    if (shot.action === "tower" && campus) {
      const height = f < 0.28 ? 18 : f < 0.52 ? 19 : f < 0.76 ? 22 : 18;
      campus.tower.children.forEach(
        (c, i) => (c.visible = Math.floor(i / 4) < height),
      );
    }
    if (film.elapsed >= duration) {
      film.index++;
      film.elapsed = 0;
      if (film.index >= film.shots.length) finishFilm();
    }
  }

  function target() {
    const p = world.player.position;
    return room.targets
      .filter((t) => Math.hypot(p.x - t.x, p.z - t.z) < t.r)
      .sort(
        (a, b) =>
          Math.hypot(p.x - a.x, p.z - a.z) - Math.hypot(p.x - b.x, p.z - b.z),
      )[0];
  }
  function interact() {
    if (mode !== "play") return;
    const t = target();
    if (!t) return;
    if (t.kind === "math") {
      if (save.solved.includes(t.id)) {
        toast("This mechanism is already restored.");
        return;
      }
      const g = adventure.gates.find((g) => g.id === t.id);
      if ((g.requires || []).some((id) => !save.solved.includes(id))) {
        toast("The override needs all eight upstream systems restored.");
        return;
      }
      openMath(g);
    } else if (
      t.kind === "stairs" ||
      t.kind === "ladder" ||
      t.kind === "escalator"
    )
      requestTravel(t.destination, t.kind, t.core || null);
    else if (t.kind === "stairwell") {
      const destinations = [save.floor - 1, save.floor + 1].filter(
        (i) => i >= 0 && i <= 20,
      );
      if (destinations.length === 1)
        requestTravel(destinations[0], "stairs", t.core);
      else
        choice(
          "Fire stair " + t.core,
          "Enclosed stairs connect the landing directly above and below.",
          destinations.map((i) => {
            const reason = travelBlock(save, i);
            return {
              label: (i < save.floor ? "Up to " : "Down to ") + floorName(i),
              disabled: !!reason,
              reason,
              action: () => requestTravel(i, "stairs", t.core),
            };
          }),
        );
    } else if (t.kind === "lift") openLift(t.id);
    else if (t.kind === "exit") {
      if (canEscape(save)) runFilm("ending");
      else toast("The campus doors are sealed. Restore the override in B3.");
    } else if (t.kind === "release") {
      if (save.flags.sculpture) {
        toast("The sculpture is already released.");
        return;
      }
      save.flags.sculpture = true;
      room.enemies.forEach((e) => (e.userData.stun = 8));
      sound.tone("pulse");
      toast(
        "The counterweight swings across the gallery. The pursuers are staggered — move!",
      );
      persist();
    } else if (t.kind === "security") {
      if (save.flags[t.id]) {
        toast("The stairwell is isolated. Continue down.");
        return;
      }
      if (!secureFloor(save, t.id)) {
        toast(
          "Recover the emergency badge at the Floor 17 security desk first.",
        );
        return;
      }
      room.enemies.forEach((e) => {
        e.userData.stun = 1.5;
        e.userData.windup = e.userData.rush = 0;
      });
      // The shutter visibly drops, ending this pursuit and opening the descent.
      sound.tone("solve");
      updateHud();
      persist();
      toast(
        t.id === "receptionSecured"
          ? "Badge recovered. Door sealed behind you. The figure is still on this floor — head down."
          : "Emergency route released. The alarm distracts the patrol briefly. Take Stair B down.",
      );
    } else if (t.kind === "record") {
      const record = adventure.objects.find((o) => o.id === t.id);
      choice(record.title, record.text, [
        {
          label:
            record.id === "recording"
              ? "Watch the recording"
              : "Return to the room",
          action() {
            if (record.id === "recording") runFilm("recording", true);
          },
        },
      ]);
    } else if (t.kind === "object") objectChoice(t.id);
  }
  function choice(title, copy, options, fromTitle = false) {
    setMode("choice");
    $("choice-title").textContent = title;
    $("choice-copy").textContent = copy;
    $("choice-options").replaceChildren();
    $("choice").dataset.fromTitle = String(fromTitle);
    for (const option of options) {
      const b = document.createElement("button");
      b.textContent = option.label;
      b.disabled = !!option.disabled;
      if (option.reason) b.title = option.reason;
      b.onclick = () => {
        $("choice").close();
        setMode("play");
        option.action();
      };
      $("choice-options").append(b);
    }
    $("choice").showModal();
  }
  function closeChoice() {
    $("choice").close();
    setMode($("choice").dataset.fromTitle === "true" ? "title" : "play");
    $("world").focus();
  }
  $("choice-close").onclick = closeChoice;
  $("choice").addEventListener("cancel", (e) => {
    e.preventDefault();
    closeChoice();
  });
  function objectChoice(id) {
    if (id === "guidebot") {
      if (save.flags.guidebot) {
        toast("The rescued Guidebot increased your stun-pistol range.");
        return;
      }
      choice(
        "A trapped Guidebot",
        "A fallen shelf pins the Guidebot. Its wheel spins uselessly.",
        [
          {
            label: "Lift the shelf and free it",
            action() {
              save.flags.guidebot = true;
              room.features.fallen.position.y = 2;
              persist();
              runFilm("freed");
            },
          },
          { label: "Leave it for now", action() {} },
        ],
      );
    }
    if (id === "researcher")
      choice(
        "The last researcher",
        save.flags.researcher
          ? "The researcher is ready to follow."
          : "“I know the freight route. But I was waiting for someone…”",
        [
          {
            label: save.flags.researcher
              ? "Continue together"
              : "Invite the researcher to come",
            action() {
              save.flags.researcher = true;
              save.flags.researcherWaiting = false;
              persist();
              runFilm("rescue");
            },
          },
          {
            label: "Let the researcher wait here",
            action() {
              save.flags.researcher = false;
              save.flags.researcherWaiting = true;
              disposeCompanion();
              persist();
              runFilm("waiting");
            },
          },
        ],
      );
    if (id === "allocation")
      choice(
        "Ten power units",
        "Lighting uses 4 units. Freight uses 6. Ventilation uses 5. Choose one allocation; changing it replaces the previous allocation.",
        [
          {
            label: "Lighting + freight · 10 units",
            action() {
              save.flags.freight = true;
              save.flags.ventilation = false;
              loadFloor(save.floor, world.player.position.clone());
              persist();
              toast(
                "Freight Lift C is powered. It links Floors 8, 4, 1 and B2.",
              );
            },
          },
          {
            label: "Lighting + ventilation · 9 units",
            action() {
              save.flags.freight = false;
              save.flags.ventilation = true;
              room.enemies.forEach((e) => {
                e.visible = false;
                e.userData.disabled = true;
              });
              persist();
              toast("Ventilation clears lower patrols before the breach.");
            },
          },
        ],
      );
  }
  function openLift(id) {
    const lift = adventure.lifts.find((l) => l.id === id);
    const options = lift.stops
      .filter((i) => i !== save.floor)
      .map((i) => {
        const reason = travelBlock(save, i, "lift", id);
        return {
          label:
            floorName(i) +
            " · " +
            adventure.rooms[i].name +
            (reason ? " — unavailable" : ""),
          disabled: !!reason,
          reason,
          action: () => requestTravel(i, "lift", id),
        };
      });
    const locked =
      lift.unlock && !save.solved.includes(lift.unlock)
        ? "Restore research power on Floor 12."
        : lift.unlockFlag && !save.flags.freight
          ? "Allocate freight power on Floor 4."
          : "Stops beyond an unrestored system or unexplored story event remain unavailable. Stairs are always nearby.";
    choice("Lift " + id, locked, options);
  }
  function requestTravel(destination, kind = "stairs", id = null) {
    const reason = travelBlock(save, destination, kind, id);
    if (reason) {
      toast(reason);
      return;
    }
    const p = world.player.position.clone();
    ride = {
      destination,
      kind,
      id,
      elapsed: 0,
      originalPosition: p,
      car: null,
    };
    setMode("travel");
    $("speaker").textContent =
      kind === "lift"
        ? "LIFT " + id
        : kind === "ladder"
          ? "MAINTENANCE SHAFT"
          : "SERVICE STAIRS";
    $("line").textContent =
      floorName(save.floor) + " → " + floorName(destination);
    if (kind === "lift") {
      const car = new T.Group();
      car.position.copy(p);
      const metal = mat("#41616b"),
        brass = mat("#cdb075", 0.4, 0.6);
      box(car, metal, [0, -0.1, 0], [3, 0.2, 3]);
      box(car, metal, [0, 1.6, -1.5], [3, 3.4, 0.1]);
      for (const x of [-1.5, 1.5]) box(car, brass, [x, 1.4, 0], [0.1, 3, 3]);
      world.scene.add(car);
      ride.car = car;
      world.player.rotation.y = 0.5;
    }
    sound.tone("jump");
  }
  function finishTravel() {
    const { destination, kind, id, car } = ride;
    if (car) {
      world.scene.remove(car);
      car.traverse((o) => {
        o.geometry?.dispose();
        o.material?.dispose();
      });
    }
    ride = null;
    const reason = travel(save, destination, kind, id);
    if (reason) {
      setMode("play");
      toast(reason);
      return;
    }
    loadFloor(destination, save.position);
    setMode("play");
    persist();
    offerEntry();
  }
  function travelFrame(dt) {
    ride.elapsed += dt;
    const p = ride.originalPosition,
      f = Math.min(1, ride.elapsed / (ride.kind === "lift" ? 1.8 : 1));
    if (ride.car) {
      world.player.position.y = Math.sin(f * Math.PI) * 0.12;
      world.camera.position.set(p.x + 4, p.y + 3, p.z + 6);
      world.camera.lookAt(p.x, 1.5, p.z);
      ride.car.children[1].position.y = 1.6 + Math.sin(f * 10) * 0.08;
    } else {
      const direction = ride.id === "A" ? 1 : -1;
      faceMovement(world.player, 0, direction);
      animateExplorer(world.player, time, 0.7);
      poseCombat(world.player, time);
      world.player.position.z = p.z + direction * f * 0.7;
      world.player.position.y =
        save.floor === 0 ? 0 : (ride.destination > save.floor ? -0.5 : 0.5) * f;
    }
    if (f === 1) finishTravel();
  }

  function openMath(gate) {
    activeGate = gate;
    question = getProblem(save, adventure.id, gate);
    progress = progressFor(save, gate.id, question);
    setMode("math");
    $("math-title").textContent = gate.label;
    $("question").textContent = question.prompt;
    $("math-skill").textContent = question.skill;
    $("feedback").textContent = "Take your time. The world is paused.";
    $("hint").hidden = true;
    $("hint").textContent = question.hint;
    // Older builds could persist the opening key itself as a draft. A lone E
    // is never a valid answer in these numeric banks; keep real typed drafts.
    if (/^e+$/i.test(progress.draft)) progress.draft = "";
    $("answer").value = progress.draft;
    renderGuide();
    $("math").showModal();
    $("answer").focus();
    persist();
  }
  function renderGuide() {
    $("guided").hidden = !progress.guided;
    $("step-count").textContent =
      `STEP ${Math.min(progress.checked.length + 1, question.steps.length)} OF ${question.steps.length}`;
    $("checked").replaceChildren();
    progress.checked.forEach((answer, i) => {
      const li = document.createElement("li");
      li.textContent = question.steps[i].prompt + " → " + answer + " ✓";
      $("checked").append(li);
    });
    $("step-prompt").textContent = progress.solved
      ? "All steps checked. The mechanism is ready."
      : question.steps[progress.checked.length]?.prompt || "";
    $("answer-form").hidden = progress.solved;
    $("activate").hidden = !progress.solved;
    $("help").hidden = progress.guided || progress.solved;
    $("answer-label").textContent = progress.guided
      ? "This step’s answer"
      : "Your answer";
  }
  $("answer").oninput = () => {
    if (progress) {
      progress.draft = $("answer").value;
      persist();
    }
  };
  $("answer-form").onsubmit = (e) => {
    e.preventDefault();
    const result = submit(question, progress, $("answer").value);
    if (result.correct) {
      sound.tone("solve");
      $("feedback").textContent = result.complete
        ? "Correct. Activate the mechanism when you are ready."
        : "That step is correct. Now calculate the next one.";
      $("answer").value = "";
      renderGuide();
      if (result.complete) $("activate").focus();
      else $("answer").focus();
    } else
      $("feedback").textContent =
        "Not quite. Try again; there is no penalty. A hint or checked steps can help.";
    persist();
  };
  $("help").onclick = () => {
    progress.guided = true;
    progress.checked = [];
    progress.draft = "";
    $("answer").value = "";
    renderGuide();
    $("answer").focus();
    persist();
  };
  $("hint-button").onclick = () => {
    $("hint").hidden = false;
  };
  function leaveMath() {
    $("math").close();
    setMode("play");
    persist();
    $("world").focus();
  }
  $("leave-math").onclick = leaveMath;
  $("math").addEventListener("cancel", (e) => {
    e.preventDefault();
    leaveMath();
  });
  $("activate").onclick = () => {
    if (!progress.solved || !activate(save, activeGate.id)) return;
    const id = activeGate.id;
    $("math").close();
    sound.tone("solve");
    setMode("play");
    updateHud();
    persist();
    toast(activeGate.message);
    if (id === "power") runFilm("power");
    else if (id === "override") {
      const position = world.player.position.clone();
      loadFloor(save.floor, position);
      runFilm("escape");
    } else if (id === "roof")
      world.roofDoors.forEach((d) => (d.leaf.position.y = 3.65));
    else if (id === "lights" && room.features.expansion)
      room.features.expansion.rotation.y = 0;
    $("world").focus();
  };

  function pause() {
    if (!["play", "film"].includes(mode)) return;
    priorMode = mode;
    setMode("pause");
    sound.silence();
    persist();
    $("scene-select").replaceChildren(new Option("Choose a scene", ""));
    for (const name of save.seen)
      $("scene-select").add(
        new Option(
          name === "skitters"
            ? "Gallery pursuit"
            : name === "impossible"
              ? "The conflicting measurements"
              : name.charAt(0).toUpperCase() + name.slice(1),
          name,
        ),
      );
    $("pause-menu").showModal();
  }
  function resume() {
    $("pause-menu").close();
    setMode(priorMode);
    $("world").focus();
  }
  $("pause").onclick = pause;
  $("resume").onclick = resume;
  $("pause-menu").addEventListener("cancel", (e) => {
    e.preventDefault();
    resume();
  });
  $("return-title").onclick = () => {
    $("pause-menu").close();
    persist();
    film = null;
    setMode("title");
    $("continue").hidden = false;
    sound.silence();
  };
  $("replay-scene").onclick = () => {
    const name = $("scene-select").value;
    if (!name) return;
    $("pause-menu").close();
    if (film) {
      toast("Finish the current scene before replaying another.");
      setMode("film");
      return;
    }
    runFilm(name, true);
  };
  $("reduced-motion").onchange = () => (reduced = $("reduced-motion").checked);
  function showComplete() {
    setMode("complete");
    $("result-details").textContent =
      `${required.filter((g) => save.solved.includes(g.id)).length}/9 systems restored · ${save.visited.length}/21 floors explored · ${save.solved.length - 9}/3 optional caches. ` +
      (save.flags.researcher
        ? "The researcher escaped with you. "
        : "The researcher stayed behind. ") +
      (save.flags.guidebot ? "You freed the Guidebot. " : "") +
      (save.flags.freight ? "Freight power was restored." : "");
    $("complete").showModal();
  }
  $("replay").onclick = () => {
    $("complete").close();
    launch(false);
  };
  $("ending-replay").onclick = () => {
    $("complete").close();
    runFilm("ending", true);
  };
  $("complete").addEventListener("cancel", (e) => e.preventDefault());

  function jump() {
    if (mode === "play" && world.player.position.y < 0.04) {
      vy = 7.4;
      sound.tone("jump");
    }
  }
  function weaponStatus() {
    const status = $("weapon-status");
    status.textContent =
      shotCooldown > 0
        ? `STUN PISTOL · charging ${shotCooldown.toFixed(1)}s`
        : "STUN PISTOL · READY";
    status.dataset.ready = String(shotCooldown === 0);
  }
  function attack(close = false) {
    if (mode !== "play" || (close ? shoveCooldown : shotCooldown) > 0) return;
    if (close) {
      shoveCooldown = 0.8;
      world.player.userData.shoveStart = time;
      const e = shoveTarget(
        world.player.position,
        world.player.rotation.y,
        room.enemies,
        room.colliders,
      );
      if (e) {
        const dx = e.position.x - world.player.position.x,
          dz = e.position.z - world.player.position.z,
          d = Math.hypot(dx, dz) || 1;
        e.userData.stun = 1.15;
        e.userData.windup = e.userData.rush = 0;
        e.userData.knockback = { x: (dx / d) * 12, z: (dz / d) * 12 };
        toast("Shoved back. Move away before they recover.");
        sound.tone("shove");
      } else toast("Shove missed. Face an opponent within arm’s reach.");
      return;
    }
    shotCooldown = STUN_COOLDOWN;
    shotTime = 0.18;
    world.player.userData.fireStart = time;
    world.player.userData.aiming = true;
    poseCombat(world.player, time);
    world.player.updateMatrixWorld(true);
    const origin = world.player.userData.weapon.muzzle.getWorldPosition(
      new T.Vector3(),
    );
    // A muzzle close to a wall may not reach through it.
    const reach = origin.clone().sub(world.player.position).setY(0),
      span = reach.length();
    const wall = rayWall(
      world.player.position,
      reach.clone().normalize(),
      span,
      room.colliders,
      origin.y,
    );
    if (wall < span) {
      const height = origin.y;
      origin
        .copy(world.player.position)
        .addScaledVector(reach.normalize(), Math.max(0, wall - 0.02))
        .setY(height);
    }
    const hit = traceShot(
      origin,
      world.player.rotation.y,
      room.enemies,
      room.colliders,
      save.flags.guidebot ? 10 : STUN_RANGE,
    );
    shotLine.geometry.setFromPoints([
      origin,
      new T.Vector3(hit.end.x, origin.y, hit.end.z),
    ]);
    shotLine.material.opacity = 1;
    noise = { x: world.player.position.x, z: world.player.position.z };
    if (hit.enemy) {
      hit.enemy.userData.stun = 4;
      hit.enemy.userData.windup = hit.enemy.userData.rush = 0;
      toast("Direct hit. Four seconds to get clear.");
    } else toast("Shot missed or blocked. Aim at the figure before firing.");
    sound.tone("stun");
    weaponStatus();
  }
  function press(code) {
    if (mode === "play") {
      if (code === "Space") jump();
      if (code === "KeyX") attack();
      if (code === "KeyC") attack(true);
      if (code === "KeyE") interact();
      if (code === "KeyQ") {
        world.player.rotation.y += Math.PI;
        world.player.userData.turnUntil = time + 0.5;
        world.player.userData.aiming = true;
      }
    }
    if (code === "KeyP" || code === "Escape") {
      if (mode === "pause") resume();
      else pause();
    }
  }
  let openingInteractHeld = false;
  document.addEventListener("keydown", (e) => {
    // Opening a dialog transfers focus during this very keydown. Consume its
    // default text insertion and any held-key repeats until the physical keyup.
    if (e.code === "KeyE" && openingInteractHeld) {
      e.preventDefault();
      return;
    }

    if (
      ["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName) ||
      ["math", "choice", "complete", "title"].includes(mode)
    )
      return;
    if (
      ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(
        e.code,
      )
    )
      e.preventDefault();
    if (e.code === "KeyE" && mode === "play") {
      e.preventDefault();
      openingInteractHeld = true;
    }
    if (!keys.has(e.code)) press(e.code);
    keys.add(e.code);
  });
  document.addEventListener("keyup", (e) => {
    keys.delete(e.code);
    if (e.code === "KeyE") openingInteractHeld = false;
  });
  document.querySelectorAll("[data-key]").forEach((button) => {
    button.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      button.setPointerCapture(e.pointerId);
      press(button.dataset.key);
      keys.add(button.dataset.key);
    });
    for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
      button.addEventListener(event, () => keys.delete(button.dataset.key));
  });
  const aimRay = new T.Raycaster(),
    ground = new T.Plane(new T.Vector3(0, 1, 0), 0),
    aimPoint = new T.Vector3();
  function aimAtPointer(e) {
    if (mode !== "play" || e.pointerType !== "mouse") return;
    const rect = $("world").getBoundingClientRect();
    aimRay.setFromCamera(
      new T.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        (-(e.clientY - rect.top) / rect.height) * 2 + 1,
      ),
      world.camera,
    );
    if (aimRay.ray.intersectPlane(ground, aimPoint)) {
      faceMovement(
        world.player,
        aimPoint.x - world.player.position.x,
        aimPoint.z - world.player.position.z,
      );
      world.player.userData.aiming = true;
    }
  }
  $("world").addEventListener("pointermove", aimAtPointer);
  $("world").addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button === 0 && mode === "play") {
      e.preventDefault();
      aimAtPointer(e);
      attack();
    }
  });
  window.addEventListener("blur", () => {
    openingInteractHeld = false;
    keys.clear();
    pause();
  });
  document.addEventListener("visibilitychange", () => {
    keys.clear();
    if (document.hidden) {
      pause();
      sound.suspend();
    } else sound.resume();
  });
  window.addEventListener("pagehide", persist);
  window.addEventListener("resize", world.resize);
  function blocked(x, z, y) {
    return (
      x < -13.2 ||
      x > 13.2 ||
      z < -10.5 ||
      z > 10.5 ||
      room.colliders.some(
        (o) =>
          Math.abs(x - o.x) < o.w / 2 + 0.3 &&
          Math.abs(z - o.z) < o.d / 2 + 0.3 &&
          y < o.h,
      )
    );
  }
  function hurt() {
    if (protection > 0) return;
    if (
      companion &&
      save.escape &&
      companionCooldown === 0 &&
      companion.position.distanceTo(world.player.position) < 3
    ) {
      companionCooldown = 8;
      protection = 1.2;
      sound.tone("pulse");
      toast("The researcher pulls you clear. Keep moving!");
      return;
    }
    save.health--;
    protection = 3;
    sound.tone("hurt");
    if (save.health <= 0) {
      save.health = 3;
      world.player.position.set(-8, 0, 7);
      room.enemies.forEach((e, i) => e.position.set(3 + i * 1.3, 0, -5));
      toast(
        "You recovered at the stairs. Your mathematics, fragments and choices are safe.",
      );
    } else
      toast(
        "Keep your distance. Face the pursuer, then fire X. Q turns around; C pushes them back.",
      );
    updateHud();
    persist();
  }
  function simulation(dt) {
    shotCooldown = Math.max(0, shotCooldown - dt);
    shoveCooldown = Math.max(0, shoveCooldown - dt);
    companionCooldown = Math.max(0, companionCooldown - dt);
    protection = Math.max(0, protection - dt);
    weaponStatus();
    const p = world.player.position;
    let x =
        Number(keys.has("KeyD") || keys.has("ArrowRight")) -
        Number(keys.has("KeyA") || keys.has("ArrowLeft")),
      z =
        Number(keys.has("KeyS") || keys.has("ArrowDown")) -
        Number(keys.has("KeyW") || keys.has("ArrowUp"));
    const len = Math.hypot(x, z);
    if (len) {
      x /= len;
      z /= len;
    }
    const dx = (x * 0.825 + z * 0.565) * 5.3 * dt,
      dz = (-x * 0.565 + z * 0.825) * 5.3 * dt;
    const beforeX = p.x,
      beforeZ = p.z;
    const turnLock = time < (world.player.userData.turnUntil ?? -100);
    const aiming = keys.has("ShiftLeft") || keys.has("ShiftRight") || turnLock;
    if (aiming) {
      if (!turnLock) faceMovement(world.player, dx, dz);
      world.player.userData.aiming = true;
    } else {
      if (!blocked(p.x + dx, p.z, p.y)) p.x += dx;
      if (!blocked(p.x, p.z + dz, p.y)) p.z += dz;
      if (len) world.player.userData.aiming = false;
    }
    const movedX = p.x - beforeX,
      movedZ = p.z - beforeZ;
    faceMovement(world.player, movedX, movedZ);
    vy -= 18 * dt;
    p.y = Math.max(0, p.y + vy * dt);
    if (p.y === 0) vy = 0;
    animateExplorer(
      world.player,
      time,
      dt ? Math.hypot(movedX, movedZ) / (dt * 5.3) : 0,
      p.y,
    );
    poseCombat(world.player, time);
    world.player.userData.weapon.gun.visible = true;
    world.player.visible = true;
    room.collectibles.forEach(({ group, id }) => {
      if (
        group.visible &&
        Math.hypot(p.x - group.position.x, p.z - group.position.z) < 1
      ) {
        group.visible = false;
        save.collected.push(id);
        sound.tone("shard");
        toast(
          save.collected.length === 3
            ? "All three recorders recovered. The route to the education wing is clear."
            : `Memory fragment ${save.collected.length} of 3 recovered.`,
        );
        updateHud();
        persist();
      }
    });
    let pursuing = 0;
    room.enemies.forEach((e) => {
      const motion = updateThreat(e, p, dt, room.colliders, {
        noise,
        early: save.floor < 4,
        escape: save.escape,
      });
      if (e.userData.disabled) return;
      animatePresence(e, time, motion.speed);
      if (
        e.userData.state === "pursuing" ||
        e.userData.state === "winding" ||
        e.userData.state === "rushing"
      )
        pursuing++;
      if (motion.attack) hurt();
    });
    noise = null;
    $("threat-status").textContent = pursuing
      ? `PURSUIT · ${pursuing} ${pursuing === 1 ? "figure" : "figures"}`
      : room.enemies.some((e) => !e.userData.disabled)
        ? "FOOTSTEPS NEARBY"
        : "AREA QUIET";
    $("threat-status").dataset.alert = String(pursuing > 0);
    room.features.steam?.forEach((s) => {
      if (
        s.visible &&
        Math.hypot(p.x - s.position.x, p.z - s.position.z) < 0.8 &&
        p.y < 0.7
      )
        hurt();
    });
    if (companion) {
      const target = p.clone().add(new T.Vector3(-1.3, 0, 1.2)),
        distance = companion.position.distanceTo(target);
      if (distance > 1) {
        const before = companion.position.clone();
        const direction = target
          .clone()
          .sub(companion.position)
          .setY(0)
          .normalize();
        moveBody(
          companion,
          direction.x * Math.min(distance, dt * 5),
          direction.z * Math.min(distance, dt * 5),
          room.colliders,
        );
        faceMovement(
          companion,
          companion.position.x - before.x,
          companion.position.z - before.z,
        );
      }
      animateExplorer(companion, time, distance > 1 ? 1 : 0);
    }
    if (save.escape && room.features.watcher)
      room.features.watcher.position.z = -7 + Math.sin(time * 0.15) * 1.5;
    const t = target();
    $("prompt").hidden = !t;
    if (t) $("prompt").querySelector("span").textContent = t.label;
    shotTime = Math.max(0, shotTime - dt);
    shotLine.material.opacity = shotTime / 0.18;
    const aim = traceShot(
      { x: p.x, y: 1.25, z: p.z },
      world.player.rotation.y,
      room.enemies,
      room.colliders,
      save.flags.guidebot ? 10 : STUN_RANGE,
    );
    const direction = new T.Vector3(aim.direction.x, 0, aim.direction.z);
    aimLine.geometry.setFromPoints([
      new T.Vector3(p.x, 0.06, p.z).addScaledVector(direction, 0.65),
      new T.Vector3(aim.end.x, 0.06, aim.end.z),
    ]);
    aimMark.position.set(aim.end.x, 0.065, aim.end.z);
    aimMark.material.color.set(aim.enemy ? "#d4aa7f" : "#a7c1b5");
    saveClock += dt;
    if (saveClock > 2) {
      saveClock = 0;
      persist();
    }
  }
  function frame(now) {
    const elapsed = Math.min((now - last) / 1000, 1);
    const dt = Math.min(elapsed, 0.05);
    last = now;
    if (["play", "film", "travel", "title"].includes(mode)) {
      time += dt;
      world.animate(time, dt, room.floor === 0 ? "roof" : "interior");
      room.animate(time, dt);
    }
    if (mode === "film") filmFrame(elapsed);
    else if (mode === "travel") travelFrame(elapsed);
    else if (mode === "play") {
      simulation(dt);
      const p = world.player.position;
      lookTarget.set(p.x, 1.3, p.z);
      cameraTarget.copy(lookTarget).add(new T.Vector3(8, 9, 12));
      if (world.camera.aspect < 0.8) cameraTarget.add(new T.Vector3(3, 5, 5));
      const speed = reduced ? 1 : Math.min(1, dt * 2.8);
      world.camera.position.lerp(cameraTarget, speed);
      look.lerp(lookTarget, speed);
      world.camera.lookAt(look);
    } else if (mode === "title") {
      world.player.visible = true;
      animateExplorer(world.player, time);
      poseCombat(world.player, time);
      world.camera.position.set(15 + Math.sin(time * 0.12) * 1.5, 9, 17);
      world.camera.lookAt(0, 1.5, -1);
    }
    if (toastClock > 0 && mode === "play") {
      toastClock -= dt;
      if (toastClock <= 0) $("toast").style.opacity = 0;
    }
    world.render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
