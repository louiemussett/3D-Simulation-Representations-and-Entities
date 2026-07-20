# RSS Living Laboratory — rapid prototype

A browser-based Three.js grassland simulation. It is an exploratory prototype for observing how individual needs, perception, memory, social behaviour and ecological constraints interact. It is not calibrated empirical evidence and does not prove RSS outside this model.

Developer architecture, schema, ownership, migration and verification rules are documented in
[DEVELOPMENT.md](DEVELOPMENT.md).

For the complete intended design, implemented feature inventory, known suspect areas and repeatable bug-bash method, read [the bug-bash design baseline](bugbash/DESIGN-AND-BUG-BASH-BASELINE.md).

## Run it

From PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File "C:\Users\louie_000\Documents\Codex\2026-07-17\run.ps1"
```

No installation or build step is required. Three.js loads from a public CDN, so the first launch requires an internet connection.

## Controls

- Drag to rotate the camera; right-drag to pan; mouse wheel to zoom.
- **Pause** stops simulation time; **Step** advances one simulation tick.
- The simulation-rate slider runs from 0 to 10 ticks per second. The multiplier scales that range: ×1, ×2, ×3 or ×5.
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

World symbols use a consistent presentation grammar: the body shows the current physical action, the face shows emotion, a brief thought bubble announces a changed priority, the health bar shows physical condition, coloured ground cues show intended movement, and a single evidence-coloured connector shows the strongest known cause. White arrows on selected organisms show facing/attention rather than travel direction. Sight, sound, scent and memory use distinct connector colours and confidence; remembered or approximate evidence never reveals a hidden entity's true position. Unusual actions such as fleeing, stalking, searching, listening, guarding and obstruction receive a compact action badge, while intentional social calls use a separate expanding signal ring.

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
- Clear terrain is in current sight. Woodland can block a sightline and reduces sight range for an animal inside it.
- Hearing, smell, scent trails, vision and interoception contribute different contacts and memories.
- Blue memory markers represent only drinkable water that the animal previously observed. They are not hidden map water.
- Same-species communication can temporarily reveal an approximate food, water or threat direction. Other species are heard as unidentified sound.

The inspector shows current action, priority chain, target, awareness, relationships, mating history, female mate preferences and expression. The **Expression** row explains the generated face currently displayed.

## Emotion faces and overlays

Animal faces are generated in browser memory, not stored as image or vector files. They are cached Three.js sprite textures selected from current state: calm, happy, hungry, thirsty, sleepy, fearful, dizzy/injured, angry, intense, affectionate and gentle/caring. The face explanation is visible in the inspector.

Available overlays include perception, memory, biomass, water and scent trails. Laboratory overlays show global model information; selected-entity overlays limit themselves to the organism’s sensed or remembered information.

At distant zoom levels, individual animals are replaced by grouped strategic markers to preserve performance. The status strip reports FPS, actual simulation ticks per second, terrain detail level, population and the number of organisms currently drawn.

## Limits

- This is a fast visual/ecological prototype, not a full climate, fluid-dynamics or population-genetics model.
- Rules and parameters are illustrative and should be calibrated or replaced before making scientific claims.
- Rendering is a presentation layer; it is not the source of the scientific model state.

## Phase 0 diagnostics

No profiler runs during ordinary play. To enable the bounded development profiler, open
`http://localhost:8017/?profile=1`. It retains only the newest 240 samples in each coarse
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
2. **Normal speed:** Map view, unlocked camera, speed 3 ticks/s (×1), no selection.
3. **Fast speed:** same view as scenario 2, speed 10 ticks/s with the ×5 multiplier.
4. **Follow moving animal:** return to 3 ticks/s (×1), select a healthy adult grazer, enable Lock entity, and confirm it is moving before clearing samples.
5. **Many corpses/skeletons:** use `rssDiagnostics.fixedSeedHash(1337, 2400)`, press Map, pause, and measure only if at least 20 corpse/skeleton objects are visible; otherwise advance another 2400 ticks and record the final tick with the report.
6. **Reality panel open:** reload seed 1337, use 3 ticks/s (×1), Map view, open Reality, and leave the panel open for the full sample.

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

The smoke test uses `?test=1`, which keeps production code paths but reduces the generated world to
48×48, 18 grazers and 4 hunters, disables antialiasing and caps device pixel ratio at 1. Normal pages
are unchanged. Playwright starts one local static server and one headless Chromium/Chrome worker, then
closes both. Screenshots, traces and videos are retained only when a test fails.

The full 1920×1080 production-quality visual comparison is deliberately excluded from normal tests:

```powershell
npm run test:browser:visual
```

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

Entity fog owns one preallocated typed position buffer and `BufferGeometry`. Visibility changes rewrite
the existing attribute and draw range in place. Map-reveal lookup uses local buckets while retaining the
same exact Manhattan reveal test; heard sounds remain separate and never reveal fog. Load/reset disposes
the previous owned fog geometry before creating one for the new world.

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
