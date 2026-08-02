# RSS Living Laboratory — Developer Handover

## Run and test

Requirements are a modern WebGL browser and Node/npm for tests. Install with `npm install` (or `npm ci` from the lockfile). Run `./run.ps1`; it selects an available port from 8017–8027 and serves with no-cache headers. Do not open `index.html` directly because ES modules/CDN imports and browser storage are intended to run over HTTP.

Normal lightweight verification:

```powershell
npm run test:static
npm run test:logic
npm run test:browser
```

`npm run test:normal` runs all three. The smoke project uses one headless Chromium worker and reduced `?testMode=1` simulation. Full visual browser checks are explicit: `npm run test:browser:visual`. Phase 6 query scaling is `npm run benchmark:phase6`. Close tests through Playwright's lifecycle; do not launch graphical browsers for routine edits.

## Where things live

- Entry/UI: `index.html`, `src/styles.css`, `src/app.js`.
- Simulation orchestration: `app.js:tickWorld`; stable entity order in `src/simulation-phases.js`.
- World/map: `app.js:createWorld`, terrain/weather/hydrology helpers; `src/hex-world.js`.
- Animals/behaviour: `makeAnimal`, `sense`, `actionCandidates`, action helpers in `app.js`.
- Structured actions: `src/action-state.js`.
- Evidence/privacy: `src/decision-trace.js`.
- Presentation semantics: `src/presentation-snapshots.js`.
- LOD/budgets/minimap invalidation: `src/presentation-budget.js`.
- Animal roots/resources: `src/animal-visual-structure.js`, `src/resource-ownership.js`.
- Corpse/trail/fog/chunks: corresponding focused modules and `app.js` render helpers.
- Profiler/hash: `src/diagnostics.js`.
- Persistence: `app.js:snapshotWorld`, `activateSnapshot` and save helpers around lines 2455–2510.
- Tests: `tests/*.test.mjs`; browser tests under `browser-tests/`.

## Safe change rules

Keep simulation truth, decision traces, snapshots, visual events, frame animation and GPU resources separate. Never infer action meaning from labels; never reconstruct decision cause from later contacts/hunt targets; never treat a destination as evidence. Presentation/profiler state must not become authoritative save state. Preserve RNG call order during performance work. Dispose only resources marked entity/chunk/temporary; shared geometry/materials must outlive individual entities.

Before a simulation change, run `tests/authoritative-state.test.mjs` and record accepted hashes. If correctness intentionally changes results, add a focused test, explain the change and update hashes only after review. Before a presentation-only change, the authoritative hash must remain unchanged.

## How to add a new action

1. Add the exact key and label/posture to the exhaustive `ACTION_PRESENTATION` map in `src/action-state.js`.
2. Add a candidate/behaviour path that calls `setAction`; specify target, destination, intended outcome, moving flag, readable label and reason as applicable.
3. Make stationary actions clear movement; movement failure must call `setBlockedAction`; arrival must clear destination.
4. Ensure `captureChosenDecision` records decision-time evidence/constraints without mutable references.
5. Add action-state mapping/lifecycle, snapshot/privacy and deterministic tests. Do not parse the label anywhere.

## How to add an entity/species

Add authoritative species constants and initialise all required fields through `makeAnimal` or a dedicated constructor. Define diet/capabilities, sensing and candidate interactions, reproduction/life stages and death/corpse metadata. Add topology in the structural visual builder and stable `userData.parts`; prefer shared base resources. Add save migration/defaults, index membership and cleanup. Test spawn, sensing/action, selection, death/removal, save/load, reset and deterministic order.

## How to add terrain or vegetation

Add a cell truth field/classification in world generation and save migration. Trace its effects into mechanics before adding colour. Map it to a fixed-size landscape chunk and mark only affected terrain/water/vegetation dirty sets. Add minimap/static invalidation and the legend. Test chunk boundaries, observer movement, hydrology, save/load and reset. Avoid coupling observer position to data rebuild.

## How to add UI, symbols and statistics

Define semantic HTML in `index.html`, style it in `styles.css`, cache the element in `app.js`'s UI map and bind one clear handler. A diagnostic control must not mutate simulation truth unless explicitly intended. Add symbols via a cached shared canvas material or existing parts, document privacy/channel requirements and add them to the visual legend. Prefer counters maintained by mutations or bounded/throttled calculation; mutate existing DOM nodes. Do not save a derived statistic as truth if it can be recomputed.

## Save migration

Current schema is `WORLD_SCHEMA = 2`. `snapshotWorld` is the allow-list boundary. When adding authoritative state, supply defaults for older snapshots and validate/clamp values during activation. Do not serialize Three.js nodes, `visualMove`, trail buffers, visual event wall times, presentation caches or profiler rings. Reset interpolation/trails after load/reset/teleport.

## Testing map

| Change area | Minimum focused tests |
|---|---|
| Actions/movement | `action-state`, `presentation-snapshots`, authoritative state |
| Evidence/privacy | `decision-trace`, snapshot tests, browser selection smoke |
| Health/events/traces | matching module tests + clock/bounds cases |
| Visual roots/resources | `animal-visual-structure`, `resource-ownership`, browser smoke |
| Corpses/perception | `spatial-index`, `cell-visitation`, `corpse-visual-cache`, Phase 6 benchmark |
| Tick order | `simulation-phases`, authoritative repeatability/long run |
| Chunks/fog | `landscape-chunks`, browser visual/follow/reset |
| LOD/budgets/UI/minimap | `presentation-budget`, browser smoke/visual |
| Any source edit | `npm run check`; relevant logic; lightweight browser if startup/render can change |

## Architecture cautions

`src/app.js` remains a large global-state coordinator. Small focused extractions are preferable to a wholesale ECS rewrite. Landscape rendering is the dominant draw-call concern in measured scenarios; animal instancing is not justified until comparable profiling proves animal bodies dominate and picking/instance mappings are designed. Preserve the legacy square-world/save compatibility path until a documented migration retires it.
