# RSS Living Laboratory — Source/Feature Index and Glossary

## Source-to-feature index

| File | Purpose and main features | Dependencies/assets/UI | Active/unfinished notes |
|---|---|---|---|
| `index.html` | semantic UI, HUD, inspector, world settings, entity panels, Reality, minimap, import map | Three.js/unpkg; all control IDs | active; CDN has no local fallback |
| `src/styles.css` | application layout, panels, responsive HUD, controls, charts/bars | HTML classes/variables | active; accessibility limitations |
| `src/app.js` | startup, global orchestration, world/animals/ecology/behaviour, rendering, input, saves and UI | every focused module + Three.js/OrbitControls | active monolith; principal coupling risk |
| `src/action-state.js` | exhaustive action semantics, transitions, movement lifecycle and migration | presentation snapshots/tests | active |
| `src/decision-trace.js` | evidence provenance, immutable traces, threats, communication splits, privacy projections | behaviour and UI trace | active |
| `src/health-presentation.js` | health clamp/severity and bar segments | animal visuals/tests | active |
| `src/visual-events.js` | stable wall-time attack/call/injury/priority/thought events | frame presentation | active |
| `src/trace-data.js` | compact bounded causal trace and lazy human text | decision trace/UI/export | active |
| `src/presentation-snapshots.js` | once-per-tick renderer-ready semantic snapshots | action/evidence/health/access | active |
| `src/trail-buffer.js` | fixed typed-array ring/sample and geometry update helpers | intent visuals | active |
| `src/animal-visual-structure.js` | structural keys, persistent root/parts/transient mutation | Three.js-like objects/resources | active; no base instancing |
| `src/resource-ownership.js` | shared/entity/chunk/temporary marking and safe disposal | all render cleanup | active |
| `src/spatial-index.js` | stable bucket queries for animals/corpses and ID maps | sensing/corpses | active |
| `src/cell-visitation.js` | deterministic direct/reused cell visitation and LOS reuse | sensing | active |
| `src/corpse-visual-cache.js` | corpse stage calculation and persistent cache lifecycle | corpse renderer/resources | active |
| `src/simulation-phases.js` | permanent decision order and stable sense/action phases | tick orchestration/index | active |
| `src/landscape-chunks.js` | fixed chunk coordinates, dirty data sets/versioning | terrain/water/vegetation rendering | active; app observer invalidation gap |
| `src/presentation-budget.js` | tiers, channel matrix, privacy gates, global budgets/hysteresis, minimap/Reality throttling helpers | render/UI | active |
| `src/diagnostics.js` | bounded profiler stats/resources and authoritative canonical hash | app/tests | development profiler active when enabled; not saved |
| `run.ps1` | no-cache local HTTP launcher with port selection | PowerShell/HttpListener | active; port conflicts handled by range |
| `scripts/static-server.mjs` | controlled static test server | Node/Playwright | active, test-only |
| `scripts/phase6-benchmark.mjs` | synthetic corpse/perception scaling measurement | spatial/index logic | active benchmark |
| `playwright.config.js` | one-worker headless Chromium smoke and explicit visual projects | Playwright/static server | active |
| `tests/*.test.mjs` | 16 focused Node logic/regression suites | extracted modules | active, 69 tests at baseline |
| `browser-tests/smoke.spec.js` | lightweight production/test-mode startup, canvas and core checks | Chromium | routine headless |
| `browser-tests/visual.spec.js` | fuller explicitly requested visual/browser checks | Chromium | excluded from routine normal workflow |
| `README.md` | operator overview, controls/profiler/benchmarks | repository commands | active but not exhaustive |
| `DEVELOPMENT.md` | staged architecture, testing and benchmark guidance | developer workflow | active |
| `bugbash/*` | historical charter, baseline, ledger and change log | project history | documentation only |
| `assets/icons/*` | PNG/SVG species-sex/stage icons | none found | unused |
| `package.json`, `package-lock.json` | scripts and pinned dependency graph | Node/npm/Playwright | active |

## Feature-to-source index

