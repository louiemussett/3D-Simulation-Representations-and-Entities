# ACSS Predictive Documentary Author: Learning and Decision Architecture

## Status

Design only. This document does not authorize or contain a runtime implementation.

This design replaces the present interpretation of “predictive author” as a fixed scorer with an ACSS-style internal mind composed of dependency-structured, ontologically registered, selectively activated prediction models. The author predicts the simulated world, its own production actions, audience comprehension, and likely narrative consequences. It learns only from measured prediction outcomes and bounded production feedback.

The simulation remains the sole source of ecological truth. The author learns how to observe and present that truth; it cannot change it.

## 1. Design objective

The author must repeatedly answer five questions:

1. What is happening now?
2. Which registered models can explain or predict it?
3. What must be true for each prediction to remain valid?
4. Which present filming or narration action best preserves the valuable possible futures?
5. What did the outcome teach the author about its models and decisions?

The target loop is:

```text
authoritative evidence
→ typed propositions
→ active situations
→ author needs
→ eligible prediction-model dependency graphs
→ selected model ensemble
→ bounded forecasts
→ candidate production plans
→ present action
→ observed outcome
→ prediction attribution
→ bounded parameter learning
→ persistent, versioned experience
```

This is not a language model, general intelligence, or opaque reinforcement learner. It is an inspectable predictive control and editorial learning system.

## 2. ACSS interpretation

For this design, ACSS is operationally expressed in the same pattern already used by the simulation’s behavioural ontology:

```text
terminal concern
→ satisfier
→ method
→ phase sequence
→ dependency closure
→ currently executable action
```

For an animal, a concern may be hydration and a method may be drinking at a confirmed shoreline. For the documentary author, a concern may be causal-story completion and a method may be holding a character-centred shot until the current behavioural method resolves.

The author does not choose directly from a flat list of shots. It first selects what documentary need matters, then a way of satisfying it, then a predictive method whose dependencies are supported, and only then an executable camera, narration, silence, or transition action.

## 3. Separation of realities

Four stores must never be conflated.

### 3.1 Authoritative world truth

Read-only simulation facts and verified events:

- entity state;
- actions and dependency plans;
- perception and memory records;
- relationships and groups;
- physiology and exertion;
- resources, terrain, water, vegetation and weather;
- births, deaths, carcasses and lineage;
- simulation time and causal event identifiers.

### 3.2 Author belief state

Propositions interpreted from evidence, with provenance, confidence, validity windows and contradictions. Beliefs may be incomplete or wrong. They never overwrite world truth.

### 3.3 Prediction state

Forecasts made by registered models, including prerequisites, alternative outcomes, expiry, calibration history and resolution evidence.

### 3.4 Production state

What the author has shown, said, deferred, missed, repeated, framed well, framed badly, or been explicitly told to prefer.

## 4. Author concern ontology

The author requires its own ontology rather than a single utility score.

### 4.1 Terminal concerns

| Concern | Meaning | Default criticality |
|---|---|---:|
| `truth_integrity` | Never claim beyond verified evidence or declared uncertainty | 1.00 |
| `production_safety` | Avoid invalid, disorienting or unusable camera states | 1.00 |
| `causal_completion` | Preserve developing causes through outcome and consequence | 0.92 |
| `subject_legibility` | Keep the actual referenced subject identifiable and visible | 0.90 |
| `character_continuity` | Maintain intelligible identity and biography across time | 0.82 |
| `event_capture` | Capture rare, irreversible or high-impact events | 0.88 |
| `audience_comprehension` | Build understanding without overload | 0.78 |
| `semantic_novelty` | Add materially new information rather than paraphrasing | 0.70 |
| `ecological_context` | Connect local behavior to relevant world processes | 0.62 |
| `coverage_diversity` | Represent the wider ecosystem over appropriate timescales | 0.48 |
| `aesthetic_rhythm` | Maintain visual variation, breathing room and pacing | 0.42 |
| `operator_intent` | Honor preset, favourites, exclusions and manual feedback | 1.00 when explicit |

