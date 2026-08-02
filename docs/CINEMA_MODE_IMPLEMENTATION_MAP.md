# Cinema Mode implementation map

> This file describes the original documentary-studio integration baseline. The
> current ACSS predictive-author architecture and its completed acceptance map are
> documented in `ACSS_PREDICTIVE_AUTHOR_IMPLEMENTATION_REPORT.md`. Where this
> historical map describes a capability as gated or unavailable, the current
> implementation report is authoritative.

## Existing integration surfaces

- `src/app.js` owns the authoritative simulation, event stream, save/load lifecycle, render loop, Three.js camera, Movie mode state and browser speech playback.
- `src/documentary-director.js` already supplies deterministic shot templates, camera candidates, transitions and shot-health evaluation.
- `src/documentary-narration.js`, `src/documentary-language-library.js` and `src/documentary-scenario-library.js` already supply evidence-derived template narration.
- `src/simulation-clock.js`, `src/reproduction-events.js`, `src/carnivore-behavior.js`, `src/group-dynamics.js`, `src/group-naming.js`, `src/social-relationships.js`, `src/kinship.js`, `src/bereavement.js`, `src/ecological-accounting.js` and the authoritative action state provide event evidence.
- `index.html` and `src/styles.css` contain the existing Movie mode control surface.
- `tests/documentary-director.test.mjs`, `tests/documentary-narration.test.mjs` and `browser-tests/movie-mode.spec.js` are the existing documentary gates.
- The project is native browser ESM with Node's built-in test runner. The companion is therefore a separate Node ESM package using built-in facilities where practical.

## Compatibility approach

The existing Movie mode remains the visual presentation layer. The new `src/documentary/` modules add a versioned observation, story, editorial, persistence and companion-client layer without moving authoritative simulation behavior or consuming its random stream. `src/app.js` adapts authoritative state into that layer and receives deterministic direction/narration decisions. The companion stores sessions and controls optional external services; absence of the companion preserves template narration and ordinary Movie mode.

## Risks and controls

- The worktree contains extensive user-owned uncommitted changes. New work is isolated in new paths and narrow integration edits.
- `src/app.js` is large and stateful. Integration uses a small facade and existing Movie lifecycle hooks.
- Browser speech already exists. Piper playback is optional and falls back to the existing implementation.
- Not every requested ecological concept has an explicit authoritative transition. Unsupported detectors are registered as capabilities rather than inferred from presentation.
- Browser media replay is expensive. The implementation records replay source/presentation time and provides a bounded metadata buffer; encoded video replay remains capability-gated.
- External services may not be installed. Clients, health checks, controlled fakes and safe degradation are implemented without downloading runtimes or models.
- A six-hour wall-clock test is not suitable for routine CI. Bounded-clock soak fixtures exercise equivalent queue and memory behavior; real commissioning remains an operator gate.

## Phase gates

1. Baseline: `npm.cmd test` passes (506 tests at audit time).
2. Documentary core: schemas, records, clock, event/range tracking, evidence, biographies, stories, promises, predictions, editorial windows and browser buffering pass unit tests.
3. Direction and narration: portfolio switching, shot grammar, factual packets, validation, queue expiry and fallback pass unit tests and existing Movie tests.
4. Companion: authentication, sessions, append-only idempotent writes, recovery, health, Ollama/Piper/OBS degradation and exports pass integration tests.
5. Browser integration: Movie mode creates/finalizes documentary sessions, logs events/camera/narration and exposes the dashboard without changing authoritative snapshots.
6. Full validation: syntax, logic, browser smoke where available, secret/path review and documentation.
