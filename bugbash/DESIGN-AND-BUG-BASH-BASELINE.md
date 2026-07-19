# Living Laboratory: design baseline and bug-bash charter

**Status:** working rapid prototype, not a validated scientific model.  
**Purpose of this document:** record the intended design and the systems added during development, so bugs can be assessed against a shared target rather than against screenshots or assumptions alone.

## 1. Project intention

The Living Laboratory is an interactive ecological simulation and RSS experimental environment. It is meant to make an organism's causal situation inspectable:

```text
environment → sensed contact → signal → processing/memory → capability
→ action → consequence → feedback/correction
```

It is **not** intended to prove RSS universally or reproduce a particular real ecosystem exactly. It should establish what happens *inside this explicit model*, allow the user to observe why it happens, and make incorrect or missing behaviour visible enough to repair.

The practical prototype goal is a living, inspectable predator–prey world that can run locally in a browser. Causal legibility and observability matter more than visual realism, but the world should still look coherent enough that terrain, cover, water, behaviour and outcomes make intuitive sense.

## 2. Non-negotiable design principles

1. **No hidden omniscience for organisms.** Behaviour may use direct physical contact, sensed signals, or the organism's own memory—not privileged simulator coordinates.
2. **The world is stateful.** Organisms, water, vegetation, terrain, remains, pregnancy, memories and groups persist across ticks and saves.
3. **Renderer is presentation only.** Visual overlays must not change simulation outcomes.
4. **World state and entity state are different views.** Laboratory/reality views can show global information; an entity view may show only that entity's sight, hearing, smell, memory and received communication.
5. **The map is a bounded square world.** Nothing—animal, asset, terrain or selected view—should exist outside the board.
6. **The prototype favours clarity over audit ceremony.** It is a rapidly evolving local simulation, but each repair should be testable in the visible interface.

## 3. Intended world model

### 3.1 Terrain and hydrology

The simulation retains a hidden grid for reliable rules but presents a connected hex terrain surface. A new world is seeded and procedurally generated on reset.

| Feature | Intended rule |
|---|---|
| Elevation | A continuous field with flat countries, rolling hills, broad massifs, and a minority of long ridges. High relief/mountain settings must not unexpectedly choose a flat country. |
| Mountains | Same elevation field as hills, but higher/steeper, colder, rockier and a source of springs. They should include broad massifs, not only thin walls. |
| Valleys | Lower, deeper-soil areas that collect drainage; lush after rain but potentially hot/dry during drought. |
| Lakes | Low basins with an excavated bed and a separate, level water surface. Water levels rise/fall while staying horizontal. |
| Rivers/streams | Follow downhill drainage from headwaters; seasonal channels can vary, permanent channels retain baseflow. |
| Soil | Depth, slope, fertility, moisture, drainage and substrate influence vegetation. |
| Ground classes | Grass, long grass, woodland, bush cover, dirt, mud/wetland, sand, rock, snow, shallow water and deep water. |
| Board edge | All visible terrain fills the square world boundary; no rounded missing corners or external assets. |

### 3.2 Climate and vegetation

Regional weather is intentionally lightweight: moving high/low pressure systems, rain bands, wind, seasons, temperature gradient, altitude cooling, windward wetness and leeward drying. It is not numerical weather prediction.

- Grass biomass grows/shrinks with rain, temperature, soil, season and grazing.
- Short and long grass are ecological states. Long grass reduces distant visual certainty but becomes less concealing at close range.
- Woodland requires persistent moisture, deep soil and gentle terrain. It is not grazeable.
- Bushes form on suitable woody ground; animals can enter them, but movement is noisy and sight is obscured.
- Living leafy trees give full visual cover; leafless winter trees and fallen logs give partial (50%) visual reduction.
- A rare storm/drought event can create a fallen tree. It remains as cover for six simulated months, then decomposes.

### 3.3 Water rule

Only a true lake or flowing water channel is drinkable. Damp ground, grass moisture, mud and groundwater may affect ecology but must not create a drink action or water contact by themselves.

## 4. Intended entity model

There are two initial species: **Valley Grazers** (herbivores) and **Ridge Hunters** (carnivores).

### 4.1 Shared organism state

- Identity: species, identifier, sex, age, life stage, mother, offspring, group and relationships.
- Traits: body size, body mass, aggression, care affinity, scent skill, water skill, food skill and mate skill.
- Physiology: energy, hydration, stomach/fullness, fatigue, health, health cap, injuries, temperature stress and fear.
- Lifecycle: dependent infant, juvenile, subadult, adult, old age, death, carcass/skeleton.
- Behaviour: orientation, movement target, action target, current action, drive/priority chain, movement noise and stationary attention.

### 4.2 Core actions

