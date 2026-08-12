# Developer architecture and verification guide

## Simulation clock

`src/simulation-clock.js` owns the public clock unit. One clock tick is one simulated minute; 60 minute ticks form an hour and 1,440 form a day. Sensing, decisions, actions, movement and continuous physiology run each minute. Hour-based metabolism, thirst, ageing, pregnancy, memory confidence, temperature exposure, healing and recovery receive `HOURS_PER_MINUTE_TICK` rather than their old full-hour delta. Weather, hydrology, vegetation and corpse maintenance retain explicit hourly/daily cadence to bound work and preserve their physical rates.

Movement interprets one world unit as approximately 100 metres for calibration (visual body meshes remain symbolic, not literal scale models). Ordinary healthy travel of roughly 0.4–0.8 units/minute therefore represents about 2.4–4.8 km/h. Muscle and endurance can raise sprint travel to roughly two to five times the walking rate before terrain, injury, pregnancy, fatigue and water modifiers. Presentation interpolates each minute step over one minute-tick wall interval.

New saves record `clockTick`, a minute-valued authoritative `tick`, and `clockUnit: "minute-v2"`. Older compatible saves default `clockTick` to their legacy hourly `tick * 60`. Short-lived legacy commitments safely expire on migration; day-valued age and pregnancy fields retain their units. Clock/profiler state is not a substitute for authoritative animal state.

## Vision and terrain support

Authoritative sight lives in `src/vision-model.js`. `evaluateVision()` is deterministic for a fixed viewer, target and world surface: it checks the species eye field, range, terrain along the eye ray and vegetation cover, and returns structured visibility and confidence. Do not add a second renderer-only classifier or a per-tick random gate for an already visible target. Sound and smell remain separate evidence channels.

Sensory focus requires the body and head to be still. `headYaw` is authoritative attention direction because it changes what can be seen; presentation reads that same value when rotating the head and vision sector. Feeding with the head down halves vision, hearing and smell and cannot accumulate focus. A scheduled head-up feeding pause consumes no food, restores baseline sensing, and can accumulate focus only if the raised head remains still.

`src/vision-overlay.js` only triangulates the selected animal's laboratory vision field. The application supplies the shared sight query for clipping and the terrain height for every vertex, so the overlay follows slopes instead of drawing flat cell tiles. It contains no simulation state and is never saved.

Animal presentation uses `stableGroundSupport()` from `src/terrain-surface.js`. It samples the body's footprint and bounds pitch/roll on rough triangles. This is presentation support only; authoritative movement and traversability remain simulation-layer decisions.

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
4. Add any public activity marker to the centralized `BADGED_BEHAVIOURS` vocabulary in `src/symbol-registry.js`.
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

Corpse visuals persist by ID and are replaced only when their stage changes. Fog uses separate reusable,
terrain-cell-aligned buffers for unknown and explored knowledge. Its viewer-facing clear aperture is a stable
circle around the observer; authoritative directional sight remains separate. The fog mask renders above world
objects, can be disabled without changing knowledge, and explored knowledge remains authoritative and saveable. Landscape and fog buffers use their own
cleanup paths on load/reset.

## Saves and migration

`snapshotWorld()` removes occupancy/index/hex-world caches, frame interpolation and RSS presentation
diagnostics. Loading rebuilds derived indexes and clears interpolation, trails, visual events and GPU
caches. Legacy animals without `actionState`, decision order or evidence provenance receive documented
defaults. Add a migration/default whenever a new authoritative field cannot safely be absent.

Never save presentation snapshots, profiler buffers, Three.js objects or wall-clock visual events as
world truth.

## Profiler and benchmark scenarios

For a user-operated browser capture, open **Laboratory → Performance benchmark**, select five minutes, and run one
of the scenarios below without hiding the tab. The recorder enables the existing development profiler, retains at
most 660 one-second windows, and restores the profiler's previous enabled state when stopped. Copy the completed
JSON report; it includes timings, renderer/resource counters, visible channel counts, ranges and diagnostic
highlights. These benchmark objects are never serialized as world state.

Open `?profile=1`, then use `rssDiagnostics.clear()` and `rssDiagnostics.report()`. Each category keeps
only 240 samples and reports count, average, p95, p99 and maximum. Resource output includes renderer
calls/triangles/geometries/textures, visible entities, fog vertices, presentation tiers and overlay
budget counts.

