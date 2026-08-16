# RSS Living Laboratory — Entity, Object, Action and State Catalogue

## Entity catalogue

| Code/player name | Kind and creation | Important truth/state | Behaviour/lifecycle | Visual/interface | Status/evidence |
|---|---|---|---|---|---|
| `grazer` / Valley Grazer | Animal; spawned in `createWorld`/`makeAnimal`, born by `giveBirth` | plants diet; adult mass 65; max age 420; maturity 80; old 310; gestation 60; dependency 48; litter 1 | forages grass/shrub/tree, drinks, herds, flees hunters, mates, nurses, ages/dies | gold/brown primitive body, sex/stage/health/event parts; inspector/pop count | Confirmed: `app.js:29-61,677`, `species` |
| `hunter` / Ridge Hunter | Animal; same paths | meat diet; adult mass 42; max age 360; maturity 95; old 275; gestation 90; dependency 65; litter 2–4 | evaluates/stalks/chases/attacks prey, scents, scavenges, claims/yields carcasses, groups | predator-coloured primitive assembly and same overlays | Confirmed |
| Dependent/juvenile/adult/old animal | Life-stage variants of either species | mother/caregivers, age, capabilities, reproduction eligibility | dependency transitions to juvenile; adult/old thresholds alter body/capability | structural scale/marker; LOD may hide marker | Confirmed: `makeAnimal`, `dependentAction`, `becomeIndependent` |
| Corpse | Created in `die`; inserted into corpse spatial index | source/owner, position, biomass, age/cause/timeline, species/sex/stage | eaten/scavenged, decays fresh→decaying→skeleton→removed | stage-specific cached primitive visual; selected/aware culling | Confirmed: `die`, corpse processing; `corpse-visual-cache.js` |
| Grass | Per-cell resource data | nutrition 1, growth .055, max 1 | grows, is consumed, reseeds/disperses | procedural tufts/ground contribution | Confirmed: `plantTypes`, `growPlants` |
| Shrub | Per-cell resource data | nutrition 1.4, growth .028, max 1.4 | browse resource, growth/stage/seed | procedural bush | Confirmed |
| Tree | Per-cell resource/cover data | nutrition .35, growth .012, max 2 | browse/cover, leafless/fallen states | trunk/canopy variants | Confirmed |
| Hex cell | World data object | x/z, neighbours, elevation, slope, climate, water, plants, scent and transient damage | hydrology, vegetation, weather and observation mutate fields | terrain/water/vegetation chunks; minimap/inspector | Confirmed: `hex-world.js`, `deriveTerrainFields` |
| Weather system | Invisible controller data | high/low kind, position/radius/moisture/temp/velocity | drifts with wind and affects local rain/temp/pressure/storm | weather summary and landscape consequences; no cloud entity | Confirmed: `createWeatherSystems`, `regionalWeatherAt` |
| Social group/herd/pack | Data relationship, not independent physics entity | ID, members, goal, leader, alert | locally regrouped; coordination/following/protection/carcass goals | Reality group listing/selection and overlays | Confirmed: `updateSocialGroups` |
| Social signal/call | Bounded data/event | kind, urgency, sender/location/until | emitted, heard/seen, interpreted after sensing | badge/ring/symbol; no audible sound | Confirmed: `refreshOutwardSignal`, `visual-events.js` |
| Decision trace/evidence | Invisible immutable snapshot data | tick, priority/score, trigger, action, target/destination/outcome, evidence, constraints | captured at choice; bounded compact history | selected/trace-panel explanation and connector | Confirmed: `decision-trace.js`, `trace-data.js` |
| Visual event | Presentation-only manager record | stable ID, origin tick, wall creation/minimum/expiry | deduplicates/restarts under explicit rules; expires by clock | attack/call/injury/priority/thought flash/bubble/ring | Confirmed: `visual-events.js` |
| Camera/observer | Presentation controller | OrbitControls camera, target, selected/locked subject, access mode | overview, selection, follow, zoom/LOD and fog perspective | viewport and HUD | Confirmed |
| Spatial index | Invisible manager | animal/corpse buckets and ID/order maps | stable snapshot for sensing; nearby queries | none; profiler query counts | Confirmed: `spatial-index.js` |

Animals also carry numerous mutable fields: position/orientation, sex/age/stage/mass, energy/stomach/hydration, health/healthCap, fear/aggression/social traits, capabilities, injuries/trauma, pregnancy/mate history, mother/offspring/caregivers, group state, sensory buffer, memory/long memory, threat contributors, signals, actionState, decisionTrace and bounded timeline/trace records. Three.js objects and presentation/profiler caches are separate and non-authoritative.

