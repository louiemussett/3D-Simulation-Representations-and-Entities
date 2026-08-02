# ACSS Predictive Documentary Author: implementation and commissioning report

## Status

The corrective Cinema Mode design, including its audience-learning extension, is
implemented and passed automated commissioning on 29 July 2026.

The installed safe default is deliberate:

```text
author mode:       V3_SHADOW
learning:          OBSERVING
AI overview:       off
OBS recording:     off
deterministic TTS: independently selectable
captions:          independently selectable
```

Selecting `V3_ACTIVE` alone is insufficient to place ACSS decisions on air.
`ACSSPredictiveAuthor.canControl()` also requires the production-policy component
to possess `CONTROL_BOUNDED` or a certificate-backed `CONTROL_VALIDATED`
capability. This prevents an observing or unvalidated profile from acquiring the
camera accidentally.

The local LLM prototype was not changed. Deterministic, evidence-licensed narration
remains the immediate event explanation system; the optional LLM overview remains
separate and off by default, as requested.

## Runtime architecture

```text
authoritative simulation state and verified events
  -> immutable snapshot adapter
  -> exhaustive evidence adapters and append-only evidence ledger
  -> versioned beliefs and evidence-licensed propositions
  -> persistent typed situations
  -> ACSS concerns, satisfiers, eligible methods and story dependency plans
  -> dependency-closed, topologically executed prediction ensembles
  -> hard policy filtering and bounded audience preference ranking
  -> one validated presentation contract
  -> deterministic narration plus single-owner predictive camera session
  -> authoritative forecast and measured production outcomes
  -> separated calibration, production-policy and audience learning
  -> immutable checksummed revisions, session records and rollback
```

The simulation is the sole source of ecological truth. The author consumes frozen
observations and cannot change animal decisions, needs, plans, physiology, weather,
terrain, resources or random-number state.

## Corrective-plan compliance

| Audited requirement | Implemented behavior | Principal implementation |
|---|---|---|
| Evidence before planning | Each selection begins one immutable observation transaction; evidence, beliefs, propositions and situations are committed before a plan is considered. | `runtime/observation-transaction.js`, `evidence/snapshot-adapter.js` |
| Exhaustive Laboratory evidence | Adapters cover world, cells, entities, decisions, movement, physiology, expressions, calls, perception, memories, relationships, reproduction, lineages, events, carcasses and archives. Unsupported or invalid records are rejected rather than inferred. | `evidence/adapters.js`, `evidence/evidence-ledger.js` |
| Typed situation lifecycles | Stable situation identities track resource seeking, recovery, danger, predation, social/reproduction, death/remains and environmental processes across observation revisions. | `situations/situation-manager.js` |
| Ontology-driven methods | Concern, satisfier and method eligibility is evaluated from typed situations, evidence and compiled policy; action text is not used as documentary ontology. | `ontology/eligibility.js`, `documentary-author-v3/ontology.js` |
| Operational prediction DAG | Required and optional dependencies have typed relations, confidence gates, cost budgets, correlation limits, contradictions and supersession; execution is topological. | `documentary-author-v3/model-registry.js`, `documentary-author-v3/models.js` |
| Many selected world models | Eighteen specialised state, physiology, resource, behaviour, spatial, predation, social, environment, story, audience, camera and production models can assemble beneath the current concern. | `documentary-author-v3/models.js` |
| Typed forecast lifecycle | Immutable forecasts become `OPEN`, `RESOLVED`, `CENSORED`, `INVALIDATED` or `EXPIRED_UNOBSERVABLE`. | `documentary-author-v3/forecast-ledger.js` |
| Authoritative outcome observers | Models name registered outcome observers; only authoritative later state resolves ecological forecasts. | `documentary-author-v3/outcome-observers.js` |
| Model-specific calibration | Resolution updates only attributable models using Beta/categorical statistics, Brier and log loss, plus Welford and bounded quantile summaries for continuous values. | `documentary-author-v3/learning.js` |
| Calibration affects selection | Calibrated probabilities feed forecasts; confidence-bound reliability can abstain or remove an unsafe model; required-root failure selects only a valid dependency-closed fallback. | `documentary-author-v3/model-registry.js`, `documentary-author-v3/models.js` |
| Causal shadow learning | Proposed ACSS decisions are recorded beside the actually executed baseline. Unexecuted proposals receive no production reward. Observe-only profiles remain byte-identical. | `documentary-author-v3/author.js`, `documentary/system.js` |
| Per-family lifecycle gates | Default, model-family and production-component lifecycles compile to explicit capabilities. Validated control verifies certificate checksum, profile revision, registry version, seed separation, safety and approved scope. | `runtime/capability-matrix.js`, `learning/validation-certificate.js` |
| Causal story plans | Threads contain prerequisite/completion beat graphs. Timers cannot present a required beat, and interrupted threads create evidence-terminating return obligations. | `stories/dependency-plan.js`, `stories/return-obligation-queue.js` |
| Audience proposition memory | Stable claims retain evidence and epistemic identity; superseded claims cannot license speech. Semantic fingerprints suppress paraphrased repetition while material state/phase changes remain narratable. | `audience/proposition-store.js`, `documentary-author-v3/audience-memory.js` |
| Questions, hypotheses and silence | Epistemic claims can support bounded questions/hypotheses; missing or invalid claims yield a contract-level silence decision instead of invented prose. | `presentation/deterministic-narration-adapter.js`, `planner.js` |
| Hard policy compiler | Presets, subject mode, Character Stories/World Reality separation, information channels, event priority, pacing, continuity, camera family, shot size, movement, voice and captions compile into one immutable policy. | `planning/policy-compiler.js` |
| Contract-only narration | Every sentence on the V3 path is realised from active allowed claim IDs and returns its exact claim/evidence provenance. Unlicensed free prose is discarded. | `presentation/contract-validator.js`, `presentation/deterministic-narration-adapter.js` |
| Entity identity continuity | Named living subjects are highlighted while discussed; stable identity continues through carcass and skeletal/remains evidence. The Laboratory name overlay is optional. | `src/app.js`, `evidence/snapshot-adapter.js` |
| Single-owner predictive camera | One camera session owns the physical pose in active ACSS control. It evaluates a bounded horizon, uses absolute targets, enforces speed/acceleration/jerk and performs continuous repair without snap-back. | `presentation/camera-horizon-planner.js`, `documentary-author-v3/camera-executor.js` |
| Measured production outcomes | Visibility, composition, containment, screen area, occlusion, clearance, subject loss, discontinuity, angular travel, speed, acceleration, jerk and predicted-zone error are time-weighted from executed frames. | `presentation/camera-metric-accumulator.js`, `src/app.js` |
| Versioned persistence | Browser learning uses immutable IndexedDB revisions with checksums and atomic manifest pointers. The companion can keep a second immutable archive and perform exact rollback. Corrupt revisions quarantine safely. | `persistence/indexeddb-profile-store.js`, `companion/src/profile-manager.js` |
| Complete editorial archive | Evidence, belief, situation, model graph, forecast open/resolution, contract, execution, shadow comparison, attribution, audience feedback, fault, profile delta and profile commit records use the documentary session timeline. | `documentary-author-v3/author.js`, `documentary/system.js`, `documentary/schemas.js` |
| Audience feedback loop | Optional startup priming, profiles/guest mode, per-scene ratings, like/dislike, reason tags, more/less, pairwise preferences, tapered questions, implicit actions, confirmed written feedback, undo and fault reports are implemented. | `documentary-author/audience/`, `src/app.js` |
| Separated learning | Ecological results calibrate prediction models; executed production metrics train production policy; ratings train audience preference; reported faults diagnose/quarantine responsible production components. | `documentary-author-v3/learning.js`, `documentary-author/audience/system.js` |
| Diagnostics and budgets | The UI and JSON diagnostic expose concerns, methods, beats, candidate exclusions, safe fallbacks, raw/calibrated forecasts, alternatives, utility components, obligations, profile/certificate scope, learning, audience state and recent trace. Rolling median/p95 budgets cover observation, planning, camera planning/frame steps and profile checkpoints; the camera diagnostic exposes planned/actual poses and constraint margins. | `documentary-author-v3/author.js`, `runtime/performance-budget.js`, `src/app.js` |

