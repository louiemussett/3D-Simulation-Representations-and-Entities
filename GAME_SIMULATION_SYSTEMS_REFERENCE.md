# RSS Living Laboratory — Systems, Rules, Configuration and Data Reference

## Six-layer model

1. **Simulation truth:** seeded `sim`, cells, animals, corpses, physiology and relationships.
2. **Decision traces:** immutable decision-time action/evidence/constraint snapshots.
3. **Presentation snapshots:** renderer-ready semantics, calculated at most once per relevant animal/tick.
4. **Visual events:** wall-clock-bounded attack/call/injury/priority/thought transitions.
5. **Frame animation:** position interpolation, posture, fade/pulse, camera/LOD and visibility.
6. **GPU resources:** shared/entity/chunk/temporary geometries, materials and textures with explicit ownership.

These boundaries are active engineering constraints. Presentation text is not authoritative action meaning; destinations are not causal evidence; profiler/presentation fields do not belong in saved truth.

## Tick and rendering pipeline

`tickWorld` first updates world-scale systems and then calls `runStableAnimalPhases`. Living animals are sorted by permanent `decisionOrder`, not array order. The phases are pre-sense physiology, outward-signal preparation, stable spatial snapshot construction, sensing all animals against that snapshot, signal interpretation, action application, post-action consequences, and after-action group/presentation work. This intentionally changes some formerly sequential same-tick observations into consistent snapshot semantics; tests cover order independence and bucket crossings.

The frame loop accumulates requested ticks, runs bounded authoritative work, then performs presentation update, OrbitControls/camera-follow work and `renderer.render`. Semantic snapshots are reused between ticks. Ordinary frames may interpolate and mutate existing objects but should not search/sort memories or rebuild trail geometry.

## Rules and formula catalogue

| Rule/formula | Effect in plain English | Evidence/status |
|---|---|---|
| Seeded RNG | increments `rngState` by `0x6d2b79f5` and applies Mulberry32 bit mixing | Confirmed: `rand`, `mulberry32` |
| Feeding bands | stomach `<8` starving, `<22` very hungry, `<38` hungry, `<52` mildly hungry, `<68` satiated, `<82` full, `<94` stuffed, else over-stuffed | Confirmed: `feedingState` |
| Eat eligibility | stomach below 72 and at least 2 ticks since last meal | Confirmed: `canEat` |
| Plant stocks | grass `(nutrition 1,growth .055,max 1)`; shrub `(1.4,.028,1.4)`; tree `(.35,.012,2)` | Confirmed: `plantTypes` |
| Seasonal modifiers | Spring growth 1.45/temp14/rain.42/breed1; Summer 1.08/24/.25/.8; Autumn .82/11/.38/.35; Winter .22/1/.22/0 | Confirmed: `seasonMods` |
| Weather influence | Gaussian high/low pressure influence combines humidity, uplift, lee rain shadow, seasonal temperature and storm factor; values clamped | Confirmed: `regionalWeatherAt` |
| Threat confidence | overall is `1 - product(1 - contributor confidence)`; each location retains its own contributor confidence/uncertainty | Confirmed: `threatAssessment` |
| Direction | `atan2(dz,dx)` only if destination differs by >`1e-9`; zero distance gives null | Confirmed: `directionTo` |
| Visible velocity | zero when paused, absent/invalid move or interpolation completed; otherwise distance/duration | Confirmed: `completedVisibleVelocity` |
| Health | clamped to current recoverable `healthCap`; acute severity uses health relative to cap; `100-healthCap` is permanent unavailable capacity | Confirmed: `health-presentation.js` |
| Group choice | nearby same-species compatible animals form IDs; goal ranks care, carcass, fear, thirst, hunger, mates, travel; leader uses goal skill | Confirmed: `updateSocialGroups`, `groupGoal` |
| Perception | nearby cell/index visits preserve deterministic order; squared ranges and reused line-of-sight reduce allocation | Confirmed: `cell-visitation.js`, `sense` |
| Evidence aging | current sight/smell converted to `channel:memory`, retaining `originalChannel`, confidence/uncertainty/age | Confirmed: `decision-trace.js` |
| Decision | candidates receive numeric scores; highest selected; trace captures priority/trigger/action and copied evidence at that tick | Confirmed: `chooseAndAct`, `captureDecisionTrace` |
| Corpse query | bucket range query returns corpses in stable creation order; work scales mainly with nearby buckets/candidates | Confirmed: `spatial-index.js`, benchmark |
| Visual event expiry | event gets stable ID, origin tick, wall creation/minimum/expiry; unchanged event cannot refresh forever | Confirmed: `visual-events.js` |
| Presentation priority | selected > immediate threat > tier > urgent > nearer, with previous-winner hysteresis | Confirmed: `presentation-budget.js` |

Many action scores, damage probabilities and ecology thresholds live inline in `app.js:actionCandidates` and its helpers rather than in a central tuning table. They are hard-coded and must be treated as coupled model parameters.

## Configuration values

