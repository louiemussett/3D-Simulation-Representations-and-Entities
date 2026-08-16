# RSS Living Laboratory — Complete Reverse-Engineering Audit

Audit baseline: branch `refactor/presentation-performance`, commit `010fe477` (20 July 2026). Confidence terms follow the requested definitions: **Confirmed** means active code or runtime evidence; **Partial** means implemented with a material limitation; **Unverified** means not exercised in this audit.

## Master index

- [Player manual](GAME_SIMULATION_PLAYER_MANUAL.md)
- [Map and visual legend](GAME_SIMULATION_MAP_AND_VISUAL_LEGEND.md)
- [Entity and action catalogue](GAME_SIMULATION_ENTITY_AND_ACTION_CATALOGUE.md)
- [Asset inventory](GAME_SIMULATION_ASSET_INVENTORY.md)
- [Systems reference](GAME_SIMULATION_SYSTEMS_REFERENCE.md)
- [Developer handover](GAME_SIMULATION_DEVELOPER_HANDOVER.md)
- [Bug and risk register](GAME_SIMULATION_BUG_AND_RISK_REGISTER.md)
- [Source/feature index](GAME_SIMULATION_SOURCE_FEATURE_INDEX.md)

## Executive summary

**Confirmed.** RSS Living Laboratory is a browser-based, seeded wildlife/ecology sandbox and diagnostic visualisation. It has no player avatar, score, victory, or defeat condition. The user creates or resumes a procedurally generated landscape, watches Valley Grazers and Ridge Hunters live autonomously, selects animals or groups, changes observation overlays and speed, and inspects why decisions were made. Its emphasis is observation and experimentation, not direct command.

The world contains connected hex cells with elevation, climate, water and three plant resources; mobile animals with physiology, perception, memory, communication, social grouping, injury, reproduction and death; persistent corpses progressing to skeletons; regional weather and a budgeted hydrology cycle. Simulation truth is seeded and tick-based. Presentation is Three.js/WebGL plus DOM panels and a canvas minimap. Almost every visible world object is constructed from Three.js primitives or canvas textures; the twelve stored icon files appear unused.

The current build is sophisticated but still experimental. Strongest areas are structured actions, decision-time evidence traces, phased sensing/action, deterministic logic tests, save migration, bounded visual events, spatial corpse queries, persistent corpse/trail resources, chunked landscape presentation, and privacy-aware presentation tiers. Important limitations are high landscape-driven draw-call cost, expensive high-speed ticks, an observer-selection path that can unnecessarily invalidate vegetation, lack of audio, limited accessibility, no formal balancing objective, and incomplete automated coverage of long real-browser fixed-seed runs.

## What the simulation is about

The implemented subject is an open-ended predator–prey ecosystem under environmental pressure. Animals must maintain stomach/energy, hydration, health and social/reproductive needs while responding to weather, terrain, plants, water, threats, remembered evidence and messages. Grazers consume vegetation and form protective/social groups. Hunters evaluate, stalk, chase and attack prey, scavenge corpses and can coordinate. Death creates biomass that decays. Plants grow and disperse; water, rainfall, temperature and seasons affect habitat.

The player's relationship is observational and experimental. World-creation controls alter initial conditions; after creation the player changes time, camera and information views rather than issuing animal orders. The “laboratory” access mode intentionally exposes private internal data; entity-awareness modes restrict other animals to externally observable facts. There is an implied narrative in births, hunts, injuries, family dependency and deaths, but no authored plot.

## Architecture and execution flow

```text
index.html + styles.css
        │ imports Three.js 0.165.0 and src/app.js
        ▼
world setup → createWorld / hex-world / terrain fields
        ▼
stable tick phases (simulation-phases.js)
 physiology → outward signals → spatial snapshot → sensing → signal interpretation
 → structured action/decision trace → consequences → bounded traces/snapshots
        ▼
presentation snapshots → tiers/privacy/budgets → Three.js scene + canvas minimap + DOM
        │                       │
        ├─ resource ownership, corpse cache, trail buffers, visual events
        └─ profiler/renderer counters (development only)
        ▼
schema-v2 snapshot → IndexedDB/localStorage/import/export
```

Startup is direct ES modules: `index.html` maps `three` and `three/addons/` to pinned CDN URLs and imports `src/app.js`. There is no bundler or compilation step. `app.js` creates renderer, camera, controls, lights, shared geometry/materials, UI bindings and an initial seeded world. `requestAnimationFrame(loop)` separates wall-clock presentation from requested simulation ticks. `tickWorld()` advances environment and invokes the explicit stable animal phases. `renderAll()` rebuilds dirty/structural presentation and `syncAnimalVisuals()` performs frame interpolation and transient mutation. `updateUI()` and throttled `updateRealityPanel()` render secondary interfaces.

