# Embodied Simulation — Exhaustive Implementation Plan

Status: planning only. This document does not authorize or contain implementation changes.

## 1. Objective

Add an optional **Embodied Simulation** experience alongside the existing autonomous Living Laboratory experience. A player may configure a world, choose a difficulty and ecological role, and inhabit one organism already counted in the generated population. The existing observer/Laboratory experience remains available and unchanged when Embodied Simulation is not selected.

The inhabited organism must continue to use the same authoritative systems as every other organism:

- physiology, metabolism, hydration, fatigue, temperature, ageing and injury;
- pregnancy, birth, dependency, family and social relationships;
- perception, memory, uncertainty, communication and fog knowledge;
- action semantics, navigation, continuous locomotion and collision;
- hunting, grazing, drinking, resting, mating, care and threat responses;
- death, carcass creation and ecological accounting.

Player input may replace or influence an organism's chosen intent, but must never directly teleport it, fabricate knowledge, bypass interaction ranges, or mutate biological outcomes outside explicit Creative-mode overrides.

## 2. Non-goals and constraints

### 2.1 Non-goals

- Do not replace or remove autonomous simulation, map observation, entity selection, Mini Laboratory or Main Laboratory.
- Do not create a separate simplified player-creature simulation.
- Do not duplicate locomotion, combat, feeding, pregnancy or perception rules for the player.
- Do not treat difficulty as a multiplier to hidden animal competence. Difficulty governs player access, information, camera, setup and control.
- Do not make carnivore versus herbivore a difficulty choice.
- Do not give the inhabited organism access to Laboratory truth.
- Do not initially support switching inhabited organisms during a run outside Creative mode.
- Do not add multiplayer, possession of several organisms, conventional inventory, crafting or character progression.

### 2.2 Required invariants

1. The inhabited organism occupies one configured population slot; it is not added on top of the requested population.
2. A generated world with identical seed, world setup and embodiment setup is deterministic.
3. Direct player movement produces ordinary `movementRequest` and locomotion state consumed by the existing continuous locomotion system.
4. Player actions resolve through existing authoritative action/contact systems.
5. Impossible Immersion never creates direct movement, look, target or action commands.
6. Difficulty is represented by one resolved capability profile, not ad hoc mode-name checks.
7. UI visibility does not alter organism knowledge or authoritative simulation state.
8. Save/load restores the same inhabited organism, difficulty, camera mode, influence state and Creative overrides.
9. Death is authoritative. A dead inhabited organism cannot silently respawn or transfer control without an explicit future design.
10. Observer mode continues to behave as it did before this feature.

## 3. Terminology

- **Experience**: `observer` or `embodied`.
- **Difficulty**: the selected capability profile within Embodied Simulation.
- **Ecological role**: `herbivore`, `carnivore`, `omnivore` or `random`. Herbivore and carnivore must be available at every difficulty; omnivore availability follows the species registry.
- **Inhabited organism**: the single authoritative animal associated with the player.
- **Direct control**: player movement/look/action intent is arbitrated into ordinary organism actions.
- **Internal influence**: bounded adjustment of needs, satisfier preference or commitment pressure without direct commands.
- **Close third-person**: short-range following camera with limited orbit and a semi-fixed zoom band.
- **Controlled first-person**: head-mounted view with player-controlled head movement and body turning.
- **Non-controlled first-person**: head-mounted view driven entirely by the autonomous organism's head/body orientation.
- **Total view**: fully zoomed-out strategic/world camera.
- **Middle view**: regional camera between close entity view and total view.
- **Close view**: local camera centred on the inhabited organism.

## 4. Final difficulty ladder

Ecological role is selected independently at every level. `Diet only` below means the player chooses the ecological role while species, sex, age, life stage, condition and reproductive state are randomised within valid candidates.

| Difficulty | Entity setup | Laboratory | Map knowledge | Camera access | Creature information | Control |
|---|---|---|---|---|---|---|
| Creative | Full | Mini + Full | Entire world | All cameras | Everything | Direct + god tools |
| Easy | Full | Mini + Full | Unseen terrain shaded | All cameras | Full HUD + guidance | Direct |
| Standard | Full | Mini only | Unseen terrain shaded | All cameras | Full HUD | Direct |
| Challenging | Full | Mini only | Unseen terrain black | Close + middle; no total view | Standard HUD | Direct |
| Hard | Full | Mini only | Unseen terrain black | Close only; no middle or total view | Standard HUD | Direct |
| Very Hard | Full | Disabled | Unseen terrain black | Close only | Standard HUD | Direct |
| Extreme | Diet only | Disabled | Unseen terrain black | Close third-person, semi-fixed zoom | Reduced HUD | Direct |
| Insane Immersion | Diet only | Disabled | No abstract map; embodied perception | Close third-person or controlled first-person | No artificial indicators | Direct |
| Impossible Immersion | Diet only | Internal Influence panel only | No abstract map; embodied perception | Non-controlled first-person | Natural sensory evidence only | Indirect |

### 4.1 Capability progression rules

- Creative is Easy plus explicit, visible rule overrides.
- Easy removes rule-breaking while retaining all analysis assistance.
- Standard removes Main Laboratory.
- Challenging removes the total strategic camera and changes unknown terrain from shaded to black.
- Hard removes middle/regional zoom.
- Very Hard removes Mini Laboratory.
- Extreme removes exact organism configuration while retaining ecological-role choice, and narrows the camera to close third-person.
- Insane Immersion removes abstract map access and artificial presentation channels, and offers embodied cameras.
- Impossible Immersion removes direct body, head and camera control; only Internal Influence remains.

### 4.2 Camera bands

Define named bands using both orbit distance and terrain clearance, building on `cameraPresentationMetrics` rather than raw zoom alone:

| Band | Intended use | Initial tuning target |
|---|---|---|
| First person | Eyes/head | Camera at species-specific head anchor; no orbit distance |
| Close third-person | Immediate body/local surroundings | Approximately 6–24 world units from target |
| Middle | Local region and nearby groups | Approximately 24–110 world units |
| Total | Strategic/aggregate world | Above the middle threshold, including current aggregate markers |

Exact values require visual tuning across tiny, medium, large and giant species. Store them as named policy constants rather than duplicating numeric checks.

## 5. Capability-profile architecture

Create `src/embodiment-capabilities.js` as the only authority that converts difficulty into effective permissions.

### 5.1 Proposed profile shape

