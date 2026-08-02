# RSS Living Laboratory — Map and Visual Legend

## World structure

**Confirmed.** The modern world is a procedurally generated connected hex graph (`src/hex-world.js`, created from `app.js:createWorld`). World span controls physical extent; hex detail controls cell count independently. Each cell carries coordinates/neighbours plus elevation, slope, temperature, humidity/fertility, water/hydrology and grass/shrub/tree data. A legacy square-world loader remains for compatibility. Boundaries do not wrap. Animals occupy discrete cells for authoritative movement while Three.js interpolates between their centres.

Terrain generation combines sinusoidal broad relief with generated hills, mountain ridges, valleys and lake depressions (`createTerrainProfile`, `dryLandElevation`, `deriveTerrainFields`). Regional climate uses north/south baselines and clamping; weather adds seasons, wind, mobile pressure systems, uplift/rain shadow and storms. Cell data becomes fixed-size chunk presentation through `landscape-chunks.js`; dirty terrain/water/vegetation sets govern rebuilding. Observer/camera should affect visibility/fog, not world truth.

## Map legend

Exact shades can be modified by lighting, weather and overlays; meanings below are semantic rather than sampled screen RGB values.

| Visual | Meaning/location | Mechanical truth | Creation/update | Clarity/status |
|---|---|---|---|---|
| Green ground shades | vegetated/fertile land | cell land class, moisture and plant fields | `buildTerrain`, `landClass` | Confirmed; shades can be ambiguous |
| Tan/brown ground | dry/bare/low-fertility terrain | environmental classification | `landClass`, terrain materials | Confirmed |
| Grey/light high ground | rocky, cold or elevated terrain | elevation/slope/temp classification | terrain chunk renderer | Confirmed; not a collision wall by colour alone |
| Blue surfaces/cells | lakes, rivers or surface water | water fields used by drinking/hydrology | water/terrain chunks | Confirmed |
| Grass tufts | grass resource/stage | edible biomass for grazers | `drawVegetationRegions`, `plantStageFor` | Confirmed |
| Bush forms | shrub resource/stage | edible browse resource | same | Confirmed |
| Trunk/canopy forms | tree resource/cover | browse/cover and seasonal/ damage state | `vegetationKind`, `leaflessTree` | Confirmed |
| Gold/brown creature | Valley Grazer | live herbivore data | `createAnimalVisual`, transient updates | Confirmed |
| Predator-coloured creature | Ridge Hunter | live carnivore data | same | Confirmed |
| Reduced blob/marker | distant animal LOD | same animal; detail suppressed | `resolvePresentationTier`, `presentationPartVisibility` | Confirmed; may look incomplete |
| Body/head/eyes/tail | creature anatomy/readability | presentation only, driven by species/stage/posture | `createAnimalStructuralVisual`, parts map | Confirmed |
| Sex/life-stage marker | sex or young/old category | mirrors stored animal fields | badge/material helpers | Confirmed |
| Face/expression | emotion presentation | derived presentation, not a separate decision cause | `emotionState`, `emotionFaceMaterial` | Confirmed; diagnostic shorthand |
| Three-part health bar | current, recoverable-empty, permanent cap loss | mirrors health and healthCap | `health-presentation.js`, `healthBarMaterial` | Confirmed |
| White/pale selection ring | selected subject | selection only | selected overlay rendering | Confirmed |
| Direction arrow | current movement direction | action state's movement/direction | intent visual update | Confirmed |
| Fading trail | recent sampled movement | presentation history only | `trail-buffer.js`, `updateTrailGeometry` | Confirmed; bounded |
| Connector line | permitted causal/relationship link | reads snapshot/evidence under privacy rules | `drawSelectedOverlays` | Confirmed; not destination-as-evidence |
| Vision wedge/ring | selected perception range/FOV | diagnostic approximation of sensing | `visionGeometryFor`, overlays | Confirmed |
| Sound ring | heard/emitted event | information event, no audio playback | overlays/event manager | Confirmed |
| Call ring + badge | intentional social signal | current outward signal | `syncVisualEvents`, call-ring budget | Confirmed |
| `!` yellow | threat/alarm message | evidence of warning, not proof of attack | `socialSignalMaterial` | Confirmed; potentially confused with attack |
| `✹` red | actual attack alert | recent physical strike event | `attackMaterial`, visual events | Confirmed |
| `+` orange | injury alert | health impairment signal | social signal helpers | Confirmed |
| `W` blue | water request | critical thirst communication | social signal helpers | Confirmed |
| `F` yellow | hunger signal | hunger communication | social signal helpers | Confirmed |
| `?` pale blue | lost/contact call | separation communication | social signal helpers | Confirmed |
| `♥` pink | care/dependency or courtship | context-sensitive social signal | social signal helpers | Confirmed; shared glyph is ambiguous |
| Thought bubble | selected/private priority transition | diagnostic event, access controlled | `thoughtBubbleMaterial`, budget allocator | Confirmed |
| Attack/injury flash | short-lived recent event | event corresponds to action/consequence | `visual-events.js` | Confirmed; wall-clock duration |
| Urgent halo | high-importance visible state | presentation emphasis | tier/budget allocator | Confirmed |
| Fog point/cover field | unknown/unrevealed map for observer | observer knowledge, not weather fog | `updateKnowledgeFog`, reusable buffer | Confirmed |
| Biomass overlay | cell plant quantity | diagnostic projection of cell data | selected overlays | Confirmed |
| Water overlay | water availability | diagnostic projection | selected overlays | Confirmed |
| Scent overlay | animal scent field/trail | simulated scent information | `updateScentFields`, overlays | Confirmed |
| Minimap coloured cells | selected minimap field | cached projection of world data | `drawMinimapWork` | Confirmed |
| Minimap dots/highlight | living entities and selection | current positions | dynamic minimap layer | Confirmed |

