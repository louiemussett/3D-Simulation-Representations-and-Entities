# RSS Living Laboratory — Bugs, Risks, Inconsistencies and Verification

## Bug and risk register

No defects were silently fixed during this audit.

| ID/type/severity | Finding and player consequence | Evidence/confidence | Suggested direction |
|---|---|---|---|
| R-01 Confirmed performance bug, High | Selecting/clearing an observer sets `landscapeDirty = true`; a later render can mark broad vegetation chunks dirty, causing observer-driven landscape reconstruction/stalls | `src/app.js:2439 selectObject`; landscape dirty path. Confirmed statically | Separate observer visibility/fog invalidation from terrain/vegetation data versions; add selection/rotation regression counters |
| R-02 Performance risk, High | Normal/fast ticks can monopolise the main thread for ~1s to >4s in measured large scenarios, making input/frame updates appear frozen | profiler measurements; Confirmed runtime | Profile world/perception workload and bounded tick scheduling; retain RNG/order |
| R-03 Performance risk, High | Draw calls remain around 2.9k–3.4k even with few visible animals; landscape dominates, so animal instancing would not address the main bottleneck | renderer counters in follow/overview scenarios; Strongly supported | consolidate/instance compatible terrain/vegetation chunk materials after measuring |
| R-04 Visual communication risk, Medium | Distant tier intentionally hides head and eyes; a nearby-looking creature may appear malformed when tier/zoom thresholds classify it distant | `presentationPartVisibility`; reported screenshot; Confirmed | smoother/clearer impostor, debug tier label, tune thresholds; preserve topology truth |
| R-05 Interface inconsistency, Medium | “Ambient sound” suggests audio, but the project only visualises heard movement/noise and contains no audio pipeline | UI label, no audio files/API; Confirmed | rename to “Heard movement/noise” or add explicit help |
| R-06 Accessibility risk, High | State relies on small coloured glyphs, flashes and world picking; keyboard/screen-reader alternatives and reduced-motion mode are limited | HTML/CSS/event audit; Confirmed | add textual equivalents, keyboard navigation, ARIA live summaries, reduced motion |
| R-07 Offline/dependency risk, Medium | Application imports Three.js solely from unpkg; cold offline use fails despite local server | `index.html` import map; Confirmed | vendor/pin local runtime copy and licence notice |
| R-08 Maintainability risk, High | `app.js` coordinates most systems through mutable globals and many helpers; hidden coupling makes safe changes difficult | source structure/function inventory; Confirmed | continue narrow pure-module extraction with regression hashes; avoid wholesale rewrite |
| R-09 Test gap, Medium | Long combined fixed-seed real-browser runs exceeded the bounded verification window; only Node deterministic tests are consistently quick | final verification record; Confirmed | add shorter checkpointed headless scenarios or scheduled long job with time budget |
| R-10 Benchmark integrity gap, Medium | Exact Phase 0 before-result files are absent, preventing strict before/after claims for all staged phases | docs/repo inventory; Confirmed | persist JSON benchmark artefacts keyed by seed/settings/commit/machine |
| R-11 UI truth risk, Low | Reality panel is throttled, so displayed totals may briefly lag mutations | `updateRealityPanel`, `shouldRunBoundedUpdate`; Confirmed/intentional | show “updated” age if lag matters; keep bounded update |
| R-12 Terminology risk, Medium | Heart glyph represents both dependency/care and courtship; exclamation variants represent alarm versus attack with colour/shape nuance | signal map and HUD key; Confirmed | distinct glyphs and accessible text labels |
| R-13 Balance risk, Medium | No population equilibrium controller; local feedback can produce extinction/runaway populations and high corpses | ecology code; Strongly supported, outcome seed-dependent | treat as model behaviour; add multi-seed balance envelopes before tuning |
| R-14 Data-integrity risk, Low | Browser storage is profile/origin-specific; shortcut files reference a local URL and named slot, not embedded world data | save/shortcut helpers; Confirmed | explain portability; encourage JSON exports |
| R-15 Semantic-code smell, Low | `priorityCategory()` still classifies English priority display strings with regex. It does not determine authoritative action meaning, but can drift as labels change | `src/app.js:priorityCategory`; Confirmed | replace with structured priority category when next semantic phase is authorised |
| R-16 Scalability risk, Medium | Corpse visuals are cached, but the renderer still visits all corpses to decide culling/awareness | `renderAllWork` corpse iteration/cache; Confirmed | spatial/frustum candidate set for presentation, preserving cleanup |
| R-17 Scientific-validity risk, Medium | Complex ecology/psychology presentation may look scientifically authoritative, but parameters are designed simulation rules without validation evidence | model constants/docs; Confirmed | label as experimental model and document calibration sources if added |
| R-18 Asset hygiene, Low | Twelve PNG/SVG icons are stored but unreferenced; runtime creates equivalent symbols itself | asset/source search; Confirmed | document or remove only in a separately authorised cleanup |

## Interface-to-code inconsistencies