```js
{
  id: "hard",
  rank: 4,
  entitySetup: "full",              // full | role-only
  laboratory: "mini",              // full | mini | influence-only | none
  mapKnowledge: "unknown-black",    // full | unknown-shaded | unknown-black | embodied-only
  abstractMap: true,
  camera: {
    orbit: true,
    firstPerson: false,
    playerLook: true,
    allowedBands: ["close"],
    minDistance: 6,
    maxDistance: 24,
    pan: false,
    freeTarget: false
  },
  information: {
    hud: "standard",                // everything | full-guided | full | standard | reduced | natural-only
    entityBars: "inhabited-only",
    expressions: true,
    warnings: true,
    labels: true,
    thoughts: false,
    privateOtherState: false,
    overlays: "selected-permitted"
  },
  control: "direct",                // direct | influence
  setup: {
    chooseRole: true,
    chooseSpecies: true,
    chooseSex: true,
    chooseAge: true,
    chooseCondition: true,
    choosePregnancy: true
  },
  creativeOverrides: false,
  instinctAssistance: "optional"
}
```

### 5.2 Required exported functions

- `difficultyProfile(id)` returns the frozen base profile.
- `resolveEmbodimentCapabilities(session)` returns effective permissions, including selected camera sub-mode.
- `canAccess(capabilities, capabilityPath)` supports UI gates without checking difficulty names.
- `validateDifficultyProfiles()` verifies monotonic restrictions and required fields.
- `compareDifficultyProfiles(lower, higher)` reports accidental regressions such as a harder mode gaining a map or overlay.

### 5.3 Policy enforcement layers

Capabilities must be enforced in three layers:

1. **Presentation**: hidden controls, HUD channels, overlays, markers, minimap and panels.
2. **Interaction**: blocked shortcuts, map clicks, entity selection, camera gestures and disabled inputs.
3. **Authoritative boundary**: intent arbitration rejects prohibited direct commands or Creative overrides even if synthetic DOM events are sent.

CSS-only hiding is insufficient.

## 6. Session and persistence data model

Add an `embodiment` object to the saved simulation root. Keep transient key/button state outside the snapshot.

### 6.1 Proposed saved state

```js
embodiment: {
  schema: 1,
  experience: "embodied",           // observer | embodied
  difficulty: "standard",
  role: "herbivore",
  inhabitedAnimalId: "VG1",
  setupRequest: {
    speciesId: "grazer",            // null means random
    sex: "F",                        // null means random
    lifeStage: "adult",
    age: 120,
    condition: {
      hunger: 35,
      thirst: 20,
      energy: 82,
      health: 100,
      injuries: []
    },
    reproduction: {
      pregnant: false,
      gestationProgress: null
    }
  },
  cameraMode: "close-third-person",
  instinctAssistance: "fallback",
  influence: {
    needBiases: {},
    satisfierBiases: {},
    commitmentBias: 0,
    riskBias: 0,
    lastChangedTick: 0
  },
  creative: {
    disableHunger: false,
    disableThirst: false,
    disableDamage: false,
    disableAgeing: false,
    disablePregnancyCosts: false,
    disableDeath: false
  }
}
```

### 6.2 Transient runtime state

Create `src/player-input.js` state that is never saved directly:

- currently pressed movement/action keys;
- gamepad axes/buttons;
- pointer-lock state;
- accumulated look deltas;
- requested camera switch;
- action edge events;
- last input timestamp and active input device;
- focus-loss/cancel state.

On load, all transient controls start neutral.

### 6.3 Save migration

- Increment or extend the save schema deliberately; do not reject every previous observer save solely because embodiment is absent.
- Migrate missing `embodiment` to `{ experience: "observer", schema: 1 }`.
- Validate that `inhabitedAnimalId` points to a living or retained dead entity. If missing, enter an explicit ended-session state rather than possessing another animal.
- Persist camera mode but reconstruct camera transforms safely from the organism after load.
- Persist influence values and decay timestamps so loading cannot reset influence cooldowns.
- Save Creative overrides explicitly and display them in save metadata.

## 7. New-world flow and entity configuration

The existing `#new-world-panel` remains the entry point. Reorganise it into progressive sections without removing world-generation controls.

### 7.1 Proposed flow

1. **Experience**: Observer Laboratory or Embodied Simulation.
2. **Difficulty**: nine mode cards, ordered from Creative through Impossible Immersion.
3. **Ecological role**: Herbivore, Carnivore, Omnivore, Random.
4. **Organism**: exact configuration or role-only summary, depending on capability.
5. **World**: existing landscape, ecology, population and climate settings.
6. **Review**: resolved organism constraints, population guarantee, difficulty restrictions and seed.
7. **Generate and inhabit**.

### 7.2 Full entity setup fields

- species or random, filtered by selected role and enabled species;
- sex: female, male or random;
- life stage: baby/dependent, juvenile, subadult, adult, elder/old or random;
- exact age within the chosen stage's valid interval;
- health, hunger, thirst, energy and fatigue;
- injury presets plus advanced exact injury selection;
- pregnancy: no, yes or random when valid;
- gestation progress when pregnancy is selected;
- optional caregiver/family context for dependents;
- Randomise organism button;
- Randomise everything button, which may also randomise role if explicitly chosen.

Use the project's internal stage identifiers (`dependent`, `juvenile`, `subadult`, `adult`, `old`) while presenting friendly labels.

### 7.3 Validation module

Create `src/embodied-setup.js` with pure functions:

- `speciesForRole(role, registry)`;
- `ageRangeForStage(species, stage)`;
- `validReproductiveSetup(request, species)`;
- `normalizeConditionSetup(request, species, stage)`;
- `validateEmbodiedSetup(request, worldSetup, capabilities, registry)`;
- `randomEmbodiedSetup(request, worldSetup, capabilities, rng)`;
- `describeEmbodiedSetup(request)`.

Validation rules include:

- selected species must be in the selected ecological role;
- selected species must have at least one starting population slot;
- if its configured count is zero, generation may move one slot from another species in the same role, or the UI must request a population correction before generation;
- pregnancy requires female sex, a mature stage, species-valid reproductive state and a compatible gestation value;
- dependents cannot be pregnant and should receive a valid caregiver/family seed where the simulation requires one;
- age must match the selected stage and species thresholds;
- hunger/thirst labels must translate once into authoritative fields (`stomach`, `energy`, `hydration`) with documented directionality;
- health and injury combination must not begin dead unless a future explicit scenario supports it;
- Creative-only biological toggles are unavailable in every other mode;
- Extreme and above discard or ignore disallowed exact fields and show the resolved random outcome only after generation.

### 7.4 Accessibility and UX