## Object catalogue

| Object | Mechanical or decorative role | Creation/update/removal |
|---|---|---|
| Terrain/water/vegetation chunk | Visualises cell truth; geometry itself is non-mechanical | built from dirty chunk sets; chunk-owned disposal on rebuild/reset |
| Terrain pick mesh | Invisible/transparent raycast target for cell selection | terrain build; replaced/reset with world |
| Animal root and `userData.parts` | Persistent presentation container with body/head/eyes/tail/face/wound/etc. references | structural cache on species/form/sex topology; transient parts mutated; entity-owned cleanup |
| Intent visual | Trail, arrow and related movement presentation | per animal as needed; fixed buffer, no normal-frame replacement |
| Selection ring/urgent halo | observation emphasis only | budget/selection update; removed with entity/overlay reset |
| Perception/memory/cause connector | diagnostic information only, privacy filtered | selected overlays; owned targeted cleanup |
| Corpse render cache entry | stage visual and culling state | keyed by corpse ID; rebuild only on stage; removed at final decay/reset |
| Fog buffer | observer knowledge mask | preallocated/in-place draw range; disposed on reset |
| Minimap canvases | static terrain cache and dynamic entity/selection layer | invalidation keys; not authoritative |
| Health/thought/action/social sprite | code-drawn canvas texture billboard | cached shared material where possible, toggled by tier/budget/state |
| DOM inspector/HUD/reality/event stream | controls and textual projections | `index.html`; updated/throttled from snapshots/world totals |

## Exhaustive structured entity actions

All valid keys are defined once in `src/action-state.js:ACTION_PRESENTATION`. `setAction` sets target, destination, outcome, movement, direction, label and reason and clears incompatible movement for stationary actions.

| Action key | Meaning/posture | Typical trigger/target/outcome | Completion/failure |
|---|---|---|---|
| `idle` | stand and await | no stronger candidate | next decision replaces it |
| `orient` | scan/orient | attention to evidence | finishes on later choice |
| `rest` | stationary recovery | fatigue/low competing urgency | movement cleared |
| `travel` | purposeful movement | known destination/group objective | arrival clears destination |
| `wander` | exploratory movement | no urgent known target | invalid move becomes blocked |
| `graze` | feed posture | grazer + edible grass | reduces cell resource, fills digestion/energy |
| `browse` | feed posture | grazer + shrub/tree food | same with browse resource |
| `drink` | drink posture | thirst + reachable water | hydration rises; stationary at source |
| `flee` | rapid escape | current/remembered threat | increases distance; blocked if no valid move |
| `join-herd` | move to conspecifics | isolation/group need | arrives near group |
| `shelter-herd` | guarded group posture | protection need | stationary/next decision |
| `evaluate-prey` | scan potential prey | hunter evidence before commitment | choose stalk/chase/abandon |
| `stalk` | quiet approach | hunter and viable prey | transitions to chase/attack/loss |
| `chase` | sprint after prey | committed hunt | explicitly never classified as flee |
| `attack` | strike | prey in range/cooldown permits | damage/injury/death or later retry |
| `search` | scan for missing target/resource | evidence lost | new evidence/action replaces it |
| `listen` | deliberate stationary listening | auditory/social attention | movement cleared |
| `track-scent` | follow scent/memory bearing | hunter prey trail/current smell | moves; memory bearing may vary seededly |
| `guard` | protect resource/group | carcass/family/social need | stationary until changed |
| `defend` | respond to attack/threat | self/offspring/ally emergency | may move/strike depending helper |
| `blocked` | no valid action movement | missing valid move; reason recorded | new decision may recover |
| `courtship` | mating approach/display | eligible mate/reproduction drive | mate accepts, rejects or movement continues |
| `reject` | reject courtship | mate unsuitable/unready | stationary response |
| `scavenge` | seek/use corpse | known carcass + hunger | approach/feed/ownership conflict |
| `nurse` | dependent feeding/care | mother/dependent proximity/need | transfers care/resources |
| `communicate` | emit/attend signal | social candidate/call | signal event/cooldown |
| `dependent` | seek caregiver/support | young animal dependency | join/nurse or eventual independence |
| `coordinate-group` | group scan/coordination | leader/group objective | next group/action phase |
| `abandon-hunt` | stop hunt/rest | prey lost, cost/risk too high | clears hunt movement/target semantics |
| `claim-kill` | guard corpse | hunter ownership | owner set/guard/feed |
| `yield-carcass` | back away/scan | social/ownership pressure | gives access to rival/group |
| `feed-carcass` | consume meat | at owned/available corpse | corpse biomass falls, animal feeds |
| `protect-offspring` | urgent defence/chase | offspring attacked/distress signal | closes threat distance/defends |

