# The Midnight Museum — selected direction and playable proof

The user selected **C: The Midnight Museum** after a study of 100 conceptual visual directions and six original illustrated finalists. The chosen format is cinematic story scenes plus playable arcade action. The new version is being rebuilt around dimensional rooms and expressive characters, independently of the original Elevator Action visual layout.

## What is playable now

`midnight/index.html` contains a new 3D opening proof, separate from the original complete Tower 1. It demonstrates:

- An animated helicopter approach and landing, multiple camera shots, subtitles, synthesized ambience and optional device-generated speech.
- A smooth handoff to keyboard or touch movement, jumping over low obstacles, a rooftop access instrument and a physically opening door.
- A museum chamber with columns, arches, a moving pendulum, suspended polyhedra, rotating geometric rings and an animated damaged Guidebot.
- Three Skitters with approach, anticipation, attack and stun states; a radial stun pulse; three collectible memory fragments.
- A second typed math instrument that aligns the exhibit and opens a passage with depth and suspended geometry; a short cinematic ending.
- Saved position, collected fragments, solved instruments and checked help progress. Original campaign saves remain independent.

This is **not the full Tower 1 rebuild**. The proof compresses the descent between selected roof and museum scenes; it does not reproduce all 21 floors or all thirteen cinematic sequences in the treatment. No additional Tower or Interlude has been implemented.

The illustrations define the art target. This build uses original procedural 3D prototype models, not finished feature-film models, rigs, recorded performances or production animation. Device speech is optional and depends on the browser's installed voices; subtitles always carry the dialogue. Runtime assets are local, including vendored Three.js r170 under its MIT license. No CDN request or build step is needed.

## Controls and mathematics

WASD or arrows move relative to the action camera. Space jumps, X sends a short-range stun pulse and E uses a nearby instrument. P or Escape pauses. Touch controls provide the same actions. The pulse has a brief recharge; a Skitter's crouch signals its attack.

Choose Readiness (fractions, percentages and numerical equation answers) or Foundations (gentle arithmetic) before starting. Both instruments draw deterministic variants from the existing replaceable banks. Formal answers are typed. The simulation and enemies pause during a problem; mistakes cost no health. Worked help requires a correct intermediate input before the next step appears. Closing or reloading retains the checked steps. These are starter banks, not a new transcription of the uploaded PDF collections.

Losing all hearts returns the explorer to the gallery entrance and preserves learning and collected fragments. Skipping a cinematic returns to its intended gameplay state. Reduced camera motion is available in Pause. Browser storage failures preserve the session and show a persistence notice in Pause.

## Architecture and checks

Tower-specific scenes and sockets are the named `midnightOpening` export in `towers/tower-0001.js`. Shared rendering, actors, audio and coordination live in `engines/midnight/`. The old engine remains available at the original root page while the new direction is reviewed. The original root links to the new opening.

Run the original checks and the additional opening browser check:

```sh
npm test
npm run check
python tests/browser.py
python tests/midnight_browser.py
```

The new browser test covers cinematic handoffs, real keyboard movement, both math gates, harmless errors, guided-step persistence, fragment triggers, the opening ending, mobile touch and local-only requests under a GitHub Pages prefix. Checkpoint fixtures cover room interactions; this is not a claim of a continuous automatic traversal of every path or a real-device performance benchmark.

The next production stage is to review movement and visual presence in this proof, refine the assets, then rebuild the rest of the first Tower from its complete script and cinematic treatment.
