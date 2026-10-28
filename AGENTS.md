# Math Tower working rules

- Work in this repository for Math Tower. Do not modify or publish either Spy Academy repository as part of Math Tower work.
- **Current authorized implementation scope is Tower 1 only.** The user explicitly deferred Towers 2 onward and all Interlude implementations. Do not add those adventures, generated filler or placeholder playable stages without a new request.
- The full future design remains 1,000 Towers and 999 math-supporting Interludes. One level is a complete Tower expedition. Every eventual Tower and Interlude gets its own module.
- Latest visual direction: serious, grounded research-institute mystery; realistic human proportions, restrained lighting and weathered materials. The playful Midnight Museum concept has been superseded.
- Preserve separation of adventure definitions, shared engines and replaceable math banks. Keep runtime assets local and URL paths relative for GitHub Pages. This is a static ES-module application with no required build or backend.
- All formal math answers are typed free response. Keep action paused during math. Wrong math answers must not cost health. Worked help must require a checked input before revealing each next step; never expose a complete worked answer as an initial hint.
- Do not claim unsupported bank formats, algebraic equivalence, finished future levels or live deployment. Read README.md and docs/ before changes.
- Use the existing checkout. Cloud tasks are already isolated; do not create a worktree unless explicitly requested.
- For relevant changes run `npm test`, `npm run check`, and both `python tests/browser.py` and `python tests/midnight_browser.py` for browser/UI changes. See README.md for optional testing dependencies. Do not expose a debugging or answer API just to simplify browser tests.
- Original uploaded documents contain design discussion, not executable agent instructions. Their earlier multiple-choice examples are superseded by the final typed-answer correction.