| Feature | Main implementation | Supporting/UI/assets/tests |
|---|---|---|
| Startup/render loop | `src/app.js:loop` | `index.html`, Three.js import map, smoke tests |
| World/hex generation | `createWorld`, `deriveTerrainFields`, `hex-world.js` | world controls; landscape tests |
| Weather/hydrology | `updateWeather`, `regionalWeatherAt`, `advanceWaterCycle` | setup sliders/chunks |
| Vegetation | `growPlants`, `drawVegetationRegions` | chunk/cell modules |
| Animal creation/physiology | `makeAnimal`, `prepareAnimalForSensing`, digestion/injury helpers | health module/tests |
| Sensing/spatial query | `sense`, `spatial-index.js`, `cell-visitation.js` | decision tests/benchmark |
| Decisions/actions | `actionCandidates`, `chooseAndAct`, `action-state.js` | action/authoritative tests |
| Evidence/explanation/privacy | `decision-trace.js`, `trace-data.js` | trace/HUD/tests |
| Groups/communication | `updateSocialGroups`, signal helpers | Reality/HUD symbols/event tests |
| Reproduction/care | `eligibleMate`, `reproduce`, `giveBirth`, `dependentAction` | entity panel/authoritative tests |
| Hunting/combat | hunt/action helpers, `strikeAnimal`, `die` | action/evidence/event tests |
| Corpses | `die`, corpse processing, cache/index modules | corpse tests/benchmark |
| Animal visuals/LOD/overlays | render/sync helpers, structure/budget/snapshot modules | CSS, browser tests |
| Terrain/fog/minimap | landscape chunks, `updateKnowledgeFog`, `drawMinimap` | budget invalidation tests |
| Save/load/migration | `snapshotWorld`, `activateSnapshot`, storage/import helpers | buttons/smoke/authoritative tests |
| Profiling | `diagnostics.js`, `profiler.measure` call sites | performance summary/README |
| Resource cleanup | `resource-ownership.js` and clear/reset helpers | ownership/visual/cache tests |

## Glossary

| Term | Plain-English meaning |
|---|---|
| Authoritative state/truth | data that determines future simulation outcomes and belongs in a save |
| Presentation snapshot | cached, renderer-ready description derived after a tick; not world truth |
| ActionState | exact action key plus target, destination, outcome, moving/direction, label/reason |
| `currentAction` | compatibility/display label; must never be parsed to infer action meaning |
| DecisionTrace | immutable record of why an action was selected at a specific tick |
| EvidenceRef | provenance-labelled copied evidence with channel, confidence, age and uncertainty |
| Channel | how information arrived: sight, smell, hearing, visual signal, memory, etc. |
| Provenance | broader origin: perception, memory, communication, inference or internal |
| Original channel | sight/smell/etc. retained when current evidence becomes memory |
| Constraint | limiting fact captured with a decision, distinct from causal evidence |
| Intended outcome | what the action is trying to achieve; private presentation data, not evidence |
| Tick | one discrete authoritative simulation update |
| Decision order | stable per-animal ordering used for deterministic phased updates |
| Visual event | non-authoritative wall-time-limited flash/ring/bubble tied to a simulation tick |
| Interpolation | smooth frame position between authoritative cell positions |
| Hex cell | connected discrete world unit holding terrain/environment/resource data |
| Chunk | fixed group of cells sharing presentation resources and dirty status |
| LOD/tier | selected, close, medium, distant or strategic level of visual detail |
| Access mode | laboratory, selected-self, observable-other or strategic information boundary |
| Overlay budget | global maximum for an expensive optional visual channel |
| Hysteresis | bonus for current overlay winners to avoid flicker near a ranking boundary |
| Spatial index | grid buckets used to query nearby animals/corpses without scanning all entities |
| Corpse stage | fresh, decaying, skeleton or removed presentation/lifecycle category |
| Health cap | maximum currently recoverable health; loss below 100 can be permanent impairment |
| Fog | selected observer's map-knowledge mask, not atmospheric weather |
| Ambient sound | visualised heard movement/noise evidence; there is no audible playback |
| RSS trace | bounded compact causal/response diagnostic history |
| Feedback pathway | laboratory diagnostic return mode: immediate, delayed, suppressed or independent |
| Test mode | automated-browser configuration with reduced world/render cost only |
| Renderer calls/triangles | Three.js draw-call and submitted-triangle counters, not simulation counts |

## Completeness checklist

All tracked source, entry, style, script, test, documentation and asset paths were inventoried. Entity types, objects, structured actions, major states, terrain/world structure, symbols/colours/generated visuals, stored/external assets, controls, major formulas/configuration, randomness, persistence, performance, risks, coverage and bidirectional source mapping are documented across the linked audit set. Runtime claims distinguish the successfully observed headless startup and existing final-verification evidence from the unverified long browser run. No claim is based solely on a filename where an active implementation path was available.