Action costs, probability and cooldown are not uniform properties of the action table; candidate score formulas and helpers apply physiology, evidence, distance, capabilities, cooldowns and seeded choices (`actionCandidates`, hunt/social/reproduction helpers). Labels are presentation text only; code does not parse `currentAction` to determine action semantics.

## Player and world actions

| Actor/action | Trigger/precondition | Outcome | Status/evidence |
|---|---|---|---|
| Player select/inspect/follow | click pickable, optionally lock | changes observation/camera, never commands animal | Confirmed: `selectObject`, `toggleCameraLock` |
| Pause/play/step/speed | UI controls | schedules zero/one/more ticks | Confirmed: `loop`, handlers |
| Create/reset world | reset/settings | new seed/setup, clears presentation and interpolation | Confirmed: `loadSeedWorld` |
| Save/load/import/export | buttons/storage/file | schema snapshot persistence/migration | Confirmed: save helpers |
| Toggle diagnostic overlays/access | checkboxes/tabs | changes permitted presentation only | Confirmed |
| Weather advance | tick | moves pressure systems, refreshes regional field | Confirmed |
| Hydrology advance | tick/budget | water movement/change and chunk dirtiness | Confirmed |
| Vegetation grow/disperse | tick + local conditions/seeded chance | biomass/stage changes | Confirmed |
| Scent update | tick | lays/decays fields used by sensing | Confirmed |
| Social grouping/alerts | post-sensing/tick | group IDs/goals/leaders/alerts refresh | Confirmed |
| Corpse age/decay/removal | tick | biomass/stage changes; index/cache cleanup | Confirmed |
| Statistics/event update | mutations/tick/UI cadence | counters, bounded log and panels | Confirmed |

## State catalogue

| State family | Values/examples | Entry/exit/effect | Visual/overlap |
|---|---|---|---|
| Action | 30 keys above | exactly one authoritative `actionState.key`; transitions via `setAction` | posture/movement/badges; overlaps physiology |
| Life | alive/dead | health/age/starvation/dehydration/attack → `die`; no revival | live animal removed; corpse created |
| Life stage | dependent, juvenile, adult, old | age/dependency thresholds | structural scale/marker; one stage |
| Feeding | starving, very hungry, hungry, mildly hungry, satiated, full, stuffed, over-stuffed | stomach thresholds `<8,<22,<38,<52,<68,<82,<94` | inspector; overlaps action |
| Health | health within healthCap; injury/trauma/permanent cap loss | strikes/environment/age; recovery clamped to cap | bar/tier/wound/flash |
| Reproduction | eligible, courting/rejecting, pregnant, gestating, nursing | maturity, sex, drive, energy, mate/cooldown | body/status/signal; overlaps other state |
| Social | alone/grouped, leader/member, group goal/alert, dependent/caregiver | proximity/compatibility and phase refresh | Reality/groups/signals |
| Evidence | sight, smell, hearing, visual-signal, memory, inference, internal | sensing/communication/memory conversion; confidence/age | trace/overlays under privacy |
| Threat | overall confidence + contributor records | qualifying predator/alarm contacts | fear/decision plus contributor-specific uncertainty |
| Corpse | fresh, decaying, skeleton, removed | age/biomass thresholds | exclusive render stage |
| Weather/season | Spring, Summer, Autumn, Winter; high/low/rain/storm | world clock/system movement | terrain/weather summary; overlapping regional fields |
| Run | running/paused | Play/Pause/Step | HUD; presentation can continue while paused |
| Observation | laboratory, selected-self, observable-other, strategic | selection/view context | controls private channels and LOD |
| Presentation tier | selected, close, medium, distant, strategic | selection, camera distance/zoom | controls parts/channels before overlay allocation |
| Visual event | attack, call, injury-alert, priority-change, thought-transition | manager emission/dedup/expiry | presentation only, multiple can overlap |

## Major transitions

`birth → dependent → juvenile → adult → old → dead → fresh corpse → decaying corpse → skeleton → removed`.

`sense stable snapshot → create evidence/current memory → score candidates → capture immutable decisionTrace → setAction → move/interact → post-action consequences → presentation snapshot`.

`evaluate-prey → stalk → chase → attack → claim-kill/feed-carcass` can branch to `search`, `track-scent`, `abandon-hunt`, `yield-carcass`, `rest` or `blocked`. Arrival clears active destination; completed interpolation reports zero visible velocity, including when paused.