- Difficulty cards must be keyboard navigable and expose a concise “what changes from the previous level” description.
- Role selection must not be visually nested under difficulty.
- Disabled organism fields must explain which difficulty controls them.
- Changing role invalidates incompatible species immediately.
- Changing species recalculates stage age ranges and pregnancy validity.
- The review screen must state: “This organism uses one existing population slot.”
- Generation failures must be actionable, not silently corrected when that would change population intent.

## 8. Population-slot guarantee and spawning

Modify generation at the demographic-plan level, before `makeAnimal` and before starting pregnancy, family, group, knowledge and plan seeding.

### 8.1 Algorithm

1. Resolve and validate world setup, difficulty, role and setup request.
2. Build normal per-species starting counts using `enabledSpeciesCounts`.
3. Select a species candidate deterministically from valid role candidates.
4. Guarantee at least one slot for that species:
   - use an existing slot when its count is positive;
   - otherwise transfer one slot from another species in the same selected role;
   - never increase total population;
   - fail validation if the selected role has zero total configured population.
5. Build the ordinary `startingDemographicPlan` for every species.
6. Replace one deterministic entry in the selected species plan with the resolved player demographic request.
7. Call the existing `makeAnimal` path for all animals.
8. Apply condition and reproductive overrides to the chosen animal through a dedicated normaliser before metabolism initialization and starting pregnancy seeding.
9. Exclude the chosen animal from random starting-pregnancy mutation when pregnancy was explicitly specified; allow ordinary random seeding when requested as random.
10. Continue ordinary group, family, metabolism, carcass, knowledge and starting-plan setup.
11. Store the resulting entity ID in `world.embodiment.inhabitedAnimalId`.
12. Verify final population totals and selected-role membership.

### 8.2 Spawn location

The inhabited organism should use the same habitat-compatible spawn logic as its species. A later enhancement may offer starting-context choices, but initial implementation must not place the organism at a privileged resource location.

For dependent organisms, family wiring must occur before control begins. If a valid caregiver cannot be created without changing population constraints, reject that setup or choose a different valid role candidate.

### 8.3 Determinism

- Use a derived RNG stream for embodiment resolution so adding UI previews does not consume the world RNG.
- Do not use `Math.random()` for entity selection or traits.
- Record the resolved request in the world snapshot for reproduction and debugging.
- Add authoritative hashes that include embodiment setup but exclude transient input state and camera transforms.

## 9. Embodiment lifecycle

Create `src/embodiment-session.js` to own lifecycle without conflating it with ordinary selection.

### 9.1 States

- `observer`: no inhabited organism.
- `starting`: world generated, organism resolved, presentation not yet attached.
- `active`: organism alive and controllable/influenceable.
- `incapacitated`: organism alive but control constrained by sleep, collapse or other authoritative state.
- `dead`: organism dead; camera and UI follow the death policy.
- `ended`: corpse no longer retained or save cannot restore the organism.

### 9.2 Selection separation

Do not reuse `selectedId` as the embodiment identity. Introduce `inhabitedAnimalId` through session state. On modes that permit it, the inhabited animal may be selected automatically for compatible Laboratory panels, but losing selection must never relinquish embodiment.

### 9.3 Death policy

Initial policy:

- stop accepting direct/influence input immediately;
- transition to a short death presentation using the allowed camera;
- show a mode-appropriate run summary;
- offer Load Save, Return to Menu, New World and Continue Observing only when the capability policy permits observation;
- never auto-possess offspring or another organism;
- Creative `disableDeath` prevents the terminal transition by applying its explicit rule at the authoritative damage/deprivation boundary.

## 10. Input system

Create `src/player-input.js` and keep it independent of simulation semantics.

### 10.1 Input abstraction

Represent input as a device-neutral frame:

```js
{
  movement: { forward: 0, strafe: 0, sprint: false },
  look: { yaw: 0, pitch: 0 },
  actions: {
    primary: false,
    feed: false,
    drink: false,
    rest: false,
    interact: false,
    vocalise: false,
    flee: false
  },
  cameraSwitch: null,
  timestamp: 0
}
```

### 10.2 Keyboard and mouse baseline

- WASD/arrow keys: movement intent;
- Shift: request sprint, still subject to physical eligibility;
- mouse movement under pointer lock: first-person head look;
- primary/interact bindings: context-sensitive action request;
- dedicated keys for rest, vocalise and camera switch where allowed;
- Escape releases pointer lock before opening menus;
- ignore gameplay bindings while typing in inputs, selects or textareas;
- clear all held inputs on blur, visibility change, modal opening and pointer-lock loss.

### 10.3 Gamepad and rebinding

Plan the abstraction for gamepad and remapping from the start, but keyboard/mouse may be the first delivery slice. Persist bindings separately from world saves.

### 10.4 Input sampling

- Sample controls every render frame for responsiveness.
- Convert them to a stable intent at the next simulation decision boundary.
- Edge-trigger actions once; do not repeat an attack or interaction every render frame.
- Retain movement direction continuously.
- Include deterministic quantisation when input affects authoritative simulation so replay tests can use recorded frames.

## 11. Direct-control intent and decision arbitration

Create `src/player-intent.js`. Its output must use existing action and movement concepts.

### 11.1 Integration point

In `runStableAnimalPhases`, leave `preSense`, signal preparation, snapshot construction, sensing and signal interpretation unchanged. During `act`:

1. For ordinary animals, call the existing `applyAnimalDecision` unchanged.
2. For the inhabited animal under direct control:
   - prepare the ordinary decision context;
   - resolve mandatory biological/emergency constraints;
   - translate player input into a candidate intent using only perceived/current-contact evidence;
   - arbitrate player candidate, emergency response and instinct assistance;
   - execute the winning intent through existing action helpers;
   - continue ordinary post-action and locomotion phases.
3. For Impossible Immersion, call the ordinary autonomous decision path with bounded influence inputs.

### 11.2 Priority order

Initial arbitration order:

1. dead or invalid entity;
2. authoritative incapacity: collapse, mating lock, birth, forced contact resolution or other non-interruptible state;
3. immediate physical safety constraints that the organism cannot voluntarily bypass;
4. explicit player action edge;
5. held player locomotion intent;
6. configured instinct assistance;
7. idle/orient fallback.

Player intent may choose risky behaviour; it should not be overridden merely because the autonomous planner prefers survival. It is overridden only by physical impossibility or explicitly documented involuntary behaviour.

### 11.3 Instinct assistance

Define levels independently from difficulty defaults:

- `guided`: action prompts plus fallback autonomous survival behaviour;
- `fallback`: autonomous planner acts after a short period without meaningful input;
- `idle`: organism does not choose ordinary autonomous goals while directly controlled, but involuntary/emergency systems remain;
- `locked`: Creative-only diagnostic option if required.

Harder modes may restrict which assistance options are available, but difficulty profiles decide this declaratively.

### 11.4 Movement translation

- Convert local forward/strafe input to a desired heading relative to controlled camera/body orientation.
- Emit a short-horizon destination and ordinary `createMovementRequest` with `destinationSource: "player-intent"`.
- Use `walk`, `sprint` or species-appropriate mode requests; the existing locomotion and exertion systems cap actual performance.
- Refresh the short-horizon request at decision cadence without resetting useful locomotion state unnecessarily.
- Navigation mesh, terrain speed, collision, personal space and boundaries remain authoritative.
- If no route exists, show only difficulty-permitted feedback and allow the normal blocked presentation.

### 11.5 Context actions

Add pure target-resolution helpers that select only permitted sensed/contact candidates:

- drink from reachable, valid drinkable water;
- graze/browse a valid plant resource;
- feed/scavenge from a valid carcass;
- stalk/chase/attack compatible perceived prey;
- flee from a perceived threat;
- rest/sleep where physically permitted;
- initiate or respond to social, mating and care interactions;
- vocalise using species/action-compatible signals;
- investigate a perceived or remembered location.

The UI may offer contextual labels on easier modes, but the authoritative resolver must reject invalid targets.

### 11.6 Decision trace and accounting

- Mark the source as `player-direct`, `autonomous-fallback`, `involuntary` or `internal-influence`.
- Keep predicted/actual action outcomes and ecological accounting intact.
- Do not label player action as organism knowledge unless the target/evidence was actually available to the organism.
- Add diagnostics for rejected player intents, reason codes and assistance fallbacks, visible only where capabilities allow.

## 12. Head and body orientation

Existing `orientation` and locomotion heading should remain authoritative for body facing. Add a bounded head-look state rather than rotating presentation meshes without state.

### 12.1 Proposed organism fields

```js
lookState: {
  headYaw: 0,
  headPitch: 0,
  desiredYaw: 0,
  desiredPitch: 0,
  source: "autonomous",              // autonomous | player
  lastUpdatedTick: 0
}
```

### 12.2 Controlled first-person

- Mouse/gamepad controls head yaw/pitch within species/body limits.
- When yaw approaches the comfortable head limit, continued look input creates a body-turn intent.
- Movement direction and head direction may differ within natural limits.
- Head orientation must affect the camera and, where the current vision model uses facing, the authoritative vision direction.
- Turning speed remains limited; no instant 180-degree camera snap.

### 12.3 Non-controlled first-person

- Disable all look, body and camera inputs.
- Attach camera orientation to autonomous `lookState` and body heading.
- Autonomous attention/sensing supplies look targets; when the head moves, the camera moves.
- If no explicit autonomous head-look behaviour exists, implement it as a simulation/presentation bridge driven by current attention, target, movement and ambient scanning—not random camera animation detached from the animal.
- Sleep, unconsciousness and death apply explicit eyelid/visibility policy.

### 12.4 Species geometry

Add head-anchor metadata derived from `animal-visual-structure`/phenotype rather than hard-coded one-size offsets. Test tiny, large, giant, quadruped-like and unusual body plans.

## 13. Camera controller architecture

Create `src/embodied-camera.js` and retain OrbitControls for observer-compatible modes.

### 13.1 Controller modes

- `observer-orbit`;
- `close-third-person`;
- `controlled-first-person`;
- `noncontrolled-first-person`.

Exactly one controller owns the camera each frame.

### 13.2 Close third-person

- follow interpolated visual position, not tick-jumping authoritative coordinates;
- maintain a short trailing/side offset relative to body heading;
- limit yaw orbit and pitch;
- use semi-fixed zoom bounded to the close band;
- disable free pan and target reassignment;
- perform terrain clearance and camera obstruction correction;
- smooth acceleration, turns and height changes without lag that obscures attacks;
- scale anchor distance by animal body size.

### 13.3 Controlled first-person

- attach to interpolated head anchor;
- apply player-controlled `lookState`;
- disable OrbitControls, panning and wheel zoom;
- prevent rendering the camera inside opaque head geometry; selectively hide only the inhabited head mesh from its own first-person camera if necessary;
- retain visible body where geometrically possible;
- use species-appropriate field of view with accessibility limits.

### 13.4 Non-controlled first-person

- same head anchor and clipping treatment;
- camera orientation follows autonomous head and body state only;
- no manual look, recenter or camera switching;
- menus may pause input but must not let the user inspect the world with a detached camera.

### 13.5 Difficulty clamps

- All cameras: preserve current OrbitControls range.
- Challenging: clamp maximum distance below total/strategic band; disable Map reset and aggregate strategic view.
- Hard/Very Hard: clamp maximum distance below middle band; disable pan that could simulate regional observation.
- Extreme: force close third-person semi-fixed band.
- Insane Immersion: allow close third-person and controlled first-person only.
- Impossible Immersion: force non-controlled first-person.

Clamp on every update and on mode/load transition, not merely on wheel events. Block minimap recenter, focus-group and scripted map camera functions when disallowed.

## 14. Fog, map knowledge and world visibility

Separate three concepts currently close together:

1. organism knowledge (`explored`, current perception, communicated reveals);
2. map presentation (full, shaded unknown, black unknown, absent);
3. world object rendering (what geometry/entities may be shown).

### 14.1 Modes

- Creative: no fog; full terrain and permitted global markers.
- Easy/Standard: unknown terrain is visible but shaded. No unknown organisms, resources or exact overlays are revealed.
- Challenging through Extreme: unknown terrain black, explored terrain dim, current local reveal clear.
- Insane/Impossible Immersion: remove abstract minimap/map UI entirely. Render the physical scene through embodied perception constraints.

### 14.2 Entity visibility

- In embodied-restricted modes, other organisms render only if the inhabited organism currently has appropriate sight evidence, except unavoidable physical-contact edge cases.
- Heard or smelled entities may create only difficulty-permitted nonvisual cues; they must not render a visible body through cover.
- Intrinsic physical behaviour remains visible when actually seen: limping, fleeing, charging, sleeping, vocalising and wounds.
- Artificial expressions/icons, health bars, energy bars, labels, thought bubbles, warnings, target connectors and private-state overlays are removed in Insane and Impossible Immersion.
- “Expressions disabled” means artificial face/emotion presentation that communicates model labels; ordinary body posture and animation remain.

