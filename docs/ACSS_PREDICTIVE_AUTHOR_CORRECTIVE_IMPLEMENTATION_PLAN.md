# ACSS Predictive Documentary Author

## Corrective implementation plan for a genuinely learning, dependency-structured author

### Status

Implementation and automated commissioning completed on 29 July 2026. This
document remains the normative engineering design and acceptance specification.
The requirement-by-requirement evidence is recorded in
`ACSS_PREDICTIVE_AUTHOR_IMPLEMENTATION_REPORT.md`; runtime operation, audience
controls, persistence and recovery are described in
`ACSS_PREDICTIVE_AUTHOR_OPERATIONS.md` and
`ACSS_AUDIENCE_FEEDBACK_OPERATIONS.md`.

The safe installed default remains `V3_SHADOW` with the learning lifecycle set to
`OBSERVING`. `V3_ACTIVE` cannot control the programme in that lifecycle. Bounded
control requires `BOUNDED_ACTIVE`; validated control additionally requires a
checksummed certificate matching the exact profile revision and prediction-model
registry version. The V1/V2 paths are retained as explicit operator recovery
choices, but are isolated from the active V3 observation, decision, camera and
learning transaction. This deliberate recovery provision replaces the destructive
part of the former Phase 10 wording; it does not create mixed camera ownership.

It supersedes the activation and completion claims made for the current `documentary-author-v3` prototype. The earlier architectural document remains useful as the statement of intent, but this document is the executable engineering plan for closing the audited gaps.

The simulation remains the only authority for ecological truth. The documentary author may learn how to predict, observe, frame, explain and edit the simulation. It must never change animal decisions, ecological outcomes or authoritative state.

---

## 1. Required end state

The completed author must implement this causal loop in the stated order:

```text
immutable simulation snapshot and verified events
→ evidence adapters
→ evidence ledger
→ belief revision
→ situation graph
→ documentary concern activation
→ satisfier and method eligibility
→ prediction query generation
→ dependency-closed model selection
→ topologically executed prediction DAG
→ time-bounded forecast ledger
→ candidate documentary dependency plans
→ hard policy filtering
→ expected-utility and continuity decision
→ one unified presentation contract
→ deterministic narration and camera execution
→ authoritative outcome observation
→ forecast-specific resolution
→ component-specific error attribution
→ bounded calibration and policy learning
→ atomic, versioned persistence
```

The author is complete only when a diagnostic can explain a decision in this form:

> Hydration acquisition by entity A is the active situation. Causal completion is the leading documentary concern. The resource-acquisition observation method is eligible. Its behaviour-phase forecast requires locomotion-capacity, route-reachability and target-validity forecasts. Those requirements are supported by evidence E1–E8. The selected ensemble predicts shoreline contact within 24–38 simulation ticks with 0.67 calibrated probability. Holding a medium-wide tracking shot has higher expected documentary value than switching, subject to camera feasibility and the Character Stories policy. Forecast F12 will be resolved against authoritative contact and plan-phase evidence by tick T+38.

That explanation must be generated from stored machine records, not reconstructed from display text.

---

## 2. Audit-to-remediation matrix

| Audit finding | Root cause | Required correction | Activation gate |
|---|---|---|---|
| All models receive one generic success value | No forecast ledger or typed resolver | Resolve each forecast against its declared outcome observer | At least 95% of due forecasts resolve or are explicitly censored |
| Camera snaps after transitions | Two camera state machines own the same pose | Give one executor ownership of transition and hold motion | No discontinuity over configured speed/acceleration/jerk limits |
| Planning precedes beliefs | `planner.choose()` is called before evidence revision | Make observation transaction complete before planning | Planner API accepts a read-only belief/situation snapshot, never raw scenes alone |
| Dependencies are labels only | Models read the same raw context independently | Topological DAG execution with typed dependency outputs | Required output absence forces abstention |
| Calibration does not affect decisions | Reliability only changes irrelevant ordering | Calibrate probability, confidence, eligibility and influence | Artificially degraded model loses selection/influence in tests |
| Shadow mode learns from legacy choices as if ACSS executed them | Proposed and executed decisions share one slot | Maintain separate proposed and executed decision records | No policy update for an unexecuted action |
| Audience novelty is fixed | No proposition-level audience memory | Store presented semantic claims and question state | Repeated unchanged claims become ineligible or silence |
| Presentation contract is partial | Legacy narration and camera remain independent authorities | Contract becomes the only input to narrator and camera planner | Every spoken claim and camera subject references the contract |
| Presets do not constrain V3 | Policy fields are passed but unused | Compile settings into explicit hard and soft policy constraints | Pairwise tests prove every control has its documented effect |
| Event subtype is overwritten | `kind` is reused for container and ecological type | Separate `sceneKind` and `eventType` | Birth/death/attack classification survives end to end |
| Shot evaluation uses fabricated values | No metric accumulator | Measure camera, narration and event coverage continuously | No learning input is filled by an unconditional success default |
| Rollback restores current state | Backup is written from the mutated profile | Atomic previous-current revision rotation | Rollback hash equals the prior committed revision |
| Observe-only still learns | Lifecycle is not enforced at update sites | Central capability matrix gates every mutation | Byte-identical profile before/after observing session |
| Validated mode can be selected manually | Lifecycle is a string, not a guarded transition | Validation certificate required for promotion | UI cannot bypass certificate checks |
| Return obligations never clear | Queue has no completion/removal transition | Typed obligation lifecycle and indexed queue | Resolved/invalid obligations disappear exactly once |
| Learning is absent from session archive | Learning trace stays in memory/localStorage | Write forecasts, resolutions, attribution and profile deltas to timeline | Session audit reconstructs every update |
| Existing validation manufactures success | No authoritative scenario oracle | Fixed-seed and held-out-seed outcome harness | Improvement is demonstrated on unseen seeds without injected rewards |

---

## 3. Non-negotiable invariants

### 3.1 Truth separation

1. Simulation state is read-only to the author.
2. Evidence records are immutable after insertion.
3. Beliefs may be revised, but revisions retain provenance.
4. Forecasts describe uncertainty and never become facts merely because they were selected.
5. Narration may state an outcome only after the corresponding evidence is verified.
6. Learned production preferences cannot modify ecological model state.

### 3.2 Causal learning

1. Every learned update names the exact forecast or executed production decision being evaluated.
2. A model is updated only when its declared outcome was observable within its declared horizon.
3. An interrupted or unobservable forecast is censored, not counted as failure.
4. An unexecuted camera or editorial action receives no direct reward.
5. Model calibration and production-policy learning use separate stores and separate rewards.
6. Operator preferences never modify ecological probabilities.

### 3.3 Dependency correctness

1. A required dependency must be applicable, successfully executed and above its minimum confidence.
2. A required dependency that abstains forces its dependent to abstain.
3. The required/refines graph must be acyclic.
4. Optional supporting models may raise or lower confidence only within declared bounds.
5. Contradictory forecasts remain explicit; they may not be averaged silently.
6. Correlated model outputs share an influence cap.

### 3.4 Production integrity

1. One active presentation contract owns subject selection, narration intent, captions, camera intent and logging.
2. The camera has one physical pose owner.
3. Referenced living entities, carcasses and skeletons use persistent identity links.
4. Character Stories cannot select an unrelated world process as its root situation.
5. World Reality cannot expose private entity state.
6. Ordinary action changes cannot skip required story beats.

### 3.5 Persistence safety

1. The current profile is never overwritten before the previous committed revision is recoverable.
2. Profile loading validates schema, registry compatibility, checksums and bounds.
3. Invalid profiles are quarantined rather than partially applied.
4. Learning can be disabled without disabling observation and logging.
5. A session records which profile revision influenced each decision.

---

## 4. Runtime ownership and timing

The current implementation conflates observation, planning and shot creation inside `beginMovieShot()`. Replace that with four explicit clocks.

### 4.1 Simulation observation clock

Runs after an authoritative simulation tick completes. It receives a frozen documentary snapshot and verified events for that tick.

Responsibilities:

- adapt changed simulation records into evidence;
- revise beliefs;
- update situations;
- resolve due forecasts;
- update story-thread observations;
- queue a planning request when material state changes.

This clock must not move the camera or speak.

### 4.2 Author planning clock

Runs when one of these conditions is true:

- there is no active presentation contract;
- the active contract reaches a reconsideration boundary;
- an admissible critical event arrives;
- a required dependency becomes invalid;
- the active story beat resolves;
- the operator changes a hard policy.

It may run at most once per simulation tick and should normally run much less frequently.

### 4.3 Presentation clock

Runs every rendered frame. It executes the currently committed contract:

- sample the planned camera trajectory;
- apply bounded camera control;
- update entity highlighting;
- manage deterministic speech and captions;
- accumulate real production metrics.

It cannot select an unrelated story. Replanning is requested through a typed break condition.

### 4.4 Learning/persistence clock

Runs after forecast resolution, decision completion or explicit operator feedback. It queues bounded deltas and commits them:

- at safe checkpoints;
- at session end;
- before switching learning lifecycle;
- before applying a new profile revision.

No persistence write may occur on every render frame.

---

## 5. Proposed module layout

Retain `src/documentary-author-v3/` temporarily as a compatibility shell. Build the corrected implementation in a version-neutral package so another rewrite does not require another numbered directory.

```text
src/documentary-author/
├── runtime/
│   ├── author-runtime.js
│   ├── observation-transaction.js
│   ├── planning-transaction.js
│   ├── presentation-session.js
│   └── capability-matrix.js
├── evidence/
│   ├── evidence-schema.js
│   ├── evidence-ledger.js
│   ├── snapshot-adapter.js
│   ├── entity-adapter.js
│   ├── behaviour-adapter.js
│   ├── physiology-adapter.js
│   ├── social-adapter.js
│   ├── reproduction-adapter.js
│   ├── perception-memory-adapter.js
│   ├── resource-adapter.js
│   ├── environment-adapter.js
│   └── event-adapter.js
├── beliefs/
│   ├── belief-schema.js
│   ├── belief-store.js
│   ├── belief-rules.js
│   └── contradiction-index.js
├── situations/
│   ├── situation-schema.js
│   ├── situation-manager.js
│   ├── situation-identity.js
│   └── situation-transitions.js
├── ontology/
│   ├── concern-registry.js
│   ├── satisfier-registry.js
│   ├── method-registry.js
│   ├── eligibility.js
│   └── ontology-integrity.js
├── prediction/
│   ├── model-schema.js
│   ├── model-registry.js
│   ├── dependency-graph.js
│   ├── dependency-executor.js
│   ├── model-selector.js
│   ├── ensemble-builder.js
│   ├── forecast-schema.js
│   ├── forecast-ledger.js
│   ├── forecast-resolver.js
│   ├── outcome-observers.js
│   └── models/
│       ├── state-models.js
│       ├── physiology-models.js
│       ├── behaviour-models.js
│       ├── spatial-models.js
│       ├── danger-models.js
│       ├── social-models.js
│       ├── reproduction-models.js
│       ├── environment-models.js
│       ├── story-models.js
│       ├── audience-models.js
│       └── production-models.js
├── stories/
│   ├── thread-schema.js
│   ├── thread-manager.js
│   ├── dependency-plan.js
│   └── return-obligation-queue.js
├── audience/
│   ├── proposition-memory.js
│   ├── question-ledger.js
│   ├── semantic-fingerprint.js
│   └── information-gain.js
├── planning/
│   ├── policy-compiler.js
│   ├── candidate-plan.js
│   ├── expected-utility.js
│   ├── decision-hysteresis.js
│   ├── plan-selector.js
│   └── presentation-contract.js
├── presentation/
│   ├── contract-validator.js
│   ├── deterministic-narration-adapter.js
│   ├── subject-highlighter.js
│   ├── camera-horizon-planner.js
│   ├── camera-trajectory.js
│   ├── camera-executor.js
│   ├── camera-metric-accumulator.js
│   └── production-outcome.js
├── learning/
│   ├── attribution.js
│   ├── calibration.js
│   ├── probability-calibrator.js
│   ├── policy-learner.js
│   ├── preference-learner.js
│   ├── validation-certificate.js
│   └── learning-coordinator.js
├── persistence/
│   ├── profile-schema.js
│   ├── browser-profile-store.js
│   ├── companion-profile-store.js
│   ├── profile-migration.js
│   └── profile-integrity.js
├── diagnostics/
│   ├── decision-explanation.js
│   ├── model-graph-view.js
│   ├── forecast-report.js
│   └── learning-report.js
└── index.js
```

The existing V2 authored-language and evidence code should be reused through adapters where it is authoritative and tested. Do not duplicate a working evidence schema merely to preserve a V3 name.

---

## 6. Typed data contracts

All records crossing subsystem boundaries must be validated in development and tests. Production builds may use cheaper assertions after schemas are stable.

### 6.1 Documentary snapshot

```js
/** @typedef {Readonly<{
 * schemaVersion: 1,
 * simulationSeed: number,
 * simulationTick: number,
 * ecologicalMinute: number,
 * capturedAtMonotonicMs: number,
 * worldRevision: number,
 * entities: ReadonlyMap<string, DocumentaryEntitySnapshot>,
 * corpses: ReadonlyMap<string, DocumentaryCorpseSnapshot>,
 * cells: ReadonlyMap<string, DocumentaryCellSnapshot>,
 * weatherSystems: readonly DocumentaryWeatherSnapshot[],
 * verifiedEvents: readonly VerifiedSimulationEvent[]
 * }>} DocumentarySnapshot */
```