## Commissioning evidence

### Static and logic gates

```text
npm.cmd run check                         PASS
npm.cmd test                              624 passed, 0 failed
```

The suite includes counterexamples for dependency abstention, optional dependency
failure, semantic supersession, unsupported narration, observe-only mutation,
shadow attribution, exact rollback, certificate rejection, policy separation,
camera convergence, audience learning safety and companion persistence.

### Real browser integration

`scripts/documentary-browser-diagnostic.mjs` started the application, selected
`V3_ACTIVE` plus `BOUNDED_ACTIVE`, enabled Character Stories and observed two real
presentation boundaries. Result:

```text
evidence records                  829
belief records                    829
active situations                  24
models in selected graph           13
narration/frame subjects      RH1, RH2
runtime page errors                 0
camera discontinuities              0
```

All browser gates passed: immutable observation populated, dependency plan
selected, claim/evidence contract licensed, Character Stories policy honoured,
camera family licensed, narrated subjects in frame, predictive camera owning the
pose and measured camera healthy.

### Held-out learning validation

Training seeds `1103, 2207, 3301, 4409` and held-out seeds
`5501, 6607, 7703` are fixed and separately hashed in the certificate.

```text
held-out selections/contracts       66 / 66
invalid contracts                         0
unsupported claims                        0
subject-policy violations                 0
due/resolved forecasts             512 / 512
untrained mean Brier                0.207285
trained held-out mean Brier         0.136133
camera visibility mean              0.987239
camera containment mean             0.984165
invalid poses / subject loss               0
camera discontinuities                     0
unterminated obligations after close       0
observe-only profile byte stable         yes
safety violations                          0
```

The validation certificate is checksummed and approves only bounded and validated
control for its exact profile revision and registry version.

## Intentional boundaries, not omissions

1. The LLM overview is still an optional experimental layer and is off by default.
   It is not allowed to replace evidence-licensed immediate narration.
2. OBS remains opt-in and off by default. Its button starts the installed OBS path
   through the companion when recording is requested.
3. V1/V2 are retained as explicit recovery/comparison modes because the user asked
   for a restorable system. V3 does not import their beliefs, rewards or camera
   state, and active V3 has one physical camera owner.
4. Automated certification does not overwrite a real viewer profile. Learning and
   audience profiles stay local and require the operator's selected lifecycle and
   consent.
5. The simulation itself is intentionally outside the learning loop. Documentary
   feedback cannot change ecology or teach unsupported ecological facts.

## Operational handoff

After source changes, restart the documentary companion so its profile archive
endpoints load, then refresh the browser. For ordinary use:

1. Keep **ACSS learning shadow / Observe only** when auditing.
2. Select **ACSS predictive author / Bounded active learning** when ACSS should
   control the live documentary.
3. Leave AI and OBS off unless explicitly required.
4. Use audience review and fault controls only when desired; declining them never
   blocks Cinema Mode.
5. Use rollback before reset if a learned profile behaves worse.

The normative design remains
`docs/ACSS_PREDICTIVE_AUTHOR_CORRECTIVE_IMPLEMENTATION_PLAN.md`. This report is the
implementation evidence and must be updated whenever a gate, seed partition,
certificate, model registry or runtime ownership rule changes.
