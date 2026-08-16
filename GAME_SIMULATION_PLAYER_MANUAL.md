# RSS Living Laboratory — Player Manual

## What this is

RSS Living Laboratory is an open-ended wildlife simulation. You are an observer, not a character. Valley Grazers seek plants, water, safety, companions and mates. Ridge Hunters seek prey, corpses, water, safety and family/group support. Weather, seasons, water, plants, injury, memory and communication alter what happens. There is no win or loss screen; the aim is to observe and experiment.

## Starting and controlling a world

The simulation opens with a seeded world. Use **Pause/Play** to stop or resume automatic ticks and **Step** for one authoritative tick. The speed slider requests 0–10 ticks per second; the multiplier offers ×1, ×2, ×3 and ×5. High settings can be CPU intensive because each tick performs ecology and perception for the population.

World settings affect the next reset/new seed: preset, physical span, hex detail, season, wind, starting populations, relief, mountains, hills, valleys, rivers, lakes, woodland, plant densities, rainfall, storm/rain-shadow/sediment strengths and temperature range. **Reset** creates a different random seed; **Save seed** records the present seed for later recreation.

## Camera and selection

- Drag/rotate, pan and zoom with the standard Three.js orbit camera controls (mouse/touch gestures).
- Click an animal to select it; click again to clear it unless locked.
- Click empty terrain when no entity is selected to inspect a cell.
- **Lock entity** follows a selected moving animal. **Map** clears focus and restores the overview camera.
- A selected group can be focused through the Reality panel.

Selection opens details, priorities, trace and view tabs. “Laboratory” can disclose internal drives and memories. Entity-aware views deliberately hide private thoughts and exact intent of other animals.

## Interface inventory

| Area/control | What it does | Notes |
|---|---|---|
| Top observer HUD | Pause, map, Reality, Laboratory, speed | Main everyday controls |
| Inspector | World setup, simulation, selected entity, overlays, events, saves | Can slide closed |
| Reality panel | Terrain/population/group totals | Updates only while visible and at a bounded rate |
| Minimap | Cached terrain plus current entities/selection | Mode dropdown changes the mapped field |
| Event stream | Recent births, deaths, saves and notable changes | Filter and display limit available |
| Details/Priorities/Trace/View | Selected-animal facts and explanations | Visibility depends on observation mode |
| Footer/World symbol key | Basic on-screen legend | The complete legend is in the companion document |

## Controls reference

| Input | Result | Mechanical effect |
|---|---|---|
| Pause/Play | Stops/starts automatic simulation ticks | Presentation/camera can still render while paused |
| Step | Advances exactly one tick and pauses | Changes authoritative world state |
| Speed + multiplier | Changes requested tick rate | Does not directly change a single tick's rules |
| Map | Returns to overview | Presentation only |
| Reality | Opens aggregate panel | Presentation only |
| Laboratory | Opens/closes inspector | Presentation only |
| Canvas click | Select animal/group or terrain | Observation only |
| Lock entity | Camera follows selected entity | Presentation only |
| Favourite | Saves selected ID and seed | Browser metadata; not animal state |
| Quick save/load | Save or restore resume snapshot | Authoritative state persistence |
| Named slot save/load/delete | Manage reusable saves | Browser storage |
| Export/import | Download/upload JSON world | Validated/migrated on load |
| Game shortcut | Downloads a URL shortcut for a named slot | Requires local server and stored slot |
| Overlay checkboxes | Show biomass, water, scent, perception, sound, calls, memory or entity focus | Diagnostic presentation; does not alter truth |
| Feedback pathway | Immediate/delayed/suppressed/independent diagnostic return | Laboratory tracing feature |

## Reading animals

Gold/brown rounded creatures are Valley Grazers; cooler/red-brown predator forms are Ridge Hunters. Primitive body, head, eyes, tail, face and markers change with species, sex, life stage and posture. Distant presentation intentionally removes small details such as eyes and heads at the farthest tier; zoom closer or select the animal for full detail. This is level-of-detail rendering, not decapitation or injury.

Movement and posture are the main action language. A line/trail is recent movement intent/history, an arrow gives direction, and a ring/halo highlights selection or urgency. Health bars divide current health, recoverable empty capacity and permanently unavailable capacity. Injury can reduce the cap without making a fully recovered animal “acutely critical.”

## Symbols

| Symbol | Meaning |
|---|---|
| `W` | water request |
| `!` | threat/alarm |
| `✹` | actual recent physical attack |
| `+` | injury signal |
| `♥` | dependency/care or courtship, depending on context |
| `?` | lost/contact call |
| `F` | hunger signal |

These are messages or visible alerts. An alarm reports a sender's knowledge; it does not automatically prove the predator's exact location. The “Ambient sound” overlay visualises heard movement/noise—it does not play audio and must not reveal unseen terrain.

## What animals do

Animals can idle/orient, rest, travel/wander, graze/browse/drink, flee, join or shelter with a herd, evaluate prey, stalk/chase/attack, search/listen/track scent, guard/defend, court/reject, scavenge/feed/claim/yield a carcass, nurse/protect offspring, communicate/coordinate and become blocked when no valid move exists. They decide from current evidence, bounded memories, internal needs and group information. Their displayed explanation is captured when the action is selected, so later contacts should not rewrite the reason.

## Time and expected outcomes

Ticks advance physiology and decisions. Days and seasons change automatically. Plants grow and spread; animals feed, digest, drink, age, mate, give birth, become independent, become injured and die. Corpses pass through fresh, decaying and skeleton stages before removal. Populations may rise, fall or collapse from local rules; the code does not guarantee equilibrium.

## Saving and recovery

Quick saves, named slots and favourites live in this browser profile. Export JSON for a portable copy. Imported/older saves are defaulted to current schema where supported. Visual interpolation, trails, profiler samples and GPU objects are intentionally not authoritative save data, so a loaded frame will be visually reconstructed.

## Experimental limitations

- Fast speed can produce long stalls on the default large world.
- Terrain/vegetation rendering, rather than animal bodies, is the largest draw-call concern in measured views.
- Selecting/changing observer can trigger more landscape work than necessary.
- No sound is played despite the sound-information overlay.
- Colour and small symbols carry substantial meaning; accessibility is limited.
- This is a simulation laboratory, not a validated scientific population model.

See [the complete visual legend](GAME_SIMULATION_MAP_AND_VISUAL_LEGEND.md) for visual detail and [the entity/action catalogue](GAME_SIMULATION_ENTITY_AND_ACTION_CATALOGUE.md) for every structured action.
# Embodied Simulation

Select **Embodied Simulation** while creating a world to inhabit one animal without removing the autonomous Laboratory experience. The inhabited animal replaces one starting demographic entry, so the configured population total does not increase.

Difficulty controls setup detail, Laboratory access, map knowledge, camera range, HUD information and whether control is direct or indirect. Carnivore, herbivore, omnivore and random ecological roles are separate from difficulty. In direct modes, movement and contextual action requests remain constrained by the animal's ordinary biology and knowledge. In Impossible Immersion, the first-person camera follows the animal's autonomous head direction and the Internal Influence panel only biases need/commitment pressure; it cannot select a target, route or action.
