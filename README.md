# RSS Living Laboratory — rapid prototype

## Embodied Simulation

New worlds can now use the existing observer Laboratory experience or inhabit one organism in **Embodied Simulation**. The inhabited animal consumes one normal population slot and continues to use the same perception, memory, physiology, pregnancy, injury, action, navigation and ecological systems as every autonomous animal.

Choose difficulty and ecological role independently in **New world**. Creative through Very Hard support exact organism setup; Extreme, Insane Immersion and Impossible Immersion retain the herbivore/carnivore/omnivore choice while randomising valid species and life history. Camera access narrows from all views, to no total view, to close view, then embodied first-person. Impossible Immersion is autonomous first-person: the animal moves and looks for itself while the player applies bounded, decaying Internal Influence to needs and commitments.

Direct controls are WASD/arrow keys, Shift to request sprint, E for a contextual action, F for feeding intent, R to rest, Q for a flee intent, V to vocalise and C to switch the permitted Insane Immersion camera. Double-click the scene in controlled first-person to capture the pointer; Escape releases it. All input resolves through ordinary movement and action rules and cannot bypass terrain, fatigue, injury, perception or contact.

A browser-based Three.js grassland simulation. It is an exploratory prototype for observing how individual needs, perception, memory, social behaviour and ecological constraints interact. It is not calibrated empirical evidence and does not prove RSS outside this model.

Developer architecture, schema, ownership, migration and verification rules are documented in
[DEVELOPMENT.md](DEVELOPMENT.md).

For the complete intended design, implemented feature inventory, known suspect areas and repeatable bug-bash method, read [the bug-bash design baseline](bugbash/DESIGN-AND-BUG-BASH-BASELINE.md).

## Current implementation snapshot — 2 August 2026

This section records the principal features added since the earlier prototype documentation below. It describes implemented behaviour, not a claim that every model is scientifically validated. The authoritative simulation remains separate from animal knowledge, documentary interpretation and presentation-only UI state.

### Predictive animal cognition

Animals now have an individual, bounded predictive layer built on their own physiology, perception, communicated evidence and memory. It does not receive hidden resources, unseen live coordinates or outcomes the animal did not observe.

- The automatic cost/relevance scheduler assigns one of three computation depths on every decision cycle: `LEGACY` reactive fallback, `PREDICTIVE_SHADOW` forecasting without behavioural influence, or `PREDICTIVE_ACTIVE` qualified decision support. These are diagnostic results, not player-selectable behaviour modes.
- Implemented model families cover body reserves and sustainable travel, remembered-water availability, observed target motion, hidden threat likelihood and forward action consequences.
- Every forecast records its owner, framework, target, referent, horizon, applicability, evidence references, output, confidence, cost, evaluation condition and authority. Explicit `UNKNOWN`, `NOT_APPLICABLE`, `INSUFFICIENT_EVIDENCE` and `ABSTAINED` results are retained rather than disguised as predictions.
- Activation, prediction admission, coalition influence and decision authority are separate lifecycle stages. Confidence does not grant authority; only registered physical-feasibility or safety processes may veto.
- Heterogeneous forecasts are coordinated only at the action-selection boundary. Incompatible targets and horizons are not averaged together.
- Active support can re-score compatible travel, water, safety, pursuit and recovery candidates. Empty coalitions, failed predictions and exhausted budgets fall back to established behaviour instead of immobilising the animal.
- Critically hungry carnivores have a bounded last-resort live-prey route when no usable carcass is known and current evidence and physiology make a hunt feasible.
- Learning is restricted to bounded parameter and confidence corrections. Proposed applicability, dependency, splitting, replacement or retirement changes are recorded for human review and do not execute automatically.
- Prediction ledgers, outcome ledgers and structural-proposal stores are bounded. Save migration adds deterministic default cognition state without changing existing animal state or consuming random numbers.

The selected entity's **Forecasts** tab shows admitted forecasts as circular confidence symbols with the detailed evidence and effect below them. The compact Overview shows only the current forecast summary; the Mini Laboratory provides a condensed live digest; the Main Laboratory exposes the complete activation, admission, coordination, authority, correction and proposal history. Prediction symbols, physiology symbols, private clouds and their epistemic meanings are documented in the in-game Reference and legends.

### Entity presentation and visual language

World-space animal information now uses a unified ownership system rather than independently floating badges.

- An unselected animal uses one thick identity rail with a square expression bay, stable identity and reproductive text, and a rectangular public call/action bay.
- Selecting an animal hides other entity panels and replaces its rail with one integrated instrument panel containing expression, identity, sex, maturity, pregnancy/litter state, public call/action, health, immediate concern, forecast effect, metabolic reserves and fuel/performance metrics.
- Private priority and private forecast clouds are selected-only attachments to the integrated panel. They remain visually distinct from outward calls and observable expressions.
- Panel size scales the complete root uniformly. A separate panel-text setting changes labels and values without independently distorting the expression, call or bubble artwork. The whole entity-panel system can be hidden.
- Panels use a single collision footprint. If panels would overlap, the lower-priority panel disappears; priority favours selection and entities nearest the centre of the screen. Off-screen entities have no panel.
- Camera wheel distance controls panel scale. Camera tilt, rotation and terrain proximity do not switch layouts or unexpectedly resize a panel.
- Expression, call/action, thought and prediction channels use semantic hold profiles. Brief startle events can clear after about 0.5 seconds, while settled states and contextually persistent signals may remain for up to five seconds. A new state does not erase an unreadable one immediately.
- A selected animal with no admitted private forecast can briefly show an explicit undecided/insufficient-confidence symbol rather than leaving viewers to infer meaning from an empty space.
- Internal reserve symbols now distinguish gut nutrients, blood/liver fuel, body fat, water, aerobic endurance, muscle glycogen, burst capacity/adrenaline and recovery burden.

The Social tab explains the four channels directly: private priority, notable action, visible expression and public signal. Longer caveats about public evidence and forecast exceptions live in the Laboratory Reference, where they can be read without crowding the entity panel.

### Groups, herds and social memory

Local animal groups remain real organisations with their own leaders, members and goals. A herd or pack shown at strategic scale is a higher-level organisation made from those constituent groups; it is not one biological entity.

