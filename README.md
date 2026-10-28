# Math Tower

A modular browser adventure based on **Math Tower Evolution**. Explore a university mathematics museum after a dimensional experiment goes wrong. Every formal answer is typed; worked solutions reveal one calculation at a time after a correct input.

**Current release: Tower 1 only — The Night Everything Went Wrong.** There are no implemented Interludes or additional Towers. The full campaign target is **1,000 Towers plus 999 math-supported Interlude games**, totaling 1,999 adventures. Future levels will be implemented from their completed scripts when requested.

**Play the complete 3D Tower:** [The First Correspondence](midnight/). The rooftop opening now continues through all 21 floors to the basement breach and the escape back to campus. The latest art direction is a serious research-institute mystery, with human-scale animated characters, weathered materials, dramatic lighting and a rewritten introduction. See [the full 3D feature and scope guide](docs/TOWER-1-3D.md). The earlier 2D adaptation remains at the repository root for comparison.

In the 3D version, **WASD/arrows move, Space jumps, X sends a stun pulse, C shoves and E interacts** with nearby stairs, lifts, instruments and people. P/Escape pauses. Touch controls provide the same actions. Mathematics pauses the scene; each step of worked help still requires a checked input.

## Earlier 2D adaptation

Start on Floor 18, descend through the museum and research areas to B3, restore the campus override, and return to the Floor 1 lobby to escape. The current playable adaptation includes:

- 18 above-ground floors and three basements; two main elevators, an optional freight lift, stairs, escalators and a maintenance ladder shortcut.
- **Nine required math panels and three optional panels.** The script's twelve numbered sockets include optional routes; the HUD counts the nine required ones accurately.
- Skitters, damaged Guidebots, pulse stuns, close-range shoves, jumping and a non-attacking Watcher silhouette.
- Inspectable records, recordings, a trapped Guidebot, a researcher you can invite along, and a ten-unit power-allocation choice affecting the freight lift or lower patrols.
- Optional medical supplies and an emergency battery that grants protection during the escape.
- A Foundations bank, a small Readiness bank, and importable numeric teacher banks. These are starter practice generators, not a complete SHSAT curriculum or a transcription of earlier PDF collections.
- Local saves for position, panels, choices, checked help steps and practice records. All formal math pauses action; incorrect answers cost no health. Losing all three hearts restores you to the current floor's stairs without discarding solved work.

Q.E.D. is mentioned in the museum material and is **not** recruited in Tower 1. Campus Sprint is deferred along with all later adventures. The first release uses procedural canvas art, text dialogue and synthesized effects; it does not reproduce every proposed cinematic or optional exhibit from the design document.

## Earlier 2D controls

| Control | Action |
| --- | --- |
| A/D or ←/→ | Move |
| Space | Jump |
| ↑/↓ or W/S | Use stairs/escalators at their marked landings; call or ride a lift |
| E | Open a panel, inspect a record, talk or escape through the lobby |
| X or Z | Fire a non-graphic stun pulse |
| C | Close-range shove/stun |
| P or Escape | Pause |

To use an elevator, stand at its shaft and press ↑ or ↓. If the car is elsewhere, this calls it; press again when it arrives to ride to the next served floor. Research Lift B needs its Floor 12 power panel. Freight Lift C needs the Floor 4 power allocation. The stairs always provide a valid route. Touch controls are below the scene.

## Modular layout

```text
index.html                    Browser entry point
styles.css                    Interface styling
assets/                       Local theme and icon
core/                         Campaign IDs/loading, input, saves, UI, audio
engines/tower.js               Shared Tower simulation and drawing
towers/tower-0001.js           Tower 1's geometry, encounters, story and math sockets
interludes/                   Reserved for separately authored Interlude modules
math/
  banks/                      Independent curriculum adapters
  generators.js               Seeded numeric problem families
  answer-checker.js           Exact numeric/fraction equivalence
  guided-solutions.js         Checked, sequential working
  bank.js                     Bank selection and safe JSON import validation
docs/                         Scope and authoring contracts
tests/                        Engine/math and browser checks
tools/                        Local server and campaign validation
```

Each adventure owns one module. Shared engines own behavior; math banks own learning content. `core/campaign.js` reserves the complete alternating sequence but lazily imports only authored, registered adventures. It never presents missing stages or repeated filler as finished content.

## Run locally

No application dependencies, build step, database, Python-in-the-browser or API keys are required. With Node 22 or newer:

```sh
npm run dev
```

The development server uses port 3000 by default. Alternatively serve the repository with any static HTTP server. ES modules need HTTP: opening `index.html` directly with `file://` is not the supported workflow.

**Serve the entire repository structure**, not just `index.html`. All runtime assets are local, and all paths are relative to support deployment beneath `/Math-Tower/`.

## Deploy

**GitHub Pages:** open repository **Settings → Pages**, choose **Deploy from a branch**, then **main / (root)** and Save. The expected address after deployment is:

`https://vorontzov.github.io/Math-Tower/`

The URL becomes live only after Pages has been enabled and successfully deployed. `.nojekyll` preserves the static tree. The CI workflow checks the game but does not enable Pages automatically.

**Vercel:** import `Vorontzov/Math-Tower`, choose **Other**, leave the build command empty, and serve the repository root (`.`). No environment variables are needed. Keep every module and asset in the deployment.

## Math banks and saves

Choose Foundations for gentle arithmetic or Readiness for fractions, percentages and two-step equations. Changing banks begins a new expedition; Continue retains the saved bank, question seeds and checked steps.

Use **Import a teacher's question bank** with the format in [the example bank](math/banks/example-custom.json). The app validates structure, answer formats and the final guided step. The author must still review the mathematical correctness and teaching quality of imported material. It does not run imported code or insert imported HTML.

This version accepts integers, signed decimals, fractions and mixed numbers with exact equivalence. It does **not** yet grade symbolic algebraic expressions, inequality intervals, root sets or proofs. The equation generator asks for the numerical value of x. Simplest-form-only assessment and rounded-answer tolerances are also future capabilities, not silently approximated here.

Saves use `mathTower.campaign.v1`, independently of the Spy Academy games. They remain on the same browser/device and origin. Hosting on a different domain starts a separate save. If storage is blocked, the game stays playable for the session and explains that persistence is unavailable.

## Checks

```sh
npm test
npm run check
```

The Node tests cover the full reserved sequence, Tower 1 reachability, prerequisite cycles, 10,000 seeded questions checked against independent arithmetic, guided-step progression and reloads, custom banks, invalid saves, transport, optional choices, and a complete roof-to-basement-to-lobby traversal through the actual simulation controls.

Optional browser checks need Python, Playwright and Chromium:

```sh
python -m pip install -r requirements-dev.txt
python -m playwright install chromium
python tests/browser.py
python tests/midnight_browser.py
```

`CHROMIUM_PATH` can select a browser; otherwise the test uses system Chromium when available or Playwright's installed browser. The test manages its own HTTP server. It checks a `/Math-Tower/` deployment prefix, keyboard and touch, paused maths and harmless errors, checked-step persistence, the final escape from a saved checkpoint, teacher-bank import, fraction equivalence, mobile layout, blocked storage and local-only runtime requests. The Node test covers the complete traversal; the browser test uses checkpoint fixtures for the late-game escape.

The additional 3D tests cover the full 21-floor progression, room accessibility, transport/story gates, all rendered rooms, optional choices and the return-to-lobby escape.

See [the authoring contract](docs/AUTHORING.md) and [scope decisions](docs/DESIGN.md) before adding content.