### 14.3 Minimap

Refactor minimap drawing through a `mapPresentationPolicy`:

- filter terrain by knowledge state;
- filter entities by permitted evidence;
- hide modes and click navigation when unavailable;
- do not cache a full-world static canvas and then expose it beneath fog;
- ensure screenshot, resize and mode changes cannot flash forbidden map data.

## 15. Information and HUD policy

Create `src/embodied-presentation-policy.js` that returns permitted presentation channels from capabilities and current context.

### 15.1 Channel inventory

- identity: species, sex, age, life stage, name/id;
- physiology: health, hydration, energy, stomach/hunger, fatigue, temperature, body composition;
- reproductive: pregnancy, gestation, readiness, dependents;
- action: current action, intended outcome, blocked state;
- emotion/expression;
- warnings and contextual prompts;
- private thought and decision trace;
- sensory evidence and memory;
- world diagnostics and ecological overlays;
- other-entity labels, bars, intentions and relationships.

### 15.2 Suggested mode mapping

- Creative: all channels and all overlays.
- Easy: full inhabited state, guidance and permitted Laboratory data.
- Standard: full inhabited HUD, no Main Laboratory.
- Challenging/Hard/Very Hard: standard survival HUD, no private state of other entities.
- Extreme: reduced HUD—core inhabited survival condition and minimal action feedback only.
- Insane Immersion: no artificial bars, expressions, warnings, labels, thought bubbles or other-entity private information.
- Impossible Immersion: no ordinary HUD; only natural scene evidence and the Internal Influence interface.

Do not infer permissions in `accessModeFor` solely from selection and Laboratory toggle; extend it or replace it with a context object containing experience, capabilities, inhabited status, selected status and perception relationship.

## 16. Laboratory access

### 16.1 Full and Mini Laboratory

- Creative/Easy: both current modes.
- Standard/Challenging/Hard: Mini only; hide and disable the size toggle to Main.
- Very Hard/Extreme/Insane: neither mode; shortcuts and programmatic opening must be blocked.
- Impossible Immersion: ordinary Laboratory disabled, only Internal Influence panel present.

### 16.2 No information leaks

- Closing/hiding a panel is not enough; prevent its updater from constructing forbidden global data for accessible DOM or assistive technology.
- Remove forbidden controls from tab order.
- Prevent persisted Laboratory display mode from reopening a disallowed view after load.
- Filter event logs and Reality panel according to capabilities.

## 17. Creative mode overrides

Create `src/creative-overrides.js` with explicit flags and authoritative hooks.

### 17.1 Initial overrides

- disable hunger/deprivation;
- disable thirst/dehydration;
- disable damage/injury health loss;
- disable ageing;
- disable pregnancy costs;
- disable death.

### 17.2 Rules

- Toggles affect only the inhabited organism by default. A separately labelled world-wide scope can be a later feature.
- Apply at named physiology boundaries, not by resetting values every UI frame.
- Turning a protection off resumes normal simulation from current state.
- `disableDeath` must define whether health floors at 1 or the fatal transition is deferred; choose one documented rule and test it.
- Saves and diagnostics visibly identify active overrides.
- Creative state must not contaminate observer benchmarks or ecological audits unless explicitly included.

## 18. Impossible Immersion Internal Influence

Create `src/internal-influence.js` and a dedicated panel extracted conceptually—not copied—from the existing needs/satisfiers Laboratory presentation.

### 18.1 Design principle

Influence changes bounded internal salience; it does not select a target, destination, action or camera direction. The autonomous organism still senses, remembers, plans, commits and acts.

### 18.2 Influence controls

- intensify or suppress a need;
- encourage or discourage a satisfier class;
- reinforce or weaken the current commitment;
- bounded risk tolerance influence;
- bounded urgency influence;
- release/reset influence to neutral.

Possible needs/satisfiers must come from the existing ontology and current organism capabilities, not a separate hard-coded list.

### 18.3 Bounded model

- Store signed biases in `[-1, 1]`.
- Convert them to small bounded score terms after ordinary biological urgency is computed.
- Never reduce emergency biological pressure below its hard safety floor.
- Decay influence gradually toward zero.
- Add cooldown or limited influence budget if testing shows rapid slider oscillation can micromanage actions.
- A satisfier influence changes preference among known/viable methods; it cannot make an unknown resource known or an impossible method viable.
- Commitment influence affects switching/persistence thresholds but cannot break non-interruptible actions.

### 18.4 Planner integration

Integrate at pure scoring boundaries in `need-planning.js`, `commitment-system.js` and/or `goal-planning.js` through an optional influence context. Avoid directly rewriting `drive`, `actionState`, `movementRequest`, memories or target fields.

Record influence contribution separately in decision traces for diagnostics, while hiding that trace in Impossible Immersion.

### 18.5 Panel presentation

- The panel shows qualitative internal tensions and available influence, not exact authoritative percentages unless explicitly desired by the final design.
- It must not expose resource coordinates, targets, path plans, private memories or world overlays.
- The user receives delayed/ambiguous feedback appropriate to the mode.
- Keyboard/controller access is mandatory because the camera cannot be manually moved.

## 19. Incapacity, sleep and involuntary states

Define explicit policies rather than treating lack of response as a bug:

- sleep/rest may block movement and reduce/close first-person view;
- collapse blocks direct input and follows involuntary head/body motion;
- mating, birth and care interactions retain their existing action locks;
- severe injury may limit turning, speed and head movement through authoritative capability values;
- death disables input and transitions lifecycle state;
- menus and pause do not change biological state unless simulation is actually paused.

On easier modes, explain the reason input is unavailable. On immersion modes, rely on natural presentation except where accessibility requires a neutral status cue.

## 20. UI implementation map

### 20.1 `index.html`

Plan additions:

- experience selector;
- difficulty-card group and comparison/details disclosure;
- ecological-role selector outside difficulty;
- entity-setup section with progressive fields;
- generated-organism review;
- embodied HUD shell;
- context-action prompt region;
- camera-mode indicator/switch where permitted;
- Internal Influence panel;
- Creative override panel;
- death/run-summary dialog.

### 20.2 `src/styles.css`

Plan additions:

- accessible selected/disabled difficulty cards;
- responsive setup wizard layout;
- embodied HUD and reduced/natural-only variants;
- first-person reticle only if tests show it is necessary and mode-permitted;
- Internal Influence controls;
- pointer-lock and paused-state messaging;
- camera-mode transitions;
- body classes based on resolved capabilities, used only as presentation helpers.

### 20.3 `src/app.js`