- Strategic markers aggregate by actual camera distance: close views show entities, intermediate views show groups and the widest views show regional totals. Cinema cannot override these distance thresholds merely by requesting a named shot scale.
- Selecting a herd lists its constituent groups. Groups can be expanded in place to inspect their individual members, and selecting a member returns to the ordinary organism panel.
- Large organisations form only when population, distance, movement, purpose and species compatibility permit them. Migration groups, mixed herds, packs/bands, territory claims and disputes retain bounded records.
- Female social memory retains firsthand and shared mate outcomes. Male social memory separately tracks observable/reported potential partners, last observed locations, confidence, rivalry, status and mating outcomes; reports never become live tracking or privileged reproductive knowledge.
- Sex influences weights and priorities rather than removing social cognition from males or applying one compulsory behaviour to every animal.

### Cinema Mode and documentary author

The default Cinema experience is an adaptive nature-documentary mode. It moves between quiet observation, interaction coverage, entity detail, ecology and wide context according to current evidence instead of remaining in one fixed preset.

- Cinema prioritises connected interactions over random statistics. Implemented thread families include predation, courtship/mating, pregnancy/labour and caregiving such as nursing, reunion and protection.
- A thread can follow evidence, the other participant's response, progress, nearby participants, spatial context and relevant condition, then return when its phase changes. The author does not need to predict a complete future arc before covering it.
- Narration uses tempo bands: flash phrases for rapidly changing moments, urgent clauses, active short sentences, developing explanations and reflective follow-up after action settles. Fast pursuit coverage therefore does not wait for a long paragraph to finish.
- One development may receive one narrated establishing shot followed by silent angles. New developments may also be narrated consecutively; there is no fixed rule requiring a set number of silent shots or a wide shot after five cuts.
- Repeated wording is suppressed by development identity, participants and thread phase rather than camera angle. A camera cut alone does not make the same nursing, death or pursuit fact narratable again.
- Specific entity names require matching visual identification. Depending on detail, Cinema can use a focus ring, condensed identity rail, full instrument panel, Mini Laboratory or Main Laboratory highlight. If identification is unnecessary, narration uses contextual roles such as “the group leader”, “the mother” or “the juvenile”.
- Camera coverage includes close, intermediate, group, regional and world-establishing perspectives. Wide context is selected when it helps explain spatial relationships, organisations or ecology—not by a mandatory shot counter.
- Numbered entity/group/regional markers continue to obey observer distance rules in Cinema.
- Cinema queues up to three bounded shot beats for short sequences. Live evidence and narration are validated near execution so a precomputed pursuit does not become stale.
- Entering Cinema, changing shots and camera recovery use a camera/overlay refresh rather than rebuilding terrain, vegetation and the entire landscape. Full world presentation work remains on its normal invalidation cadence.
- Cinema starts with ordinary entity panels off and chooses the minimum presentation needed for a shot. It can choose which entity receives detail; normal observer selection remains exclusive.
- Voice, captions and companion services are active only while Cinema is running. Local deterministic narration and metadata remain available if the optional companion is absent.

The documentary system maintains separate authoritative truth, author interpretation, animal epistemic state and audience-facing claims. Ecological forecasting, camera execution, narration validation and audience-preference learning have separate records; documentary learning cannot mutate animal cognition or authoritative simulation state.

### Laboratory, menus, saves and settings

- The Main Laboratory is a resizable, closable full-workspace reference and diagnostic surface. The Mini Laboratory is its condensed operational view. Principal panels can be resized, minimised to recoverable dock entries, closed and restored through the in-game Escape menu.
- The Escape menu is deliberately simpler than the startup menu and can restore closed observer, entity, settings, Laboratory and Cinema windows.
- The startup screen identifies the exact quick/automatic save that **Resume previous world** will open. Named saves remain available through **Saved worlds**.
- Clicking a named save loads it into the simulation. Exported game shortcuts include a save slot and enter the loaded simulation directly rather than stopping at the archive screen.
- **Map** clears entity/group selection and restores the strategic camera.
- Graphics settings expose only supported 30 FPS and 60 FPS limits. Older 45 FPS values migrate to 30 FPS; the former Unlimited value migrates to 60 FPS.
- Adaptive rendering, panel visibility, whole-panel size, panel text scale and independently switchable health/metabolic/performance content remain presentation-only settings.

### Performance and bounded runtime work

Recent optimisation work preserves simulation rules while reducing repeated allocation and presentation work:

- Spatial, perception and documentary lookups use bounded indexes and reusable caches rather than repeated full-population scans where an authoritative result can safely be reused.
- Predictive ledgers, documentary stores, visual-event holds, trails, corpse presentation and diagnostic samples have explicit limits.
- Stable animal roots, texture caches, semantic icon layouts and combined physiology presentation avoid recreating equivalent Three.js resources every frame.
- Population panels are admitted only for visible, readable, high-priority entities and use one collision solve per viewport state.
- Terrain, landscape chunks, fog, vegetation and overlays have separate invalidation paths. Cinema cuts no longer force unrelated landscape rebuilds.
- Deferred and worker-assisted serialisation reduces long save/export blocking while preserving deterministic authoritative data.
- Frame-rate limiting is capped at 60 FPS and adaptive resolution remains bounded by the selected lower and upper limits.

### Verification status

As of this update, `npm run check` passes and the complete deterministic Node/companion suite passes **983/983 tests**. The suite includes predictive contracts and epistemic boundaries, behaviour and learning scenarios, Cinema thread/narration/camera policy, entity presentation and timing, groups and social networks, persistence and shortcuts, deterministic state, ecology and performance regressions. Browser smoke and full visual tests remain separate commands because they launch Chromium.

## Run it

From PowerShell:

```powershell
npm install
powershell -ExecutionPolicy Bypass -File ".\run.ps1"
```

The install step pins the same Three.js runtime used by production and installs the test tools. After installation, the simulation and browser smoke test load Three.js locally and do not depend on a CDN.

## Controls

- Drag to rotate the camera; right-drag to pan; mouse wheel to zoom.
- **Pause** stops simulation time; **Step** advances one simulated minute.
- One clock tick is one simulated minute. Animals sense, decide, act and advance continuous physiology every minute. Rates expressed per hour or day are timestep-scaled rather than applied 60 times at full strength. Expensive landscape, weather, hydrology and corpse maintenance remains on its appropriate hourly or daily cadence. A single slider requests 0–60 minute ticks per real second.