| System | Intended behaviour |
|---|---|
| Movement | An animal turns before changing direction, then travels across the terrain surface. It must not teleport or walk backwards relative to its body. |
| Rest | Tired or injured animals prioritise recovery appropriately; rest should not create permanent starvation loops. |
| Grazing | Only grazeable grass biomass can be eaten. Grazing visibly lowers biomass/grass height. |
| Drinking | Requires physical adjacency to a drinkable river/stream/lake cell. |
| Hunting | Hunters require their own perceived prey evidence, then stalk/pursue/attack. Hunger, fatigue, fullness, risk and cover influence the decision. |
| Carcass feeding | Carcasses emit scent, take time to eat, can be guarded/contested and ultimately become skeletons. |
| Combat/injury | Hunters can injure grazers; grazers can defend at lower damage/greater energy cost. Health decline must be visible. |
| Healing | Injury can heal only to a constrained health cap; serious injury imposes lasting speed/rest penalties. |
| Death | Starvation, dehydration, injury and age are distinct causes. |

### 4.3 Reproduction and care

- Starting populations are approximately 50/50 female/male.
- Females have species-specific fertile cycles and mate preferences (health, mass, age, aggression).
- Courtship can be accepted or rejected. Both outcomes are visible and recorded.
- Herbivores bear one offspring; hunters bear a litter.
- Pregnancy, birth, nursing, dependency, caregiver assignment and independence are part of the lifecycle.
- A parent retains an enduring child record: a mother must not simply forget a dependent child and resume irrelevant feeding.
- A child under attack may cause a caregiver/protection response, not merely a generic flee response.

### 4.4 Social groups

Same-species organisms can form temporary or longer-term groups for: protection, caregiving, water, foraging, carcass search, hunting, mate search and travel.

Groups can be male, female or mixed. Leadership should be selected from goal-relevant traits: e.g. scent ability for carcass search, care affinity/low aggression for caregiving, or aggression for hunting/defence. Close group proximity reduces fear; it must not grant global shared knowledge.

## 5. Perception, memory and communication

### 5.1 Senses

| Channel | Intended constraints |
|---|---|
| Vision | Forward field of view, orientation-dependent, line-of-sight aware. Hunters have a narrower, longer forward view; grazers retain broader view. Stillness expands focused sight after 3 and 9 ticks. |
| Hearing | Sound travels farther than vision, but direction/species/meaning lose precision with distance. A still listener gains accuracy. Movement, calls, combat, feeding and distress generate sound; idle animals should not continuously beacon. |
| Smell | No line-of-sight requirement but strict smell range. Scent trails and carcass scent fade with time/wind; direction becomes more useful at close range. |
| Interoception | Internal energy, hydration, health, fullness, fatigue, temperature and fear. |
| Physical contact | Needed for drinking, grazing, attacks and close care. |

### 5.2 Fog, memory and information boundaries

- At first selection, the entity's unexplored map is black except for current sight.
- Explored-but-not-currently-visible terrain is fogged.
- Memory is not a duplicated global terrain map. Water memories are approximate observed sources; ordinary land defaults to neutral terrain.
- Water arrows/markers represent a remembered *direction/source*, never water physically present on every marked cell.
- Calls may create a temporary approximate reveal, but not perfect coordinates.
- Entity overlays must use the same orientation, range, line-of-sight and contact records as behaviour; a visual cone that disagrees with body movement is a bug.

### 5.3 Signals

An organism exposes at most one urgent outward status at a time. Signals have cooldowns/decay and are not a constant broadcast.

Priority of outward status:

1. Physical attack / immediate danger
2. Dependent-child care request
3. Serious injury/distress
4. Critical thirst
5. Critical hunger
6. Lost/separated
7. Courtship
8. Ordinary state

Visual expressions require line of sight. Calls are audible and less precise with distance. Same-species callers can understand water, threat, care and courtship semantics; other species hear only broad animal activity/alarm/distress.

## 6. Observation and interface intentions

### 6.1 View levels

| View | Intended use |
|---|---|
| Strategic/far | A small number of regional markers; no individual animal clutter. |
| Group/middle | Separate grazer (yellow) and hunter (purple) group markers plus grey count markers for ungrouped individuals. |
| Close | Individual animals, faces, world symbols, interaction cues and terrain assets. |
| Entity | Selected organism's accessible information, essential state, priority chain and RSS trace. |
| Group inspector | Members, sex, pregnancy only when applicable, basic need/health state and group goal/leader. |
| Reality/laboratory | Privileged world-state counts, terrain/resource state, population distribution, comparisons and diagnostics. |

### 6.2 Selection and navigation

- Empty-ground click deselects without moving the camera.
- The Map button recentres/zooms out.
- Lock camera follows a selected entity or group while allowing manual camera control.
- Entities/groups/favourites/saved seeds are selectable and saves can be named, loaded, exported and deleted.

### 6.3 Visual language

Faces are generated in browser memory, not stored as external face images. The UI must explain every visible symbol in the selected panel/legend:

- `W`: water request / critical thirst
- `+`: injury/distress
- `!`: perceived immediate threat
- physical attack: visually distinct from a merely perceived threat
- `♥`: care request or courtship, with context

Status icons, attack cues, injury cues, hearts, rejection signs and pregnancy/infant indicators must last long enough to observe. They are evidence of a state/action, not decoration.

## 7. RSS instrumentation intent

The simulation retains a lightweight causal trace for a selected organism:

1. Interfaces
2. Contacts
3. Signals
4. Processing
5. State / optional representation
6. Capabilities
7. Action
8. Consequence
9. Feedback

This trace must remain diagnostic. It may observe privileged simulator state in a laboratory comparison, but must never alter an organism's memory, target, capability or action from privileged truth.

## 8. Features implemented during this prototype

This is a feature inventory, **not a pass certification**. Many features are present in code/UI but require bug-bash verification.

- Seeded procedural bounded world, configurable map size, population and terrain/climate controls.
- Connected terrain surface with soil, elevation, valleys, hills, massifs/ridges, lakes/headwaters and weather fields.
- Dynamic water-cycle fields, drinkable-source distinction, vegetation growth, grazing, long grass, woody cover, snow/sand/mud/rock classes.
- Trees, bushes, winter bare trees and six-month fallen logs; tree/bush render anchors are cell-derived.
- Grazers, hunters, health/energy/hydration/fatigue/fullness, injuries, permanent health consequences and remains.
- Hunting, fleeing, carcasses, scavenging, contesting, skeletons and carcass decay.
- Pregnancy, conception/rejection, fertility cycles, births, nursing, dependency and caregiver logic.
- Individual/group priorities, temporary goal groups and strategic/group/individual zoom representations.
- Vision, hearing, scent, carcass scent, memory, map exploration, entity fog, calls, visual signals, social alarms and an RSS trace.
- Entity/group/reality interfaces, overlays, minimap modes, lock/favourites, seed saves, named saves/import/export and local resumable progress.
- Generated faces and world status symbols.

## 9. Known suspect areas for the bug bash

These are not declared failures until reproduced, but are high priority because they directly undermine the model.

1. **Terrain generation/rendering:** map edge coverage, relief respecting controls, broad-vs-ridge mountains, lakes/streams visible at reset, horizontal lake surface, and no terrain holes.
2. **Hydrology:** water state matches visible water; configured rivers/lakes always generate; only drinkable channels/lakes support drinking.
3. **Perception agreement:** body direction, vision cone, real sight checks, sound overlays, scent range, contact markers and memory arrows agree.
4. **No privileged leaks:** mating, care/protection, carcass choices, prey tracking, water seeking and feedback use only legitimate contacts/memory/contact.
5. **Fog of war:** new entity begins black-map; explored/current/heard/memory states are distinct; no global water leaks.
6. **Movement:** continuous, surface-aware, directionally correct, bounded, no teleporting/backwards gait.
7. **Predator–prey ecology:** nearby perceived predators interrupt grazing; hunters explain why they do/don't attack; hunters do not starve through inaccessible carcasses/prey.
8. **Family/social persistence:** parent-child memory and care override inappropriate low-priority behaviour; group signals affect group goal without global coordination.
9. **Rendering/performance:** no asset drift, shimmer, z-fighting, hidden legacy square layers, or high-cost rebuilds on routine ticks.
10. **UI legibility:** every marker has meaning; group/entity selection works; overlays reflect their labels; no duplicate/obsolete panels.
11. **Persistence:** reset, quick save, named save, import/export, seed replay and loading old snapshots fail safely.

## 10. Bug-bash method

For each issue, record:

```text
World seed and world-setup values:
Simulation day/tick and speed:
View and selected entity/group:
Expected behaviour from this document:
Observed behaviour:
Screenshot/video or save name:
Reproducible? (always / intermittent / once)
Severity: blocker / major / minor / visual
```

### First test set

1. Generate three new worlds: low relief, rolling hills, high mountains. Confirm terrain and water controls visibly change outcomes.
2. Select a newly spawned grazer and hunter. Compare body heading, vision cone, visible animals, fog, sound, scent and water memory.
3. Place/observe a predator near a grazer. Confirm detection evidence determines flee/scan/graze and the reason is visible.
4. Follow a parent/infant pair through separation, distress, care and reunification.
5. Observe a hunter through hunger, carcass scent, pursuit, attack, feeding, rest and injury.
6. Save, reload, export and import the same world; confirm entity/location/world continuity.
7. Run at slow, normal and fast speed while panning/zooming. Check for rendering artifacts and simulation/display divergence.

## 11. Claim limits

This prototype can help explore how its declared causal assumptions interact. It cannot prove that RSS is universally true, validate real animal psychology, establish ecological predictions without calibration, or replace empirical research. Results must be described as **within-model observations**.