## Procedural visual catalogue

| Generated visual | Construction | Dynamic behaviour | Ownership/disposal | Risk |
|---|---|---|---|---|
| Terrain/water chunks | Three.js mesh/instanced primitives per fixed chunk | dirty chunks rebuild; camera toggles visibility | chunk-owned; reset disposes | many draw calls/stalls |
| Vegetation | instanced primitive stems/canopies/tufts grouped by chunks | dirty on resource/stage changes | chunk-owned | largest presentation workload |
| Animal bodies | spheres/ellipsoids/cones and optional children in a root group | parts mutate for posture/state; root retained | shared base resources + entity-owned extras | no base-body instancing |
| Faces/badges | runtime canvas drawings into `CanvasTexture`/sprites | cached by meaning | shared materials/textures | colour/symbol dependence |
| Health bars | generated canvas texture/sprite | cache includes healthCap | entity visual mutation | texture churn if cache misses |
| Intent trails | one preallocated `BufferGeometry` + `Float32Array` per visual | draw range/positions update only on samples | entity-owned, disposed on removal/reset | bounded and identity-stable |
| Arrows/connectors/rings | Three.js line/cone/ring primitives | transformed/reused each frame if budgeted | shared or entity-owned by explicit policy | overlay counts require budgets |
| Corpse stages | species/stage primitive group | rebuilt only when fresh/decaying/skeleton changes | persistent cache; owned cleanup | all corpses still visited for visibility |
| Fog | preallocated points/geometry attribute | in-place positions + draw range | temporary/owned, disposed on reset | large vertex count in focus view |
| Minimap | 2D canvas cached static terrain + dynamic entities | static invalidation separate from movement | browser canvas | UI cost when large/visible |
| DOM bars/charts/text | HTML/CSS widths, colours and text | mutated/throttled | DOM lifecycle | accessibility and update cost |

## Map data to pixels

`world setup → createWorld → createHexWorld/deriveTerrainFields → cell elevation/climate/water/plants → chunk key and dirty sets → terrain/water/vegetation mesh creation → camera/frustum/observer visibility → Three.js render`. Fog follows a separate knowledge path: `selected observer evidence/map reveals → efficient revealed-cell lookup → reusable fog position buffer`. Heard movement without an explicit reveal remains outside that path.

## Visual caveats

- Distant tier intentionally hides head, eyes, tail, face and life-stage marker (`presentation-budget.js:presentationPartVisibility`). Medium retains head/eyes/tail but hides the face. This explains “no eyes/no head” reports when an entity is classified distant.
- Health-cap loss is a separate unavailable segment; a creature at `health = healthCap = 60` is fully recovered within a permanent limitation, not acute critical.
- Alarm coordinates can identify the sender, not necessarily an unseen predator. Exact predator location requires permitted direct/directional evidence.
- Symbols are budgeted and privacy-filtered. Absence may mean suppressed detail, not absence of the underlying state.