The snapshot adapter must copy or structurally share immutable values. It must not hand mutable simulation objects to learning code.

### 6.2 Evidence record

```js
{
  evidenceId: "evidence-...",
  schemaVersion: 1,
  sourceKind: "ENTITY_STATE" | "VERIFIED_EVENT" | "ENVIRONMENT_STATE" | "MEMORY_RECORD",
  predicate: "entity.plan.phase",
  subjectIds: ["animal-17"],
  object: { methodId: "drink-confirmed-shoreline", phase: "travel" },
  epistemicClass: "AUTHORITATIVE" | "OBSERVED" | "INFERRED" | "REPORTED_MEMORY",
  confidence: 1,
  validFromTick: 9821,
  validUntilTick: null,
  observedAtTick: 9821,
  causalEventIds: ["event-..."],
  fingerprint: "sha256-or-stable-key",
  sourcePath: "animals[17].needDependencyPlan.phase"
}
```

`sourcePath` is diagnostic metadata. Runtime logic must use typed predicates, not parse source paths.

### 6.3 Belief revision

```js
{
  beliefId: "belief-...",
  semanticKey: "entity.plan.phase|animal-17",
  predicate: "entity.plan.phase",
  subjectIds: ["animal-17"],
  value: { methodId: "drink-confirmed-shoreline", phase: "travel" },
  confidence: 1,
  evidenceIds: ["evidence-..."],
  revision: 12,
  validFromTick: 9821,
  validUntilTick: null,
  supersedesBeliefId: "belief-previous",
  contradictionIds: []
}
```

Belief identity must be based on predicate and complete semantic role set. JSON shallow sorting is insufficient for nested objects; use a recursive stable canonicalizer.

### 6.4 Situation

```js
{
  situationId: "situation-...",
  type: "RESOURCE_ACQUISITION",
  participantRoles: {
    actor: ["animal-17"],
    target: ["water-cell-42"],
    dependants: ["animal-31"],
    threats: []
  },
  identityKey: "RESOURCE_ACQUISITION|actor:animal-17|method:drink-confirmed-shoreline",
  state: "DEVELOPING",
  methodId: "drink-confirmed-shoreline",
  methodPhase: "travel",
  beliefIds: ["belief-..."],
  openedAtTick: 9700,
  lastMaterialChangeTick: 9821,
  lastObservedTick: 9821,
  resolvedAtTick: null,
  resolution: null,
  importanceComponents: {
    rarity: 0.1,
    survival: 0.7,
    causalDepth: 0.8,
    characterContinuity: 0.6
  }
}
```

Situation identity must not depend only on the first participant. Role ordering is canonical; member ordering is sorted.

### 6.5 Model descriptor

```js
{
  modelId: "behaviour.resource-acquisition.phase-transition.v2",
  registryVersion: 2,
  family: "BEHAVIOUR",
  predicts: "METHOD_PHASE_TRANSITION",
  scope: ["RESOURCE_ACQUISITION"],
  queryTypes: ["NEXT_PHASE", "RESOLUTION_WINDOW"],
  requiredEvidence: [
    { predicate: "entity.plan.phase", minimumConfidence: 0.95, maximumAgeTicks: 1 }
  ],
  dependencies: [
    { modelId: "physiology.locomotion-capacity.v2", relation: "REQUIRES", output: "locomotion" },
    { modelId: "space.route-reachability.v2", relation: "REQUIRES", output: "route" },
    { modelId: "resource.target-validity.v2", relation: "CONDITIONS", output: "target" }
  ],
  outcomeSchema: "categorical:method-phase-transition-v1",
  horizon: { minimumTicks: 1, maximumTicks: 60 },
  calibrationContext: ["speciesId", "methodId", "phase", "conditionBand"],
  correlationGroup: "resource-acquisition-plan",
  costUnits: 3,
  maximumInfluence: 0.24,
  abstainBelowConfidence: 0.55,
  applicable(query, beliefs) {},
  predict({ query, beliefs, dependencyOutputs, calibration }) {},
  observeOutcome({ forecast, evidenceDelta, snapshot }) {}
}
```

### 6.6 Model execution result

```js
{
  modelId: "...",
  status: "PREDICTED" | "ABSTAINED" | "INELIGIBLE" | "DEPENDENCY_FAILED",
  output: {
    outcomes: [
      { id: "ADVANCE_PHASE", rawProbability: 0.62, calibratedProbability: 0.57 },
      { id: "HOLD_PHASE", rawProbability: 0.28, calibratedProbability: 0.31 },
      { id: "INTERRUPTED", rawProbability: 0.10, calibratedProbability: 0.12 }
    ],
    values: { expectedTransitionTicks: 18, interval: [9, 34] }
  },
  confidence: 0.73,
  evidenceIds: ["..."],
  dependencyForecastIds: ["..."],
  correlationFingerprint: "...",
  abstentionReason: null
}
```

### 6.7 Forecast record

```js
{
  forecastId: "forecast-...",
  modelId: "...",
  modelVersion: 2,
  ensembleId: "ensemble-...",
  queryId: "query-...",
  situationId: "situation-...",
  issuedAtTick: 9821,
  observableFromTick: 9822,
  expiresAtTick: 9881,
  outcomes: [/* calibrated categorical distribution */],
  continuousPredictions: {
    transitionTick: { mean: 9839, lower: 9830, upper: 9855 }
  },
  evidenceIds: ["..."],
  dependencyForecastIds: ["..."],
  profileRevision: 27,
  status: "OPEN",
  resolution: null
}
```

### 6.8 Forecast resolution

```js
{
  resolutionId: "resolution-...",
  forecastId: "forecast-...",
  status: "RESOLVED" | "CENSORED" | "EXPIRED_UNOBSERVABLE" | "INVALIDATED",
  resolvedAtTick: 9838,
  observedOutcome: "ADVANCE_PHASE",
  observationEvidenceIds: ["evidence-..."],
  probabilityAssigned: 0.57,
  brierScore: 0.21,
  logLoss: 0.56,
  continuousErrors: { transitionTick: -1 },
  attributionWeight: 1,
  censorReason: null
}
```

### 6.9 Presentation contract

The contract is the only production instruction accepted by the live presenter.

```js
{
  contractId: "contract-...",
  decisionId: "decision-...",
  profileRevision: 27,
  situationId: "situation-...",
  threadId: "thread-...",
  concernId: "causal_completion",
  satisfierId: "hold-developing-thread",
  methodId: "observe-resource-acquisition",
  beatId: "development",
  subjectRoles: {
    primary: ["animal-17"],
    secondary: ["animal-31"],
    contextual: ["water-cell-42"]
  },
  forecastIds: ["forecast-..."],
  evidenceIds: ["evidence-..."],
  narration: {
    mode: "DETERMINISTIC",
    function: "DEVELOPMENT",
    allowedClaimIds: ["claim-..."],
    forbiddenClaimIds: [],
    questionIds: ["question-..."],
    maximumSentences: 4,
    requireNovelInformation: true,
    voiceEnabled: true,
    captionsEnabled: true
  },
  camera: {
    intention: "TRACK_CAUSAL_ACTION",
    primarySubjects: ["animal-17"],
    secondarySubjects: ["animal-31"],
    predictedActionZone: { x: 12.4, z: -8.1, radius: 4.2 },
    allowedFamilies: ["tracking", "still", "push-in"],
    preferredSizes: ["MEDIUM_WIDE", "MEDIUM"],
    minimumHoldSeconds: 8,
    preferredHoldSeconds: 13,
    maximumSpeed: 12,
    maximumAcceleration: 18,
    maximumJerk: 35,
    breakConditions: ["CRITICAL_EVENT", "ALL_PRIMARY_SUBJECTS_LOST", "POSE_INVALID"]
  },
  highlight: {
    livingEntityIds: ["animal-17", "animal-31"],
    remainsIdentityIds: []
  },
  reconsiderAt: {
    earliestRecordingMs: 8000,
    latestRecordingMs: 16000,
    simulationTick: 9855
  }
}
```

---

## 7. Evidence acquisition before planning

### 7.1 Replace scene-first planning

`movieSceneCandidates()` may continue to produce visual candidates during migration, but it must not be the author’s primary evidence source. Candidate scenes are possible views, not facts.

Implement `captureDocumentarySnapshot(sim)` in `snapshot-adapter.js`. It should expose all documentary-relevant state through bounded typed summaries:

- identity, name, species, age, sex and lineage;
- living, carcass and skeleton identity continuity;
- action state and action target;
- active ACSS need, satisfier, method and phase;
- plan prerequisites, blockers and reconsideration reasons;
- energy substrates, endurance, sprint capacity, fatigue, recovery depth and adrenaline state;
- hydration, gut contents, body condition, pregnancy and lactation;
- expression, posture, emitted calls and visible condition cues;
- current perception contacts and provenance-limited memory;
- family, group, friendship, dominance and mating relationships;
- mate preferences and compatibility evidence without predicting unsupported acceptance;
- route, destination, locomotion and movement constraints;
- water, biomass, terrain, scent, weather and temperature;
- births, deaths, attacks, mating stages and other verified transitions.

Adapters must be incremental. Each adapter receives the previous snapshot revision and emits records only for changed semantic values or explicit events.

### 7.2 Preserve event subtype

Change event construction in `src/app.js` from the ambiguous shape:

```js
{ kind: "ecosystem-event", ... }
```

to:

```js
{
  sceneKind: "VERIFIED_EVENT",
  eventType: "BIRTH" | "DEATH" | "ATTACK" | "CONCEPTION" | "MATING" | "MATURATION",
  eventId,
  subjectRoles,
  importance,
  occurredAtTick,
  evidenceIds
}
```

The UI may derive a display `kind`, but author logic must use `eventType`.

### 7.3 Observation transaction

All evidence for tick `T` must be committed as one transaction:

```js
function observeTick(snapshot) {
  const transaction = evidenceLedger.begin(snapshot.simulationTick);
  for (const adapter of adapters) transaction.addAll(adapter.observe(snapshot));
  const evidenceDelta = transaction.commit();
  const beliefDelta = beliefStore.revise(evidenceDelta);
  const situationDelta = situationManager.update({ snapshot, beliefDelta });
  const resolutions = forecastResolver.resolveDue({ snapshot, evidenceDelta, beliefDelta });
  storyManager.observe({ snapshot, situationDelta, resolutions });
  return Object.freeze({ evidenceDelta, beliefDelta, situationDelta, resolutions });
}
```

If an adapter throws, abort that adapter’s records and log a diagnostic. Do not partially insert malformed records.

---

## 8. Belief revision and contradiction handling

### 8.1 Revision rules

For each semantic key:

1. Expire the previous belief if its evidence validity ended.
2. Compare canonical typed values.
3. If unchanged, refresh observation time without creating semantic novelty.
4. If changed compatibly, create a superseding revision.
5. If contradictory, preserve both claims and create a contradiction record.
6. Resolve the contradiction only through evidence precedence, expiry or an explicit interpretation rule.

Authoritative current state outranks inferred state. A remembered predator location does not contradict a current absence unless both claims describe the same time and observation scope.

### 8.2 Belief views

Provide immutable query views:

```js
beliefs.forSubject(entityId)
beliefs.match({ predicate, subjectIds, atTick })
beliefs.dependenciesFor(situationId)
beliefs.changedSince(revision)
beliefs.contradictionsFor(semanticKey)
```

Planning receives a `BeliefSnapshot` with a fixed revision. It cannot observe half of a later tick.

---

## 9. Situation identity and persistence

### 9.1 Situation constructors

Implement typed constructors for at least:

- resource acquisition;
- recovery;
- danger response;
- predation sequence;
- social approach/conflict/care;
- reproduction stage;
- group migration or separation;
- death and bereavement consequence;
- environmental process;
- lifecycle transition;
- unresolved question;
- character biography development.

### 9.2 Identity rules

A situation key contains:

```text
situation type
+ canonical semantic roles
+ authoritative method or process identity
+ bounded spatial/process identity when relevant
```

It must not contain volatile display text, current action label or the first member of an unordered list.

### 9.3 State machine

```text
DISCOVERED
→ DEVELOPING
→ OUTCOME_PENDING
→ RESOLVED
→ CONSEQUENCE_AVAILABLE
→ ARCHIVED

Any nonterminal state
→ DORMANT
→ RETURN_READY
→ previous nonterminal state

Any state
→ INVALIDATED
```

Transitions require evidence predicates. Time alone may make a situation dormant, but it cannot invent resolution.

---

## 10. Concern, satisfier and method selection

The current implementation always raises `operator_intent` because `operatorConstraint` is always true. Replace the single sorted pressure list with eligibility plus deficit evaluation.

### 10.1 Concern activation

For concern `c` at time `t`:

```text
Pressure(c,t) = Criticality(c)
              × Deficit(c,t)
              × Urgency(c,t)
              × Observability(c,t)
```

All factors are in `[0,1]`.

- `Deficit` measures how poorly the concern is currently satisfied.
- `Urgency` measures deadline or irreversible-outcome pressure.
- `Observability` prevents selecting a concern with no filmable evidence.
- A hard constraint such as truth integrity is enforced separately and does not need to win a score every cycle.