Long jumps are explicit rather than speed multipliers. The time-skip control offers one minute,
hour, day, 30-day ecological month or 120-day ecological year. It pauses playback, clears pending
real-time backlog and executes every intervening authoritative minute in order. A progress bar shows
completed minutes, percentage, elapsed wall time and estimated remaining time; Cancel stops after
the currently executing minute. Long skips are deterministic but not promised to be instantaneous.
- Click an animal to inspect it. Click empty ground, or the selected animal again, to deselect while keeping the camera position.
- **Map** deselects, recentres and zooms out.
- **Lock entity** follows the selected organism without preventing camera movement.
- **Favourite** saves an entity shortcut for the current world seed. **Save seed** stores the current world seed for later replay.
- **Reset** creates a new procedural hex world. Saves from the retired square-world format are intentionally incompatible and show a clear message instead of loading incorrectly.

## World and ecology

The simulation uses one connected hex world. The **Physical world span** control changes the size of the world, while **Hex terrain detail** selects about 5,000, 10,000, 20,000 or 40,000 connected hexes at maximum span. No hidden square terrain grid exists.

Terrain rules cascade from elevation, slope, drainage, soil depth and weather:

- Seeded elevation first creates massifs, hills and valleys; climate then adds altitude cooling, humidity, windward rain and leeward rain shadow.
- Rain, snowmelt, infiltration, groundwater, runoff, basin storage and spill outlets create streams and lakes.
- Lakes are flat stored water in terrain basins; shallow water is light blue and wadeable, while deep water is dark blue and blocks movement.
- Rock occurs on steep/high thin-soil ground; sand and mud occur along channels, shores and wet ground.
- Grass depends on biomass, soil moisture, weather, season and grazing. Woodland needs sustained moisture, deeper soil and gentle ground; it is not grazeable and blocks line of sight.
- Only true lakes and river channels are drinkable. Damp grass, mud and surface moisture are not water sources.

Regional weather is a lightweight synoptic approximation: moving low-pressure rain systems, frontal bands, a persistent blocking high, seasonal north/south temperature variation, topographic cooling and hotter valleys.

## Animals

The current world contains Valley Grazers and Ridge Hunters. Every organism has age, sex, body size, mass, health, energy, hydration, fullness, fatigue, injuries, temperature stress, aggression and individual sensory/memory state.

They can search, drink, graze, hunt, scavenge, flee, rest, digest, communicate, court, reject a mate, conceive, give birth, nurse, follow caregivers, defend young, form groups and die. Occupied cells prevent animals from sharing the same space.

Conspecific social conflict is an emergent extension of those behaviours, not a compulsory sex rule or a direct
random encounter roll. Repeated proximity accumulates play, dominance, submission, aggression and protective
pressure from condition, temperament, relationships, rivalry, visible danger and remembered outcomes. Most
male contests proceed through assessment, display and yielding; only sustained unresolved pressure escalates
to sparring or attack. Young animals spar when surplus energy, familiarity and aggression outweigh fear,
hunger and injury. Recovery cooldowns reflect exertion and fear. A caring male intervenes only when accumulated
protective pressure and current observable attack evidence justify it.
Male courtship breadth also varies: some favour familiar bonded partners while others more readily court
unfamiliar females, so mating success remains an individual outcome rather than a universal pattern.

Sparring, fighting, sprinting, climbing and difficult terrain create strength and endurance training loads.
Heat and cold exposure contribute more slowly to endurance conditioning. Adaptation requires food and usable
energy, occurs gradually, and reduces later exertion cost; animals can rank restoring ideal fat, muscle and
endurance condition as medium-term goals. Females adjust mate preferences slowly from observed adult males,
resource scarcity and danger. Dependent, juvenile and subadult animals have no libido, mate preferences,
courtship or mating state; these initialise only on reaching adulthood. Older saves receive deterministic
defaults for muscle, conditioning, social pressure and learned preferences.

Committed fleeing and predator pursuit use a true sprint rather than a small walking-speed adjustment. Muscle
condition determines a 2–5× walking-speed multiplier, while endurance conditioning reduces sprint-reserve drain
and therefore extends duration. Stalking and ordinary travel retain their slower speeds. Sprint remains unavailable
during its recovery cooldown and emergency reserve is still used only after sprint and endurance are exhausted.

The four physical-span presets remain available. An optional numeric custom span overrides them, and starting
herbivore/carnivore inputs have no fixed upper cap. Values must still be finite non-negative whole numbers.
Browser memory and processing capacity are the practical limit; very large maps or populations can make world
generation slow or exhaust memory.

The visual language assigns one job to each element. Body shape and injury marks show persistent physical condition; posture, head motion and speed show current activity, attention and exertion. A face shows only a coarse involuntary condition (temperature stress, fear, pain, aggression or fatigue). A side symbol and expanding ring exist only for a time-bounded emitted signal. Only blocked movement and deliberate listening receive action badges because ordinary actions are readable from posture. Thought bubbles are private priority changes, exact health bars are selected-self/Laboratory information, and detailed decision traces are Laboratory diagnostics only. Thus a cold face does not imply a cold-distress call, and neither reveals the private thought of seeking warmth.

The selected organism receives the integrated private instrument panel described above. Its exact health,
metabolic reserves, performance capacity, recovery burden, priority and forecast effect are observer/Laboratory
information; they are not automatically available to another animal. Unselected organisms expose only bounded
public identity, expression and emitted-call/action presentation.

- Hunters must perceive prey or follow their own remembered/scent information; they cannot use hidden target coordinates.
- Carcasses provide variable food value, can be guarded or contested, rot into selectable skeletons and eventually disappear.
- Herbivores graze only grassland biomass. Grazing reduces visible plant cover; regrowth follows local ecology.
- Infant grazers and hunters rely on a mother or knowledgeable nearby adult before becoming independent.

### Reproduction

Females have species-specific fertility cycles. Courtship takes time and may be rejected. Each female has preferences for a potential mate’s health, body mass, age and aggression. Accepted pairings are recorded in each entity’s inspector history; conception, pregnancy and births are then visible in the world.

