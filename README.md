# RSS Living Laboratory — rapid prototype

A browser-based Three.js grassland simulation. It is an exploratory prototype for observing how individual needs, perception, memory, social behaviour and ecological constraints interact. It is not calibrated empirical evidence and does not prove RSS outside this model.

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