Keep orchestration responsibilities only:

- collect DOM references;
- instantiate embodiment/input/camera controllers;
- pass setup into world generation;
- call intent arbitration at the stable act boundary;
- route presentation through policy;
- update lifecycle and save/load glue.

Extract pure policy and mechanics into new modules to prevent further growth.

## 21. Proposed file-level work

### 21.1 New source modules

- `src/embodiment-capabilities.js`: difficulty profiles and monotonic validation.
- `src/embodied-setup.js`: role/species/stage validation, randomisation and population-slot resolution.
- `src/embodiment-session.js`: lifecycle and inhabited-entity identity.
- `src/player-input.js`: keyboard/mouse/gamepad-neutral input state.
- `src/player-intent.js`: direct-control candidate intent and arbitration.
- `src/embodied-camera.js`: camera modes, anchors and restrictions.
- `src/embodied-presentation-policy.js`: HUD, overlay, entity and map channel permissions.
- `src/internal-influence.js`: bounded influence state and scoring contributions.
- `src/creative-overrides.js`: Creative-only authoritative protections.
- Optional `src/head-look.js`: autonomous/player head state if it does not fit existing attention/presentation modules.

### 21.2 Existing source modules likely modified

- `src/app.js`: integration and UI glue.
- `src/species-registry.js`: role queries if guild semantics need explicit omnivore/random helpers.
- `src/simulation-phases.js`: optional controlled-act hook/context without changing ordinary ordering.
- `src/locomotion-system.js`: accept player-origin requests without special physics; likely minimal or no semantic change.
- `src/attention-controller.js`: autonomous head/look targets.
- `src/vision-model.js`: use authoritative head/body facing where appropriate.
- `src/animal-visual-structure.js` and `src/animal-face-geometry.js`: head anchors and self-camera visibility.
- `src/camera-ground.js`: named camera bands and embodied obstruction helpers.
- `src/knowledge-fog.js` / `src/vision-overlay.js`: map-presentation policy inputs.
- `src/presentation-snapshots.js`: embodiment-aware access context.
- `src/need-planning.js`, `src/commitment-system.js`, `src/goal-planning.js`: optional bounded influence contribution.
- `src/action-state.js` / `src/decision-trace.js`: intent-source metadata and rejection reasons.
- physiology modules: Creative override hooks at their owning boundaries.
- `index.html`, `src/styles.css`: setup and runtime UI.
- `README.md`, player manual, developer handover and Laboratory reference: user/developer documentation.

### 21.3 New tests

Mirror every new module:

- `tests/embodiment-capabilities.test.mjs`;
- `tests/embodied-setup.test.mjs`;
- `tests/embodiment-session.test.mjs`;
- `tests/player-input.test.mjs`;
- `tests/player-intent.test.mjs`;
- `tests/embodied-camera.test.mjs`;
- `tests/embodied-presentation-policy.test.mjs`;
- `tests/internal-influence.test.mjs`;
- `tests/creative-overrides.test.mjs`;
- browser tests for setup, camera, HUD, save/load and information leakage.

## 22. Phased delivery plan

Each phase should land with its own tests and preserve observer behaviour.

### Phase 0 — Specification lock and baselines

1. Approve exact mode matrix, camera bands, HUD channel mapping and death policy.
2. Inventory every current UI entry point that can open map, Laboratory, Reality, overlays, entity focus or camera jumps.
3. Record observer-mode screenshots, authoritative hashes, browser smoke results and performance baselines.
4. Identify authoritative physiology boundaries for every Creative toggle.
5. Decide whether omnivore is a first-class role in the first release.

Exit criteria:

- no unresolved contradiction in the capability matrix;
- observer baselines captured;
- all information channels classified.

### Phase 1 — Capability profiles and policy tests

1. Implement frozen difficulty profiles.
2. Implement profile validation and monotonic-difficulty tests.
3. Add experience/difficulty/role types and normalisation.
4. Add presentation/interaction policy query functions.
5. Do not yet alter the running UI beyond developer diagnostics.

Exit criteria:

- every matrix cell has one policy value;
- harder modes do not accidentally regain capabilities;
- no production code checks difficulty names outside the profile module.

### Phase 2 — Setup validation and deterministic population guarantee

1. Implement setup schema and pure validation.
2. Implement deterministic role/species/random resolution.
3. Insert selected demographic into one normal population slot.
4. Apply valid starting condition and reproduction state.
5. Add determinism/population/family tests.
6. Keep runtime control disabled until later phases.

Exit criteria:

- exact and random setups generate valid organisms;
- requested total population is unchanged;
- every role/difficulty combination produces a valid candidate or actionable error;
- pregnancy/dependent constraints pass tests.

### Phase 3 — New-world UI

1. Add Experience, Difficulty, Role and Organism sections.
2. Wire progressive disclosure to capability policy.
3. Add randomisation and review.
4. Add keyboard/accessibility behaviour.
5. Connect Generate to the validated setup object.

Exit criteria:

- full setup works Creative through Very Hard;
- role-only setup works Extreme through Impossible Immersion;
- role remains selectable at every difficulty;
- no hidden invalid fields affect generation.

### Phase 4 — Session identity and save/load

1. Separate inhabited identity from selection.
2. Add lifecycle state.
3. Persist and migrate embodiment data.
4. Restore organism/camera mode safely.
5. Implement death/end transitions.

Exit criteria:

- save/load retains the exact inhabited animal and difficulty;
- old observer saves migrate to observer experience;
- missing/dead entity handling is explicit and tested.

### Phase 5 — Input and direct locomotion

1. Implement device-neutral input state.
2. Add keyboard/mouse baseline and focus cancellation.
3. Translate movement to short-horizon ordinary movement requests.
4. Integrate arbitration at the stable act phase.
5. Add instinct-assistance modes.
6. Record source/rejection trace data.

Exit criteria:

- inhabited organisms move through ordinary navmesh/locomotion/collision;
- fatigue, terrain and injury constrain player movement;
- all other organisms remain autonomous;
- no-input and focus-loss behaviour is safe.

### Phase 6 — Context actions

1. Implement perception-bounded context targeting.
2. Route drink, forage, feed, hunt, flee, rest, social, mating, care and signal intents to existing systems.
3. Add difficulty-permitted prompts and rejection feedback.
4. Test each ecological role and life stage.

Exit criteria:

- no player action bypasses range, knowledge, capability or action locks;
- carnivore and herbivore survival loops are playable;
- pregnancy, dependents and injuries behave normally.

### Phase 7 — Camera ladder