Herbivores produce one offspring; hunters produce a litter. Pregnancy and infants have persistent badges. During courtship, hearts linger above both animals; a rejection shows a red × above the female. Selecting an animal with an active reproductive link highlights its pursued partner, or the animal pursuing it.

## Perception, fog and observation

Selecting an organism changes the presentation to its accessible information:

- **Black** terrain has never been seen.
- **Fogged** terrain has been explored but is not currently visible.
- Clear terrain is the stable local circle around the selected organism. Directional current sight remains the separate Vision overlay; woodland can block that sightline and reduces sight range for an animal inside it.
- **Knowledge fog** can be unchecked to show the complete map without black or explored fog layers.
- Hearing, smell, scent trails, vision and interoception contribute different contacts and memories.
- Blue memory markers represent only drinkable water that the animal previously observed. They are not hidden map water.
- Same-species communication can temporarily reveal an approximate food, water or threat direction. Other species are heard as unidentified sound.

The inspector shows current action, priority chain, target, awareness, relationships, mating history, female mate preferences and expression. The **Expression** row explains the generated face currently displayed.

Mate choice uses decision-time observable body cues: visible injury and gait, activity, head movement,
movement pace, emitted calls, and permitted coarse mass, age, and aggression estimates. It never reads a
potential mate's exact health, thoughts, priorities, or private memory. Males have an authoritative libido
trait that changes how often reproduction becomes competitive with ordinary priorities. Animals retain a
bounded social memory of courtship, mating, rejection, shared foraging, affinity, and last observed location.
Repeated successful interaction can establish a friendship or mate bond, but survival and dependent-care
needs remain higher priority and remembered locations are never live tracking.

## Emotion faces and overlays

Animal faces are generated in browser memory, not stored as image or vector files. Cached Three.js sprite textures cover an expanded catalogue of externally visible rest, alertness, startle, fear, pain, fatigue, thermal stress, aggression, courtship, care and recovery expressions. Selection is based on observable state rather than private needs, predictions or memories. Each face has a dedicated legend entry, an observable timing cause and a context-sensitive hold duration; the Social tab explains the currently visible expression.

Available overlays include Vision, Smell contacts, ambient sound, memory, biomass, water and scent trails. Vision is a species-specific eye-facing field projected as a continuous mesh onto the terrain; it is not the former set of highlighted map-cell squares. The simulation and diagnostic overlay share the same deterministic cone, terrain-occlusion and vegetation-cover query. Cover lowers confidence, while opaque cover or intervening terrain blocks sight. Laboratory overlays show global model information; selected-entity overlays limit themselves to the organism’s sensed or remembered information.

Feeding reduces vision, hearing and smell to half range while the head is down. Animals periodically stop consuming food and lift the head, restoring baseline senses. Enhanced stationary focus applies only after both body and head remain still; a turning head steers the vision field but does not receive the focus multiplier.

At distant zoom levels, individual animals are replaced by grouped strategic markers to preserve performance. The status strip reports FPS, actual simulation ticks per second, terrain detail level, population and the number of organisms currently drawn.

The strategic overview also displays that live performance summary directly below its speed control. Opening
**Laboratory** exposes a bounded performance benchmark. Choose a duration (five minutes is the standard), press
**Start benchmark**, keep the tab visible, and exercise one repeatable scenario. The resulting JSON report can be
copied and supplied with a performance investigation. It contains one-second diagnostic windows for frame,
presentation, render, camera, tick, perception, decisions, corpses, terrain, vegetation, fog, overlays, minimap and
UI work; renderer calls/triangles/memory; visible entities and overlays; tier/budget state; simulation backlog;
resource ranges; and automatically generated diagnostic highlights. Benchmark samples and state are bounded,
presentation-only, and excluded from saved worlds and authoritative hashes.

## Limits

- This is a fast visual/ecological prototype, not a full climate, fluid-dynamics or population-genetics model.
- Rules and parameters are illustrative and should be calibrated or replaced before making scientific claims.
- Rendering is a presentation layer; it is not the source of the scientific model state.

## Phase 0 diagnostics

No profiler runs during ordinary play. To enable the bounded development profiler, open
`http://localhost:8117/?profile=1` (or the next free port reported by `run.ps1`). It retains only the newest 240 samples in each coarse
category. In the browser developer console, use:

```js
rssDiagnostics.report()  // timing summaries and current renderer/visible-object counts
rssDiagnostics.clear()   // discard samples before a new scenario
rssDiagnostics.disable() // stop collecting; existing samples remain available
rssDiagnostics.enable()  // resume collecting
rssDiagnostics.authoritativeHash()
rssDiagnostics.fixedSeedHash(1337, 24) // resets the current world, advances it, and returns its hash
rssDiagnostics.prepareBaseline("normal") // development-only repeatable camera/UI setup
```

The report gives sample count, average, p95, p99 and maximum milliseconds for each requested
category. It also reports Three.js calls, triangles, geometries and textures, plus visible
animals, corpses/skeleton parts, trails, connectors, thoughts, call rings and fog vertices.
Profiler samples and presentation interpolation are excluded from saves and authoritative hashes.

### Repeatable baseline scenarios

Use Microsoft Edge or Chrome at 1920×1080 with the browser zoom at 100%. Start from a fresh
`?profile=1` page, choose the **Mixed grassland** preset, Standard physical span, 5,000 hexes,
220 herbivores, 36 carnivores, seed 1337, and leave laboratory overlays off unless the scenario
says otherwise. Before each measurement run `rssDiagnostics.clear()`, leave the scenario running
for 30 seconds, then copy `rssDiagnostics.report()` from the console. Do not compare runs made at
different window sizes, terrain detail, populations, or hardware.

1. **Paused, many visible:** press Pause, select Map, then zoom until individual animals are drawn and the report shows at least 150 visible animals.
2. **Normal speed:** Map view, unlocked camera, speed 3 minute ticks/s (×1), no selection.
3. **Fast speed:** same view as scenario 2, speed 10 minute ticks/s.
4. **Follow moving animal:** return to 3 minute ticks/s (×1), select a healthy adult grazer, enable Lock entity, and confirm it is moving before clearing samples.
5. **Many corpses/skeletons:** use `rssDiagnostics.fixedSeedHash(1337, 2400)`, press Map, pause, and measure only if at least 20 corpse/skeleton objects are visible; otherwise advance another 2400 ticks and record the final tick with the report.
6. **Reality panel open:** reload seed 1337, use 3 minute ticks/s (×1), Map view, open Reality, and leave the panel open for the full sample.