`operator_intent` should activate only when a plan conflicts with an explicit setting or manual request. It should not permanently dominate the author’s mind.

### 10.2 Method eligibility

Methods must be chosen from actual situation and belief state. Do not infer the documentary method from regular expressions over `actionKey`.

Example mapping:

```js
if (situation.type === "RESOURCE_ACQUISITION" &&
    beliefs.has("entity.plan.method", situation.actorIds)) {
  eligibleMethods.add("observe-resource-acquisition");
}
```

The simulation’s internal plan method becomes evidence; the documentary method remains the author’s method. Their relationship is explicit rather than based on similar names.

### 10.3 Method dependency plan

```js
{
  documentaryMethodId: "observe-resource-acquisition",
  situationId,
  phases: [
    { id: "establish", prerequisites: ["identity-visible"], completion: ["subject-established"] },
    { id: "cause", prerequisites: ["need-evidence"], completion: ["cause-communicated"] },
    { id: "development", prerequisites: ["phase-forecast"], completion: ["material-phase-change"] },
    { id: "outcome", prerequisites: ["outcome-evidence"], completion: ["outcome-shown-or-logged"] },
    { id: "consequence", prerequisites: ["consequence-claim"], completion: ["consequence-presented"] },
    { id: "release", prerequisites: [], completion: ["thread-releasable"] }
  ]
}
```

Phase completion must be recorded. The planner cannot advance merely because a timer ended.

---

## 11. Operational dependency semantics

### 11.1 Required graph construction

For each root query:

1. Find applicable root-model candidates.
2. Expand `REQUIRES` and `REFINES` transitively.
3. Reject missing, inapplicable or cyclic required dependencies.
4. Add eligible `CONDITIONS`, `SUPPORTS`, `OBSERVES` and `EXPLAINS` models within the cost budget.
5. Apply `SUPERSEDES` before execution.
6. Retain `CONTRADICTS` pairs explicitly.
7. Apply `INHIBITS` as a bounded influence reduction or hard contraindication according to the edge descriptor.
8. Topologically sort the executable DAG.

An edge must specify its output binding:

```js
{
  modelId: "physiology.locomotion-capacity.v2",
  relation: "REQUIRES",
  output: "locomotion",
  minimumConfidence: 0.6
}
```

### 11.2 Topological execution

```js
for (const node of graph.topologicalOrder) {
  const dependencyOutputs = {};
  for (const edge of node.dependencies) {
    const result = execution.get(edge.modelId);
    if (edge.relation === "REQUIRES" &&
        (!result || result.status !== "PREDICTED" || result.confidence < edge.minimumConfidence)) {
      execution.set(node.modelId, dependencyFailure(node, edge, result));
      continue outer;
    }
    dependencyOutputs[edge.output] = result?.output;
  }
  execution.set(node.modelId, node.predict({
    query,
    beliefs,
    situation,
    dependencyOutputs,
    calibration: calibration.view(node.modelId, query.context)
  }));
}
```

This is the central change that turns the dependency graph from documentation into computation.

### 11.3 Selection score

Candidate model score before closure:

```text
S(m|q) = 0.24 Rel(m,q)
       + 0.20 EvidenceQuality(m,q)
       + 0.18 CalibrationReliability(m,q)
       + 0.14 Specificity(m,q)
       + 0.12 ExpectedInformationGain(m,q)
       + 0.08 Observability(m,q)
       + 0.04 DiversityContribution(m,E)
       - 0.10 NormalizedCost(m)
       - 0.20 ConflictRisk(m,E)
```

Weights are initial policy constants, not learned ecological facts. They may later receive bounded production-policy adjustment.

### 11.4 Ensemble constraints

Select the ensemble under:

```text
maximize Σ selected S(m|q)
subject to:
  required closure complete
  total cost ≤ query budget
  correlation-group influence ≤ group cap
  hard policy constraints satisfied
  at least one outcome observer available
  root model does not abstain
```

A deterministic bounded branch-and-bound search is sufficient because the candidate set per query should remain small. A stable greedy closure selector may be used initially if it is proven equivalent for the registered graph sizes.

---

## 12. Model families and exact initial responsibilities

Do not activate all families simultaneously. Implement and calibrate them in the following dependency order.

### 12.1 Foundation models

1. `state.identity-continuity.v2`
   - predicts whether the same individual/remains identity will be available;
   - reads living/corpse/skeleton identity evidence;
   - resolves on identity continuity or removal.

2. `state.evidence-freshness.v2`
   - predicts whether required evidence remains within validity;
   - resolves deterministically from timestamps.

3. `space.subject-trajectory.v2`
   - predicts a bounded position distribution, not one point;
   - reads authoritative velocity, destination, route and movement state;
   - outputs mean path plus uncertainty radius per horizon step.

4. `camera.frameability.v2`
   - consumes trajectory distributions;
   - predicts containment and expected required shot size;
   - resolves from measured frame containment.

### 12.2 Physiology and plan models

5. `physiology.locomotion-capacity.v2`
   - consumes endurance, muscle substrate, fatigue, recovery and emergency reserve;
   - predicts sustainable pace band and probability of recovery insertion;
   - never describes energy as being created by adrenaline.

6. `resource.target-validity.v2`
   - consumes target existence, accessibility, ownership, depletion and memory provenance;
   - predicts remain-valid/change/invalid.

7. `space.route-reachability.v2`
   - consumes navmesh route result and boundary state;
   - predicts reachable/blocked/replan with an ETA interval.

8. `behaviour.method-phase-transition.v2`
   - requires locomotion and route outputs;
   - conditions on target validity and threat interruption;
   - predicts explicit next plan-phase outcomes.

### 12.3 Event-specific models

9. `danger.response.v2`
10. `predation.contact-window.v2`
11. `social.interaction-response.v2`
12. `reproduction.stage-transition.v2`
13. `recovery.resume-window.v2`
14. `environment.process-change.v2`

Each must declare a separate outcome observer. Generic shot completion cannot resolve them.

### 12.4 Documentary models

15. `story.beat-opportunity.v2`
   - consumes world-model forecasts and current thread plan;
   - predicts whether a required beat becomes observable.

16. `audience.information-gain.v2`
   - consumes candidate proposition fingerprints and audience memory;
   - predicts new/reinforcing/duplicate/overloading.

17. `camera.occlusion-risk.v2`
   - consumes predicted trajectory, terrain, vegetation and candidate pose path;
   - predicts visibility distribution.

18. `production.hold-switch-value.v2`
   - consumes story, audience and camera forecasts;
   - predicts production consequences of holding versus switching;
   - produces no ecological prediction.

The distinction between world models and production models is mandatory in attribution and persistence.

---

## 13. Forecast lifecycle and outcome resolution

### 13.1 Lifecycle

```text
PROPOSED
→ OPEN
→ RESOLVED

OPEN → CENSORED
OPEN → INVALIDATED
OPEN → EXPIRED_UNOBSERVABLE
```

Only `RESOLVED` forecasts train predictive calibration.

### 13.2 Outcome observer registry

Register observers by outcome schema:

```js
outcomeObservers.register("method-phase-transition-v1", {
  observe(forecast, observation) {
    const phase = observation.beliefs.get("entity.plan.phase", forecast.subjectIds);
    if (!phase) return { status: "UNOBSERVABLE" };
    if (phase.value.methodId !== forecast.context.methodId) {
      return { status: "RESOLVED", outcome: "INTERRUPTED" };
    }
    if (phase.value.phase !== forecast.context.phase) {
      return { status: "RESOLVED", outcome: "ADVANCE_PHASE" };
    }
    if (observation.tick >= forecast.expiresAtTick) {
      return { status: "RESOLVED", outcome: "HOLD_PHASE" };
    }
    return { status: "PENDING" };
  }
});
```

### 13.3 Censoring

Censor rather than fail when:

- the simulation is reset or loaded;
- the subject is removed outside the model’s declared scope;
- a critical unrelated event prevents observation;
- the operator exits Cinema Mode before the observable horizon;
- required evidence becomes inaccessible due to policy;
- an adapter failure makes the outcome unknown.

Death is not automatically censoring. If a model includes death/interruption in its outcome vocabulary, death can resolve it.

### 13.4 Metrics

For categorical distribution `p` and observed one-hot outcome `y`:

```text
Brier = Σ_k (p_k - y_k)²
LogLoss = -log(max(ε, p_observed))
```

For binary calibration bucket:

```text
α' = α + w·y
β' = β + w·(1-y)
```

For categorical outcome probabilities, use a Dirichlet vector:

```text
α'_k = α_k + w·1[k = observed]
```

For continuous estimates, maintain count, weighted mean error, weighted mean absolute error, Welford variance and bounded quantile sketches.

`w` is attribution weight in `[0,1]`; it is not a generic shot-quality score.

---

## 14. Making calibration affect prediction

Calibration must change future behavior conservatively.

### 14.1 Probability shrinkage

For categorical raw probability `p_k`, empirical calibrated estimate `q_k`, reliability `r` and sample-confidence `n`:

```text
λ = r × min(1, n / N_full)
p'_k = normalize((1-λ)·p_k + λ·q_k)
```

Before enough samples exist, probabilities remain near authored priors. A poorly calibrated model shrinks toward the uninformative distribution or an applicable parent model.

### 14.2 Eligibility gates

```text
OBSERVING: authored model may forecast; no parameters mutate
CALIBRATING: probabilities calibrate; output remains shadow-only
SHADOW_POLICY: calibrated world forecasts may inform proposed decisions; policy updates only from executed baseline actions where attribution is valid
BOUNDED_ACTIVE: certified model families may influence live output within caps
VALIDATED_ACTIVE: held-out certificate permits broader registered influence
```

Lifecycle is tracked per model family and per policy component. There is no global assumption that all models mature together.

### 14.3 Abstention from poor performance

A model is quarantined for a context when all are true:

- minimum sample threshold met;
- Brier score exceeds the registered failure boundary;
- confidence interval excludes the acceptable threshold;
- an eligible parent or fallback exists.

Quarantine is reversible after offline validation or registry revision. It is not silently forgotten.

---

## 15. Story threads as dependency plans

### 15.1 Thread key

```text
thread type
+ situation identity
+ canonical role set
+ documentary method
```

Do not key a group thread only by its first member.

### 15.2 Beat completion

Each beat declares evidence and presentation completion separately:

```js
{
  beatId: "outcome",
  evidenceCondition: { predicate: "resource.contact", subjectRole: "actor" },
  presentationCondition: "OUTCOME_VISUALLY_SHOWN_OR_FACTUALLY_NARRATED",
  status: "PENDING" | "EVIDENCE_READY" | "PRESENTED" | "SKIPPED_WITH_REASON"
}
```

Timers create reconsideration opportunities; they do not complete beats.

### 15.3 Return obligations

Use an indexed priority queue with this lifecycle:

```text
CREATED → ELIGIBLE → SELECTED → FULFILLED
                    ↘ INVALIDATED
CREATED/ELIGIBLE → EXPIRED
```

On `FULFILLED`, `INVALIDATED` or `EXPIRED`:

- remove from the queue index;
- clear the thread flag;
- record a terminal reason exactly once.

Priority is based on unresolved causal value, outcome deadline, character importance and time away—not insertion order alone.

---

## 16. Audience memory and semantic repetition

### 16.1 Proposition-level memory

When deterministic narration is realised, store:

```js
{
  semanticFingerprint,
  propositionId,
  subjectIds,
  predicate,
  normalizedArguments,
  communicatedAtMs,
  communicatedAtTick,
  epistemicClass,
  threadId,
  wordingFamily,
  visualSupport,
  materialRevision
}
```

### 16.2 Novelty

For candidate proposition `p`:

```text
Novelty(p) = 1
           - SemanticSimilarity(p, recentMemory)
           + MaterialChangeBonus(p)
           + DelayedRecallBonus(p)
           + ResolutionBonus(p)
```

Clamp to `[0,1]` after applying terms.

The same fact with different wording remains duplicate. A changed value, new causal relationship, resolved question or newly visible consequence can make the subject narratable again.

### 16.3 Questions and hypotheses

Questions have states:

```text
OPEN → EVIDENCE_DEVELOPING → ANSWERABLE → ANSWERED
OPEN/DEVELOPING → EXPIRED_UNRESOLVED
```

Hypotheses must name supporting evidence, disconfirming evidence and a resolution predicate. They are never upgraded to fact because they were narrated.

### 16.4 Silence

Silence is an explicit candidate plan with positive value when:

- no material proposition is new;
- narration load is high;
- the image clearly communicates the beat;
- a predicted outcome is imminent;
- speech would overlap another voice.

---

## 17. Hard policy compiler

Compile UI settings into a `DocumentaryPolicy` before planning.

### 17.1 Character Stories

Hard constraints:

- root situation must contain identified entity roles;
- a world process may appear only through a causal dependency edge;
- private state narration follows the selected information lens;
- remains retain the deceased entity identity.

Continuity mapping:

- `off`: no incumbent bonus and no elective return obligation;
- `prefer`: bounded incumbent bonus and normal return obligations;
- `strong`: larger but capped incumbent bonus, protagonist allocation and stronger interruption hysteresis.

### 17.2 World Reality

Hard constraints:

- root situation is environmental;
- private entity beliefs are unavailable to models and narration;
- incidental animals may be visually present but are not semantic narration subjects;
- world-process models must have actual changed evidence, not generic terrain availability.

### 17.3 Full Laboratory

- every evidence family may be eligible;
- relevance and causal dependency are still mandatory;
- no data is narrated merely because it exists;
- channel overrides change eligibility or preference explicitly.

### 17.4 Event priority

- `quiet`: only irreversible or extremely rare events interrupt;
- `balanced`: verified critical events and high-value resolution windows interrupt;
- `events`: lower event threshold, but truth and camera safety remain hard constraints.

### 17.5 Camera and narration settings

Shot subject, motion, length, captions, voice and deterministic narration settings must compile into contract constraints. They must not be reapplied independently after the contract is selected.

---

## 18. Decision formation

### 18.1 Candidate plans

Generate plans from eligible documentary methods, not directly from scene candidates. A plan contains:

- concern and satisfier;
- documentary method and executable phase;
- situation/thread;
- selected model ensemble;
- forecasted documentary outcomes;
- proposed narration function;
- proposed camera intention;
- required beat and completion rule;
- cost, risk and hard-constraint result.

### 18.2 Expected utility

For action `a`, model outcomes `o`, concerns `c`:

```text
EU(a) = Σ_o P(o | ensemble) × Σ_c W_c × ΔSatisfaction(c,a,o)
      + InformationGain(a)
      + ContinuityValue(a)
      + OperatorPreference(a)
      - CameraRisk(a)
      - InterruptionCost(a)
      - RepetitionCost(a)
      - ProductionCost(a)
```

Hard constraints are evaluated before utility. A high score cannot legalize an unsupported claim or invalid camera pose.

### 18.3 Hysteresis

Switch from incumbent plan `i` to challenger `j` only if:

```text
EU(j) - EU(i) > BaseMargin
                  + ProtectedBeatPenalty(i)
                  + SpeechPenalty(i)
                  + RecentSwitchPenalty
```

Critical irreversible events use a separate override rule and create a return obligation for the interrupted thread when appropriate.

### 18.4 Determinism

For identical snapshot revision, profile revision, policy and seed, planning must return the same plan. Any tie-breaking random stream must be explicit, seeded and logged.

---

## 19. Unified deterministic narration

The LLM overview prototype remains untouched, as requested. ACSS controls only deterministic live documentary narration in this phase.

### 19.1 Contract-to-narration adapter

Change `composeAdaptiveDocumentaryNarration(context)` so its primary entry point accepts:

```js
composeContractNarration({
  contract,
  claimStore,
  audienceMemory,
  deterministicLanguageLibrary,
  entityIdentityStore
})
```

The adapter may reuse the extensive deterministic phrase inventory, but it must:

- realize only `allowedClaimIds`;
- respect `maximumSentences`;
- fulfil the contract’s narration function;
- preserve epistemic language;
- name/highlight the contract’s semantic subjects;
- return proposition fingerprints;
- mark memory only after actual presentation;
- choose silence when the contract requests silence.

### 19.2 Validation

Before speech:

1. Verify every claim ID still has valid evidence.
2. Verify entity/remains identities exist.
3. Verify no private channel violates policy.
4. Verify no resolved outcome is described as pending or vice versa.
5. Verify semantic novelty or explicit recap permission.
6. Verify sentence and timing limits.

If validation fails, use a contract-compatible deterministic fallback or silence. Do not silently fall back to unrelated narration.

---

## 20. Predictive camera planning

### 20.1 Remove dual ownership

The legacy transition interpolator and V3 executor must not both write the final pose. Introduce `CameraPresentationSession` as the sole owner from contract activation until completion.

At contract activation:

```js
cameraSession.begin({
  actualPose: readCameraPose(camera, controls),
  contract,
  predictedSubjectPaths,
  worldGeometryView,
  startedAtMs
});
```

Every frame:

```js
const pose = cameraSession.step({ nowMs, deltaSeconds, actualSubjects, terrain });
applyCameraPose(camera, controls, pose);
```

There is no separate `lerpVectors(startCamera, desiredPosition, blend)` afterward.

### 20.2 Horizon planner

Plan over a short horizon, for example 2–6 seconds sampled at 0.25-second intervals.

For candidate camera state sequence `X = {x_0 ... x_H}`:

```text
J(X) = Σ_t [
    w_f FrameError(x_t, predictedSubjects_t)
  + w_o OcclusionRisk(x_t)
  + w_g GroundRisk(x_t)
  + w_l LensChangeCost(x_t)
  + w_v VelocityCost(x_t)
  + w_a AccelerationCost(x_t)
  + w_j JerkCost(x_t)
  + w_i IntentionMismatch(x_t, contract)
] + w_T TerminalError(x_H)
```

Choose the feasible candidate with minimum `J`. Candidate generation remains deterministic and bounded. Full nonlinear optimization is unnecessary.

### 20.3 Predicted action zone

The zone influences:

- target look-ahead;
- shot-size selection;
- safe lead room;
- camera-side choice;
- whether to hold or reposition;
- predicted exit from frame.

It must not replace actual subject tracking. Blend prediction toward observation as time advances:

```text
Target_t = (1-λ_t)·ObservedCentroid_t + λ_t·PredictedCentroid_t
```

with bounded `λ_t` derived from forecast confidence and horizon distance.

### 20.4 Motion limits

Use contract-specific limits. The contract’s maximum jerk cannot remain diagnostic-only.

Enforce:

```text
|velocity| ≤ Vmax
|acceleration| ≤ Amax
|acceleration_t - acceleration_(t-1)| / Δt ≤ Jmax
```

When a new target would violate limits, extend convergence time or select a safe cut if the policy permits. Do not exceed bounds to catch up.

### 20.5 Repair hierarchy

1. Adjust look-ahead within the same pose family.
2. Widen within the permitted shot-size range.
3. Move laterally within the same side and thread.
4. Recalculate the remaining horizon.
5. Switch permitted camera family without changing story.
6. Use a thread-preserving safe camera.
7. Break the contract only for a declared break condition.

### 20.6 Camera metrics

Accumulate time-weighted metrics:

```js
{
  sampleDurationMs,
  visibilityIntegral,
  containmentIntegral,
  compositionIntegral,
  occlusionDurationMs,
  invalidPoseDurationMs,
  distanceErrorIntegral,
  maximumSpeed,
  maximumAcceleration,
  maximumJerk,
  discontinuityCount,
  subjectLossCount,
  predictedZoneError
}
```

Finalize means by dividing integrals by actual sampled duration. These measured values feed production evaluation.

---

## 21. Correct shadow mode

Maintain two records:

```js
{
  proposedDecision: acssDecision,
  executedDecision: legacyOrAcssDecision,
  executionOwner: "LEGACY" | "ACSS",
  sharedWorldForecastIds: [],
  productionForecastIds: []
}
```

Rules:

- World forecasts may resolve from authoritative outcomes regardless of which director was on air, if the camera action did not causally affect observability.
- ACSS production-policy actions learn only when `executionOwner === "ACSS"` and the action was executed.
- Legacy action outcomes may train a separate baseline model.
- The system may compare predicted quality of an unexecuted action with observed baseline quality for diagnostics, but it cannot treat that comparison as direct reward.
- A shadow plan must not be replaced merely because the legacy director chose another scene.

Log both decisions with the same observation revision so offline comparison is possible.

---

## 22. Component-specific outcome attribution

Use an attribution graph rather than one list of error labels.

```text
world forecast error
├── evidence adapter
├── belief interpretation
├── dependency selection
├── responsible world model
└── outcome observer

production decision error
├── concern/method selection
├── expected-utility policy
├── story continuity policy
├── narration realization
├── camera horizon planning
├── camera physical execution
└── external interruption
```

An attribution record contains component IDs, causal confidence, update permission and weight.

Example:

```js
{
  evaluatedId: "forecast-42",
  components: [
    { id: "space.subject-trajectory.v2", role: "MODEL", weight: 0.8, update: true },
    { id: "camera.frameability.v2", role: "DEPENDENT_MODEL", weight: 0.5, update: true },
    { id: "camera-executor", role: "EXECUTION", weight: 0, update: false }
  ],
  externalCauses: [],
  explanation: "Subject path diverged before the predicted frame boundary"
}
```

Unsupported narration updates the narrator/claim selector, not the animal behavior model. Camera occlusion caused by a poor pose updates camera planning or execution, not the ecological trajectory model unless the trajectory itself was wrong.

---

## 23. Learning lifecycle and capability matrix

Implement a central capability matrix:

| Lifecycle | Record evidence | Open/resolve forecasts | Mutate calibration | Propose policy | Mutate policy | Control live output |
|---|---:|---:|---:|---:|---:|---:|
| `OBSERVING` | yes | yes | no | no | no | no |
| `CALIBRATING` | yes | yes | yes | no | no | no |
| `SHADOW_POLICY` | yes | yes | yes | yes | only from causally valid executed baselines | no |
| `BOUNDED_ACTIVE` | yes | yes | certified families only | yes | bounded | certified actions only |
| `VALIDATED_ACTIVE` | yes | yes | yes | yes | bounded | validated registered scope |

Every mutation calls `capabilities.require("MUTATE_CALIBRATION", context)`. Do not scatter lifecycle string checks.

### 23.1 Validation certificate

```js
{
  certificateId,
  profileRevision,
  registryVersion,
  trainingSeedSetHash,
  heldOutSeedSetHash,
  evaluatedAtUtc,
  modelFamilyResults,
  documentaryMetrics,
  cameraMetrics,
  safetyViolations,
  approvedCapabilities,
  checksum
}
```

`VALIDATED_ACTIVE` requires a valid certificate matching the loaded registry and profile revision. The UI displays it but cannot fabricate it.

---

## 24. Persistence and rollback

### 24.1 Storage architecture

Use two layers:

1. Browser IndexedDB for low-latency profile access and offline operation.
2. Documentary companion storage for versioned durable profiles and session learning logs when connected.

LocalStorage may retain only the selected profile ID and lightweight UI preference. It is not the primary learning database.

### 24.2 Profile layout

```text
DocumentaryProfiles/
└── default/
    ├── manifest.json
    ├── revisions/
    │   ├── 000001.json
    │   ├── 000002.json
    │   └── 000003.json
    ├── certificates/
    ├── quarantine/
    └── current.json
```

Each immutable revision contains:

- schema and registry versions;
- parent revision and checksum;
- calibration parameters;
- policy parameters;
- operator preferences;
- lifecycle per family;
- training data summary;
- bounds and validation state.

### 24.3 Atomic commit

```text
1. Read and validate current revision R.
2. Apply bounded deltas in memory to form R+1.
3. Serialize canonical R+1.
4. Compute checksum.
5. Write immutable revision R+1.
6. Read back and verify checksum/schema/bounds.
7. Atomically update current pointer from R to R+1.
8. Retain R as immediate rollback target.
```

Rollback changes the current pointer to a validated earlier immutable revision. It never constructs a backup from the already-mutated object.

### 24.4 Session archive

Write these timeline record types:

- `author_evidence_batch`
- `author_belief_revision`
- `author_situation_transition`
- `author_model_graph`
- `author_forecast_opened`
- `author_forecast_resolved`
- `author_plan_proposed`
- `author_decision_executed`
- `author_presentation_outcome`
- `author_learning_attribution`
- `author_profile_delta`
- `author_profile_commit`

Each record uses recording time, simulation time and stable IDs.

---

## 25. Author session lifecycle

`DocumentarySystem.start()` must not replace a live author object after Cinema Mode has already begun planning.

Implement:

```js
author.beginSession({
  sessionId,
  simulationSeed,
  profileRevision,
  policy,
  recorder
});
```

and:

```js
await author.endSession({ reason, finalSnapshot });
```

The same author runtime remains active through the session. `beginSession` resets session-scoped beliefs, open forecasts, situations, threads and metrics as configured, while retaining the validated persistent profile.

Mode changes call a guarded `setExecutionMode()` without reconstructing the author or losing open model state. If a mode change makes an open forecast unobservable, censor it explicitly.

---

## 26. Exact changes to current files

### `src/app.js`

1. Replace event `kind` overwrite with `sceneKind` and `eventType`.
2. Remove V3 planning from `beginMovieShot()`.
3. Call `author.observeSnapshot()` after completed simulation ticks.
4. Ask `author.requestPresentation()` only at planning boundaries.
5. Replace V3/legacy mixed narration selection with `presentContract(contract)`.
6. Remove direct V3 camera interpolation and delegate to `CameraPresentationSession`.
7. Persist actual shot metrics on the presentation session.
8. Send actual production outcomes to `author.completePresentation()`.
9. Maintain separate shadow-proposed and executed decisions.
10. Compile all Movie settings through `compileDocumentaryPolicy()`.
11. Keep LLM overview toggles outside this implementation.
12. Preserve name highlighting for living entities and remains through contract roles.

### `src/documentary/system.js`

1. Stop recreating the author in `start()`.
2. Add `beginAuthorSession`, `observeAuthorSnapshot`, `requestAuthorPresentation`, `completeAuthorPresentation` and `endAuthorSession` methods.
3. Record every model graph, forecast, resolution, attribution and profile delta.
4. Add profile-store capability negotiation with the companion.
5. Include profile revision and registry version in the manifest.

### `src/documentary-author-v3/author.js`