## Core loops

| Loop | Trigger | Main work | Evidence |
|---|---|---|---|
| Player | pointer/UI events | select, inspect, pause, step, speed, overlays, world setup, save/load/export | `src/app.js:402-480`, `selectObject` |
| World | each simulation tick | day/season, weather, hydrology budget, vegetation, scent, corpses | `tickWorld`, `updateWeather`, `advanceWaterCycle`, `growPlants` |
| Entity | stable decision order | pre-sense physiology, snapshot sensing, signals, candidate scoring/action, post-action | `tickWorld`; `src/simulation-phases.js` |
| Rendering | animation frame | controls, position/posture/event animation, visibility/LOD, renderer call | `loop`, `syncAnimalVisuals` |
| Interface | bounded updates | summaries, inspector, event stream, reality panel, minimap | `updateUI`, `drawMinimap`, `updateRealityPanel` |
| Data | decisions/events/save requests | compact causal history, counters, profiler ring buffers, schema snapshot | `decision-trace.js`, `trace-data.js`, `diagnostics.js`, `snapshotWorld` |

Time is continuous only for display animation. Authoritative change happens in discrete seeded ticks. Requested ticks per second are slider × multiplier; pause prevents automatic ticks, while Step invokes exactly one tick. Days, seasons, animal age, decay and cooldowns are derived from simulation fields/ticks, not display frames. Visual events deliberately use both origin tick and wall-clock expiry so slow/fast simulation speeds do not make them invisible.

## Implemented feature status

| System catalogue | Status | Plain-English implementation | Principal evidence |
|---|---|---|---|
| Procedural hex world | Confirmed | Generates connected cells and terrain/climate/water fields from a seed and setup | `app.js:createWorld`, `deriveTerrainFields`; `hex-world.js` |
| Weather/climate | Confirmed | Moving highs/lows, wind, orographic effects, rain, pressure and temperature | `updateWeather`, `regionalWeatherAt` |
| Hydrology | Confirmed | Budgeted surface-water cycle changes cell fields and dirty chunks | `beginWaterCycle`, `advanceWaterCycle` |
| Vegetation | Confirmed | Grass, shrub and tree stocks grow, are eaten, stage and disperse | `growPlants`, `plantStageFor`, `disperseSeed` |
| Physiology | Confirmed | Digestion, energy, hydration, health/cap, age, trauma, injuries and death | `prepareAnimalForSensing`, `processDigestion`, `updateInjuries`, `die` |
| Perception/memory | Confirmed | Sight, smell, hearing and received signals become provenance-labelled current evidence or bounded memory | `sense`, `decision-trace.js` |
| Autonomous decisions | Confirmed | Scored candidates select exact action keys and capture decision-time causation | `actionCandidates`, `chooseAndAct`, `captureChosenDecision` |
| Social groups/signals | Confirmed | Local compatibility forms groups, leaders/goals/alerts; animals emit calls/signals | `updateSocialGroups`, `refreshOutwardSignal`, `updateGroupAlerts` |
| Reproduction/dependency | Confirmed | Mate eligibility/courtship, pregnancy, gestation, birth and dependent care | `eligibleMate`, `reproduce`, `giveBirth`, `dependentAction` |
| Predation/corpses | Confirmed | Hunt states, attacks/injuries/death, corpse ownership/feeding/decay/stage cache | `hunt`, `strikeAnimal`, `die`, `scavenge`; `corpse-visual-cache.js` |
| Fog/knowledge | Confirmed | Selected observer knowledge controls reusable fog buffer; sound alone is not map reveal | `updateKnowledgeFog`; `decision-trace.js:splitCommunicationEvidence` |
| Save/load/export | Confirmed | Versioned authoritative JSON, quick/named slots, import/export, compatibility defaults | `snapshotWorld`, `activateSnapshot`, save helpers |
| Performance instrumentation | Confirmed | Fixed-size timing buffers and renderer/entity/resource counters; excluded from saves | `diagnostics.js`, profiler calls in `app.js` |
| Selective animal instancing | Not implemented | Phase 9 evidence judged landscape draw calls dominant; individual roots retained | `animal-visual-structure.js`; development record |
| Audio | Absent | “Ambient sound” is a visualised information channel, not audible playback | no audio files/API; overlay code |

## Major dependency chains

- `seed + world settings → hex/terrain/climate → water/fertility/plants → grazer food → grazer survival/reproduction → hunter prey → hunter survival`.
- `weather systems + wind + elevation → local rain/temperature → hydrology and plant growth → movement/feeding decisions`.
- `physiology + current evidence + memory + group alerts → candidate scores → actionState → movement/attack/feeding → changed world truth`.
- `decisionTrace + access mode → permitted presentation snapshot → tier/budget allocator → overlays/DOM explanation`.
- `death → spatially indexed corpse → scavenging/ownership → biomass decay → fresh/decaying/skeleton visual stage → removal/disposal`.