For deterministic regression evidence, record `rssDiagnostics.fixedSeedHash(1337, 24)` and
`rssDiagnostics.fixedSeedHash(7331, 240)` after a clean page load. These hashes cover authoritative
simulation fields while excluding presentation caches, Three.js objects, wall-clock data and profiler state.

Run automated regression checks from PowerShell with the bundled/current Node.js available:

```powershell
npm test
npm run check
```

### Test levels

Routine checks do not open a visible browser and use one browser worker at most:

```powershell
npm run test:static          # JavaScript syntax only
npm run test:logic           # deterministic Node tests; no browser
npm run test:browser         # one small headless Chrome smoke test
npm run test:normal          # static, logic, then smoke
```

The smoke test uses Playwright's isolated headless Chromium runtime and `?test=1`, which keeps production code paths but starts paused, reduces the generated world to
48×48, 18 grazers and 4 hunters, disables antialiasing and caps device pixel ratio at 1. Normal pages
are unchanged. The smoke verifies startup, canvas visibility, a completed render and browser errors; detailed Reality/follow behavior remains covered by logic tests and the explicit visual suite. Its small Playwright launcher owns and closes one local server and one headless Chromium process directly. A screenshot is written only if the smoke fails.

The full 1920×1080 production-quality visual comparison is deliberately excluded from normal tests:

```powershell
npm run test:browser:visual
```

## Ecological research diagnostics

Ecological accounting is development-only and disabled during ordinary play. Open
`?research=1` to attribute bounded plant/corpse biomass flows and major energy costs without
placing samples in saved worlds. The browser console exposes:

```js
rssDiagnostics.ecologyAccounting()
rssDiagnostics.clearEcologyAccounting()
rssDiagnostics.validateMap()
rssDiagnostics.researchSummary()
rssDiagnostics.experimentRecord()
rssDiagnostics.multiSeedSummary([1337, 7331, 9001], 240)
```

The multi-seed runner is bounded to eight seeds and 10,000 ticks per seed. It suppresses
intermediate rendering, leaves the final seed loaded, and returns derived results rather than
saving them as world truth. Map warnings identify experimental risks such as distant resources
or one-sex starting regions; they never alter generation or make every habitat equally viable.

Longer independent-seed audits can use isolated headless browser workers. Each worker owns one
page and authoritative world at a time; workers share no simulation state, result ordering remains
the requested seed ordering, and checkpoint writes are serialized so interrupted runs remain
resumable:

```powershell
npm run audit:ecology -- --preset population --workers 4
```

Keep `--workers 1` when collecting same-process timing baselines. Increase it only for experiment
throughput, and normally no higher than the number of physical CPU cores available. `--chunk`
controls checkpoint frequency, while `--output` selects the JSON report path.

## Structured action state and save compatibility

Animal actions now use exact structured keys for simulation and presentation. English labels remain
for people to read and for compatibility, but the simulation does not derive action meaning from
those labels. Saves created before this change load safely: animals without structured action data
start at an idle compatibility state and receive an exact action on their next decision.

A movement request with no traversable destination, including a zero-distance choice, now records a
`blocked` action and its reason. Previously that path returned silently. This is an intentional
correctness change: it can alter later deterministic outcomes because the animal is truthfully
stationary rather than being presented as if its requested action succeeded.

## Decision evidence and observer boundaries

Each chosen action retains an immutable decision trace containing its tick, scored priority,
trigger, structured action, target, destination, intended outcome, decision-time evidence and
constraints. Explanations use that recorded trace only; later sensing, a stale hunt target, or an
intended destination cannot rewrite the reason shown for an earlier decision.

Evidence distinguishes current perception, memory, communication, inference and internal state.
A remembered sight or smell is labelled as memory while retaining its original channel. Heard
events, received signals and explicit map reveals are separate collections, so an unknown sound
does not reveal terrain and an observed alarm identifies its sender rather than disclosing a hidden
predator position.

Presentation has four access levels: **Laboratory diagnostic** exposes internal model state;
**Selected-self** exposes the selected animal's own state; **Observable-other** is limited to
visible body state, posture, movement, injury, emitted signals and directly perceived interaction;
and **Strategic** exposes only coarse identity, position and survival state. Old saves default
missing traces to `null`, convert old contacts to memory provenance, and treat legacy mixed
communication entries as heard events rather than map reveals.

## Health, visual events and causal traces

Acute health severity is measured against the animal's recoverable health cap. An animal at 60/60
therefore has permanent capacity loss but is not acutely critical. Health is clamped between zero
and its cap. The health bar separately shows current health, recoverable empty capacity, and the
dark permanently unavailable portion.

Attack, call, injury, priority and thought visuals use bounded, deduplicated wall-clock events.
Their minimum display time is independent of simulation speed, and unchanged alerts do not extend
themselves indefinitely. Priority changes must remain stable briefly before starting a thought
transition. Lost calls consistently apply to stationary, ungrouped non-dependent animals.

RSS causal instrumentation is stored as compact structured records with a 32-entry history. Text
is formatted only when the selected animal's trace is displayed. RSS data and wall-clock visual
events are presentation/diagnostic state and are excluded from saved worlds.

## Tick-built presentation snapshots

Renderer-ready semantic snapshots are built once after each completed simulation tick and cached by
animal, tick and access mode. Ordinary animation frames read those snapshots and are limited to
position interpolation, posture animation, event fading/pulsing, camera/LOD visibility and mutation
of existing Three.js objects. The profiler resource report includes the snapshot count and maximum
semantic derivations for one animal in the current tick; ordinary play should report at most one.

Intent trails own one fixed `BufferGeometry` and typed position array for their lifetime. Samples
update that attribute and draw range only when movement adds a non-duplicate point. Synchronous
frame traversal also reuses vector and quaternion scratch objects for terrain pose, headings, arrows
and camera targets.

## Landscape render batching and culling

The connected hex ground keeps one index batch per populated terrain material. Do not restore a
geometry group per cell: Three.js submits every geometry group as a separate draw call, even when
adjacent groups use the same material. `batchIndicesByMaterial()` is covered with both small and
production-sized index arrays.