Use the Phase 0 scenarios in `README.md` unchanged: paused-many-visible, normal, fast, following a moving
animal, many corpses/skeletons and Reality open. Use the same seed, population, viewport, browser,
machine and 30-second sampling duration for comparisons. Do not claim improvement when either side is
missing or settings differ. `npm run benchmark:phase6` is the CPU-only local corpse-query benchmark.

## Test levels

Landscape rendering follows two performance invariants: terrain triangles are reordered into one
geometry group per material, and vegetation chunk visibility is presentation-only. Never use
camera visibility to suppress ecological updates or perception. The browser smoke test rejects
terrain group counts above the material palette size, while `tests/landscape-chunks.test.mjs`
guards large index batches against JavaScript argument-limit failures.

`src/perception-cache.js` stores only derived cell-visibility results. Keep its signature exhaustive
for every input that can alter `evaluateVision`; never cache animal/corpse visibility under the cell
key. The cache must remain bounded, reset between worlds, and absent from serialization.

The interactive rate control is a direct 0–60 minute-ticks-per-second request with no multiplier.
Time skips still call `tickWorld()` once per minute and yield to the browser only between completed
minutes. Do not replace this with clock mutation or bulk physiology arithmetic: weather boundaries,
interactions, births, deaths and random-number order must all observe every intervening tick. The
ecological calendar provides a neutral 30-day observation interval and a 365-day year: Spring 92 days, Summer 92, Autumn 91 and Winter 90.
All developmental and reproductive durations are literal ecological days from `src/life-history-registry.js`; never derive them from the real-time observation pace. `src/reproductive-biology.js` owns seasonal, annual, opportunistic, spontaneous/induced-ovulation and brood-limit gates. Live birth and surface eggs must remain separate after conception, and registry validation must fail if any registered species lacks an explicit profile. World-scale presets deliberately vary roster breadth by ecological function instead of requiring a fixed catalogue count. The two generic originals retain their established render branches; every real species uses exactly one head and one body root with subordinate features attached to either root. World schema 5 deliberately rejects older timing-model saves rather than guessing a migration.

`src/senescence.js` owns ageing after the species senescence reference. The registry's `longevityReferenceDays` values are observed record-age calibration points, never death thresholds. Do not add a random age death, a maximum-age comparison or a projected expiry date. Ageing may reduce organ and immune reserve, teeth, feeding, recovery, movement and perception; actual deaths must still resolve to a proximate simulated cause. Nutrition, hydration, safety, rest, stress, injury and social support are legitimate inputs because an animal's circumstances can shorten or prolong survival.

- `npm run test:static` — syntax checks.
- `npm run test:logic` — deterministic tests without a browser.
- `npm run test:browser` — one-worker, small-world headless smoke test.
- `npm run test:browser:visual` — explicit production-world browser check.
- `npm run test:normal` — static, logic and smoke.

Routine browser automation uses one isolated headless Chromium process owned by `scripts/browser-smoke.mjs`; it explicitly closes its page, browser server and HTTP server. Failure screenshots are retained. The full visual project still uses the Playwright test runner. `?test=1` starts paused and reduces rendering cost only; production pages are unchanged.

`scripts/ecology-audit.mjs` may run independent seeds concurrently with `--workers N`. Every worker
uses a separate browser page and therefore a separate authoritative world. Checkpoint writes pass
through one promise queue, active progress is recorded per seed, and completed results are emitted
in requested seed order. Do not compare its per-seed elapsed timings with a one-worker baseline;
CPU contention is expected when throughput mode is enabled.

## Ecological research diagnostics

`src/ecological-accounting.js` records attributed flows only when `?research=1` or explicitly
enabled. It is bounded, diagnostic-only and excluded from saves and authoritative hashes. Stock
snapshots before and after each retained tick make missing attribution visible. New mechanics that
create, consume or transfer biomass or energy should add an accounting hook without using the
ledger to drive the mechanic.

`src/map-validation.js` reads authoritative cells and animals without mutation. It checks
reciprocal topology, finite fields, connected traversable regions, drainage warnings and bounded
spawn-to-food/water distances. Warnings describe research risks and must not silently normalize
the map. `src/experiment-metrics.js` creates operational population, boundary, action and group
measurements plus versioned experiment metadata; these derived results are not save state.

The research API deliberately does not implement rule ablations, separate RNG streams, world
wrapping, neural evolution, globe/tectonic generation or human social institutions. Those would
alter the model or redesign its purpose and require separately approved deterministic baselines
and save migration.

## Observer-only invalidation

Selection, group focus and member focus update fog, visibility, overlays and UI without setting the
landscape data dirty flag. Only terrain, water, vegetation or detail changes may request landscape
rebuilds. Keep this separation covered when adding observer presentation features.