Criticality is contextual. `event_capture` rises during a birth or attack. `coverage_diversity` must not displace `causal_completion` merely because the current location has appeared recently.

### 4.2 Author satisfiers

Examples include:

- `hold-developing-thread` supports causal completion, character continuity and comprehension;
- `reframe-current-subject` supports legibility and production safety without abandoning continuity;
- `establish-relevant-environment` supports ecological context only when a causal dependency connects it to the active thread;
- `cut-to-critical-event` supports event capture but impairs current-thread completion;
- `remain-silent` supports comprehension and aesthetic rhythm;
- `explain-new-proposition` supports comprehension and novelty but can impair rhythm;
- `return-to-known-character` supports continuity and deferred resolution;
- `open-predictive-watch` supports event capture by preparing for a bounded expected outcome;
- `safe-camera-fallback` supports production safety but impairs subject legibility and continuity;
- `defer-low-priority-topic` protects more critical concerns.

Each satisfier declares `supports`, `impairs`, and one or more phased methods.

### 4.3 Example method

```text
Concern: causal_completion
Satisfier: hold-developing-thread
Method: observe-resource-acquisition
Phases:
  establish subject
  confirm goal and method
  follow travel
  show resource contact
  show acquisition
  observe immediate consequence
  release or defer
Dependencies:
  verified active dependency plan
  identifiable subject
  feasible camera
  predicted phase transition
  no overriding irreversible event
```

The next camera action is selected from the current executable phase. Later phases cannot be skipped merely to create visual novelty.

## 5. Prediction-model ontology

The author owns a registry of many small prediction models. Every model is typed, bounded and inspectable.

### 5.1 Model descriptor

```js
{
  modelId: "behaviour.resource-acquisition.phase-transition.v1",
  family: "BEHAVIOUR",
  predicts: "NEXT_METHOD_PHASE",
  scope: ["ENTITY", "ACTIVE_PLAN"],
  horizons: [{ unit: "simulation-tick", minimum: 1, maximum: 30 }],
  requiredInputs: ["entity.action", "entity.needPlan.methodId", "entity.needPlan.phase"],
  optionalInputs: ["route.distance", "endurance.forecast", "resource.contact"],
  dependencies: [
    { modelId: "physiology.locomotion-capacity.v1", relation: "REQUIRES" },
    { modelId: "space.route-reachability.v1", relation: "REQUIRES" },
    { modelId: "resource.target-validity.v1", relation: "SUPPORTS" }
  ],
  contraindications: ["entity.dead", "plan.cancelled", "target.invalidated"],
  outcomeVocabulary: ["ADVANCE_PHASE", "HOLD_PHASE", "ABANDON_METHOD", "INTERRUPTED"],
  learner: "DIRICHLET_CONTEXTUAL",
  minimumEvidence: 3,
  abstainBelowConfidence: 0.58,
  maximumInfluence: 0.22,
  version: 1
}
```

### 5.2 Dependency relations

The registry supports explicit edge meanings:

- `REQUIRES`: prediction is invalid without the dependency;
- `SUPPORTS`: increases confidence but is not mandatory;
- `CONDITIONS`: supplies a contextual variable or branch;
- `INHIBITS`: lowers viability or probability;
- `CONTRADICTS`: mutually inconsistent prediction;
- `REFINES`: gives a narrower forecast than a parent model;
- `EXPLAINS`: supplies a causal interpretation;
- `OBSERVES`: predicts whether evidence will become visible;
- `SUPERSEDES`: newer or more specific model replaces another;
- `COSTS`: identifies production or computation cost.

Cycles in `REQUIRES` and `REFINES` are invalid. Feedback relationships are represented across time, not as same-cycle dependency loops.

## 6. Model families

### 6.1 State-estimation models

- evidence freshness;
- entity identity continuity;
- action and plan phase;
- relationship participation;
- local environment state;
- carcass identity and decay stage;
- uncertainty and contradiction state.

### 6.2 Physiology models

