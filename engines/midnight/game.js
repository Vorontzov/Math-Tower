import * as T from "../../vendor/three.module.js";
import { createWorld } from "./world.js";
import { buildRoom, buildCampus } from "./rooms.js";
import {
  animateExplorer,
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
  canEscape,
} from "./state.js";

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
    pulseCooldown = 0,
    shoveCooldown = 0,
    companionCooldown = 0,
    pulseTime = 0,
    priorMode = "play",
    question = null,
    progress = null,
    activeGate = null;
  let reduced = matchMedia("(prefers-reduced-motion: reduce)").matches,
    voice = false;
  const cameraTarget = new T.Vector3(),
    lookTarget = new T.Vector3(),
    look = new T.Vector3(0, 2, 0);
  room = buildRoom(world, 4, freshState(1));
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
    if (room.def.requiredCollect && save.collected.length < 3)
      return "Recover three memory fragments. Jump, shove or stun the Skitters.";
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
    world.player.rotation.y = 0.6;
    vy = 0;
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
      world.roofDoor.leaf.position.y = save.solved.includes("roof") ? 6.2 : 2;
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
    if (name === "skitters")
      toast(
        "Three memory fragments are scattered through the gallery. Space jumps; X stuns; C shoves.",
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
      sound.say(shot.line);
      if (["dent", "alarm", "swarm"].includes(shot.action)) sound.tone("hurt");
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
    world.player.visible = !["landing", "approach"].includes(shot.action);
    animateExplorer(world.player, time, 0, 0, shot.speaker === "THE EXPLORER");
    const features = room.features;
    if (shot.action === "approach")
      world.heli.position.y = 11 + Math.sin(time) * 0.15;
    if (shot.action === "landing") {
      world.heli.position.y = 0.5 + (1 - f) * 11;
      world.heli.rotation.z = Math.sin(f * 20) * (1 - f) * 0.05;
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
    if (shot.action === "skitters" && features.robot) {
      features.robot.rotation.z = f * 0.9;
      features.robot.userData.arms[0].rotation.z = Math.sin(time * 8);
      room.enemies.forEach((e, i) => {
        e.position.z = -3 + Math.sin(time + i) * 0.3;
        e.position.y = Math.abs(Math.sin(time * 2 + i)) * 0.5;
      });
    }
    if (shot.action === "expand" && features.expansion)
      features.expansion.scale.z = 1 + f * 0.6;
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
      features.ceiling.position.y = 5.2 - f * 0.12;
    }
    if (shot.action === "shift" && features.statue) {
      features.statue.visible = f < 0.3 || f > 0.7;
      features.alternate.visible = !features.statue.visible;
      features.alternate.rotation.y = time * 0.8;
    }
    if (shot.action === "swarm")
      room.enemies.forEach((e, i) =>
        e.position.set(-3 + i * 1.1, 0.15, -4 + f * 4),
      );
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
      requestTravel(t.destination, t.kind);
    else if (t.kind === "lift") openLift(t.id);
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
      toast("The swinging sculpture scatters the Skitters.");
      persist();
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
        toast("The rescued Guidebot upgraded your pulse range.");
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
      animateExplorer(world.player, time, 1);
      world.player.position.z = p.z - f * 0.6;
      world.player.position.y = Math.sin(f * Math.PI) * 0.35;
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
    } else if (id === "roof") world.roofDoor.leaf.position.y = 6.2;
    else if (id === "lights" && room.features.expansion)
      room.features.expansion.scale.z = 1.5;
    $("world").focus();
  };

  function pause() {
    if (!["play", "film"].includes(mode)) return;
    priorMode = mode;
    setMode("pause");
    sound.silence();
    persist();
    $("scene-select").replaceChildren(new Option("Choose a scene", ""));
    for (const name of save.seen) $("scene-select").add(new Option(name, name));
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
  function attack(close = false) {
    if (mode !== "play" || (close ? shoveCooldown : pulseCooldown) > 0) return;
    if (close) shoveCooldown = 0.65;
    else {
      pulseCooldown = 1.4;
      pulseTime = 0.5;
      world.pulse.position
        .copy(world.player.position)
        .add(new T.Vector3(0, 0.6, 0));
    }
    const range = close ? 2 : save.flags.guidebot ? 5.5 : 4.5;
    world.player.userData.strikeStart = time;
    room.enemies.forEach((e) => {
      if (e.position.distanceTo(world.player.position) < range) {
        e.userData.stun = close ? 2.5 : 4.5;
        e.position.add(
          e.position
            .clone()
            .sub(world.player.position)
            .setY(0)
            .normalize()
            .multiplyScalar(0.5),
        );
      }
    });
    world.player.userData.arms[1].rotation.x = -1.5;
    sound.tone("pulse");
  }
  function press(code) {
    if (mode === "play") {
      if (code === "Space") jump();
      if (code === "KeyX") attack();
      if (code === "KeyC") attack(true);
      if (code === "KeyE") interact();
    }
    if (code === "KeyP" || code === "Escape") {
      if (mode === "pause") resume();
      else pause();
    }
  }
  document.addEventListener("keydown", (e) => {
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
    if (!keys.has(e.code)) press(e.code);
    keys.add(e.code);
  });
  document.addEventListener("keyup", (e) => keys.delete(e.code));
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
  window.addEventListener("blur", () => {
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
    } else toast("Space jumps over danger. X stuns; C shoves at close range.");
    updateHud();
    persist();
  }
  function simulation(dt) {
    pulseCooldown = Math.max(0, pulseCooldown - dt);
    shoveCooldown = Math.max(0, shoveCooldown - dt);
    companionCooldown = Math.max(0, companionCooldown - dt);
    protection = Math.max(0, protection - dt);
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
    if (!blocked(p.x + dx, p.z, p.y)) p.x += dx;
    if (!blocked(p.x, p.z + dz, p.y)) p.z += dz;
    if (len) {
      const angle = Math.atan2(dx, dz),
        delta = Math.atan2(
          Math.sin(angle - world.player.rotation.y),
          Math.cos(angle - world.player.rotation.y),
        );
      world.player.rotation.y += delta * Math.min(1, dt * 13);
    }
    vy -= 18 * dt;
    p.y = Math.max(0, p.y + vy * dt);
    if (p.y === 0) vy = 0;
    animateExplorer(world.player, time, len ? 1 : 0, p.y);
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
            ? "All three fragments recovered. The route to the children’s gallery is clear."
            : `Memory fragment ${save.collected.length} of 3 recovered.`,
        );
        updateHud();
        persist();
      }
    });
    room.enemies.forEach((e, i) => {
      const s = e.userData;
      if (s.disabled) return;
      s.stun = Math.max(0, s.stun - dt);
      if (s.stun) {
        e.rotation.z = Math.sin(time * 8) * 0.1;
        return;
      }
      e.rotation.z = 0;
      s.phase += dt;
      const direction = p.clone().sub(e.position).setY(0),
        distance = direction.length();
      e.rotation.y = Math.atan2(direction.x, direction.z);
      const phase = s.phase % 3.8,
        windup = phase > 2.25 && phase < 3,
        charge = phase >= 3,
        speed = windup ? 0 : charge ? 5 : save.escape ? 1.5 : 1;
      if (distance < 11 && distance > 0.6) {
        direction.normalize().multiplyScalar(dt * speed);
        const nx = e.position.x + direction.x,
          nz = e.position.z + direction.z;
        if (!blocked(nx, e.position.z, 0)) e.position.x = nx;
        if (!blocked(e.position.x, nz, 0)) e.position.z = nz;
      }
      e.position.y = windup
        ? 0.05 + Math.sin(time * 20) * 0.03
        : Math.abs(Math.sin(time * 9 + i)) * 0.05;
      e.scale.setScalar(windup ? 1.12 : 1);
      s.legs?.forEach(
        (l, j) => (l.rotation.y = Math.sin(time * (charge ? 18 : 8) + j) * 0.3),
      );
      if (s.kind === "guidebot")
        e.userData.arms.forEach(
          (a, j) => (a.rotation.z = Math.sin(time * 3 + j) * 0.3),
        );
      if (distance < 0.9 && p.y < 0.7) hurt();
    });
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
        companion.position.lerp(target, Math.min(1, dt * 2));
        companion.rotation.y = Math.atan2(
          p.x - companion.position.x,
          p.z - companion.position.z,
        );
      }
      animateExplorer(companion, time, distance > 1 ? 1 : 0);
    }
    if (save.escape && room.features.watcher)
      room.features.watcher.position.z = -7 + Math.sin(time * 0.15) * 1.5;
    const t = target();
    $("prompt").hidden = !t;
    if (t) $("prompt").querySelector("span").textContent = t.label;
    pulseTime = Math.max(0, pulseTime - dt);
    world.pulse.material.opacity = pulseTime * 1.7;
    world.pulse.scale.setScalar(1 + (1 - pulseTime / 0.5) * 4);
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
      if (save?.flags.sculpture && room.floor === 4)
        world.pendulum.rotation.z = 1.4;
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
      world.camera.position.set(15 + Math.sin(time * 0.12) * 1.5, 9, 17);
      world.camera.lookAt(0, 3, -1);
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