| User-facing appearance | Actual implementation/evidence | Consequence | Severity/documentation correction |
|---|---|---|---|
| “Sound” overlay | visual evidence channel, no audible playback | users expect speakers/audio | Medium: call it heard events |
| Animal without head/eyes | deliberate distant LOD part suppression | resembles damage or rendering bug | Medium: document/tune LOD |
| Alarm at sender/location | warning provenance does not guarantee exact predator coordinate | symbol can be overinterpreted | Medium: explain sender vs threat evidence |
| Permanent health loss | unavailable capacity is separate from current acute health | a 60/60 animal is not critical | Medium: three-part bar legend |
| Smooth walking position | authoritative animal moves between discrete cell decisions; display interpolates | apparent continuous position is not simulation collision truth | Low: document discrete truth |
| Reality totals | bounded visible-panel updates, not every frame | short-lived staleness | Low: optional timestamp |
| World setup sliders | configure next reset/world creation rather than continuously rewriting present truth | adjustments may seem ineffective until reset | Medium: label “next world” clearly |
| Feedback pathway | diagnostic return/trace mode, not an ecological law or animal command | meaning is obscure | Medium: add help text |

## Hidden, disabled, unused and unfinished inventory

| Item | Status | Evidence/meaning |
|---|---|---|
| Stored sex/stage icons | Unused | no source references; generated canvas/geometry replaces them |
| Base-animal instancing | Deliberately not implemented | Phase 9 profiling found landscape draw calls dominant |
| Render-to-texture fog | Not implemented by design | reusable-buffer low-risk approach retained |
| Legacy square world | Active compatibility path | `legacySquareWorld`; do not remove without save migration |
| Test mode | Active test-only | URL/query reduces world/detail/population/render cost, production defaults unchanged |
| Laboratory private state | Active but mode-gated | intentionally hidden in observable-other/strategic modes |
| Detailed causal prose for all animals | Deliberately lazy | compact bounded traces; prose only on selection/panel/export |
| Audio/music | Absent | no loader, WebAudio use or files |
| Mission/win/loss/progression | Absent | no state/UI/rules found |
| Multiplayer/backend/telemetry | Absent | static client only |
| Fire, buildings, roads, settlements, ocean, snow physics | Absent | no active entities/rules; generic audit categories only |
| Commented-out/TODO feature block | None material found | comments primarily explain invariants; no TODO/FIXME backlog surfaced |

## Test coverage matrix

| Feature | Existing test evidence | Important gap |
|---|---|---|
| Structured actions/movement lifecycle | `action-state.test.mjs` | full browser animation combinations |
| Deterministic authoritative state | `authoritative-state.test.mjs` | bounded long real-browser multi-seed job |
| Evidence/provenance/privacy/threat | `decision-trace.test.mjs` | end-to-end every UI access-mode transition |
| Presentation snapshot once/tick | `presentation-snapshots.test.mjs` | large-world allocation instrumentation |
| Health cap/clamping | `health-presentation.test.mjs` | visual pixel/reference snapshots |
| Visual event timing/dedup | `visual-events.test.mjs` | background-tab clock behaviour |
| Bounded causal data | `trace-data.test.mjs` | very long exported trace size |
| Stable trail geometry | `trail-buffer.test.mjs` | GPU driver/memory endurance |
| Root stability/shared resource safety | `animal-visual-structure`, `resource-ownership` tests | repeated real-WebGL reset/load memory tolerance |
| Corpse index/cache | spatial/corpse cache tests + benchmark | presentation query still all-corpse visit |
| Cell visitation/LOS reuse | `cell-visitation.test.mjs` | ecological equivalence across more seeds |
| Stable sensing phases | `simulation-phases.test.mjs` | explicit same-tick signal/consequence matrix |
| Landscape chunks | `landscape-chunks.test.mjs` | observer dirty regression R-01 |
| LOD/privacy/budgets/minimap throttle | `presentation-budget.test.mjs` | screenshots at every zoom/device size |
| Startup/canvas/save basics | `browser-tests/smoke.spec.js` | exhaustive control extremes/import corruption |
| Visual browser checks | `browser-tests/visual.spec.js` | intentionally not in routine suite |

## Verification results

The completed staged branch's final automated verification reported lightweight headless Chromium smoke and explicit visual checks passing. During this audit, `npm.cmd run check` passed for every JavaScript module/script/config and `npm.cmd run test:logic` passed all 69 Node tests, including the authoritative fixed-seed regression. A combined long real-browser fixed-seed run from final verification timed out and is explicitly **Unverified**, not passed. The audit made documentation-only changes and did not repeat costly browser/stress suites because the existing browser evidence was current at the audited commit.

## Usability/accessibility observations

The interface is responsive and has conventional buttons/labels, a pause control and textual inspector, but canvas objects cannot be tab-selected, many labels are small, colour conveys categories, symbols are context-dependent, movement/events can pulse/flash, and screen-reader announcements are not comprehensive. Touch inherits OrbitControls gestures but dense inspector controls and picking precision may be difficult on small screens. These are **Confirmed** static limitations; a formal WCAG audit was not performed.
