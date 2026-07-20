# Developer architecture and verification guide

## Six separate layers

Keep these layers separate when changing the simulation:

1. **Simulation truth** — authoritative animal, corpse, terrain, weather and vegetation state. Only simulation ticks mutate it.
2. **Decision traces** — immutable decision-time snapshots containing the selected priority, action, evidence and constraints. Later sensing must not rewrite them.
3. **Presentation snapshots** — renderer-ready semantics built at most once per animal and simulation tick for the active access mode.
4. **Visual events** — bounded wall-clock attack, injury, call, priority and thought events. They do not become authoritative world state.
5. **Frame animation** — interpolation, posture animation, fading, camera/LOD decisions and mutation of existing Three.js objects.
6. **GPU resources** — geometries, materials, textures, instanced buffers and ownership/disposal policy.

Display text is output only. Never parse a label to recover action meaning or decision causation.

## Actions

`src/action-state.js` defines authoritative action keys and the exhaustive `ACTION_PRESENTATION`
mapping. An action state contains its exact key plus structured target, destination, intended outcome,
movement flag, label and optional blocked reason. `setAction()` is the transition boundary. Arrival and
stationary transitions clear incompatible destination/movement state.

To add an action safely:

1. Add one exact key to `ACTION_PRESENTATION`, with its posture and presentation style.
2. Use `setAction()` from the behavior; do not assign `currentAction` directly.
3. Supply target, destination, intended outcome, movement and readable label where applicable.
4. Decide whether the action is visually ambiguous enough to belong in `BADGED_ACTIONS`.
5. Add the key to the exhaustive action test and add focused lifecycle tests.
6. Run `npm run test:normal`; manually verify observer privacy and save migration.

`currentAction` remains compatibility/display data. It is not semantic input.

## Evidence and decisions

`decisionTrace` is captured when an action is selected. It contains tick, priority and score, trigger,
action key, target, destination, intended outcome, copied evidence snapshots, primary evidence ID and
constraints. Evidence references distinguish sight, smell, hearing, memory, communication, inference
and internal evidence. Memory changes `channel` to `memory` and preserves `originalChannel`.

Presentation explanations use the recorded trace. A destination or movement intent is never evidence,
and a later hunt target/contact cannot be used as a fallback cause. Observable-other mode is restricted
to body, posture, movement, visible injury, emitted signals and directly observed interaction.

## Clocks

- Simulation tick time controls physiology, sensing, decisions and world consequences.
- Wall time controls animation interpolation and minimum/expiry times for visual events.
- Profiler timing is diagnostic wall time only.

Changing simulation speed must not shorten wall-clock alert readability. Wall-clock fields, frame
interpolation and profiler samples are excluded from authoritative saves and hashes.

## Resource ownership

Resources are labelled `shared`, `entity-owned`, `chunk-owned` or `temporary` in
`src/resource-ownership.js`. Shared resources live for the application lifetime and must not be disposed
when one entity disappears. Entity/chunk/temporary resources must be released through targeted removal
or reset functions. Animal roots retain typed part references under `userData.parts`; transient state
changes mutate those children instead of rebuilding roots. Trails retain one geometry and typed buffer.

Corpse visuals persist by ID and are replaced only when their stage changes. Landscape and fog buffers
use their own cleanup paths on load/reset.

## Saves and migration

`snapshotWorld()` removes occupancy/index/hex-world caches, frame interpolation and RSS presentation
diagnostics. Loading rebuilds derived indexes and clears interpolation, trails, visual events and GPU
caches. Legacy animals without `actionState`, decision order or evidence provenance receive documented
defaults. Add a migration/default whenever a new authoritative field cannot safely be absent.

Never save presentation snapshots, profiler buffers, Three.js objects or wall-clock visual events as
world truth.

## Profiler and benchmark scenarios

Open `?profile=1`, then use `rssDiagnostics.clear()` and `rssDiagnostics.report()`. Each category keeps
only 240 samples and reports count, average, p95, p99 and maximum. Resource output includes renderer
calls/triangles/geometries/textures, visible entities, fog vertices, presentation tiers and overlay
budget counts.

Use the Phase 0 scenarios in `README.md` unchanged: paused-many-visible, normal, fast, following a moving
animal, many corpses/skeletons and Reality open. Use the same seed, population, viewport, browser,
machine and 30-second sampling duration for comparisons. Do not claim improvement when either side is
missing or settings differ. `npm run benchmark:phase6` is the CPU-only local corpse-query benchmark.

## Test levels

- `npm run test:static` — syntax checks.
- `npm run test:logic` — deterministic tests without a browser.
- `npm run test:browser` — one-worker, small-world headless smoke test.
- `npm run test:browser:visual` — explicit production-world browser check.
- `npm run test:normal` — static, logic and smoke.

Browser automation uses one headless Chrome worker. Failure artifacts are retained; servers and browsers
must be closed by Playwright. `?test=1` reduces rendering cost only and does not change production pages.

## Known audit limitation

Observer selection/focus handlers currently set the global `landscapeDirty` flag. The following render
pass can mark every vegetation chunk dirty, so observer-driven vegetation rebuild has not been fully
eliminated. This should be fixed and measured as a focused follow-up before merge; it must not be hidden
inside an unrelated redesign.