Convert to a temporary adapter forwarding legacy V3 calls into the new runtime. Mark direct `cycle()` and global `currentPlan` APIs deprecated. Remove after migration phase 9.

### `src/documentary-author-v3/beliefs.js`

Replace with adapters to the new evidence/belief packages. Planning must no longer mutate beliefs after choosing.

### `src/documentary-author-v3/model-registry.js`

Replace closure-only behavior with schema-validated dependency DAG construction and operational edge semantics.

### `src/documentary-author-v3/models.js`

Split model definitions by family. Give every model typed dependency input and outcome observer. Remove fixed generic `STABLE` fallback.

### `src/documentary-author-v3/planner.js`

Replace regex method selection and flat scoring with concern/satisfier/method eligibility, dependency-plan generation and expected utility.

### `src/documentary-author-v3/learning.js`

Separate forecast calibration, production policy, operator preference and persistence. Remove aggregate Boolean training.

### `src/documentary-author-v3/camera-executor.js`

Retain tested bounded axis control where useful, but place it beneath the horizon planner and single-owner presentation session. Read limits from the contract.

### `src/documentary-narration.js`

Add contract-driven deterministic realization. Preserve existing phrase inventory and Orwell/ASD-style clarity constraints.

### `src/documentary-deterministic-knowledge.js`

Expose proposition/claim IDs and evidence requirements so audience memory tracks meaning rather than text.

### `index.html`

1. Retain ACSS diagnostics under an advanced disclosure.
2. Remove unrestricted `VALIDATED_ACTIVE` selection.
3. Display per-family lifecycle and certificate state.
4. Add export profile, inspect revision, rollback and reset controls.
5. Explain that shadow prediction can learn world calibration but cannot reward unexecuted production choices.

### `companion/src/`

1. Add profile revision endpoints/messages.
2. Store immutable profile revisions below the configured documentary data root.
3. Validate session token, profile path confinement, schema and checksum.
4. Append learning records to session JSONL.
5. Never accept a browser request to mark a profile validated without a signed/local validation artifact produced by the validation command.

---

## 27. Core pseudocode

### 27.1 Observation and prediction

```js
observeSnapshot(snapshot) {
  const observation = this.observer.commit(snapshot);
  const resolutions = this.forecasts.resolveDue(observation);
  const attributions = this.attribution.attributeForecastResolutions(resolutions);
  const deltas = this.learning.consumeForecastAttributions(attributions);
  this.persistence.queue(deltas);

  const concerns = this.concerns.evaluate({
    beliefs: observation.beliefSnapshot,
    situations: observation.situationSnapshot,
    stories: this.stories.snapshot(),
    audience: this.audience.snapshot(),
    policy: this.policy
  });

  this.pendingPlanningState = Object.freeze({ observation, concerns });
  return { observation, resolutions, attributions };
}
```

### 27.2 Plan selection

```js
requestPresentation({ reason, baselineDecision = null }) {
  const state = this.pendingPlanningState;
  const methods = this.methodSelector.eligible(state);
  const plans = [];

  for (const method of methods) {
    const queries = this.queryBuilder.build(method, state);
    const graphs = queries.map(query => this.modelSelector.select(query, state));
    const executions = graphs.map(graph => this.dependencyExecutor.execute(graph, state));
    const forecasts = executions.flatMap(result => this.forecasts.open(result));
    plans.push(...this.planBuilder.build({ method, forecasts, state }));
  }

  const eligible = this.policy.filterHard(plans);
  const selected = this.planSelector.choose(eligible, this.activePlan, state);
  const contract = this.contractCompiler.compile(selected, state);
  this.contractValidator.assertValid(contract, state);

  const proposal = { selected, contract, baselineDecision, observationRevision: state.observation.revision };
  this.trace.proposal(proposal);
  return proposal;
}
```

### 27.3 Presentation completion

```js
completePresentation({ contractId, productionMetrics, narrationResult, endReason }) {
  const executed = this.presentations.complete(contractId);
  const outcome = buildProductionOutcome({ executed, productionMetrics, narrationResult, endReason });
  const attribution = this.attribution.attributeProductionOutcome(outcome);

  if (executed.executionOwner === "ACSS") {
    this.learning.consumeProductionAttribution(attribution);
  }

  this.audience.markActuallyPresented(narrationResult.presentedClaims);
  this.stories.applyPresentationOutcome(outcome);
  this.persistence.queue(attribution.profileDeltas);
  return { outcome, attribution };
}
```

---

## 28. Implementation phases and gates

### Phase 0 — Preserve and disable unsafe activation

Changes:

- take a new source snapshot and hash manifest;
- keep V3 shadow available;
- hide or label V3 Active experimental until Phase 8;
- add feature flags for every new subsystem;
- capture baseline documentary metrics.

Gate:

- current deterministic Cinema Mode remains recoverable;
- snapshot verification passes.

### Phase 1 — Event schema and immutable observation transaction

Changes:

- introduce documentary snapshot and evidence adapters;
- preserve event subtype;
- create evidence ledger and belief transaction;
- move observation before planning.

Gate:

- every selected author fact points to evidence;
- no planning API accepts a mutable simulation entity;
- malformed sparse archive data cannot crash startup.

### Phase 2 — Situations and story identity

Changes:

- typed situation constructors and transitions;
- canonical semantic roles;
- dependency-plan threads;
- correct return-obligation lifecycle.

Gate:

- action changes inside one method retain one thread;
- group member ordering does not change identity;
- every return obligation terminates exactly once.

### Phase 3 — Operational model DAG

Changes:

- model schema;
- dependency graph builder;
- topological executor;
- operational edge semantics;
- foundation models only.

Gate:

- removing a required dependency causes dependent abstention;
- dependency output mutation predictably changes dependent output;
- cyclic graphs fail registry validation.

### Phase 4 — Forecast ledger and real outcome resolution

Changes:

- immutable forecast records;
- outcome observer registry;
- resolution/censoring;
- Brier/log-loss/continuous errors;
- timeline logging.

Gate:

- no generic production success trains world models;
- at least 95% of observable due forecasts resolve correctly in scenarios;
- censored forecasts create zero calibration delta.

### Phase 5 — Calibration and persistence

Changes:

- Beta/Dirichlet/continuous calibration;
- probability shrinkage;
- IndexedDB and companion revision stores;
- correct atomic rollback;
- capability matrix.

Gate:

- observing is byte-stable;
- rollback restores exact previous hash;
- corrupted revision quarantines;
- learned reliability changes model influence in a controlled test.

### Phase 6 — Concern/method planning and audience memory

Changes:

- deficit-based concern activation;
- actual ontology-driven method eligibility;
- proposition memory and question ledger;
- explicit silence;
- hard policy compiler.

Gate:

- operator intent no longer dominates ordinary cycles;
- repeated unchanged claims are suppressed;
- every UI setting has a behavioral test;
- Character and World modes remain information-safe.

### Phase 7 — Unified contract and deterministic narration

Changes:

- contract compiler/validator;
- deterministic narration adapter;
- entity/remains highlighting;
- contract-only narration scheduling.

Gate:

- every spoken sentence is licensed by contract claim IDs;
- narration function and sentence limit are obeyed;
- voice/captions can be disabled independently;
- LLM overview behavior is unchanged.

### Phase 8 — Predictive camera shadow and single-owner executor

Changes:

- horizon planner;
- trajectory forecasts;
- single pose owner;
- real metric accumulator;
- shadow comparison logs.

Gate:

- zero snap-back discontinuities;
- motion limits hold at transitions and during tracking;
- predicted zone reduces subject loss on fixed scenarios;
- shadow actions receive no direct production reward.

### Phase 9 — Bounded active commissioning

Changes:

- activate certified model families individually;
- enforce break conditions and repair hierarchy;
- connect production-policy learning;
- generate validation certificates.

Gate:

- held-out documentary metrics improve or remain non-inferior;
- missed critical events do not rise;
- skipped outcomes fall materially;
- no truth-integrity violations;
- rollback is tested during a live session.

### Phase 10 — Retire prototype paths

Changes:

- remove V3 compatibility branches from `beginMovieShot()`;
- remove obsolete aggregate learning and unused fixed models;
- consolidate diagnostics and documentation;
- keep the verified baseline snapshot.

Gate:

- no runtime imports from deprecated prototype modules;
- all migration tests pass;
- restore instructions are current.

---

## 29. Test architecture

### 29.1 Unit tests

Add targeted files:

```text
tests/documentary-evidence-transaction.test.mjs
tests/documentary-belief-revision.test.mjs
tests/documentary-situation-identity.test.mjs
tests/acss-dependency-graph.test.mjs
tests/acss-dependency-executor.test.mjs
tests/acss-forecast-ledger.test.mjs
tests/acss-outcome-observers.test.mjs
tests/acss-calibration.test.mjs
tests/acss-capability-matrix.test.mjs
tests/acss-profile-store.test.mjs
tests/acss-story-dependency-plan.test.mjs
tests/acss-audience-memory.test.mjs
tests/acss-policy-compiler.test.mjs
tests/acss-contract-validator.test.mjs
tests/acss-camera-horizon.test.mjs
tests/acss-camera-session.test.mjs
tests/acss-shadow-attribution.test.mjs
```

### 29.2 Required counterexample tests

1. Required dependency exists but is inapplicable: root must abstain.
2. Required dependency abstains: dependent must not execute.
3. Two correlated supports agree: combined confidence must respect the correlation cap.
4. A contradicted model remains explicit and reduces confidence.
5. A forecast assigns 0.1 to the observed outcome: it receives worse log loss than one assigning 0.7.
6. Camera quality is excellent but ecological forecast is wrong: camera policy improves, world model worsens.
7. Ecological forecast is correct but camera is occluded: world model improves, camera component worsens.
8. Operator exits before horizon: forecast is censored, not failed.
9. Shadow ACSS proposes switch while legacy holds: ACSS switch policy receives no direct reward.
10. Observe-only session: serialized profile is byte-identical.
11. Current revision is R2 and new R3 commits: rollback produces exact R2 checksum.
12. Birth event with importance 78 remains typed `BIRTH` and follows configured critical policy.
13. A transition completes: first hold-frame pose differs continuously from final transition pose.
14. Same proposition in different wording remains duplicate.
15. Same subject with materially changed plan phase becomes narratable.

### 29.3 Deterministic scenario harness

Build authoritative scenarios using real simulation state transitions:

- travel to water and successful contact;
- travel interrupted by recovery;
- target dries or becomes invalid;
- hunt progresses from detection through contact or abandonment;
- prey escapes frame but remains in the story;
- courtship progresses, rejects or is interrupted;
- birth followed by care;
- death followed by carcass and skeleton identity continuity;
- group split and reunion;
- rainfall, runoff and downstream surface-water change;
- quiet world period where silence is optimal;
- critical event interrupt followed by fulfilled return obligation.

Each scenario provides expected observable outcomes, not injected learning rewards.

### 29.4 Held-out seed validation

Split seeds before training:

- calibration/training set;
- development set;
- held-out validation set.

Store hashes in the certificate. Never choose held-out seeds after inspecting their results.

Compare baseline, shadow and bounded-active profiles on:

- forecast Brier score and log loss;
- calibration error;
- outcome coverage;
- censored rate;
- dependency failure rate;
- completed story-beat rate;
- missed resolution rate;
- unrelated switch rate;
- semantic duplicate rate;
- silence appropriateness;
- camera visibility, containment, jerk and discontinuity;
- critical-event capture;
- truth-integrity violations.

### 29.5 Browser integration

The native headless Chromium crash must not be ignored indefinitely. Separate the browser-runner fault from author correctness:

- keep pure logic and deterministic scenario tests runnable in Node;
- add an interactive diagnostic mode exporting camera metrics without OBS;
- test against a working installed Chrome channel if available;
- retain manual commissioning until automated browser execution is stable;
- never promote `VALIDATED_ACTIVE` solely from Node-only synthetic tests.

---

## 30. Performance budgets

Initial desktop budgets on the target machine:

| Work | Budget |
|---|---:|
| Incremental evidence adaptation per simulation tick | 2.0 ms median, 6.0 ms p95 |
| Belief and situation update | 1.5 ms median, 4.0 ms p95 |
| Forecast resolution batch | 1.5 ms median, 5.0 ms p95 |
| Planning transaction | 8 ms median, 25 ms p95 |
| Camera session frame step | 0.8 ms median, 2.0 ms p95 |
| Diagnostic UI refresh | 2 Hz maximum |
| Profile checkpoint serialization | off render path, below 50 ms p95 |

Use bounded stores:

- evidence ledger retains active evidence plus session archive references;
- belief store compacts superseded revisions after archive commit;
- forecast ledger indexes open forecasts by expiry tick and observer type;
- story archive bounds dormant in-memory threads;
- audience memory uses semantic indexes and time windows;
- diagnostics retain summarized traces, while full records stream to the session archive.

Planning may yield across frames in shadow mode if it exceeds budget. Active mode must retain the current valid contract until a new valid contract is ready.

---

## 31. Diagnostics required before activation

The ACSS panel must expose:

- current observation, belief and profile revisions;
- active concerns with deficit/urgency/observability components;
- eligible and rejected methods with reasons;
- selected dependency DAG;
- required dependency failures and abstentions;
- raw and calibrated outcome probabilities;
- forecast horizons and resolution state;
- active thread, beat and return obligation;
- incumbent/challenger expected utility decomposition;
- active contract and break conditions;
- camera planned path, actual path and constraint margins;
- latest production metrics;
- attribution records and profile deltas;
- current/previous profile hashes;
- validation certificate scope.