Vegetation remains chunked so ecological changes can rebuild only affected chunks. Each frame,
chunk roots are rejected by both bounded camera distance and the camera frustum. Fine decorative
layers such as bushes and lilies use a shorter distance tier; structural trees remain visible at
the coarse tier. These visibility decisions are presentation-only and never alter authoritative
vegetation, navigation, sight blocking, saves, or hashes.

Benchmark reports expose `terrainMaterialDrawGroups` and `visibleVegetationChunks`. A normal ground
mesh should never exceed the available terrain-material count (currently 12). Compare total draw
calls, Three.js render time and FPS using the same camera and viewport before claiming a gain.

## Bounded perception result reuse

Cell line-of-sight is broad-phased by the existing spatial/hex lookup and cached for stationary
observers. A cache entry remains eligible only while position, body and head heading, effective
sensory focus, vision range, terrain/vegetation versions, season and ecological hour match. Moving,
scanning or a landscape change invalidates it immediately. Animal and corpse observations are not
reused because their transforms and salience can change every tick.

The cache is capped at 1,024 cells per animal, cleared on world activation/reset, and excluded from
saves and authoritative hashes. Benchmark resources expose `cellVisionCacheHits`,
`cellVisionCacheMisses` and `cellVisionCacheEntries`; resting populations should develop hits while
moving populations correctly miss and recompute.

## Stable animal roots and resource ownership

Animal root topology is cached by species and life stage only. Emotion, signals, attacks, injury,
courtship, rejection, pregnancy, health and ordinary body-condition changes update referenced child
objects in place. Body, head, eyes, tail, face, wound, attack effect, signal/status, health, thought,
sex marker and optional indicators are retained under the root's `userData.parts` structure.

Action badges are reserved for blocked movement and deliberate listening; locomotion, fleeing,
chasing, feeding, drinking, resting, guarding and attacking rely on posture and movement. Dynamic
resources are labelled shared, entity-owned, chunk-owned or temporary. Targeted animal and intent
removal disposes only explicitly owned geometry/material resources and leaves global shared assets
available to every other entity. The profiler reports animal roots created/removed and owned-resource
disposal counts alongside renderer geometry and texture memory.

## Phase 6 corpse and perception diagnostics

Animals and corpses share a spatial-index implementation while retaining separate buckets and ID
lookups. Carcass sensing queries only nearby corpse buckets and then restores corpse insertion order,
so the established deterministic contact and random-number order is unchanged. The diagnostics report
also exposes `corpseQueryCallsLastTick`, `corpseCandidatesLastTick`, and `totalCorpses`.

Corpse visuals persist by corpse ID. They are replaced only when changing between fresh, decaying and
skeleton stages, and are removed when the corpse leaves the world. Ordinary frames reuse the visual,
update its position/scale/visibility, and apply camera-frustum, distance and observer-awareness culling.
World reset and load clear the cache through the existing owned-resource disposal rules.

`tick.perception` is recorded once per simulation tick as the accumulated sensing time for all animals;
`tick.corpses` is the corpse ageing/removal time for that tick. To collect browser measurements, enable
the profiler, clear it, run one fixed scenario, and read `rssDiagnostics.report()` as described above.
For a short CPU-only small/medium/high query baseline, run:

```powershell
npm run benchmark:phase6
```

The Phase 6 implementation run used 25 animals/100 corpses, 100/1,000, and 250/5,000. Each animal had
the same eight nearby corpses while all remaining corpses were distant. Candidate work stayed at exactly
8 corpses per animal in all three cases, demonstrating that sensing candidates depend on local corpses,
not the total corpse population. Timing samples can be noisy on a busy development machine and are
reported as baselines only; no performance improvement is claimed without a same-machine pre-change run.

## Phase 7 stable sensing and action order

Animal updates now use one explicit tick lifecycle:

1. update physiology and other pre-sensing state for every living animal;
2. prepare outward signals from information already held at the start of the tick;
3. build one stable spatial and occupancy snapshot;
4. sense for every living animal without moving any animal;
5. refresh outward signals and interpret received group alerts;
6. choose and apply actions in persistent decision order;
7. apply pregnancy, digestion, health and death consequences;
8. rebuild post-action occupancy/index state, then update groups and presentation snapshots.

This fixes the former stale-bucket case where an early animal could cross a spatial bucket before a
later animal sensed it. Saves retain a small `decisionOrder` number for each animal; older saves receive
orders from their existing saved array order. Newborns receive the next order and begin physiology,
sensing and action on the following tick.

The correction intentionally changes some same-tick information timing. Movement sounds, attacks and
new perception-driven calls produced during the action phase are heard uniformly on the next tick,
rather than only by animals that happened to appear later in the backing array. Attacks and movement
conflicts still resolve sequentially in the same tick, using the stable decision order. Group alerts
derived from the completed sensing phase are available for that tick's decisions.

With profiling enabled, `rssDiagnostics.report()` includes `tick.total`, and the following bounded
development helper runs an actual fixed-seed world without rendering or autosaving between ticks:

```js
rssDiagnostics.longRunSummary(1337, 10000)
```

It reports elapsed time, population by species, births, deaths, animals that moved, the final
authoritative hash, and the bounded timing summaries. Running this changes the current development
world, just like `fixedSeedHash`, but profiler samples and batch state are not saved as world truth.

## Phase 8 landscape and fog invalidation

Vegetation presentation is divided into persistent 24×24-world-unit chunks. Observer movement,
rotation, selection and entity-focus changes now alter chunk visibility and fog only; they do not clear
or reconstruct vegetation. Terrain, water and vegetation have separate bounded dirty-chunk sets, and
vegetation growth or grazing rebuilds only affected vegetation chunks. Chunk resources use chunk-owned
disposal during replacement, load and reset.

Entity fog owns two preallocated typed position buffers and reusable `BufferGeometry` objects: fully black
unknown terrain and dim previously explored terrain. Both reuse the exact terrain-cell triangles, so selecting
an animal cannot create large floating fog wedges that resemble missing ground. A stable circular local aperture
clears both layers while directional eye visibility remains a separate diagnostic overlay. The mask renders above
terrain and vegetation so unknown trees cannot leak through it. Map-reveal lookup uses local buckets; heard sounds remain separate and never reveal fog. Load/reset
disposes the owned fog geometries before creating them for the new world.