1. Introduce camera-controller ownership.
2. Implement named camera bands and total/middle clamps.
3. Implement close third-person with semi-fixed zoom.
4. Add species head anchors.
5. Implement controlled first-person and body-turn coupling.
6. Implement non-controlled first-person from autonomous look state.
7. Block all alternate camera entry points according to policy.

Exit criteria:

- Challenging cannot reach total view;
- Hard cannot reach middle or total view;
- Extreme is close third-person only;
- Insane offers only close third-person/controlled first-person;
- Impossible offers only non-controlled first-person and follows autonomous head movement.

### Phase 8 — Fog, visibility and information policy

1. Implement shaded unknown terrain without revealing entities/resources.
2. Enforce black knowledge fog for appropriate modes.
3. Remove abstract map for immersion modes.
4. Gate entity rendering by sight evidence where required.
5. Route HUD, overlays, expressions, warnings, labels and panels through policy.
6. Add adversarial leakage tests.

Exit criteria:

- no forbidden entity/map data appears visually, in interactive DOM, via shortcuts or during transitions;
- intrinsic visible behaviour remains readable;
- organism knowledge is unchanged by presentation mode.

### Phase 9 — Creative overrides

1. Add explicit Creative panel.
2. Hook each override at its authoritative owner.
3. Add save, UI and diagnostic markers.
4. Ensure benchmarks/audits remain unaffected by default.

Exit criteria:

- each toggle affects only its documented rule;
- toggling off resumes normal mechanics;
- non-Creative modes cannot invoke overrides programmatically.

### Phase 10 — Internal Influence and Impossible Immersion

1. Implement bounded influence state and decay.
2. Integrate optional score contributions into needs/satisfiers/commitments.
3. Build the qualitative Internal Influence panel.
4. Disable all direct body/head/camera/action input.
5. Force non-controlled first-person.
6. Test that influence never creates knowledge, targets or direct actions.

Exit criteria:

- the organism remains autonomous;
- player input changes only bounded planner pressure;
- camera movement comes only from organism head/body movement;
- the panel is the only world-influence mechanism.

### Phase 11 — Death, lifecycle polish and accessibility

1. Complete incapacity/sleep/death visual policies.
2. Add run summary and menu flows.
3. Add remapping/gamepad support if included in first release.
4. Add motion-sickness options: camera smoothing, head bob reduction and field-of-view limits, without expanding information access.
5. Validate keyboard, screen-reader and colour-independent UI.

### Phase 12 — Documentation, performance and release hardening

1. Update all user/developer/reference documentation.
2. Run logic, static, browser and visual suites.
3. Run long ecology audits with an embodied organism idle, directly controlled via replay, and indirectly influenced.
4. Profile first-person scene rendering and fog/entity filtering.
5. Compare observer authoritative hashes and performance baselines.
6. Perform save compatibility and corrupted-state tests.

## 23. Test strategy

### 23.1 Unit tests

Capability profiles:

- all nine IDs resolve;
- ranks are unique and ordered;
- role selection exists in all modes;
- camera bands decrease correctly;
- Laboratory access decreases correctly;
- Impossible has influence control and non-controlled first-person only.

Setup:

- species filtering by guild/role;
- random selection determinism;
- exact age-stage boundaries per species;
- pregnancy validity;
- dependent caregiver constraints;
- condition clamping and hunger/thirst translation;
- zero-population and slot-transfer cases;
- total population unchanged.

Intent:

- player movement produces valid ordinary requests;
- sprint is capped by capability/exertion;
- invalid feed/drink/attack targets are rejected;
- unseen targets cannot be acted on by ID;
- involuntary states outrank input;
- fallback assistance activates only after its threshold.

Influence:

- biases clamp and decay;
- emergency floors remain;
- unknown methods remain unknown;
- nonviable methods remain nonviable;
- no movement/action request is emitted directly;
- deterministic scoring with the same state.

Camera:

- band clamps by difficulty;
- pan/map jumps rejected where forbidden;
- head/body yaw coupling;
- non-controlled first-person ignores input;
- anchors remain above terrain and outside opaque geometry.

Creative overrides:

- each flag affects only the inhabited organism and owning subsystem;
- flags unavailable outside Creative;
- save/load round-trip.

### 23.2 Integration tests

- Generate every difficulty as herbivore and carnivore.
- Generate representative exact species/stage/sex combinations.
- Start as pregnant adult, nonpregnant adult, dependent and elder.
- Drink, eat, rest, flee, hunt, mate, care and vocalise through direct control.
- Let instinct assistance take over and return control.
- Save during movement, sleep, pregnancy, hunt and influence decay; reload safely.
- Die through injury, dehydration, starvation and predation.
- Confirm other organisms' behaviour and stable phase ordering remain deterministic.

### 23.3 Browser/end-to-end tests

- New-world wizard keyboard navigation and validation.
- Difficulty comparison text and progressive field hiding.
- Camera wheel, drag, pan, Map button, minimap click and entity-focus shortcuts at every camera tier.
- Laboratory open/toggle shortcuts under every policy.
- Pointer lock acquisition/release and modal interactions.
- HUD/overlay screenshots for all nine modes.
- First-person head movement and Impossible autonomous camera movement.
- Forbidden DOM elements absent/disabled, not merely transparent.

### 23.4 Information-leak tests

For Insane and Impossible Immersion, assert that an unseen organism does not appear through:

- world mesh rendering;
- minimap/map;
- entity labels, bars or selection rings;
- event log or Reality panel;
- accessibility tree/text content;
- target connectors or action prompts;
- cached presentation during a mode switch;
- one-frame flashes during load, resize or camera transition.

### 23.5 Deterministic replay tests

Record quantised input frames and replay them against a fixed seed. Assert:

- final authoritative hash;
- inhabited position/orientation;
- reserves, health and action state;
- population/birth/death counts;
- no dependence on render frame rate.

### 23.6 Performance tests

- input-to-camera latency at 30/60/120 FPS;
- full-population first-person render cost;
- perception-gated entity rendering cost;
- camera obstruction raycast cost;
- map/fog invalidation under continuous embodied movement;
- DOM update cost of Internal Influence;
- no observer-mode regression beyond agreed budgets.

## 24. Acceptance criteria by mode

### Creative

- Full setup and both Laboratories available.
- Entire map and unrestricted camera available.
- All declared god toggles work and persist.
- Direct control still uses ordinary actions unless an explicit override applies.

### Easy

- No god toggles.
- Full setup, full Laboratory and all camera bands.
- Unknown terrain shaded without unknown entity/resource disclosure.
- Full HUD and guidance.