| Setting | Default/range | Unit/effect | Exposed |
|---|---|---|---|
| Physical span | Standard 3; 1–4 | named world extent; derives `WORLD`/`HALF` | yes |
| Hex detail | 5k/10k/20k/40k; default 5k | approximate connected cell count | yes |
| Start season | Spring | season enum | yes |
| Wind direction | west; west/SW/south/SE/east | prevailing vector | yes |
| Start populations | grazers 220 (0–500), hunters 36 (0–200) | animals | yes |
| Relief/mountains/hills/valleys | 1; 0–2 | generation multipliers | yes |
| Rivers/lakes | 1; 0–3 | generation amount | yes |
| Woodland | 1; 0–2 | cover multiplier | yes |
| Trees/bushes/long grass | 1; 0–3 | plant density | yes |
| Rainfall/wind/storm/rain shadow/sediment | 1; 0–3 | environmental multipliers | yes |
| North temperature | 8; −12..18 | °C baseline | yes |
| South temperature | 24; 8..38 | °C baseline | yes |
| Coldest/hottest | −12 (−30..5), 36 (18..50) | °C clamps/targets | yes |
| Regional variation | 1; 0–3 | climate contrast | yes |
| Climate amount | 1; 0–2 | north/south variety multiplier | yes |
| Tick request | 2; 0–10 × 1/2/3/5 | ticks per second requested | yes |
| Presentation distances | close 34, medium 86; zoom 110/175 | world/camera distance thresholds | no |
| Overlay budgets | connectors 8, trails 16, thoughts 1, calls 12, health 24, badges 12, arrows 24, halos 16 | maximum visible optional channels | code-configurable |
| Profiler buffer | fixed/bounded in diagnostics module | samples per timing category | development control |
| Test mode | world 48, detail 400, 18 grazers/4 hunters | reduced automated render load | query/test only; production unchanged |

World presets (`mixed`, `arid`, `alpine`, `maritime`, `boreal`) overwrite groups of exposed setup values. `setWorldSetup` computes physical size. UI input parsing clamps multipliers; invalid save values are defaulted/migrated.

## Perception, evidence and privacy

`EvidenceRef` fields are ID, type/target/location, confidence, age, channel, provenance, originalChannel, uncertainty, signal kind/sender, sound identity and observed tick. Channels/provenance distinguish current sight/smell, memory, hearing/communication, inference and internal evidence. A decision trace copies data (JSON clone/freeze) so later mutable contacts cannot rewrite it.

Access modes are laboratory, selected-self, observable-other and strategic. Laboratory/selected-self can receive complete allowed state. Observable-other retains externally visible identity, position/orientation, health/injury, movement, visible action posture, emitted signal and recent visible interaction—excluding hunger, thirst, emotion/priority, thoughts, memories, exact destination, intended outcome and causal connector. Strategic keeps aggregate/minimal ID/species/position/alive data. Tier budgets run after privacy; importance cannot grant a forbidden channel.

## Ecology and environment

There is no central carrying-capacity controller. Balance emerges from local resource growth, drinking, metabolism/digestion, predation/scavenging, reproduction thresholds, age/injury/weather and spatial opportunity. This permits extinction or runaway outcomes. Main feedback loops are:

- more plants → better grazer condition/reproduction → more grazing pressure and hunter prey;
- more grazers → more hunter food/reproduction → more predation → fewer grazers;
- death → corpse biomass → hunter/scavenger food → decay/removal;
- rain/water/fertility → vegetation → animal movement and survival;
- injury/low capacity → impaired capability and signals → altered group/defence outcomes.

No fire, disease epidemic, explicit genetic evolution, population restocking or equilibrium enforcement was found.

## Rendering/resources/performance

The scene uses a perspective camera, OrbitControls, lights, Three.js materials, primitive/instanced chunk geometry, sprites and lines. No shadows/post-processing/custom shaders were identified. Presentation tiers are resolved before optional overlays. Budgets and hysteresis prevent unbounded overlays/flicker. Corpse and trail roots persist. Resource ownership is `shared`, `entity-owned`, `chunk-owned`, or `temporary`; disposal traverses only owned resources so removing one animal cannot break shared geometry/materials used by another.

Measured current scenarios (same machine, 30-second samples from final staged verification; not a pre/post claim): paused frame avg 8.94 ms/p95 13.4/p99 23.4/max 29.9, render avg 7.04/p95 10.6/p99 21.7/max 26.3, about 3,264 calls; normal frame avg 90.53/p95 1006/p99 1125.8/max 1171.9 with tick perception avg 945.44 ms and about 3,320 calls; fast had only nine frames, avg 3416.99/max 4126.2; follow view frame avg 71.77/p95 950.5 and render avg 5.43 with 2,892 calls; Reality frame avg 75.08/p95 951.8, UI avg 2.47/p95 12.1, about 3,356 calls. These reveal simulation stalls and landscape draw calls; they do not demonstrate improvement because exact Phase 0 before data was not preserved.

The Phase 6 synthetic benchmark showed nearby-corpse query/perception scaling: small 25 animals/100 corpses perception avg .144 ms; medium 100/1000 .447 ms; high 250/5000 1.478 ms. This supports spatial-query locality, though it is not an end-to-end browser frame benchmark.

## Statistics, histories and exports

Population counts are current living filters; births/deaths are cumulative since world start/load. Cell/plant totals and group summaries are calculated for panels/minimap. Entity trace history is bounded (compact RSS trace 32); events 80; memories are bounded by animal role (hunter 140/grazer 80), long memory 12 and mate history 8. Detailed causal prose is generated only for selection/open trace/export. Profiler categories keep fixed rings and report count, average, p95, p99 and maximum plus renderer resources/visible entities.

The authoritative JSON save schema is version 2. Saves include seed/RNG, setup/world/cells, animals, corpses and counters needed to resume. They exclude DOM/Three.js objects, profiler samples, interpolation caches, trail history and other frame-only state. Autosave occurs on page hide/visibility change. Quick/named saves use browser persistence; export/import uses JSON files.