Profiler reports include `display.terrain`, `display.vegetation`, `display.fog`, chunk/dirty counts and
fog buffer capacity/use. The continuous hex ground and joined river/lake surface remain global meshes:
hydrology identifies affected chunk sets but still rebuilds that global surface to avoid introducing
water seams. Converting those continuous meshes to independently replaceable terrain chunks is deferred
until their cross-chunk shoreline and river topology can be preserved and tested in a real browser.

## Phase 9 bounded presentation and UI

Animal presentation is assigned one of five tiers before optional overlays are created or updated:
**selected**, **close**, **medium**, **distant**, and **strategic**. Selected animals receive every
channel allowed by the current access mode. Close animals retain readable posture, observable signals
and urgent events. Medium animals retain simplified movement and critical visible state. Distant
animals use the base body only, and strategic zoom uses aggregate map markers instead of individual
animal roots.

Global budgets bound connectors, trails, thoughts, call rings, health bars and action badges. Candidate
ordering is stable, keeps the selected animal and epistemically permitted immediate threats ahead of
ordinary candidates, and applies hysteresis to close rankings. Access-mode privacy is checked before
importance: a selected or urgent animal cannot spend a budget slot on a private channel the observer is
not permitted to see. These development-only limits are configurable without entering saves:

```js
rssDiagnostics.presentationBudgets()
rssDiagnostics.configurePresentationBudgets({ connectors: 8, trails: 16, thoughts: 1,
  callRings: 12, healthBars: 24, actionBadges: 12, movementArrows: 24, urgentHalos: 16 })
```

The profiler resource report includes current tier counts, configured budgets and visible counts for
each budgeted overlay. `frame.total`, `frame presentation update`, `Three.js render`, `overlays`,
`minimap`, `UI.minimap.static`, `UI.reality`, and `DOM/UI` provide the Phase 9 timing split. The Reality
panel does no population/terrain work while hidden, updates at most once per 750 ms while open, and
mutates its existing sections only when their generated content changes. The minimap caches its static
terrain separately; animal/selection updates do not redraw that terrain.

For a same-machine Phase 9 comparison, run each Phase 0 baseline scenario unchanged for 30 seconds,
then copy `rssDiagnostics.report()`. Record the timing fields above plus renderer calls, triangles,
geometries, textures, tier counts, visible animals/corpses and all visible overlay counts. A result from
a different browser size, seed, population, camera setup or machine is not comparable. Base-animal
instancing is intentionally deferred unless those measurements show Three.js render time and draw calls
are the remaining dominant frame cost. If later justified, picking must use an explicit mapping from
each `InstancedMesh` instance ID to animal ID, with selected or unusually animated animals promoted to
individual roots.

## Responsive high-speed simulation

Rendering now receives a frame opportunity after at most 7 ms of completed simulation-tick work.
Any due ticks that did not fit remain in the accumulator and execute in their original order on later
frames; ticks are never skipped, combined, or reordered. A single unusually expensive tick cannot be
interrupted, but additional ticks will not compound that stall in the same frame. This changes only
wall-clock throughput under load, not authoritative tick results or random-number order.

The profiler resource report exposes `simulationTickBacklog`,
`simulationTicksCompletedLastFrame`, and `simulationFrameBudgetMs`. A sustained backlog means the
requested tick rate exceeds the current machine's capacity; it is not evidence that ticks were lost.
Use the established same-scenario profiler procedure before claiming an improvement.

## Movement and ground contact

Animals choose from the authoritative connected neighbours of their current hex. Standing still is no
longer offered as a movement route, so an animal may take a temporarily longer detour around an occupied,
flooded, or tree-blocked cell. It still enters the structured `blocked` action when no connected
traversable neighbour exists. This is an intentional movement-correctness change and can alter fixed-seed
world outcomes after the first affected route choice without changing RNG call order.

Food and water decisions identify location-only memory evidence by its structured evidence type; the
destination itself never becomes evidence. Presentation height is interpolated from the same triangle fan
used to draw the ground instead of using a nearest-cell approximation. A single instanced contact-shadow
layer and subtle reusable ground pattern improve motion and height readability without adding one shadow
object per animal. Older saves remain compatible; an animal at a legacy between-cell coordinate joins its
connected cell topology on its next move.

## Camera clearance and goal horizons

The orbit camera keeps its target on the rendered terrain and maintains at least 2.4 world units of
ground clearance. Zoom distance is bounded from 6 to 520 units with tuned pan, rotation, damping, and
zoom speeds. Presentation LOD uses both orbit distance and height above terrain: a near-ground camera
cannot show strategic or distant icons merely because its orbit target was previously far away.

Animal roots keep a scale-aware clearance above the rendered terrain; lowered stalking, resting and
birthing postures receive additional clearance so their body meshes do not enter slopes. Ordinary walking
uses a slow articulated bob shared by body, head and tail, keeping attached eyes aligned with the head.
Fleeing and chasing retain a faster cadence.

Each animal now saves an authoritative `goalPlan` with exact short-, medium-, and long-term keys. The
short-term goal gives an ordinary selected priority a limited commitment bonus (normally four ticks,
eight for travel/resource/hunt goals) while explicit emergencies bypass commitment. A blocked movement
releases its commitment immediately. Medium goals describe reserve recovery, pregnancy, or dependent
care; long goals describe survival, raising current offspring, or reproduction when adequately resourced.

Female reproductive readiness now requires food reserve, hydration, health, manageable fatigue, and no
needy dependent in addition to the existing energy and fertility requirements. If condition declines
during courtship, conception is deferred instead of converting automatically into pregnancy. Older saves
without `goalPlan` receive empty horizons on load and establish them on the next decision.

Each goal horizon also retains a ranked top three with scores. Short-term rankings come from the actual
decision candidates selected that tick. Medium- and long-term rankings are scored from reserves, safety,
pregnancy, dependents, reproductive readiness and information needs. Both selected-organism and Laboratory
priority views show all nine entries; observable-other views still cannot inspect another animal's private
plans. Older singular goal plans migrate into one-entry rankings and expand to three at the next decision.