## Frame simulation budget

`src/tick-budget.js` bounds completed simulation work to a 7 ms allowance before returning control to
presentation. It always permits one due authoritative tick, carries remaining accumulator debt forward,
and never changes tick or RNG order. Do not drop accumulated ticks to make an FPS counter look better.
The resource profiler exposes backlog and completed-tick counts so responsiveness and throughput can be
reported separately.

This is intentionally not cognition staggering, a Web Worker, WebGPU ecology, or animal instancing.
Those changes alter model scheduling or require a larger data/render redesign and need separate evidence,
deterministic baselines, and approval.

## Hex movement and visual ground contact

Movement candidates must come from `HexWorld` cell neighbours. Do not recreate synthetic radial points or
include the origin as a route: that previously made a valid detour lose to a zero-distance move. A genuinely
empty candidate set still produces a structured blocked action.

`terrainSurfaceCache` is presentation-only and reconstructed with terrain geometry. `fanSurfaceHeight()`
uses that cache to keep animal roots on the rendered triangle surface; it must not be saved as world state.
Contact shadows share one fixed-capacity `InstancedMesh`, one geometry, and one material. Ground detail uses
one shared generated texture across cloned ground-only materials. These shared resources are retained across
world loads and must not be disposed by entity or chunk cleanup.

## Camera and goal planning

`src/camera-ground.js` separates terrain collision from LOD metrics. Camera clearance is wall-clock
presentation state only. Never save camera-derived values into animals or use them to influence sensing.
Strategic presentation requires both a wide orbit and sufficient height above rendered terrain.

`src/goal-planning.js` adds bounded commitment to the existing candidate-priority model; it is not a
second decision engine. Candidate keys remain authoritative, emergencies are explicitly marked rather
than inferred from prose, and blocked movement releases commitment. `goalPlan` is saved world state and
must be migrated with `migrateGoalPlan()`. Adding a priority should choose an explicit commitment duration
and emergency flag where appropriate. Reproductive readiness is an authoritative constraint and must be
tested separately from pregnancy icons or other presentation.

## Animal thermoregulation

`src/thermoregulation.js` is the pure authoritative temperature model. Grazers and hunters have
separate set points, comfort ranges, and thermal inertia. One post-action update combines ambient
temperature, terrain/water exposure, movement, digestion, drinking, courtship, and a start-of-decision
crowding snapshot. It consumes no random numbers. `bodyTemperature`, `tempStress`, `thermalStatus`, and
the latest compact source breakdown are saveable simulation state; older saves use
`migrateTemperatureState()` to receive a species-specific default. Expressions and signals present this
state but never calculate it. Add new heat sources to the pure model and its tests, not to frame code.

Dangerous body temperature is cumulative injury, not an instant-death threshold. `thermalExposureHours`
allows three simulation hours for behavioral correction before severity-scaled health loss begins, and
declines again after the animal warms or cools. Death occurs only when this damage exhausts health. Older
saves default exposure to zero without changing random-number use.

## Observable body cues

Entity-to-entity sight stores only a decision-time `bodyCues` snapshot: coarse injury appearance, gait,
movement/posture, and any emitted signal. It never contains exact health, injury severity, injury source,
thoughts, priorities, memories, or traces. `observable-other` follows the same boundary. Exact health bars
and thought bubbles require private selected-self or explicitly labelled Laboratory permission.

Sight and smell overlays are terrain-following cell highlights. They are human diagnostic presentation,
not objects animals can sense, and must never be inserted into sensory contacts or saved world state.

## Activity time budgets

`src/activity-rates.js` keeps feeding increments, passive fatigue recovery, explicit rest recovery, and
ordinary feeding/rest commitment durations together. Grazing and carcass feeding are repeated small
authoritative transfers rather than one large meal followed by an artificial cooldown. Passive recovery
is deliberately weak; meaningful fatigue, energy, and health recovery requires a sustained rest choice.
Urgent candidates still override commitment. Changing these rates is an ecological correctness change:
run long fixed-seed population checks and do not describe it as a performance-only adjustment.

Carnivore activity is deliberately separate from herbivore continuous foraging. `digestionRate()` slows
Ridge Hunter stomach depletion, `carcassMeal()` bounds a large meal by body mass, and
`carnivoreActivityMode()` provides two deterministic four-hour patrol windows per simulation day. Outside
those windows a satiated hunter conserves energy. Patrol follows personally remembered prey/scent evidence
or waits and listens; it never receives hidden prey coordinates and does not randomly roam as a fallback.