### Standard

- Main Laboratory inaccessible.
- Mini Laboratory, all cameras and shaded unknown terrain remain.
- Full entity setup and full HUD.

### Challenging

- Total/world zoom and strategic aggregate view inaccessible.
- Close and middle views remain.
- Unknown terrain black.

### Hard

- Middle and total views inaccessible.
- Close view only.
- Mini Laboratory remains.

### Very Hard

- Full entity setup remains.
- All Laboratory access disabled.
- Close view and standard HUD remain.

### Extreme

- Player chooses herbivore/carnivore/omnivore/random role only.
- Species and remaining traits are deterministically random.
- Close third-person with semi-fixed zoom only.
- Reduced HUD.

### Insane Immersion

- Role selection remains.
- Close third-person and controlled first-person are the only cameras.
- Player controls body and head within physical limits.
- No abstract map, bars, artificial expressions, warnings, labels, thought bubbles or other-entity private information.
- Visible physical behaviour remains visible when genuinely perceived.

### Impossible Immersion

- Role selection remains; remaining traits random.
- Non-controlled first-person only.
- Body, head, camera and direct actions ignore player command input.
- Camera follows autonomous head movement.
- Internal Influence is the only player influence.
- Influence cannot directly select targets, actions or destinations.

## 25. Cross-cutting risks and mitigations

### Risk: player control becomes a second simulation

Mitigation: require all player candidates to resolve to existing action/movement/contact systems; reject bespoke state mutation.

### Risk: `src/app.js` becomes unmaintainable

Mitigation: extract capability, setup, input, intent, camera, presentation and influence modules before wiring UI details.

### Risk: difficulty leaks through hidden shortcuts

Mitigation: central capability checks at presentation, interaction and authoritative boundaries; adversarial browser tests.

### Risk: inhabited organism gains omniscience

Mitigation: target resolution accepts perception/memory evidence, never arbitrary world IDs or nearest global entities.

### Risk: Impossible influence is secretly direct control

Mitigation: influence functions return score terms only and cannot import locomotion/action constructors.

### Risk: camera causes nausea or clipping

Mitigation: species anchors, obstruction handling, configurable smoothing/head bob/FOV within fixed information bounds.

### Risk: exact starting state breaks metabolism or pregnancy

Mitigation: normalise through owning physiology modules before initialization; extensive species/stage property tests.

### Risk: world population changes

Mitigation: demographic-plan replacement and explicit before/after total assertions.

### Risk: render FPS changes authoritative control

Mitigation: sample at render rate, quantise and apply at simulation boundaries; deterministic replay tests.

### Risk: observer mode regresses

Mitigation: default absent embodiment to observer, keep ordinary animal path unchanged, compare hashes/screenshots/performance.

### Risk: selected entity and inhabited entity conflict

Mitigation: separate identity fields and define capability-dependent selection behaviour.

### Risk: death leaves a broken camera/session

Mitigation: explicit lifecycle state machine and tested death/end policy.

## 26. Telemetry and diagnostics

Development diagnostics should record:

- experience, difficulty and camera controller;
- inhabited entity ID/species/stage;
- input device and quantised intent, excluding raw personal device data;
- intent source and rejection reason;
- autonomous fallback count;
- camera clamp/obstruction events;
- influence contribution and decay;
- forbidden-capability rejection counts;
- input-to-presentation latency;
- embodied render/fog/entity visibility costs.

These diagnostics remain Laboratory/development information and must be hidden in restricted modes.

## 27. Documentation updates

Update:

- `README.md`: experience overview, controls, camera ladder and difficulty table;
- `GAME_SIMULATION_PLAYER_MANUAL.md`: setup, direct control, death and each difficulty;
- `GAME_SIMULATION_SYSTEMS_REFERENCE.md`: control arbitration and influence boundaries;
- `GAME_SIMULATION_ENTITY_AND_ACTION_CATALOGUE.md`: player-requestable actions and rejection conditions;
- `GAME_SIMULATION_DEVELOPER_HANDOVER.md`: modules, state schemas and integration boundaries;
- `LIVING_LABORATORY_ENCYCLOPEDIA.md`: observer truth versus embodied perception;
- `src/laboratory-reference.js`: in-application explanation where Laboratory access permits it.

## 28. Decisions required before implementation

The following choices should be locked before Phase 1 or at the named phase:

1. Whether omnivore is selectable alongside carnivore/herbivore/random in the first release.
2. Exact camera distance thresholds after species-scale visual prototypes.
3. Whether Challenging simultaneously changes fog and camera, or whether another difficulty is desired so each changes separately.
4. The exact Standard versus Challenging HUD difference.
5. Which core values remain in Extreme's reduced HUD.
6. Whether Insane allows switching freely between close third-person and controlled first-person during play.
7. Whether sleeping makes first-person fully black, heavily obscured or intermittently visible.
8. Whether first-person field of view follows each species exactly or uses comfort-clamped species ranges.
9. Default instinct-assistance option per direct-control difficulty.
10. Exact influence budget, decay rate and qualitative wording in Impossible Immersion.
11. Death-screen options allowed at each difficulty.
12. Whether Creative overrides affect only the inhabited organism or may optionally affect the whole world.
13. Whether changing difficulty after generation is prohibited, Creative-only, or allowed only toward harder modes.

## 29. Recommended implementation order summary

The critical dependency chain is:

```text
Capability profiles
  → validated setup and population-slot guarantee
  → embodiment identity and persistence
  → input abstraction
  → intent arbitration through existing mechanics
  → camera controllers and head state
  → fog/HUD/Laboratory enforcement
  → Creative overrides
  → Internal Influence and Impossible Immersion
  → accessibility, performance and release hardening
```

Do not begin with first-person rendering or UI hiding. The capability model, population invariant, identity separation and authoritative intent boundary must exist first; otherwise later camera and UI work will be built on unstable semantics.

## 30. Definition of complete

Embodied Simulation is complete only when:

- observer mode retains its previous behaviour and deterministic baselines;
- all nine difficulty profiles satisfy the final matrix;
- herbivore and carnivore are selectable at every difficulty;
- one normal population slot is inhabited with no population increase;
- direct control uses existing authoritative mechanics;
- the complete camera ladder is enforced against every input and shortcut;
- Insane Immersion exposes only embodied, genuinely observable evidence;
- Impossible Immersion has non-controlled first-person and indirect influence only;
- saves, death, pregnancy, dependent life stages and all core survival loops work;
- automated unit, integration, browser, leakage, replay and performance tests pass;
- documentation accurately describes the shipped behaviour.