Provide a human-readable decision explanation and a machine-readable JSON export.

---

## 32. Failure handling

| Failure | Runtime behavior |
|---|---|
| Evidence adapter throws | Skip adapter batch, log, retain last valid belief until expiry |
| Required model unavailable | Dependent abstains; select parent/fallback plan |
| No valid documentary plan | Hold current safe contract or deliberate silence |
| Camera plan infeasible | Thread-preserving safe camera |
| Narration claim invalidates before speech | Re-realize contract or remain silent |
| Profile checksum fails | Quarantine and load last valid revision |
| Companion disconnects | Continue browser observation; queue bounded archive/profile deltas |
| Simulation resets | Censor open forecasts, close threads, begin new observation epoch |
| Operator changes hard preset | Revalidate active contract and replan at safe boundary |
| Critical event during narration | Apply event policy; log interruption; create return obligation if needed |

No failure should silently convert uncertainty into fact.

---

## 33. Definition of done

The corrective implementation is complete only when all statements below are true.

### Architecture

- Evidence and beliefs precede every plan.
- Model dependencies are topologically executed and supply typed outputs.
- Required dependency failure causes abstention.
- Forecasts are immutable, time-bounded and resolvable.
- One contract controls narration, subjects, camera and logging.

### Learning

- Every model update references a resolved forecast.
- World and production learning are separate.
- Calibration materially but boundedly affects future probabilities or eligibility.
- Observe-only makes no profile mutation.
- Shadow mode never rewards an unexecuted action.
- Per-family lifecycle gates are enforced.

### Story and audience

- Threads preserve causal method progress across ordinary action changes.
- Required beats cannot be skipped through timers alone.
- Return obligations terminate correctly.
- Presented propositions update audience memory.
- Semantically duplicate statements are suppressed independent of wording.

### Camera

- One state machine owns the physical pose.
- Transitions have no snap-back.
- Predicted trajectories influence framing.
- Contract motion limits are measured and enforced.
- Camera learning uses real time-weighted metrics.

### Persistence

- Profile revisions are immutable and checksummed.
- Rollback restores the exact prior revision.
- Invalid profiles quarantine safely.
- Session archives contain forecasts, resolutions, attribution and learning deltas.

### Validation

- Fixed deterministic scenarios pass.
- Held-out seeds meet non-inferiority and safety thresholds.
- Browser or interactive camera commissioning passes.
- No truth-integrity violations occur.
- `VALIDATED_ACTIVE` requires a matching certificate.

---

## 34. Recommended implementation order

The work should begin with correctness, not additional phrases or additional model count.

1. Snapshot the current prototype and capture baseline metrics.
2. Preserve event subtype and introduce immutable documentary snapshots.
3. Move evidence/belief/situation processing before planning.
4. Implement operational required-dependency execution using four foundation models.
5. Implement the forecast ledger and real outcome observers.
6. Prove model-specific calibration on authoritative scenarios.
7. Implement versioned persistence and correct rollback.
8. Replace regex method selection with ontology-driven method eligibility.
9. Implement story dependency plans and audience proposition memory.
10. Compile all Cinema settings into hard/soft policies.
11. Make deterministic narration consume the unified contract.
12. Replace dual camera ownership with the horizon planner and single executor.
13. Run correct shadow comparisons.
14. Commission one model family at a time under bounded active control.
15. Generate a held-out validation certificate before enabling validated active mode.

Adding more prediction models before steps 1–7 would enlarge the decorative graph without creating real learning. The first success criterion is not the number of models. It is one complete, inspectable causal chain in which a forecast is formed from dependencies, resolved against the world, correctly attributed, learned within bounds, persisted, and shown to change a later decision safely.

---

## 35. Audience feedback and preference-learning extension

The author also needs an explicit audience feedback loop. Ecological outcome learning tells the author what its world models predict correctly. Production feedback tells it whether a camera plan physically worked. Audience feedback tells it what this particular viewer wants the documentary to emphasize and how they prefer it to be presented.

These are three different learning domains and must remain separate:

```text
authoritative ecological outcome
→ world-model calibration

measured camera/narration execution
→ production-policy calibration

explicit or carefully qualified audience response
→ audience-preference profile
```

An audience dislike must never reduce confidence in a true ecological forecast. A five-star rating for an incorrect sentence must never make that sentence factually acceptable. A camera fault must never be interpreted merely as a stylistic dislike.

### 35.1 Objectives

The feedback system must learn:

- preferred balance between character stories and world processes;
- preferred entities, species, families, groups and recurring protagonists;
- preferred ecological domains such as perception, physiology, social life, mating, predation, vegetation, water, weather or terrain;
- preferred shot distance, scale, angle and height;
- preferred camera motion and motion intensity;
- preferred pacing and shot duration;
- preferred narration density, depth and question frequency;
- tolerance for quiet observation;
- tolerance for repetition and recap;
- preference for causal completion versus variety;
- interest in rare events versus ordinary daily behavior;
- whether the viewer wants more explanation, more visual observation or more Laboratory detail.

It must also distinguish faults such as:

- invalid or obstructed camera angle;
- subject missing from frame;
- camera too distant or too close;
- unintended zoom oscillation;
- looping or circling camera;
- excessive cutting;
- failure to follow named entities;
- repeated narration;
- narration about the wrong subject;
- missed important event;
- captions or voice synchronization fault;
- incorrect entity/remains identity;
- factual or epistemic narration error.

### 35.2 Explicit non-objectives

Audience feedback cannot:

- alter simulation behavior or ecological state;
- certify a factual claim;
- suppress truth-integrity checks;
- override camera safety;
- force private information into a restricted documentary lens;
- promote an uncertified prediction model;
- train directly from unconfirmed arbitrary text;
- assume that failure to click means approval;
- treat every Next Shot action as strong dislike;
- create a hidden psychological profile unrelated to documentary preferences.

---

## 36. Audience identity and profile modes

At startup, Cinema Mode should ask which feedback context applies.

### 36.1 Profile choices

```text
Use local audience profile
Create new audience profile
Guest session — do not retain learning
Shared audience — aggregate only explicit ratings
Skip review setup — use neutral defaults
```

The default profile remains local to the machine. Profiles require user-visible names such as `Louie documentary preferences`, not opaque tracking identifiers.

### 36.2 Audience profile schema

```js
{
  profileId: "audience-...",
  schemaVersion: 1,
  displayName: "Local documentary viewer",
  createdAtUtc: "...",
  lastUsedAtUtc: "...",
  mode: "PERSONAL" | "GUEST" | "SHARED_AGGREGATE",
  consent: {
    retainExplicitFeedback: true,
    retainImplicitSignals: true,
    retainWrittenFeedback: true,
    allowStartupPriming: true,
    allowOccasionalPrompts: true
  },
  stablePreferences: {},
  sessionPreferences: {},
  entityAffinities: {},
  speciesAffinities: {},
  topicAffinities: {},
  cameraPreferences: {},
  narrationPreferences: {},
  promptState: {},
  samples: {
    explicit: 0,
    implicit: 0,
    pairwise: 0,
    confirmedTextTags: 0
  },
  revision: 0,
  parentRevision: null,
  checksum: "..."
}
```

### 36.3 Stable and session preferences

Keep two layers:

- `stablePreferences`: cautiously learned across sessions;
- `sessionPreferences`: immediate requests such as “focus on weather today.”

Session preferences may change the current documentary strongly but expire at session end unless the viewer explicitly chooses **Remember this preference**.

This prevents one unusual viewing session from permanently rewriting the audience profile.

### 36.4 Multiple viewers

Shared-audience mode may aggregate button ratings but must not pretend to infer one coherent personal preference. Use:

```text
aggregate score
+ vote count
+ disagreement/variance
```

High disagreement should reduce learned influence and may prompt the operator to select a target audience profile.

---

## 37. Startup audience-priming stage

The startup review is optional, short and progressively skippable. It should establish high-value preference axes without requiring the viewer to understand every Cinema setting.

### 37.1 Entry screen

```text
Help the documentary learn what you enjoy?

This optional review takes about two minutes. It changes what the documentary
focuses on and how it films. It does not change the ecosystem itself.

[Start quick review] [Use previous profile] [Skip for now]
```

### 37.2 Stage A — documentary purpose

Ask one primary question:

> What should this documentary mainly help you experience?

Multi-select with ranked priority:

- Follow individual animal lives.
- Understand the whole ecosystem.
- Watch rare and dramatic events.
- Learn hidden causes and internal systems.
- Observe the world quietly with less narration.
- Explore everything available in the Laboratory.

This creates explicit session priors. It is not treated as a noisy rating.

### 37.3 Stage B — subject preference

Use direct choices:

- Animals and character stories
- Landscape, climate and resources
- Balanced mixture
- Let the author discover what interests me

Then optionally ask:

- More perception and sensory experience
- More family and social relationships
- More physiology, needs and recovery
- More predation and danger
- More reproduction and mate choice
- More water, plants, weather and terrain

### 37.4 Stage C — cinematography preference

Use four to six pairwise comparisons rather than many abstract sliders. Each comparison shows either:

- two stored short clips from previous verified sessions;
- two still frames representing actual camera poses;
- two labeled camera diagrams when no clips exist.

Example:

```text
Which view would you rather watch?

[Closer, stable character shot]  versus  [Wider environmental context]
```

Pairwise axes:

- close versus wide;
- stable versus moving;
- slow hold versus faster cutting;
- subject-centred versus contextual composition;
- ground-level versus elevated overview;
- one protagonist versus group coverage.

Never manufacture ecological events solely for the review. Review assets are presentation examples, not simulated evidence.

### 37.5 Stage D — narration preference

Ask:

- Brief observations
- Standard documentary passages
- Detailed causal explanations
- Maximum Laboratory depth

Additional toggles:

- Ask occasional questions and hypotheses.
- Prefer names for recurring entities.
- Allow quiet scenes without speech.
- Recap earlier stories when they return.

### 37.6 Stage E — confirmation

Show a plain-language summary:

> The documentary will begin by favoring recurring animal stories, closer stable shots, detailed causal explanation and occasional perception inserts. Rare irreversible events may still interrupt. You can change or reset this at any time.

Controls:

```text
[Start documentary]
[Adjust choices]
[Use only this session]
[Remember for future sessions]
```

### 37.7 Cold-start behavior without review assets

If there are no earlier clips or screenshots:

1. collect direct purpose/topic settings;
2. start from neutral camera priors;
3. ask pairwise questions only after suitable real scenes have been observed;
4. never delay simulation startup waiting for examples.

---

## 38. Per-scene review interface

Every completed scene receives a stable `presentationId` and a review affordance. The affordance must not cover the principal subject and must remain available briefly after the shot ends.

### 38.1 Compact controls

Default collapsed row:

```text
Rate this scene:  [thumbs down] [thumbs up] [1] [2] [3] [4] [5]
[Why?] [More like this] [Less like this] [Report a problem]
```

Thumbs and five-point rating are alternative inputs, not mandatory duplicates. If the viewer supplies both, retain both but combine them as one feedback episode rather than two independent samples.

### 38.2 Contextual quick tags

Positive tags:

- Good subject choice
- Good camera angle
- Good distance
- Good pacing
- Good explanation
- Useful Laboratory detail
- Follow this entity again
- More of this topic
- Good quiet moment
- Good story continuation

Negative preference tags:

- Not interested in this subject
- Too much of this topic
- Too much narration
- Not enough explanation
- Shot too long
- Shot too short
- Too many cuts
- Prefer a different entity
- Prefer more world context
- Prefer more character focus

Fault tags appear only under **Report a problem** and are not mixed with taste tags.

### 38.3 Focus questions

The author may occasionally ask a bounded question after a scene:

> Should I continue following River Grazer 14?

```text
[Yes, follow this individual]
[Follow the family/group]
[Return only for important changes]
[No, show something else]
```

Or:

> What should receive more attention next?

```text
[Individual animals]
[Whole ecosystem]
[Perception and senses]
[Needs and physiology]
[Weather, water and plants]
[Rare events]
[No preference]
```

Or:

> How should similar action be filmed?

```text
[Closer]
[Wider]
[More stable]
[More movement]
[Longer hold]
[Shorter hold]
```

Questions must be selected because the corresponding preference is uncertain and the answer would change an eligible future decision.

### 38.4 Review timing

Do not prompt:

- during speech;
- during a critical event;
- while the user is already interacting with controls;
- while a fault dialog is open;
- before the scene has had its minimum meaningful exposure;
- more frequently than the active prompt budget permits.

The compact passive rating control may remain present, but active questions wait for a safe editorial boundary.

---

## 39. Feedback record schemas

### 39.1 Scene feedback episode

