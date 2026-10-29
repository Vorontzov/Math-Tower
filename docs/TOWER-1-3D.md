# Tower 1 — The First Correspondence

The complete first expedition now runs in 3D at `midnight/`. The original two-room proof has been expanded into all **18 above-ground floors and B1–B3**, followed by a playable return to the lobby and a campus ending. No other Tower or Interlude is implemented.

The latest direction is a serious, grounded mystery: restrained interfaces, realistic human proportions and skeletal animation, worn surface materials, HDR environment lighting, subdued effects and an unnerving research-institute atmosphere. The opening now stages an emergency approach, tower blackout, a rough landing that damages the helicopter, a transmission in the explorer’s own voice, and an armed android at the roof stairwell. Danger continues immediately into play. This is an original setting and narrative. It is a more realistic real-time art treatment, not a claim of film-quality photorealism or scanned environments.

## Expedition

| Floor | Environment / main event |
| --- | --- |
| 18 | Emergency landing, roof pursuer, cover and the first typed access relay |
| 17 | Pursuit through security reception; seal the stairwell and recover an emergency badge |
| 16 | Patrols in a divided lift lobby; use the badge to release the emergency route |
| 15 | Signal analysis gallery, pursuers and a required security calibration |
| 14 | Kinetic exhibit, three recorder cartridges, unidentified figures and a releasable counterweight |
| 13 | Education wing; gallery exit calibration |
| 12 | Research power; restore Lift B and hear the warning |
| 11 | Hidden classroom and optional mathematical cache |
| 10 | Enclosed conference hall |
| 9 | Archives and a trapped Guidebot |
| 8 | Robotics lab; maintenance shaft to Floor 6 |
| 7 | Fibonacci garden |
| 6 | Metrology laboratory and emergency lighting |
| 5 | Observation glass and the Watcher |
| 4 | Ten-unit power allocation; optional emergency battery |
| 3 | Researcher encounter and invitation |
| 2 | Dented lift ceiling and restart instrument |
| 1 | Sealed campus doors and a different lobby |
| B1 | Generator machinery and steam hazards |
| B2 | Voss’s acted research recording |
| B3 | Boundary apparatus, upside-down Tower, final override and breach |

There are **nine required mathematics systems and three optional caches**. The final override checks all upstream requirements. It starts the escape, not the completion screen. Completion requires reaching the campus exit in the Floor 1 lobby.

Public Lift A serves 18–10. Research Lift B serves its authored stops after Floor 12 power restoration. Freight Lift C serves 8, 4, 1 and B2 after allocation on Floor 4. Both enclosed fire stairs connect every adjacent floor, including B2↔B3. Walk through the fire door and take the left flight to ascend or the right flight to descend. Walk across the half-height landing and back along the return flight. Movement stays under player control, and reversing partway is possible. E at a stair door provides directions; it does not teleport the player. Each core has 22 risers per 3.9-metre storey, 280-mm treads, two 1.35-metre-wide flights, intermediate landings and handrails. Progress gates are enforced at the entry to the next flight. Adjacent floors stream at the landing; the game does not render 21 full interiors simultaneously.

For elevators, E at the call button opens the landing/cabin doors. Walk into the car and press E at its controls to select a served, unlocked floor. The real cabin surrounds the passenger during the ride, doors close, the indicator changes floor, and the destination doors open before the player walks out. Ride duration varies with distance. Power and story gates still apply. Landing enemies can shoot into an open car; a closed door blocks their darts. The ride itself is a safe transition between room instances. The 8→6 maintenance shaft remains an additional route. The former decorative escalators have been removed. Lifts cannot skip unrestored mathematics, the two upper-floor security objectives, or unvisited key story events on the first descent. Backtracking and the escape use already restored routes.

The explorer is a civilian in a sweater and trousers, with an uncovered face. The older researcher has a separate face and jacket. Mara Voss has her own female model in the B2 recording, using native female idle/run/walk motion. All three use skeletal animation. Assets are normalized to face local +Z; player and companion orientation follows their actual movement, including sliding along obstacles. The introduction includes a closer face shot.

## Action and choices

WASD/arrows move relative to the camera; Space vaults low obstacles. Move the mouse to aim and click to fire, or face a direction and press X. Q turns the explorer 180 degrees. Hold Shift with arrows to turn in place. Touch controls include Fire, Turn and a holdable Aim button. Z/V or right mouse drag turns the camera. E uses nearby instruments, lift controls, records and characters; P/Escape pauses. Stair movement uses WASD/arrows directly.

The explorer carries a visible stun pistol, with two-handed aiming, a muzzle flash, a brief shot trace and a directional sight marker. A shot hits the first body in an eight-metre line. Walls, glass and tall cabinets block it. There is no radial combat effect or automatic targeting behind the player. A hit stuns for four seconds; the pistol recharges for 1.25 seconds. The HUD shows readiness and nearby pursuit. Freeing the archive Guidebot extends the range to ten metres.

C is a defensive shove: one opponent directly ahead, within 1.35 metres. The left arm extends, the opponent moves backward, its aiming windup is interrupted and it staggers briefly. Collision checks stop the shove at walls. A miss gives explicit feedback. Shoving is for creating an escape gap, not defeating a room of opponents.

The antagonists are manufactured security androids: articulated ceramic armour, visible metal joints and actuators, optical sensors and stun pistols. Native walk motion is paced to actual movement; an android stops moving its feet when it scans, aims or holds cover. Patrols creep and pause. Alert androids seek concealed positions, pause behind obstacles, edge out to aim, telegraph a locked shot and retreat. Darts visibly travel and can be dodged; walls block them. Lower stair landings have additional sentries that activate when the player enters their staircase. The player can mouse-aim up/down the stairs. These are room-local patrols and sentries, not a simulation of enemies travelling freely through all 21 floors. Friendly Guidebots remain institute equipment.