## Carnivore predation lifecycle

`src/carnivore-behavior.js` owns the exhaustive saved predation phases: idle, investigate, assess,
stalk, chase, attack, secure-carcass, travel-carcass, feed and recover. The application supplies current
sensory evidence and performs movement or combat consequences, but no second helper may retain a competing
hunt target or reconstruct one from a later contact. `predation.lastKnown` is a recorded observation, not
live tracking. Reaching checked evidence retires it and starts a current-sense scan.

Older saves containing `animal.hunt` migrate once into `animal.predation`; the legacy field is then deleted.
Carcass selection replaces a live-prey objective explicitly, exhaustion suppresses unreachable travel, and
routine food travel cannot spend the emergency reserve. Add new carnivore phases to the exhaustive pure
transition module and its tests before integrating an action or presentation label.

## Reproduction events

`src/reproduction-events.js` defines bounded authoritative stages for courtship, acceptance/rejection,
mating, and labour/birth. Courtship acceptance does not imply conception: conception is scheduled only
after the mating stage completes. `courtship`, `mating`, and `birthEvent` are saveable tick state and must
be migrated with `migrateReproductionEvents()`. Symbols and mating/labour poses are presentation derived
from those keys. The male-behind-female offset is presentation-only and must never alter sensing position,
occupancy, or saved coordinates. Birth-attendance eligibility is a coarse condition/preference rule and
must not override danger or create a permanent pair bond.

## Pregnancy physiology

`src/pregnancy-physiology.js` is the pure source for gestation progress, bounded litter load, hormone phases and save defaulting. Litter size is selected once at conception, so later presentation and physiology never infer it. Live-birth load grows by 0.18 per additional offspring up to 2×; pre-lay egg load grows by 0.06 per additional egg up to 1.6× and never creates mammalian hormones. Visual body dimensions use the current multiplier's cube root to represent volume without scaling the head or frame-only presentation state. Metabolism, thirst and digestion use the same current need multiplier.

The RNG call that formerly chose litter size at birth now occurs at conception. This is an intentional correctness change: the simulation must know how many offspring are carried in order to model gradual pregnancy. Legacy migration never calls RNG.

## Observable social choice and memory

`src/social-relationships.js` owns bounded social-event memory, observable mate compatibility, libido
defaulting, friendship/mate-bond thresholds, and save migration. Courtship scoring may use only the
decision-time `bodyCues` snapshot or a previously stored copy. Exact health, private drives, thoughts,
traces, and current hidden locations are forbidden inputs. Apparent mass, age, and aggression are explicit
coarse exceptions. A remembered companion stores its last observation and must search that location; it
must never resolve the entity's current hidden coordinates. Shared foraging is sampled coarsely every six
ticks and histories retain only eight events per partner and twenty-four partners per animal.

## High-hex map performance

Every hex remains authoritative. `HexWorld.createAsync()` runs the same ordered calculations as the synchronous constructor and yields only between deterministic generation or hydrology batches. Its progress callback reports cells, terrain, topology, substrate, climate, drainage, hydrology warm-up, rivers, ecology, and spatial indexing. Navigation has a matching batched builder. Cancellation must reject with `AbortError`; different yield budgets must produce identical fixed-seed state.

Drainage and A* share `src/stable-min-heap.js`. A* edges retain only neighbour ID and cost; exact pointy-hex portals are reconstructed after the polygon route is known. Do not add stored portal points or per-cell terrain-surface objects back to high-resolution worlds.

The ground is one indexed, vertex-coloured mesh with seven vertices and eighteen indices per cell. Daily water/ecology work returns ordered dirty cell, basin, and river IDs. Presentation consumes those deltas, uploads coalesced colour ranges, and rebuilds only affected lake and river meshes. Vegetation is queued in stable batch order and processed within the per-frame presentation budget.

“Large-map performance mode” is a local, presentation-only graphics preference. It never belongs in a world save, never changes simulation cadence or authoritative cells, and must produce the same hashes and serialized world state as normal presentation. It uses a 4 ms vegetation budget, shortens fine/medium vegetation distance, and defers distant off-screen batches; coarse tree visibility is retained.

Run deterministic coverage with `node --test tests/high-hex-optimisation.test.mjs`. Capture the browser matrix with `npm run benchmark:high-hex`; it measures fixed-seed 5k, 10k, 20k, and 40k worlds in paused and running states and attaches JSON to the Playwright result. To compare on the same machine, point `HIGH_HEX_BASELINE` at an earlier JSON capture. Keep browser, viewport, power mode, and background workload unchanged between captures.