```js
{
  feedbackId: "feedback-...",
  audienceProfileId: "audience-...",
  sessionId: "run-...",
  presentationId: "presentation-...",
  contractId: "contract-...",
  decisionId: "decision-...",
  threadId: "thread-...",
  situationId: "situation-...",
  submittedAtRecordingMs: 81432,
  submittedAtSimulationTick: 9824,
  explicit: {
    thumb: "UP" | "DOWN" | null,
    rating: 1 | 2 | 3 | 4 | 5 | null,
    direction: "MORE_LIKE_THIS" | "LESS_LIKE_THIS" | null,
    tags: ["GOOD_SUBJECT", "CAMERA_TOO_DISTANT"],
    focusAnswer: null,
    writtenFeedbackId: null
  },
  implicit: null,
  sceneFeaturesId: "scene-features-...",
  productionOutcomeId: "production-outcome-...",
  confidence: 1,
  status: "RECORDED" | "CONFIRMED" | "RETRACTED",
  profileRevisionBefore: 14,
  profileRevisionAfter: null
}
```

### 39.2 Scene feature vector

Store interpretable features rather than raw rendered frames in the preference learner:

```js
{
  sceneFeaturesId,
  subject: {
    mode: "CHARACTER" | "WORLD" | "MIXED",
    entityIds: [],
    speciesIds: [],
    entityCountBand: "ONE" | "PAIR" | "SMALL_GROUP" | "LARGE_GROUP" | "NONE",
    favouritePresent: false,
    protagonistContinuity: 0.0,
    remainsPresent: false
  },
  content: {
    situationType,
    eventType,
    topicIds: [],
    rarityBand,
    causalDepth,
    perceptionDepth,
    laboratoryChannelIds: []
  },
  camera: {
    family,
    shotSize,
    elevationBand,
    motionBand,
    holdSeconds,
    subjectScreenAreaMean,
    containmentMean,
    occlusionFraction,
    maximumJerk
  },
  narration: {
    enabled,
    sentenceCount,
    wordCount,
    depth,
    questionCount,
    recapFraction,
    noveltyMean
  },
  story: {
    beat,
    threadAge,
    returningThread,
    outcomeShown,
    interrupted
  }
}
```

### 39.3 Implicit interaction signal

```js
{
  signalId,
  presentationId,
  type: "NEXT_SHOT" | "PAUSE" | "KEEP" | "HIGHLIGHT" | "FAVOURITE" | "OPEN_DETAILS",
  occurredAtRecordingMs,
  exposureFraction,
  narrationComplete,
  criticalEventActive,
  userInitiated: true,
  inferredPreferenceTarget: null,
  learningWeight: 0.0,
  interpretationReason: "AWAITING_CONTEXT"
}
```

### 39.4 Fault report

```js
{
  reportId,
  presentationId,
  contractId,
  category: "CAMERA" | "SUBJECT" | "NARRATION" | "CAPTIONS" | "IDENTITY" | "EVENT_COVERAGE" | "PERFORMANCE" | "OTHER",
  faultCodes: ["SUBJECT_OUT_OF_FRAME", "CAMERA_LOOP"],
  severity: "MINOR" | "MAJOR" | "UNUSABLE",
  descriptionId: null,
  capture: {
    cameraMetrics,
    activeContract,
    subjectPositions,
    selectedModelGraphId,
    recentDecisionIds,
    recentConsoleErrors,
    recordingTimeWindow: [78000, 84000]
  },
  immediateAction: "NONE" | "SAFE_CAMERA" | "REPLAN" | "MUTE" | "DISABLE_ACTIVE_AUTHOR",
  status: "OPEN" | "REPRODUCED" | "NOT_REPRODUCED" | "RESOLVED"
}
```

Fault reports are diagnostic evidence. They do not directly become negative style ratings.

---

## 40. Normalizing explicit feedback

Maintain the original input and a normalized preference observation.

### 40.1 Base mapping

```text
Thumbs up                 +0.65
Thumbs down               -0.65
1-star                    -1.00
2-star                    -0.50
3-star                     0.00
4-star                    +0.50
5-star                    +1.00
More like this            +0.80
Less like this            -0.80
Explicit focus directive  hard session preference or +1.00 targeted observation
```

If thumb and rating are both submitted:

```text
y = 0.35·thumbValue + 0.65·ratingValue
```

Do not count them as two samples.

### 40.2 Tag attribution

Tags determine which feature groups receive the observation.

Examples:

```text
GOOD_CAMERA_ANGLE
→ camera family + elevation + side composition

FOLLOW_THIS_ENTITY_AGAIN
→ entity affinity + character continuity

TOO_MUCH_NARRATION
→ narration density, not subject/topic preference

PREFER_MORE_WORLD_CONTEXT
→ subject balance and shot scale, not dislike of the focal entity
```

Without tags, apply a low-resolution observation to overall scene utility. Never assume which component caused a low rating when the viewer did not say.

### 40.3 Conflicting feedback

If a user gives five stars and selects `CAMERA_TOO_DISTANT`, interpret:

- positive subject/story/topic observation;
- negative camera-distance observation.

If explicit inputs contradict without separable tags, retain both in the raw episode, reduce learning confidence and optionally ask for clarification later.

### 40.4 Retraction and correction

Allow **Undo rating**. Retraction must append a compensating profile delta or rebuild the affected bounded posterior from retained observations. Never silently delete an already archived feedback record.

---

## 41. Implicit feedback rules

Implicit behavior is useful but weak and ambiguous.

### 41.1 Next Shot

Clicking Next Shot may mean boredom, dislike, curiosity, testing or merely wanting variety. Use low weight unless the viewer supplies a reason.

Suggested interpretation:

```text
Before 25% exposure and before narration starts:
  no preference update; likely navigation/testing

Between 25% and minimum meaningful exposure:
  weak scene-level negative, weight 0.10

After meaningful exposure but before expected resolution:
  weak hold-duration or subject negative, weight 0.20

Repeated skips of the same feature pattern:
  bounded pattern negative, maximum combined weight 0.35

Next Shot + selected reason:
  explicit targeted observation, use reason-specific weight
```

Do not penalize the active topic when Next Shot is used during a camera fault.

### 41.2 Keep, Highlight and Favourite

- `Keep`: positive editorial value for that scene, not proof every component was liked.
- `Highlight`: strong importance/value signal, not necessarily camera preference.
- `Favourite`: strong entity affinity, not universal preference for that species.
- Opening advanced information: weak positive signal for the requested information domain.
- Pausing: ambiguous; do not learn unless followed by an explicit tag such as “wanted more time.”

### 41.3 Absence of interaction

No click is not approval. Completion may be recorded as an exposure fact but has zero preference reward unless combined with an explicit opt-in research mode whose meaning is explained.

### 41.4 Repetition threshold

Repeated implicit signals may increase confidence only when:

- they span multiple sessions or materially different situations;
- the same feature interpretation remains plausible;
- no known fault explains them;
- the total implicit influence remains below the explicit-feedback influence cap.

---

## 42. Written feedback

Written feedback is valuable but cannot be applied directly as unconstrained model training.

### 42.1 Storage

Store raw text separately from learned parameters:

```js
{
  writtenFeedbackId,
  audienceProfileId,
  presentationId,
  text,
  submittedAtUtc,
  parserVersion,
  proposedTags: [],
  confirmedTags: [],
  unparsedTextRetained: true,
  learningApplied: false
}
```

### 42.2 Deterministic interpretation

The first implementation must use a transparent phrase/keyword grammar, not the experimental LLM.

Examples:

```text
"too far away", "zoom in", "cannot see the animal"
→ CAMERA_TOO_DISTANT

"keeps circling", "camera loop", "going around again"
→ CAMERA_LOOP

"same sentence", "already said this", "repeating itself"
→ NARRATION_REPEATED

"follow this one", "stay with this animal"
→ FOLLOW_ENTITY

"more weather", "show rain", "focus on climate"
→ MORE_TOPIC:WEATHER
```

Negation and scope must be handled. “The camera is not too far away” must not yield `CAMERA_TOO_DISTANT`.

### 42.3 Confirmation

Before learning from text, show:

> I understood this as: **camera too distant** and **follow the current animal more closely**.

```text
[Correct — apply]
[Edit interpretation]
[Keep as note only]
```

Only confirmed structured tags affect the profile. Unparsed text remains an operator note for later inspection.

### 42.4 Future optional classifier

A future local classifier may propose tags, but it must:

- output only registered feedback tags;
- provide confidence;
- require confirmation below a strict threshold;
- never modify factual model calibration;
- remain disabled independently from the current LLM overview system.

This plan does not authorize changing or activating the existing LLM prototype.

---

## 43. Preference feature model

Use an interpretable contextual preference model rather than unrestricted reinforcement learning.

### 43.1 Feature groups

```text
subject balance
entity affinity
species affinity
topic/domain affinity
story continuity
event intensity
camera family
shot size/distance
elevation and angle
motion intensity
hold duration
narration density
narration depth
question frequency
quiet-scene allowance
Laboratory channel depth
```

Categorical values use one-hot or effect coding. Continuous features are normalized to `[-1,1]`. Interactions are limited to registered, interpretable pairs such as:

- character story × close shot;
- world process × wide shot;
- high motion × short hold;
- detailed narration × Laboratory depth;
- favourite entity × continuity.

### 43.2 Bounded Bayesian linear preference model

For feature vector `x` and normalized explicit response `y ∈ [-1,1]`:

```text
A' = A + w·x·xᵀ
b' = b + w·y·x
θ' = A'⁻¹·b'
```

Use regularized prior `A₀ = λI`. For browser performance, a diagonal-plus-registered-interactions approximation is acceptable if tests demonstrate stable behavior.

Predicted preference:

```text
PreferenceMean(x) = clamp(θᵀx, -1, 1)
PreferenceVariance(x) = xᵀA⁻¹x
```

The variance drives useful questions and prompt tapering.

### 43.3 Ordinal rating model

Preserve one-to-five ratings as ordinal observations for reporting. The first active learner may normalize them as above. A later ordinal-logistic layer is allowed only if it improves held-out prediction and remains inspectable.

### 43.4 Pairwise preferences

For startup comparison `A` versus `B`, use feature difference:

```text
d = x_A - x_B
P(A preferred) = sigmoid(θᵀd)
```

Update with bounded logistic loss or convert the choice to a normalized observation over `d`.

Pairwise choices are especially useful for camera style because viewers often answer concrete comparisons more reliably than abstract sliders.

### 43.5 Entity affinity

Use a separate bounded store:

```js
{
  entityId,
  affinityMean,
  explicitSamples,
  implicitSamples,
  lastFeedbackAtTick,
  requestedFollowMode: "ALWAYS" | "IMPORTANT_CHANGES" | "NONE" | null,
  remainsIdentityAllowed: true
}
```

Affinity decays slowly only when based on weak implicit evidence. Explicit favourites remain until cleared or changed by the viewer.

### 43.6 Exploration and exploitation

Audience learning may vary selection only among already valid documentary plans.

For candidate plan `a`:

```text
AudienceUtility(a) = μ(x_a) + κ·σ(x_a)
```

- `μ` is predicted preference;
- `σ` is uncertainty;
- `κ` is a small exploration coefficient that tapers with samples.

Exploration cannot violate truth, policy, story protection or camera safety. It must not skip an imminent causal resolution merely to test whether the viewer likes terrain.

Use deterministic seeded sampling or upper-confidence selection so decisions remain reproducible from profile revision and seed.

### 43.7 Influence bounds

Audience preference adjusts documentary utility but cannot dominate hard concerns:

```text
FinalPlanUtility = BaseDocumentaryUtility
                 + min(AudienceInfluenceCap, AudiencePreferenceAdjustment)
```

Initial caps:

```text
OBSERVING/CALIBRATING: 0
SHADOW_POLICY: diagnostic only
BOUNDED_ACTIVE: ±0.12 plan utility
VALIDATED_ACTIVE: ±0.20 plan utility
Explicit session directive: hard eligible-set constraint where safe
```

---

## 44. Prompt selection and tapering

The author should not repeatedly interrupt the documentary for ratings. Prompting itself has an audience cost.

### 44.1 Prompt phases

```text
PRIMING
→ EARLY_CALIBRATION
→ ADAPTIVE_LEARNING
→ STEADY_STATE
→ OCCASIONAL_RECHECK
```

Suggested default budgets:

| Phase | Condition | Active prompt budget |
|---|---|---|
| Priming | Optional startup review | 5–10 answers total |
| Early calibration | First 12 meaningful scenes | At most one prompt per 3 scenes |
| Adaptive learning | 12–40 rated/qualified scenes | At most one per 6 scenes and 4 minutes |
| Steady state | Stable preference confidence | At most one per 15 scenes or 15 minutes |
| Occasional recheck | Long-term profile | One high-value question per 30–60 minutes |

These are maxima, not quotas. If there is no useful question, do not prompt.

### 44.2 Prompt utility

For possible question `q`:

```text
PromptUtility(q) = ExpectedInformationGain(q)
                 × FutureDecisionRelevance(q)
                 × ResponseProbability(q)
                 - InterruptionCost(q)
                 - RecentPromptPenalty
                 - CriticalMomentPenalty
```

Prompt only when utility exceeds a threshold and the prompt budget has capacity.

### 44.3 Taper calculation

For preference dimension `d`:

```text
Need(d) = Uncertainty(d)
        × DecisionFrequency(d)
        × ExpectedRegret(d)
```

As posterior variance falls, `Need(d)` falls and the author stops asking. If behavior changes, feedback becomes inconsistent or the viewer resets a preference, uncertainty rises and limited questions resume.

### 44.4 Avoiding survey fatigue