**F performs a close-range takedown**, distinct from C's quick shove. Face an android within 1.85 metres and with clear line of sight. Twelve different pose sequences rotate without repetition inside a cycle: crane counter, boxing combination, spinning back kick, capoeira wheel, shoulder throw, rising knee, leg reap, low sweep, butterfly kick, leaping side kick, slip-and-uppercut and turning heel. A brief dry remark accompanies each. The moves are theatrical game choreography, not martial-arts instruction. A successful impact knocks out one android; its body stays on the floor. Defeated encounter IDs and repertoire progress persist in the save, with separate patrols for the escape. The collection repeats after all twelve techniques have been used. Mathematics freezes these animations and attacks too.

The shared building now has a **36-by-32-metre footprint**, 3.9-metre storeys and full 3.35-metre ceilings. An interior-height, collision-limited camera replaces the dollhouse view. There are full perimeter walls with actual window openings, aligned shafts, enclosed fire stairs, framed doors, staff rooms, toilets and cubicles, washbasins, mirrors, recessed lights, vents, sprinklers and fire equipment. Desks have chairs, keyboards and everyday objects. No gameplay ceiling or near wall is cut away. Static architectural geometry is batched to reduce rendering cost. Software-rendered browsers use a lower internal resolution and smaller shadow map; UI text remains at native resolution.

The helicopter is a locally bundled EC135 aircraft model with transparent glazing, a visible human pilot and headset, cockpit/seat detail, main and tail rotors and landing lights. The emergency landing includes wind-driven roll, skid contact, a suspension rebound and rotor coast-down. Torrential diagonal rain, expanding surface ripples, splash particles, wet reflective puddles, rotor spray and a gusting windsock share the storm motion. These are real-time authored effects, not fluid or aerodynamics simulation; puddles use environment reflections rather than ray tracing. See the asset credits for the aircraft source and GPL license.

Steam hazards cycle in machinery rooms. Losing all three hearts restores the player near the current stairs while preserving mathematics, fragments and choices. Supplies restore health; the optional battery protects the opening seconds of each escape floor. The invited researcher follows and can pull the player clear of an escape attack with a cooldown. Freight enables an escape shortcut from B2 to the lobby. The mutually exclusive power allocations retain their existing gameplay consequences.

## Story and learning

All thirteen principal story beats are staged as in-engine scenes, with an additional breach-to-escape handoff and short choice reactions. Characters and machinery animate in the same environments used for play. Subtitles are always available; optional speech uses installed browser voices. Synthesized sound is not recorded voice acting. Scenes can be skipped, paused, replayed from the pause menu and resumed after interruption. The current cinematic cut is shorter than the earlier written treatment; it adapts its beats rather than claiming its exact shot durations.

Mathematics freezes the simulation and costs no health on mistakes. Answers are typed numbers, decimals or fractions. Worked help requires a checked answer for each intermediate calculation. Leaving a panel or reloading preserves the checked steps. The E key that opens a panel and its held-key repeats are consumed before they can type into the answer field. A lone stray E saved by an older build is cleared; deliberate numeric drafts are retained. Foundations and Readiness use the existing replaceable banks; this release does not claim to transcribe all uploaded worksheets or provide symbolic algebra grading.

## Files, saves and checks

`towers/tower-0001.js` owns both the earlier 2D definition and the `midnightTower` 3D room/scene/socket definition. Shared renderers, actor loading, materials, simulation and state rules live in `engines/midnight/`. All runtime dependencies, character assets and lighting are local; see [asset provenance](../assets/realism/CREDITS.md). Static GitHub Pages/Vercel deployment still needs no build, server API or keys.

The complete 3D save key is `mathTower.midnight.tower1.v2`. Opening-study and 2D saves remain stored independently; checked work is not silently transferred to different questions. The current-floor position, mathematical progress, choices, fragments and pending cinematic are saved. Existing saves that already passed the upper security rooms retain passage; saved positions inside new structural walls are moved to a safe landing. Saving midway through a staircase resumes at its current-floor entrance, preserving progression and checked work. If browser storage is blocked, play remains available for the session.

Run `npm test`, `npm run check`, `python tests/browser.py`, and `python tests/midnight_browser.py`. Node tests traverse every progression state, exercise the transport and learning gates, and pathfind all rendered rooms to verify access to targets. Browser checks render all 21 rooms and exercise keyboard/touch input, saved help, choices, interrupted scenes, the final override, escape stairs, freight travel and campus completion using saved checkpoint fixtures. They are not a claim of testing every route on physical mobile hardware.

Character changes additionally run `python tests/actors_browser.py`. Combat/architecture changes run `python tests/combat_browser.py`, which exercises actual fire/turn/shove controls, wall blocking, aim-in-place, the early security objectives, touch controls and wide-screen rendering. It checks the actual animated face direction against displacement from all eight keyboard directions and verifies that the civilian assets load, with a capture of the introduction's face shot. The Node tests exercise shipped human clips and anatomy, directed hit selection, cover, shove collision, cover selection, dodgable darts, stair surfaces, varied takedowns, opening gates and old-save migration. The unused spider primitive remains a legacy asset utility, not a 3D encounter.

`python tests/rebuild_browser.py` additionally checks the aircraft rotor pivots, visible pilot, all twelve takedown poses, and a live half-landing sentry firing darts and being defeated through the actual F control. These checks use temporary HTTP-response instrumentation; the published game exposes no test hooks.