- ordinary endurance trajectory;
- sprint reserve use;
- adrenaline activation and recovery debt;
- short-rest versus travel-recovery completion;
- hydration and energy constraint horizons;
- thermoregulatory response;
- injury impairment;
- pregnancy and lactation cost.

### 6.3 Behaviour models

- need selection;
- satisfier selection;
- method viability;
- dependency completion;
- phase transition;
- plan abandonment;
- recovery and resumption;
- exploration and information acquisition.

These models should read the animal’s existing ontology and active dependency plan rather than rediscovering behavior from superficial action labels.

### 6.4 Spatial models

- route reachability;
- time to target;
- likely action zone;
- convergence or separation of entities;
- shoreline/contact geometry;
- terrain interception;
- likely exit from camera visibility.

### 6.5 Predation and danger models

- detection probability;
- stalk continuation;
- chase initiation;
- contact opportunity;
- escape-route viability;
- group defence;
- fight, flight or disengagement;
- carcass formation and contest risk.

Predictions branch and abstain. “Contact opportunity increased” is valid; “the predator will kill” is normally not.

### 6.6 Social models

- caregiver reunion;
- group cohesion;
- leader following;
- signal response;
- personal-space escalation;
- departure and rejoining;
- relationship repair or deterioration;
- offspring defence;
- learned protocol execution.

Only ontologically relevant participants are included. Geographic proximity alone never creates a social role.

### 6.7 Reproduction models

- courtship phase progression;
- female evaluation dependencies;
- acceptance or rejection possibility;
- mating completion;
- pregnancy support behavior;
- birth-window readiness;
- dependent-care transitions.

### 6.8 Environmental models

- rainfall to runoff;
- infiltration and soil moisture;
- channel discharge;
- water availability;
- biomass growth and consumption;
- grazing pressure;
- succession and decomposition;
- weather-system movement;
- terrain accessibility changes.

Environmental models may enter a Character Stories ensemble only through an explicit dependency such as `water availability → character hydration method`.

### 6.9 Story models

- situation identity persistence;
- discovery, development, complication, outcome and consequence;
- unresolved causal dependency;
- likely resolution window;
- return opportunity;
- character biography significance;
- cross-scale ecological explanation relevance.

### 6.10 Audience models

- proposition comprehension;
- retention;
- semantic duplication;
- unresolved question memory;
- character recognition;
- cognitive load;
- need for re-establishment after a long absence.

### 6.11 Camera models

- future subject position;
- expected group extent;
- occlusion probability;
- terrain clearance;
- framing containment;
- action-zone visibility;
- camera travel cost;
- motion sickness/disorientation risk;
- shot-size suitability;
- whether a correction can be continuous rather than a cut.

### 6.12 Production-policy models

- probability that holding captures a resolution;
- probability that switching misses a resolution;
- expected information gain from a shot;
- expected repetition cost;
- expected narration/visual agreement;
- interruption value;
- operator preference compatibility.

## 7. Selected dependency-structured model ensembles

The author must never run every model as one undifferentiated pool. It creates a selected ensemble for each active concern.

### 7.1 Root query

Examples:

```text
Will this water-seeking method reach contact within 20 ticks?
Will holding this shot reveal the next courtship phase?
Will these two subjects remain frameable together for eight seconds?
Is this terrain fact causally necessary to explain the protagonist’s action?
Would switching now cause the audience to miss a verified outcome?
```

### 7.2 Dependency closure

For a root model `m`, compute the transitive required closure:

```text
D*(m) = {m} ∪ required dependencies of every member
```

The ensemble is eligible only if every required node is:

- registered;
- supplied with fresh required evidence;
- not contradicted beyond its tolerance;
- within its applicable horizon;
- computationally affordable;
- epistemically permitted by the active documentary mode.

Missing optional dependencies reduce confidence. Missing required dependencies cause abstention or selection of a less specific parent model.

### 7.3 Model selection score

For model `m` in context `x`:

```text
S_m = A_m · R_m · C_m · H_m
      + w_i I_m
      + w_r Rel_m
      + w_d Dep_m
      - w_u U_m
      - w_c Cost_m
      - w_k Conflict_m
```

Where:

- `A`: applicability;
- `R`: learned reliability in comparable contexts;
- `C`: current evidence confidence;
- `H`: horizon fitness;
- `I`: expected information gain;
- `Rel`: relevance to the active author concern;
- `Dep`: dependency completeness;
- `U`: uncertainty;
- `Cost`: compute/production cost;
- `Conflict`: contradiction with active models.

Selection is constrained optimization, not merely sorting. Required dependency closure, preset constraints and production feasibility are hard constraints.

### 7.4 Ensemble diversity

Models may be combined only if they contribute different evidence or causal structure. Five correlated variants must not masquerade as five independent votes. Each forecast records a dependency/evidence fingerprint, and correlated forecasts are down-weighted.

## 8. Forecast representation

```js
{
  forecastId: "forecast-...",
  rootModelId: "behaviour.resource-acquisition.phase-transition.v1",
  ensembleId: "ensemble-...",
  situationId: "situation-...",
  subjectIds: ["grazer-42"],
  issuedAtTick: 8120,
  horizon: { earliestTick: 8122, latestTick: 8140 },
  conditions: ["target remains valid", "no threat interruption"],
  outcomes: [
    { id: "ADVANCE_TO_CONTACT", probability: 0.61 },
    { id: "CONTINUE_TRAVEL", probability: 0.25 },
    { id: "ABANDON_OR_INTERRUPT", probability: 0.14 }
  ],
  confidence: 0.73,
  dependencies: ["forecast-locomotion-...", "forecast-route-..."],
  evidenceIds: ["evidence-..."],
  productionImplications: ["hold subject", "prepare shoreline two-shot"],
  status: "ACTIVE"
}
```

Probabilities are normalized across mutually exclusive outcomes. Confidence is separate: a 70/30 forecast based on weak evidence is not equivalent to a well-calibrated 70/30 forecast.

## 9. Confidence propagation

Required dependency confidence should be conservative:

```text
C_required = geometricMean(C_i) · min(C_i)^α
```

with `α > 0` so one weak prerequisite cannot be hidden by several strong ones.

Supporting evidence contributes through bounded log-odds updates:

```text
logit(p') = clamp(logit(p) + Σ β_i e_i, lower, upper)
```

Correlated evidence groups share a cap. Contradictions reduce confidence and may force an explicit alternative forecast or abstention.

## 10. Present decision formation

The selected models do not directly move the camera. They supply forecasts to the ACSS author planner.

```text
active author concerns
→ pressure and criticality
→ eligible satisfiers
→ method dependency plans
→ predicted outcomes of each plan
→ Pareto-safe candidate set
→ present executable action
```

### 10.1 Decision utility

For production action `a` under forecast branches `o`:

```text
EU(a) = Σ_o P(o | selected models) · V(a,o)
        - switchingCost(a)
        - disorientationRisk(a)
        - missedResolutionRisk(a)
        - semanticDuplication(a)
        - epistemicRisk(a)
```

No positive utility can override truth-integrity or camera-safety constraints.

### 10.2 Hysteresis

Switch only when:

```text
EU(new) - EU(current) > baseMargin
                         + speechProtection
                         + nearResolutionProtection
                         + characterContinuityProtection
```

Irreversible critical events can override this margin. Ordinary action-phase changes cannot.

## 11. Presets as hard policy constraints

Presets must constrain model and plan selection, not merely overlays.

### Character Stories

- root situations require one or more identified character roles;
- world models are allowed only as dependencies of a character forecast;
- proximity does not establish participation;
- protagonist continuity has a minimum protected horizon;
- terrain-only root plans are ineligible;
- return obligations are created when a character story is interrupted.

### World Reality

- entity-specific private state models are ineligible;
- entities may appear only as population pressure or verified ecological actors;
- camera intentions target terrain, water, vegetation or weather processes.

