# Tower 1 — The First Correspondence

The complete first expedition now runs in 3D at `midnight/`. The original two-room proof has been expanded into all **18 above-ground floors and B1–B3**, followed by a playable return to the lobby and a campus ending. No other Tower or Interlude is implemented.

The latest direction is a serious, grounded mystery: restrained interfaces, realistic human proportions and skeletal animation, worn surface materials, HDR environment lighting, subdued effects and an unnerving research-institute atmosphere. The opening was rewritten around an institute that should be empty and an emergency transmission that contradicts its records. This is an original setting and narrative. It is a more realistic real-time art treatment, not a claim of film-quality photorealism or scanned environments.

## Expedition

| Floor | Environment / main event |
| --- | --- |
| 18 | Storm roof, helicopter arrival, first typed access relay |
| 17 | Reception, damaged Guidebot, optional emergency supplies |
| 16 | Lift vestibule; the display briefly reads 19 |
| 15 | Hall of Numbers; museum security |
| 14 | Kinetic exhibit, three fragments, Skitters, releasable sculpture |
| 13 | Children’s exhibition; gallery exit calibration |
| 12 | Research power; restore Lift B and hear the warning |
| 11 | Hidden classroom and optional mathematical cache |
| 10 | Suspended atrium |
| 9 | Archives and a trapped Guidebot |
| 8 | Robotics lab; maintenance shaft to Floor 6 |
| 7 | Fibonacci garden |
| 6 | Impossible laboratory and emergency lighting |
| 5 | Observation glass and the Watcher |
| 4 | Ten-unit power allocation; optional emergency battery |
| 3 | Researcher encounter and invitation |
| 2 | Dented lift ceiling and restart instrument |
| 1 | Sealed campus doors and a different lobby |
| B1 | Generator machinery and steam hazards |
| B2 | Voss’s acted research recording |
| B3 | Boundary apparatus, upside-down Tower, final override and breach |

There are **nine required mathematics systems and three optional caches**. The final override checks all upstream requirements. It starts the escape, not the completion screen. Completion requires reaching the campus exit in the Floor 1 lobby.

Public Lift A serves 18–10. Research Lift B serves its authored stops after Floor 12 power restoration. Freight Lift C serves 8, 4, 1 and B2 after allocation on Floor 4. Stairs connect every adjacent floor, including B2↔B3; escalators and the 8→6 maintenance shaft provide additional routes. Lifts cannot skip unrestored mathematics or unvisited key story events on the first descent. Backtracking and the escape use already restored routes.

## Action and choices

WASD/arrows move relative to the camera. Space jumps. X sends a radial stun pulse; C shoves at close range. E uses nearby instruments, doors, stairs, lifts, records and characters. P/Escape pauses. Touch buttons provide the same actions.

Skitters approach, visibly prepare, then rush. Damaged Guidebots appear in later rooms. Steam hazards cycle in machinery rooms. Losing all three hearts restores the player at the current stairs while preserving mathematics, fragments and choices.

Freeing the archive Guidebot increases pulse range. The emergency supplies restore health. The optional battery protects the opening seconds of each escape floor. The researcher follows if invited and can pull the player clear of an escape attack, with a cooldown. Freight enables an escape shortcut from B2 to the lobby; ventilation clears lower patrols before the breach. Power choices replace one another rather than stacking beyond the budget.

## Story and learning

All thirteen principal story beats are staged as in-engine scenes, with an additional breach-to-escape handoff and short choice reactions. Characters and machinery animate in the same environments used for play. Subtitles are always available; optional speech uses installed browser voices. Synthesized sound is not recorded voice acting. Scenes can be skipped, paused, replayed from the pause menu and resumed after interruption. The current cinematic cut is shorter than the earlier written treatment; it adapts its beats rather than claiming its exact shot durations.

Mathematics freezes the simulation and costs no health on mistakes. Answers are typed numbers, decimals or fractions. Worked help requires a checked answer for each intermediate calculation. Leaving a panel or reloading preserves the checked steps. Foundations and Readiness use the existing replaceable banks; this release does not claim to transcribe all uploaded worksheets or provide symbolic algebra grading.

## Files, saves and checks

`towers/tower-0001.js` owns both the earlier 2D definition and the `midnightTower` 3D room/scene/socket definition. Shared renderers, actor loading, materials, simulation and state rules live in `engines/midnight/`. All runtime dependencies, character assets and lighting are local; see [asset provenance](../assets/realism/CREDITS.md). Static GitHub Pages/Vercel deployment still needs no build, server API or keys.

The complete 3D save key is `mathTower.midnight.tower1.v2`. Opening-study and 2D saves remain stored independently; checked work is not silently transferred to different questions. The current-floor position, mathematical progress, choices, fragments and pending cinematic are saved. If browser storage is blocked, play remains available for the session.

Run `npm test`, `npm run check`, `python tests/browser.py`, and `python tests/midnight_browser.py`. Node tests traverse every progression state, exercise the transport and learning gates, and pathfind all rendered rooms to verify access to targets. Browser checks render all 21 rooms and exercise keyboard/touch input, saved help, choices, interrupted scenes, the final override, escape stairs, freight travel and campus completion using saved checkpoint fixtures. They are not a claim of testing every route on physical mobile hardware.
