# Adventure and bank contracts

**Only Tower 1 is authorized for implementation now.** This contract describes extension points for later work; it is not an instruction to create more content.

## One file per adventure

A Tower definition exports an object from `towers/tower-NNNN.js`. Interludes will use `interludes/interlude-NNNN.js`. A file owns its ID, title, brief, ending, geometry, transport, objects, encounters and math sockets. Shared simulation/rendering stays in `engines/`; loading, state and UI stay in `core/`.

For a Tower, `floors` is an ordered list of displayed labels, top to bottom. Object `floor` values and transport stops use zero-based indices into that list. Floor heights and widths belong to the definition, not to a global campaign constant. Current supported bounds are width 960–2400 and floor height 110–200.

Stairs contain `{x, from, to}` and provide the always-available traversal graph. Lifts contain an ID, x coordinate and sorted stop indices. A lift may require a solved panel (`unlock`) or a story flag (`unlockFlag`). Every floor must remain reachable via the safe stair graph. A future genuinely different topology needs engine and validator changes, not misleading data accepted by an incompatible engine.

Each math gate has a stable local ID, label, floor, x coordinate and `socket: {topic}`. Required gates omit `optional`; optional ones set it to true. A gate may list `requires` IDs. Prerequisites must exist and form an acyclic graph. The HUD derives its denominator from required gates. Exit checks are independent of the UI.

Inspectable objects carry text and optional choices. They are not formal answer-choice quizzes. Choices can set a named flag or use a supported engine action. Keep consequences explicit and preserve safe routes. Add new behavior to the shared engine with a tested contract instead of placing arbitrary unvalidated executable strings in a level.

The engine provides `update`, `render`, `status`, `snapshot`, `finishGate` and optional `encounterResult`. It receives a small API for challenges, completion, messages, input, audio and story flags. The browser coordinator owns all dialogs and persistence. No global debug or answer API is exported.

## Registering a future stage

When requested and sufficiently scripted, add its separate module, catalog entry and explicit dynamic import in `core/campaign.js`, plus the required engine. Campaign IDs already alternate correctly through the 1,999 planned positions. Never register unavailable modules or generate repetitive filler to satisfy the planned count. Update the current-scope guard and tests only when the user expands the scope.

## Math sockets

`math/bank.js` resolves a socket using bank ID, campaign seed, stage ID and gate ID. Reopening a panel or reloading must produce the same question and steps. The Foundations adapter uses the socket topic; Readiness demonstrates replacing content independently of the world. Custom banks prefer matching topic tags and otherwise draw from the entire imported bank.

A problem contains prompt, numeric answer, hint, skill label, and one or more checked steps `{prompt, answer}`. Each intermediate prompt should ask for a real calculation that leads toward the answer. Do not reveal later steps or their expected answers before the learner produces each result. The final step must yield the main answer.

All imported strings are rendered as text. The supported custom format is JSON version 1, up to 200 KB and 200 items, with 1–8 checked steps per question. See `math/banks/example-custom.json`. Shape validation cannot prove that a teacher's question is mathematically correct; review imported banks before use.

Numeric equivalence uses exact rational arithmetic. Integers, decimals, fractions and mixed numbers are supported. Invalid formats and division by zero are rejected. There is no `eval`, symbolic-equivalence guessing or rounded-answer tolerance. Add new answer kinds deliberately with corresponding validation, guidance, accessibility and tests.

## Saves and verification

The save envelope is versioned and namespaced independently of previous games. Preserve stable stage/gate IDs. Changes that alter questions for an existing seed need a save migration or a bank version change; do not reuse partially checked steps for a different question.

Use `npm test` for math, graph, state and full engine traversal, `npm run check` for authored availability, and `python tests/browser.py` for UI, persistence and hosting-path checks. A successful server launch alone does not validate the game. Tests must not label planned content as completed.