### Full Laboratory

- all model families are eligible;
- relevance and dependency connections are still required;
- “all information” never means “all overlays simultaneously.”

### Event Highlights

- irreversible-event capture pressure rises;
- interruption thresholds fall;
- completed context packets are short but must still include consequence or a deferred return promise.

## 12. Story threads as dependency plans

A story thread is not a collection of similar events. It is a persistent dependency plan.

```js
{
  threadId,
  rootConcern: "causal_completion",
  situationId,
  characterRoles: { protagonist: "grazer-42", caregiver: "grazer-9" },
  causalQuestion: "Can the dependent regain caregiver contact?",
  methodId: "observe-caregiver-reunion",
  phase: "travel",
  requiredBeats: ["establish", "cause", "development", "outcome", "consequence"],
  completedBeats: ["establish", "cause"],
  openDependencies: ["caregiver remains reachable", "call receives response"],
  forecasts: [...],
  returnObligation: null
}
```

An action change that advances the same method phase continues the thread. For example:

```text
locate → travel → contact → acquire
```

must not be interpreted as four unrelated stories.

## 13. Camera control as predictive control

The author produces one presentation contract before physical shot selection. The camera executor no longer competes with a separate legacy selector.

### 13.1 Camera intention

The intention specifies:

- narrative function;
- primary and secondary roles;
- predicted action zone over time;
- required visible relationships;
- framing envelope;
- preferred shot families;
- minimum hold and expected resolution window;
- allowed continuous corrections;
- explicit cut conditions;
- fallback that preserves the same subjects where possible.

### 13.2 Model-predictive camera horizon

At each control update, evaluate several future poses over a short horizon:

```text
J = Σ_t (
    w_s subjectContainment_t
  + w_a actionZoneVisibility_t
  + w_c composition_t
  + w_n narrativeSupport_t
  - w_o occlusionRisk_t
  - w_m cameraMotion_t
  - w_j jerk_t
  - w_d disorientation_t
)
```

The executor moves toward an absolute desired pose. It must never repeatedly add offsets to its previous repair state. Position, velocity and acceleration limits provide smooth convergence.

### 13.3 Repair hierarchy

1. Adjust target within the current composition.
2. Adjust focal length within a bounded range.
3. Move laterally along a prevalidated continuous path.
4. Widen while retaining the same subjects.
5. Change shot within the same thread.
6. Use a safe fallback preserving the thread.
7. Cut away only for invalidity or a justified override.

## 14. Learning architecture

Learning has three levels.

### 14.1 Model calibration

Every resolved forecast updates the reliability of the models that contributed to it.

For binary outcomes, use contextual Beta posteriors:

```text
α' = α + attributionWeight · outcome
β' = β + attributionWeight · (1 - outcome)
reliability = α' / (α' + β')
```

For multinomial outcomes, use a Dirichlet posterior. For continuous quantities such as arrival time or occlusion, store bounded online mean error, absolute error and quantiles.

Context bins must remain broad enough to learn:

- species/guild;
- behavior method and phase;
- subject-count band;
- terrain class;
- movement-speed band;
- weather/visibility band;
- shot family and scale.

Sparse contexts fall back hierarchically to parent contexts.

### 14.2 Production-policy adaptation

The author learns which eligible action works better in a context. A bounded contextual bandit is appropriate because actions are discrete and feedback is delayed.

Examples:

- hold versus switch;
- still versus tracking;
- medium versus wide;
- narration now versus defer;
- introduce environment versus remain character-centred.

Policy updates are constrained:

- maximum parameter change per session;
- maximum persistent change per completed session;
- immutable safety and truth rules;
- minimum sample count;
- confidence intervals;
- automatic rollback after regression;
- no update from unresolved or corrupted outcomes.

### 14.3 Operator preference learning

Explicit signals have separate semantics:

- `Favourite`: durable positive identity preference;
- `Keep`: positive evaluation of the complete presentation decision;
- `Highlight`: high editorial value, not necessarily good camera execution;
- `Compress`: information valuable but treatment too long;
- `Remove`: presentation unsuitable, with reason requested when practical;
- `Next shot`: weak negative hold feedback unless a critical event caused it;
- preset changes: hard policy selection, not reward noise.

Operator preferences cannot raise the probability of unsupported ecological claims.

## 15. Outcome attribution

Learning requires knowing why a result occurred.

```text
prediction error
├── evidence error
├── state-estimation error
├── dependency-selection error
├── model error
├── horizon error
├── story-selection error
├── camera-planning error
├── camera-execution error
├── narration-realisation error
├── audience-model error
└── external interruption / unscorable
```

Only responsible components update. A prediction should not be penalized when an unrelated critical event interrupted it. A camera model should not be penalized for a subject dying unexpectedly unless death risk was within its declared scope.

## 16. Counterfactual learning limits

The author observes the outcome of the action it took, not actions it rejected. Therefore:

- direct outcomes receive full learning weight;
- shadow policies can be evaluated when their predicted measurable quantities are later observable;
- unexecuted camera aesthetics receive no invented reward;
- inverse-propensity or off-policy estimates are allowed only when action probabilities were logged;
- speculative counterfactuals never become ecological facts.

## 17. Persistence

Persistent learning is stored outside simulation saves in a versioned author profile.

```text
DocumentaryAuthor/
├── profiles/
│   ├── default/
│   │   ├── manifest.json
│   │   ├── model-calibration.json
│   │   ├── policy-parameters.json
│   │   ├── operator-preferences.json
│   │   └── migrations.jsonl
├── sessions/
│   └── <session-id>/learning-events.jsonl
└── quarantine/
```

The manifest records:

- ontology schema;
- model-registry version;
- simulation version range;
- sample counts;
- last validated date;
- parent profile;
- checksums;
- rollback snapshot.

Profiles with incompatible schemas are migrated or quarantined, never silently loaded.

## 18. Learning lifecycle

```text
COLD
→ OBSERVING
→ CALIBRATING
→ SHADOW_POLICY
→ BOUNDED_ACTIVE
→ VALIDATED_ACTIVE
```

- `COLD`: registry priors only.
- `OBSERVING`: predictions logged; no parameter changes affect output.
- `CALIBRATING`: model reliability updates, but policy remains fixed.
- `SHADOW_POLICY`: learned policy proposes decisions alongside baseline.
- `BOUNDED_ACTIVE`: only validated model families influence output within caps.
- `VALIDATED_ACTIVE`: profile passed long-session and regression gates.

Learning status is per model family. A calibrated recovery predictor does not imply that camera policy is ready.

## 19. Runtime architecture

Recommended modules:

```text
src/documentary-author-v3/
├── ontology/
│   ├── author-concerns.js
│   ├── author-satisfiers.js
│   ├── production-methods.js
│   ├── prediction-model-registry.js
│   └── integrity.js
├── beliefs/
│   ├── evidence-adapters.js
│   ├── proposition-store.js
│   ├── contradiction-ledger.js
│   └── world-belief-state.js
├── models/
│   ├── physiology/
│   ├── behaviour/
│   ├── spatial/
│   ├── social/
│   ├── predation/
│   ├── reproduction/
│   ├── environment/
│   ├── story/
│   ├── audience/
│   └── camera/
├── selection/
│   ├── query-builder.js
│   ├── dependency-closure.js
│   ├── model-selector.js
│   └── ensemble.js
├── planning/
│   ├── concern-state.js
│   ├── dependency-plan.js
│   ├── policy-constraints.js
│   ├── decision-evaluator.js
│   └── commitment-manager.js
├── presentation/
│   ├── contract.js
│   ├── shot-planner.js
│   ├── camera-executor.js
│   ├── discourse-planner.js
│   └── deterministic-realiser.js
├── learning/
│   ├── outcome-resolver.js
│   ├── attribution.js
│   ├── calibration.js
│   ├── policy-learner.js
│   ├── preference-learner.js
│   └── profile-store.js
└── diagnostics/
    ├── trace.js
    ├── model-graph-view.js
    ├── learning-report.js
    └── comparison-runner.js
```