Global mutable state in `app.js` couples simulation, selection, camera and presentation orchestration. The extracted modules enforce important boundaries, but the monolithic coordinator remains the primary maintainability risk.

## Randomness and reproducibility

Authoritative randomness uses a stored Mulberry32-style state (`rand`, `mulberry32`, `sim.rngState`). Seeded world generation and fixed decision order support repeatability. `Math.random()` is used by the Reset button solely to choose a new seed; once chosen, world evolution uses the seeded generator. Performance-only phases have tests comparing authoritative hashes. A saved schema-v2 snapshot includes authoritative RNG/world state but excludes frame interpolation, Three.js objects, profiler samples and presentation caches.

## Data, statistics and persistence

Visible statistics include day/season/weather, plants, living herbivore/carnivore counts, births, deaths and performance. Entity inspection exposes age, sex, stage, body size, pregnancy, energy/stomach, hydration, health/cap, injuries, feeding drive, expression, relationships, memory, awareness and causal trace subject to access mode. Events and causal histories are bounded. Exports are JSON downloads; named and resume saves use browser storage (IndexedDB with legacy localStorage fallback). No CSV, screenshot exporter, telemetry or network service is implemented.

Loads are intended to resume authoritative state, but visual interpolation/trails and profiler history are deliberately reset, so the first rendered frames cannot be pixel-identical to a pre-save frame. Older animals without structured action/evidence fields receive defaults/migration.

## Verification performed for this audit

| Check | Result | Scope/limitation |
|---|---|---|
| Repository and dependency inventory | Passed | all tracked files plus untracked `main` enumerated; `main` not inspected as project source or modified |
| Logic tests | Passed: 69/69 | Node test harness across 16 test files |
| JavaScript syntax checks | Passed | `npm run check` across app, modules, scripts and Playwright config |
| Headless browser smoke | Passed | Chromium production page rendered with non-empty canvas and no startup error |
| Browser visual checks | Passed in prior final verification | lightweight visual project, explicit rather than normal workflow |
| Fixed-seed Node regression | Passed | authoritative-state test |
| Long real-browser fixed-seed scenarios | Unverified | combined run exceeded the bounded audit window; not represented as passing |
| Manual exhaustive control matrix | Partial | startup/render and prior phase scenarios observed; every parameter extreme was traced, not manually exercised |

## Final findings

### Fully implemented

Seeded creation, autonomous tick simulation, two animal species, terrain/weather/water/plants, perception/evidence/memory, structured action selection, movement/predation, social signals/groups, reproduction/dependency, injury/death/corpses, selectable diagnostic presentation, saving, profiling and layered tests are active.

### Partially implemented or misleading

Landscape chunking exists, but observer selection can still set a global dirty flag and lead to broad vegetation invalidation. LOD deliberately hides facial parts at distance, which can look like a malformed animal if distance classification is surprising. “Ambient sound” has no audio. Reality-panel values are bounded/throttled snapshots rather than continuously live instrumentation. The profiler has current measurements but no preserved exact pre-refactor Phase 0 dataset for a strict historical comparison.

### Intended but absent

There is no direct animal control, mission system, win/loss loop, combat UI, authored campaign, multiplayer, backend, actual sound playback, model/texture pipeline, base-animal instancing, render-to-texture fog, fire, settlements, roads, buildings, ocean, snow accumulation physics, or formal population controller. Some are generic possibilities from the audit prompt, not promises visible in this repository.

### Visual-only versus hidden mechanics

Faces, badges, flashes, rings, trails, arrows, fog, health bars and many vegetation forms communicate state but do not themselves cause mechanics. Conversely digestion, confidence decay, uncertainty, capability impairment, group scoring, rain-shadow calculations, corpse ownership and reproductive thresholds are mechanically active but difficult to infer from the world view without the laboratory panels.

### Recommended next steps (documentation/audit recommendations only)

1. Fix and regression-test observer-driven landscape invalidation before adding rendering architecture.
2. Add a small in-product help/legend and explicitly label visual “sound” as observed/heard information.
3. Preserve benchmark result files for same-scenario comparisons; add a bounded long-run browser determinism job.
4. Add accessibility work: keyboard picking alternatives, reduced-motion option, stronger non-colour encoding and screen-reader status.
5. Profile terrain draw calls before reconsidering instancing; animal instancing is not presently justified.

No source behaviour, configuration, assets or commits were changed by this audit. Only the documentation files linked above were created.