- Always offer **Not now**.
- Offer **Ask less often** and **Stop asking this session**.
- Never repeat the same question without material new context.
- Count dismissed prompts against the prompt budget.
- Do not prompt immediately after negative fault reports.
- Prefer passive rating affordances once stable.

### 44.5 High-value clarification

Prompt when two eligible plans are close in documentary utility but differ strongly on one uncertain audience dimension.

Example:

```text
Plan A: continue a familiar animal’s ordinary travel
Plan B: show a newly changing runoff channel

Base utility difference: 0.02
Audience preference uncertainty: high on character versus world balance
```

Ask once whether the viewer wants character continuity or world process coverage. Do not repeatedly explore both at random.

---

## 45. ACSS integration

Audience preference is itself modeled through dependency-structured author concerns.

### 45.1 New concern and satisfiers

```text
Concern: audience_alignment

Satisfiers:
  honor-explicit-session-direction
  apply-learned-viewer-preference
  resolve-preference-uncertainty
  minimize-feedback-burden
```

This concern remains subordinate to truth integrity, production safety and protected causal completion.

### 45.2 Audience models

Add models:

1. `audience.preference.scene-utility.v1`
   - predicts viewer response from the scene feature vector;
   - consumes preference posterior;
   - outputs mean and uncertainty.

2. `audience.preference.entity-affinity.v1`
   - predicts value of returning to named entities;
   - consumes explicit favourite/follow state and bounded history.

3. `audience.preference.topic-affinity.v1`
   - predicts interest in registered documentary domains.

4. `audience.preference.camera-style.v1`
   - predicts response to shot scale, motion, elevation and duration.

5. `audience.prompt-response.v1`
   - predicts whether a question is likely to be useful and answered;
   - used only to reduce prompt burden.

6. `audience.preference-change.v1`
   - detects sustained conflict between current responses and stable profile;
   - proposes a session-preference reset or clarification.

Dependencies:

```text
scene-utility
REQUIRES scene-feature-extraction
REQUIRES audience-profile-validity
SUPPORTS entity-affinity
SUPPORTS topic-affinity
SUPPORTS camera-style
CONDITIONS current-session-direction
INHIBITS known-fault-explanation
```

If a known camera fault explains a negative response, the fault-inhibition dependency reduces or blocks camera-style preference learning.

### 45.3 Concern evaluation

`audience_alignment` pressure rises when:

- an explicit directive is not being satisfied;
- preference uncertainty affects frequent decisions;
- recent explicit feedback indicates mismatch;
- the user asks for more/less of a subject or style.

It falls when:

- confidence is stable;
- decisions already align;
- prompt burden is high;
- a protected story resolution is imminent.

---

## 46. Fault-reporting and safe adaptation

### 46.1 Report interface

An always-available **Report problem** button opens categories:

#### Camera

- Subject not visible
- Too far away
- Too close
- Bad angle
- Inside terrain/object
- Camera shaking
- Camera looping/circling
- Too much zooming
- Cut too often
- Camera did not follow action

#### Subject and story

- Wrong entity highlighted
- Documentary discussed a different entity
- Important entity/event was ignored
- Kept returning to an irrelevant subject
- Did not complete the story
- Too much terrain in Character Stories

#### Narration

- Repeated the same information
- Description did not match the scene
- Incorrect factual statement
- Unsupported prediction stated as fact
- Too vague
- Voice and captions disagreed
- Narration overlapped another voice

#### Technical

- Captions missing
- Voice missing
- Severe lag
- Controls failed
- OBS/recording problem
- Other

### 46.2 Immediate response

Certain fault reports can trigger safe reversible action:

```text
SUBJECT_OUT_OF_FRAME
→ revalidate metrics → safe thread-preserving camera if confirmed

CAMERA_LOOP
→ freeze orbit family for current contract → stable fallback

CAMERA_INSIDE_TERRAIN
→ immediate safe camera and production-safety event

WRONG_ENTITY
→ clear highlight → re-resolve semantic roles

REPEATED_NARRATION
→ suppress current semantic fingerprint → no factual learning change

UNSUPPORTED_FACT
→ stop/mute current sentence where possible → truth-integrity incident
```

An immediate response is not a permanent learned preference. Permanent changes require reproduced metrics, repeated validated reports or an explicit user directive.

### 46.3 Automatic corroboration

Compare reports with telemetry:

- subject-out-of-frame against containment integral;
- too-far against subject screen area and shot-size contract;
- looping against accumulated angular travel and repeated orbit direction;
- excessive cutting against cut frequency;
- repeated narration against semantic fingerprints;
- missed event against event and camera timelines;
- wrong entity against narration subject IDs and highlights.

Report status:

```text
CONFIRMED_BY_TELEMETRY
PARTIALLY_CONFIRMED
NOT_REPRODUCED
INSUFFICIENT_DATA
```

User reports remain valuable even when telemetry cannot confirm them. “Not reproduced” does not mean “user is wrong”; it means no automatic causal update is safe.

### 46.4 Fault learning boundaries

- Confirmed camera faults update camera planning/execution components.
- Confirmed semantic repetition updates audience memory/narration selection.
- Confirmed wrong-subject faults update contract validation or role resolution.
- Confirmed missed events update event classification/story selection.
- Factual errors update evidence/claim validation and create a safety regression test.
- None of these directly update viewer taste unless the user also supplies preference feedback.

---

## 47. Audience feedback persistence and privacy

### 47.1 Storage layout

```text
AudienceProfiles/
└── <profile-id>/
    ├── manifest.json
    ├── revisions/
    ├── feedback/
    │   ├── explicit.jsonl
    │   ├── implicit.jsonl
    │   └── written.jsonl
    ├── fault-reports.jsonl
    ├── prompt-history.jsonl
    └── current.json
```

Browser-only operation uses IndexedDB with the same logical stores. Companion synchronization is optional and local.

### 47.2 Controls

Provide:

- View what the documentary has learned
- Export audience profile
- Reset session preferences
- Reset camera preferences
- Clear entity favourites
- Delete written feedback
- Delete complete audience profile
- Disable implicit learning
- Disable prompts
- Guest mode

### 47.3 Profile explanation

The UI must explain learned preferences in human terms:

```text
Strong evidence:
  Prefers recurring named animals.
  Prefers medium or close stable shots.

Moderate evidence:
  Likes perception and memory explanations.

Uncertain:
  Character stories versus environmental processes.

Session request:
  Show more weather and water today.
```

Do not expose only opaque weights.

### 47.4 Data minimization

- Store documentary feedback, not general behavioral analytics.
- Do not record keystrokes outside feedback inputs.
- Do not infer demographic, medical or psychological traits.
- Written feedback is opt-in and deletable.
- Guest profiles are destroyed at session end.

---

## 48. Exact implementation changes for audience learning

### New modules

```text
src/documentary-author/audience/
├── audience-profile-schema.js
├── audience-profile-store.js
├── scene-feature-extractor.js
├── feedback-schema.js
├── feedback-normalizer.js
├── preference-posterior.js
├── entity-affinity.js
├── topic-affinity.js
├── prompt-policy.js
├── priming-session.js
├── written-feedback-parser.js
├── fault-report-schema.js
├── fault-corroborator.js
└── audience-explanation.js
```

### `src/app.js`

1. Add optional startup priming dialog before first Cinema presentation.
2. Add persistent compact scene-review controls.
3. Bind every review to `presentationId` and `contractId`.
4. Record Next Shot exposure context before changing the scene.
5. Add focus questions at safe editorial boundaries.
6. Add Report Problem UI with categorized tags.
7. Capture the bounded diagnostic window for reports.
8. Never send raw text directly to learning code.
9. Render learned-profile summary and prompt-frequency controls.

### `src/documentary/system.js`

1. Add `recordAudienceFeedback()`.
2. Add `recordImplicitAudienceSignal()`.
3. Add `recordFaultReport()`.
4. Add audience-profile revision to the session manifest.
5. Write feedback, profile deltas and prompt decisions to the documentary timeline.

### `src/documentary-author/planning/expected-utility.js`

Add bounded audience preference adjustment after hard constraints and before hysteresis. Emit the complete adjustment decomposition.

### `src/documentary-author/planning/policy-compiler.js`

Compile explicit session focus answers as hard eligible-set constraints where safe. Compile stable learned preferences as bounded soft weights.

### `src/documentary-author/presentation/production-outcome.js`

Generate the scene feature vector and feedback eligibility record when a presentation closes.

### `src/documentary-author/learning/learning-coordinator.js`

Route:

- world outcomes to model calibration;
- production metrics/faults to production components;
- audience feedback to preference posterior;
- explicit directives to session policy;
- confirmed written tags to the appropriate structured channel.

### `index.html` and `src/styles.css`

Add accessible priming, passive ratings, focus questions, fault reporting and profile inspection. Controls must be keyboard accessible and usable while captions are enabled.

### `companion/src/`

Add path-confined audience profile revisions and append-only feedback/fault stores. Raw written feedback must never appear in ordinary health endpoints or logs.

---

## 49. Audience-feedback tests

### 49.1 Schema and normalization

1. One five-star plus thumbs-up episode counts as one sample.
2. Three stars produces neutral preference, not negative feedback.
3. Positive scene plus `CAMERA_TOO_DISTANT` splits subject and camera attribution.
4. Retracted feedback removes its learned effect reproducibly.
5. Malformed ratings and unknown tags are rejected.

### 49.2 Implicit behavior

6. Immediate Next Shot before meaningful exposure produces no learning.
7. Repeated qualified skips create only bounded weak influence.
8. Next Shot during confirmed camera failure does not penalize the topic.
9. No interaction creates zero preference reward.
10. Favourite affects the entity, not all members of the species.

### 49.3 Written feedback

11. “The camera is too far away” proposes `CAMERA_TOO_DISTANT`.
12. “The camera is not too far away” does not propose that tag.
13. Unconfirmed proposed tags do not alter the profile.
14. Unknown text remains a note only.
15. Deleting written text preserves already confirmed structured feedback only when the user explicitly permits it.

### 49.4 Prompting

16. Prompts never appear during narration or critical events.
17. Prompt frequency decreases as posterior uncertainty decreases.
18. Dismissed prompts count toward the budget.
19. “Stop asking this session” prevents all later active prompts.
20. A question is not asked when its answer cannot alter any eligible future plan.

### 49.5 Learning boundaries

21. Audience dislike does not change ecological calibration records.
22. Five-star feedback cannot legalize an unsupported claim.
23. Confirmed camera fault updates no entity/topic affinity.
24. Shadow audience proposals receive no production reward when not executed.
25. Stable preference influence remains within lifecycle cap.

### 49.6 Adaptation scenarios

26. Repeated preference for close stable character shots increases their utility among otherwise valid candidates.
27. Explicit “more world processes” raises eligible world coverage without inserting terrain into Character Stories.
28. “Return only for important changes” suppresses ordinary protagonist returns but preserves birth/death/danger returns.
29. Repeated text reports reduce semantic duplicates without muting new outcomes.
30. Camera-loop reports plus angular telemetry quarantine the faulty orbit variant and select a stable fallback.

---

## 50. Audience-learning activation gates

### Priming gate

- startup review is optional and skippable;
- summary accurately reflects selected priors;
- skipping produces neutral defaults;
- no review choice modifies ecological truth.

### Explicit feedback gate

- feedback binds to the correct presentation and feature vector;
- component tags attribute correctly;
- undo is reproducible;
- profile explanation matches stored observations.

### Implicit feedback gate

- ambiguous actions have zero or low weight;
- known faults inhibit preference learning;
- implicit influence cannot exceed its cap;
- no-action produces no reward.

### Prompting gate

- maximum frequency and safe-boundary rules hold;
- prompt count measurably tapers;
- the user can disable prompts immediately;
- prompt choices materially affect only relevant future decisions.

### Fault-report gate

- every fault captures the associated contract and metrics;
- safety faults can trigger reversible safe behavior;
- fault learning remains separate from taste learning;
- factual reports create traceable integrity incidents.

### Persistent-learning gate

- audience revisions are immutable and checksummed;
- guest sessions leave no retained profile;
- export, reset and deletion work;
- an older profile can be restored exactly;
- held-out feedback prediction improves without reducing documentary safety.

---

## 51. Updated implementation sequence

Insert audience learning only after authoritative forecast and production attribution exist. Otherwise a dislike cannot be separated from a camera fault, repeated text or an incorrect world prediction.

Revised order:

1. Complete observation, belief and situation correction.
2. Complete dependency execution and forecast resolution.
3. Complete production metric collection and component attribution.
4. Implement audience profiles and consent modes.
5. Implement explicit per-scene feedback and fault reporting.
6. Implement scene feature extraction and feedback normalization.
7. Implement startup priming and session directives.
8. Implement the bounded preference posterior in shadow mode.
9. Implement prompt selection and tapering.
10. Implement written-feedback parsing with confirmation.
11. Validate fault inhibition and learning separation.
12. Allow bounded audience utility to influence active eligible plans.
13. Validate on held-out sessions and multiple preference profiles.

The first useful audience-learning milestone is deliberately narrow:

```text
one completed scene
→ one explicit rating with one reason tag
→ one interpretable scene feature vector
→ one bounded audience-profile delta
→ one later choice between two otherwise valid plans
→ a diagnostic explanation of the changed choice
```

Only after that complete chain is verified should implicit feedback, written feedback or active prompting influence the live documentary.