V3 should not be embedded as another branch inside `beginMovieShot()`. The author emits a single presentation contract consumed by camera, narration, captions, highlights and logging.

## 20. Decision cycle pseudocode

```js
function authorCycle(snapshot, productionState, policy) {
  const evidence = adapters.observe(snapshot);
  const beliefChanges = beliefs.revise(evidence);
  const situations = situationManager.update(beliefChanges);

  const concerns = concernOntology.evaluate({
    situations,
    productionState,
    audienceState,
    operatorPolicy: policy
  });

  const plans = [];
  for (const concern of concerns.active) {
    for (const method of concernOntology.eligibleMethods(concern, policy)) {
      const queries = queryBuilder.forMethod(method, situations);
      const ensembles = queries.map(query =>
        modelSelector.selectDependencyClosure(query, modelRegistry, beliefs)
      );
      const forecasts = ensembles.map(ensemble => ensemble.predict());
      plans.push(dependencyPlanner.instantiate(method, forecasts));
    }
  }

  const feasible = plans.filter(plan =>
    plan.dependenciesSatisfied &&
    policy.allows(plan) &&
    presentationValidator.canExecute(plan)
  );

  const decision = commitmentManager.choose(feasible, productionState);
  const contract = presentationPlanner.compile(decision);
  trace.record({ evidence, beliefChanges, concerns, plans, decision, contract });
  return contract;
}
```

Outcome processing is separate:

```js
function resolveOutcome(observation) {
  const resolved = forecastLedger.resolve(observation);
  const attribution = attributionEngine.explain(resolved);
  calibrationLearner.update(attribution.modelComponents);
  policyLearner.update(attribution.productionComponents);
  profileStore.stageChanges(attribution);
}
```

## 21. Diagnostics and inspectability

The Laboratory should expose the author’s internal structure:

- active terminal concern;
- selected satisfier and method;
- current production phase;
- selected model dependency graph;
- unavailable dependencies and reasons;
- active forecasts and outcome probabilities;
- confidence and calibration sample count;
- chosen decision and alternatives;
- why each alternative lost;
- learned adjustment versus registry prior;
- preset constraints applied;
- current thread and protected beats;
- camera predicted path and repair boundary;
- pending return obligations;
- latest learning events and attribution.

Every presented sentence and shot must be traceable to this structure.

## 22. Metrics

### Prediction

- Brier score by model and context;
- log loss with probability floors;
- calibration error;
- abstention rate;
- dependency-failure rate;
- horizon error;
- outcome coverage.

### Documentary

- completed story-beat ratio;
- missed-resolution rate;
- unjustified-cut rate;
- same-character continuity time;
- irrelevant-world-shot rate in Character Stories;
- subject visibility and identity rate;
- camera jerk and accumulated displacement;
- semantic repetition rate;
- narration/visual subject agreement;
- operator keep/remove ratio.

### Learning safety

- parameter drift;
- regression against baseline;
- sample sufficiency;
- profile migration failures;
- rollback activations;
- learning updates rejected by bounds.

## 23. Testing strategy

### Ontology tests

- every concern has a satisfier;
- every satisfier has a method;
- every method has phases;
- every prediction dependency resolves;
- required dependency graph is acyclic;
- supports/impairs references are valid.

### Deterministic scenario tests

- water acquisition completes all phases;
- hunt interruption is distinguished from prediction failure;
- rest layers produce different expected recovery windows;
- courtship retains both actual participants;
- carcass identity survives into skeleton narration;
- terrain enters Character Stories only through a character dependency;
- ordinary action progression does not trigger a new story.

### Learning tests

- repeated correct forecasts improve calibration gradually;
- failures lower contextual reliability without erasing parent priors;
- sparse contexts back off to parent models;
- one anomalous session cannot dominate policy;
- profile reload reproduces learned parameters;
- incompatible profiles quarantine safely;
- shadow and active decisions can be compared deterministically.