Animals now maintain species-specific internal body temperature. Ambient weather, snow, desert ground,
woodland, wetlands, shallow water, nearby water, movement, digestion, drinking, mating, and crowding all
contribute. Heat or cold stress can become a structured priority, change movement capacity, defer mating,
produce an expression or social signal, and cause injury at dangerous extremes. Laboratory and selected
entity views show body and air temperature separately. Older saves default safely to the species set point.

### Lifetime experience and ageing

Each animal stores a compact authoritative lifetime history: equivalent hours of fear, fleeing, active injury,
extreme exertion, thermal strain and serious food/water deprivation, plus counts of injuries and emergency
exertions. The history produces a continuously changing life-quality multiplier between 1× and 3× the
species baseline lifespan and moves the onset of senescence by the same factor. A safe, well-fed, low-stress
life can approach 3×; sustained hardship moves the projection toward 1×. This models the broad survival
advantage documented for many zoo mammal populations without treating captivity itself as a magic bonus.
The selected Laboratory age field displays the current projected maximum and multiplier. Older saves lacked
the required history, so they migrate deterministically to a neutral 2× estimate and accumulate real history
from their first post-load tick.

Animals cannot read another animal's thought bubble, trace, priority, exact health bar, or detailed injury
record. Sight can retain only observable body cues such as movement, posture, emitted signals, bruising, or
a limp. Exact health and thoughts remain available to the human viewer in selected-self and explicitly
labelled Laboratory diagnostics. Perception overlays now highlight and tilt with terrain cells instead of
cutting through slopes as a separate flat disc.

Feeding and rest use sustained activity budgets. Grazers take small continuous bites, hunters consume
carcasses in substantial body-mass-bounded meals, and neither activity receives an artificial alternating-tick cooldown.
Passive fatigue recovery is slight; substantial fatigue, energy, and health recovery requires animals to
remain resting for multiple simulation hours. Ordinary feeding and rest commitments remain interruptible
by danger and other urgent needs.

Ridge Hunters use a carnivore-specific energy budget. Their basal depletion and digestion are slower than
the continuously feeding grazer model, while a carcass meal is a substantial but body-mass-bounded intake.
When satiated they conserve energy for most of the day. Their two daily activity windows are used for
remembered prey routes, scent tracking, listening, and scanning rather than random wandering; urgent
survival, dependent care, territorial group movement, and an active hunt can still override that rhythm.

### Vigilance, stealth and exertion

Animals can stop briefly to scan and listen. Focused vision and hearing begin after one stationary tick
and strengthen after three, rather than requiring a long wait. Fear can probabilistically produce a short
freeze before flight; hungry hunters without visible prey and uneasy grazers can also choose focused
vigilance directly. Information gathering may become a short-term action and, while knowledge is poor, a
medium/long goal to maintain prey knowledge or predator awareness.

Hunters infer whether visible prey may have noticed them only from observable heading, head attention,
movement and nearby visible group members. A hunt records the prey's last observed heading, group size and
group heading. An apparently unnoticed distant target permits a low stalking posture; at very slow speed
this reduces movement sound by 95%. A prey-facing hunter may hold still or abandon a detected approach.
Scent choices compare fresh trails with older prey memories, including remembered visible body mass; they
do not reveal a hidden animal's current position.

Both species have a short sprint reserve distinct from long endurance (`100 − fatigue`). Grazers have the
longer escape sprint; hunters have the faster but shorter pursuit sprint. Below 50% endurance, speed falls
by a half-life curve, and zero endurance prevents movement until rest. Once the sprint reserve is empty, a
single emergency dash can consume the remaining adrenaline reserve, inflict a seeded 20–80 health cost
within the species profile, set endurance to zero and force a short collapse. Older saves receive full
species-appropriate sprint and emergency reserves, with no random numbers consumed during migration.

### Body composition and calories

Animals store authoritative lean mass, fat mass and stomach calories. The former 0–100 stomach field is
retained as a derived compatibility percentage. Metabolic demand depends primarily on lean mass, with a
smaller contribution from fat mass, and varies by the fictional species/sex physiology profile. Stomach
calories are used before stored fat. Sustained surplus calories can continue increasing fat and total body
mass without an eating-related maximum; only the inherited spawn-frame `sizeTrait` remains capped.

| Profile | Critical fat | Modelled ideal range | Obese threshold |
|---|---:|---:|---:|
| Male Valley Grazer | 5% | 10–19% | 30% |
| Female Valley Grazer | 12% | 17–28% | 38% |
| Male Ridge Hunter | 4% | 8–16% | 27% |
| Female Ridge Hunter | 10% | 14–24% | 34% |

These are explicit parameters for the fictional animals, not human or veterinary reference ranges. Below
critical fat, health declines and restoring fat becomes an urgent priority. A female remaining below her
critical threshold for the profile's prolonged exposure period receives lasting fertility impairment;
later weight and health recovery do not automatically remove it. Older saves deterministically derive lean
mass, fat mass and stomach calories from saved body mass and fullness without consuming random numbers.

The selected animal's exertion bar combines long endurance, short sprint capacity and emergency reserve.
A separate side-mounted composition bar shows body-fat percentage on the left and stomach-calorie fill on
the right, keeping it away from the health and exertion stack.

Courtship, acceptance or rejection, mating, conception, pregnancy, labour, and birth are separate events.
Courtship lasts before the female evaluates compatibility; rejection shows a short `×`, while acceptance
shows a longer `✓` before mating begins. During mating the male is presented behind the female with a
raised, gently moving body while the female retains her ordinary stance. Labour persists before offspring
are created. A sufficiently healthy, calm father whose traits still broadly align with the female's
preferences may remain nearby as a birth attendant; urgent survival needs still take priority.

### Pregnancy physiology

Litter size is established at conception. During gestation, maternal body mass, baseline food demand, thirst and digestion rise gradually from the ordinary female baseline to `1.5 ^ carried offspring` at term (one offspring 1.5×, two 2.25×, three 3.375×, and four 5.0625×). The visible body expands by the corresponding volume scale while the head and eyes retain their normal proportions. Pregnancy suspends the ordinary fertility cycle and records implantation, early, middle, late and pre-labour hormone phases.

Older saves without a carried-offspring count migrate to the species minimum litter size. This migration is deterministic and consumes no random numbers.