### Camera tests

- correction converges to an absolute pose;
- no additive drift;
- jerk remains below threshold;
- subject retention survives normal phase changes;
- critical overrides remain possible;
- Character Stories never selects an unrelated terrain root.

### Long-session tests

Run fixed seeds for several simulated days and compare baseline, shadow and bounded-active profiles. Activation requires improvement at p50, p95 and worst-case measures, not only average score.

## 24. Migration plan

### Phase 0 — Stabilize current output

- Default to Legacy or V2 Shadow.
- Disable active V2 camera repair.
- Preserve the current implementation as a comparison baseline.

Exit gate: repeatable baseline traces and no startup failures.

### Phase 1 — Author ontology

- Register concerns, satisfiers, methods, phases and dependencies.
- Add integrity validation and Laboratory visualization.

Exit gate: every proposed author action has an ontological route.

### Phase 2 — Prediction-model registry

- Register model descriptors and dependency edges.
- Implement dependency closure and abstention.
- Run models in observation-only mode.

Exit gate: every forecast identifies its complete model/evidence graph.

### Phase 3 — Forecast resolution and calibration

- Resolve outcomes.
- Attribute errors.
- Learn calibration in memory only.

Exit gate: fixed-seed calibration tests are reproducible and bounded.

### Phase 4 — Persistent model learning

- Add versioned profiles, staged writes, checksums and rollback.
- Persist only validated calibration parameters.

Exit gate: profiles survive restart and incompatible versions quarantine.

### Phase 5 — ACSS story planning

- Represent threads as dependency plans.
- Protect required beats and return obligations.
- Keep presentation in shadow mode.

Exit gate: materially fewer skipped outcomes than baseline.

### Phase 6 — Unified presentation contracts

- Remove competing scene decisions.
- Compile camera, narration, captions and highlights from one plan.

Exit gate: narration and visible subjects agree in all deterministic tests.

### Phase 7 — Predictive camera shadowing

- Generate absolute future camera paths without applying them.
- Compare feasibility and smoothness against the active legacy camera.

Exit gate: lower occlusion and jerk with no safety regression.

### Phase 8 — Bounded active camera

- Activate one validated model family at a time.
- Enforce motion, jerk and interruption bounds.

Exit gate: long-session visual metrics improve at p95 and worst case.

### Phase 9 — Production-policy learning

- Learn bounded hold/switch/shot/narration policies.
- Keep a fixed baseline and automatic rollback.

Exit gate: improvements persist across unseen fixed seeds.

### Phase 10 — Operator preference learning

- Incorporate favourites and editorial markers.
- Keep factual and safety constraints immutable.

Exit gate: preferences alter style and subject allocation without reducing truth or safety metrics.

## 25. Activation rule

The new system must not become the default merely because it runs without exceptions. It becomes default only when:

1. Its prediction models are calibrated on held-out seeds.
2. Character Stories excludes unrelated terrain roots.
3. Required beats complete more often than baseline.
4. Camera jerk, occlusion and unnecessary cuts improve.
5. Narration and visible subjects agree.
6. Learning persists reproducibly and rolls back safely.
7. Every decision remains inspectable through its ACSS dependency graph.

## 26. Final architectural decision

The author’s mind is not one weighted list and not one monolithic prediction model. It is a changing selection of small world models arranged into dependency graphs under an explicit ontology of documentary concerns.

At any moment, the author should be able to state:

```text
I am protecting causal completion.
I selected the observe-resource-acquisition method.
That method depends on locomotion, route and target-validity models.
Those models predict contact within this bounded window.
Therefore I am holding a medium tracking shot on this named animal.
I will reframe continuously if occlusion rises.
I will cut only if the prediction invalidates or a more critical irreversible event occurs.
Afterward I will compare the forecast and production result, attribute error, and update only the responsible bounded models.
```

That is the required meaning of an ACSS predictive author that can genuinely learn.
