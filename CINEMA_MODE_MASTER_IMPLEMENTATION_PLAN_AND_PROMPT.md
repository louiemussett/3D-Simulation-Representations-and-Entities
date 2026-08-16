# Cinema Mode: Master Implementation Plan and Implementation Prompt

## Purpose

This document consolidates the full cinema-mode discussion into one build specification. It covers the browser simulation integration, deterministic documentary intelligence, cinematic cameras, factual AI narration, local text-to-speech, OBS recording, synchronized editorial logging, crash recovery, live controls, and post-production exports.

The system is a live autonomous documentary studio observing an emergent ecosystem. It must never alter ecological outcomes merely to manufacture drama. The simulation is authoritative; the documentary system observes, interprets within explicit evidence limits, selects, presents, records, and archives.

## Non-negotiable principles

1. The simulation remains the only source of ecological truth.
2. Cinema mode must not change simulation decisions, random-number consumption, timing semantics, or outcomes.
3. Stable IDs must identify every entity, group, relationship, event, thread, shot, prediction, narration item, and session.
4. Deterministic code detects facts, manages threads, ranks stories, and directs cameras.
5. The LLM receives bounded structured facts and performs language generation only.
6. Every generated factual claim must be traceable to evidence and validated before presentation.
7. Uncertainty, inference, prediction, and confirmed observation must be labelled differently.
8. One companion-controlled monotonic recording clock synchronizes video and metadata.
9. Logs are append-only during capture. Derived reports never replace raw evidence.
10. Optional services must fail gracefully. Ollama, Piper, OBS, or the companion going offline must not stop the simulation.
11. Quiet, meaningful observation is not the same as removable stagnation.
12. Automatic rough cuts never overwrite or delete the original recording.
13. Every camera cut and editorial classification must have a machine-readable reason.
14. All thresholds, weights, pacing rules, and model selections must be configuration, not scattered constants.
15. The implementation must be modular, schema-versioned, testable, observable, and documented.

## System boundary and data flow

```text
AUTHORITATIVE BROWSER SIMULATION
  state transitions + verified snapshots + stable identities
                         |
                         v
DOCUMENTARY OBSERVATION LAYER
  event bus -> detectors -> ranges -> causal evidence -> biographies
                         |
                         v
STORY INTELLIGENCE
  event candidates -> story threads -> promises -> predictions -> ranking
                         |
              +----------+-----------+
              |                      |
              v                      v
CINEMATIC DIRECTOR             NARRATION PLANNER
  shot grammar                   factual packet
  feasibility                    deadline/expiry
  inertia                        speech pacing
              |                      |
              v                      v
CAMERA CONTROLLER              NODE COMPANION
  semantic shot log              schema validation
  overlays/map/replay            Ollama -> claim validation
                                 Piper -> audio asset
              |                      |
              +-----------+----------+
                          v
                  LIVE PROGRAMME OUTPUT
                          |
                          v
                       OBS RECORDING
                          |
                          v
              SYNCHRONIZED EDITORIAL ARCHIVE
  JSONL + checkpoints + WAV + subtitles + reports + EDL + rough-cut plan
```

## Recommended repository architecture

Adapt this to the existing project rather than forcing the exact paths:

```text
src/
  documentary/
    core/
      DocumentarySystem.js
      DocumentaryClock.js
      EventBus.js
      Config.js
      IdFactory.js
    schemas/
      schema-version.js
      documentary-event.schema.json
      event-range.schema.json
      causal-evidence.schema.json
      story-thread.schema.json
      camera-decision.schema.json
      narration-request.schema.json
      narration-result.schema.json
      narration-asset.schema.json
      prediction.schema.json
      editorial-window.schema.json
      session-checkpoint.schema.json
      session-manifest.schema.json
      websocket-message.schema.json
    observation/
      SimulationAdapter.js
      EventNormalizer.js
      RangeTracker.js
      EvidenceRegistry.js
      CharacterBiographyStore.js
      WorldSummary.js
      detectors/
    story/
      StoryThreadManager.js
      ThreadLifecycle.js
      ThreadScorer.js
      PromiseLedger.js
      PredictionTracker.js
      NarrativeMemory.js
    director/
      DocumentaryDirector.js
      InterruptionPolicy.js
      SwitchPolicy.js
      ShotPlanner.js
      ShotStateMachine.js
      CameraFeasibility.js
      CameraQualityMonitor.js
    narration/
      NarrationPlanner.js
      FactPacketBuilder.js
      ClaimValidator.js
      FallbackNarrator.js
      NarrationQueue.js
      TopicMemory.js
    editorial/
      ActivityAnalyzer.js
      StagnationClassifier.js
      InterestWindowTracker.js
      HighlightRanker.js
      ReplayBuffer.js
    persistence/
      TimelineStore.js
      IndexedDbBackup.js
      CheckpointManager.js
      ExportClient.js
    ui/
      DocumentaryControls.js
      DirectorDashboard.js
      TimelinePanel.js
      StatusIndicators.js
      Overlays.js
    integration/
      CompanionClient.js
      DocumentaryHooks.js
companion/
  src/
    server.js
    config.js
    websocket-server.js
    protocol.js
    session-manager.js
    timeline-writer.js
    recovery-manager.js
    ollama-client.js
    narration-validator.js
    piper-client.js
    narration-queue.js
    audio-server.js
    obs-client.js
    export-manager.js
    report-generator.js
    subtitle-generator.js
    thumbnail-generator.js
    ffmpeg-runner.js
  package.json
  .env.example
tests/
  documentary/
  companion/
  fixtures/
docs/
  cinema-mode.md
  cinema-mode-configuration.md
  cinema-mode-operations.md
  cinema-mode-troubleshooting.md
```

Do not duplicate utilities already present in the repository. Preserve its module system, formatting, package manager, rendering architecture, state model, testing tools, and naming conventions where reasonable.

## Canonical contracts

All timeline records share this envelope:

```js
{
  schemaVersion: 1,
  sessionId: "run-014",
  recordId: "evt-000042",
  recordType: "documentary_event",
  recordingTimeMs: 426120,
  simulationTime: {
    tick: 284122,
    day: 14,
    timeOfDay: "17:42"
  },
  createdAtUtc: "2026-07-28T16:42:00.120Z",
  source: "predation-detector-v1",
  payload: {},
  evidence: []
}
```

The recording timestamp is monotonic session time. Wall-clock UTC is diagnostic. Simulation time may pause, accelerate, or rewind only if the simulation supports it; recording time never does.

### DocumentaryEvent

Required concepts:

- Type and taxonomy: survival, predation, social, family, ecological, narrative, production.
- Lifecycle: candidate, confirmed, revised, resolved, retracted.
- Subject, actor, target, group, location, and related event IDs.
- Magnitude, novelty, rarity, stakes, uncertainty, reversibility, and visual clarity.
- Confirmation method and evidence references.
- Causal confidence and interpretation limits.
- Point event or range-start/range-update/range-end semantics.
- Deduplication key.

### CausalEvidence

Use an explicit level:

```text
DIRECT              simulation recorded the cause
DETERMINISTIC       rules and complete state establish attribution
STRONG_ASSOCIATION  supported association but alternatives remain
EDITORIAL_HYPOTHESIS plausible interpretation for investigation
UNKNOWN             no supported relationship
```

Narration wording must be restricted by this level. Hypotheses cannot be converted into facts.

### StoryThread

Required fields:

- Stable ID, subjects, title, status, phase, origin event, and recent events.
- Explicit narrative question.
- Verified facts, hypotheses, causal links, promises, predictions, and unresolved questions.
- Scores for activity, stakes, uncertainty, novelty, causal significance, relationship relevance, historical significance, audience investment, readiness, visual clarity, and production feasibility.
- Current and previous shot state.
- First/last development and first/last shown times.
- Minimum hold, cooldown, return deadline, and switching cost.
- Summary at immediate, thread, and session timescales.
- Resolution and consequence records.

Lifecycle:

```text
CANDIDATE -> DEVELOPING -> ACTIVE -> DORMANT -> RETURN_READY
                                  -> RESOLVED -> CONSEQUENCE -> ARCHIVED
                                  -> INVALIDATED
```

Transitions require explicit conditions and are logged.

### PromiseLedger

Whenever narration or direction asks a question, previews an event, leaves a thread unresolved, or promises a return, create a ledger entry. Track state as open, updated, fulfilled, invalidated, expired, or deliberately abandoned. The dashboard must expose overdue promises.

### Prediction

Record who or what generated it, the exact evidence available at the time, probability/confidence, horizon, possible outcomes, resolved outcome, and scoring calibration. Predictions must be presented as predictions and must never be retroactively rewritten.

### CameraDecision

Include previous and next shot, target IDs, thread ID, trigger, considered alternatives, score breakdown, interruption level, transition, intended function, feasibility, quality assessment, and reason. Log requested, begun, settled, completed, aborted, and failed states.

### NarrationRequest and NarrationAsset

Store:

- Narration function: introduction, observation, explanation, prediction, escalation, transition, re-entry, resolution, consequence, reflection, correction, or summary.
- Factual packet and evidence IDs.
- Allowed causal language and forbidden unsupported claims.
- Recent topics and phrases to avoid.
- Maximum words, deadline, expiry, priority, and thread relevance.
- Model request/response and validation result.
- Final approved text.
- Generation, queue, audio-ready, playback-start, playback-end, interruption, cancellation, and expiry times.
- WAV path, model, voice, engine, and failure/fallback information.

### EditorialWindow

Classifications:

```text
STAGNANT_REMOVE
STAGNANT_COMPRESS
QUIET_KEEP
ACTIVE
HIGHLIGHT
MAJOR_HIGHLIGHT
```

Record separate visual activity, event activity, story development, systemic change, explanatory potential, emotional relevance, character importance, narration value, camera quality, and protected-context scores. Use hysteresis and merge rules. Preserve pre-roll, post-roll, narration, setup, outcome, reaction, and promised returns.

## Functional workstreams

### 1. Simulation instrumentation

- Audit the existing lifecycle and state-changing functions.
- Add stable IDs without altering behavioral logic or RNG call order.
- Emit facts at the state transition where possible rather than inferring them later.
- Add low-frequency detectors only for multi-tick conditions such as separation, pursuit, migration, resource crisis, dominance change, developing environmental effects, and stagnation.
- Create incremental summaries; never serialize every entity every frame.
- Support births, deaths, injury, feeding, hunger/thirst crises, detection, stalking, pursuit, escape, kills, group formation/splitting/merging, leadership, conflict, mating, pregnancy, parenting, adoption, abandonment, migration, territory, scarcity, environmental change, unusual behavior, reversals, and delayed consequences where the underlying simulation supports them.
- Do not fabricate unsupported categories. Represent unavailable capabilities clearly.

### 2. Recording clock and session lifecycle

- Browser requests session start.
- Companion authenticates to OBS and requests recording, or enters documented manual-sync mode.
- Time zero begins only after confirmed recording or explicit manual confirmation.
- Companion owns authoritative elapsed time and sends periodic clock sync.
- Browser smooths offset changes without timestamp regression.
- Record simulation time and UTC in addition to session time.
- Implement start, pause-policy, stop, abort, heartbeat, checkpoint, reconnect, recovery, and finalization.
- Detect OBS stopping unexpectedly.

### 3. Persistence and recovery

- Browser uses IndexedDB as an outage buffer.
- Companion writes append-only JSONL using serialized write queues.
- Flush on bounded intervals and important events.
- Write periodic atomic checkpoints and a clean-completion marker.
- Reconnect with acknowledgements and idempotent batch IDs.
- Prevent duplicates through stable record IDs.
- On restart, detect incomplete sessions, validate trailing JSONL, retain recoverable content, and create a recovery report.

### 4. Event and range processing

- Separate raw signal, candidate, confirmation, interpretation, and resolution.
- Debounce, deduplicate, and correlate events.
- Track point and range events.
- Add configurable pre-roll/post-roll.
- Link consequences back to causes without overclaiming.
- Keep rare-event baselines so “unusual” has statistical meaning.

### 5. Character and world memory

- Maintain bounded biographies for prominent animals and groups.
- Preserve lineage, family, affiliations, rivals, injuries, important encounters, migrations, leadership, and notable survival history.
- Promote names only for primary recurring subjects; use stable descriptive labels otherwise.
- Maintain recent-detail, active-thread, biography, ecosystem-summary, and raw-archive memory tiers.
- Use incremental compaction with provenance back to raw events.

### 6. Story-thread manager

- Create threads from correlated confirmed events and developing conditions.
- Merge duplicates and split threads when questions diverge.
- Maintain immediate, developing, and long-arc timescales.
- Detect beats: discovery, decision, complication, reversal, escalation, resolution, consequence, reflection.
- Preserve unresolved questions through off-screen periods.
- Update audience investment based on screen time, narrated context, callbacks, and consequences—not arbitrary sentiment.
- Retire stale threads transparently.

### 7. Narrative ranking and switching

- Rank a portfolio, not a single queue.
- Use configurable scores for activity, stakes, uncertainty, causality, novelty, relationships, history, readiness, visual clarity, production feasibility, switching cost, recency, and repetition.
- Include narrative inertia, minimum shot length, minimum thread tenure, cooldowns, return deadlines, and hysteresis.
- Implement interruption levels: background update, preview, cutaway, full handoff, emergency override.
- Support escalation, causal, contrast, and suspense cuts.
- Do not chase every event.
- Explain every selection and rejection in debug metadata.

### 8. Cinematic camera director

- Separate editorial intention from physical camera control.
- Support establishing, tracking, subject perspective/over-shoulder where feasible, tactical overhead, close, environmental cutaway, diagnostic overlay, map/orientation, and replay shots.
- Implement a shot grammar state machine:

```text
ACQUIRE -> ESTABLISH -> TRACK -> REVEAL_CONTEXT -> HOLD_OUTCOME
        -> REACTION -> CONSEQUENCE -> RELEASE/TRANSITION
```

- Emergency override may bypass parts of the grammar but must record why.
- Evaluate occlusion, framing, target dispersion, motion speed, terrain, available lead time, screen readability, camera travel, and overlay alternatives.
- Blend or cut according to urgency; prevent nausea, jitter, clipping, and oscillation.
- Preserve geographical orientation after major transitions.
- Record semantic metadata and camera-quality failures.
- Provide a safe overview camera fallback.

### 9. Replays and rolling capture

- Keep a bounded replay buffer where browser capabilities permit.
- Mark replays visibly and log replay source time separately from presentation time.
- Never present replay footage as live.
- If video buffering is too expensive, retain state/event replay hooks without compromising simulation performance.

### 10. Narration planner

- Decide whether to speak before asking the LLM what to say.
- Preserve natural sound and target configurable speech occupancy, initially 20–35%.
- Use minimum silence, per-mode word limits, queue length, cooldowns, topic memory, and expiry.
- Narrate invisible but verified causality, relevant history, uncertainty, changed interpretation, and consequences.
- Avoid describing plainly visible motion unless it supplies meaning.
- Support fully automatic, AI-assisted presenter, hybrid, and silent-capture modes.
- Pause generated narration for human microphone priority; avoid cutting audio mid-sentence except for a configured emergency.

### 11. Ollama integration and factual safety

- Use localhost HTTP from the companion, never expose unrestricted model access to browser code.
- Use JSON-schema structured output.
- Maintain separate bounded contexts for immediate narration, thread summary, and session summary.
- Send only verified facts, allowed hypotheses, narration intent, tone, word limit, forbidden claims, recent topics, and evidence identifiers.
- Validate schema, entity IDs, numbers, names, causal wording, tense, outcome status, and claim support.
- Reject or repair invalid output; never play unvalidated text.
- Use deterministic templates on timeout, invalid output, missing service, or expired relevance.
- Permit periodic LLM editorial suggestions, but deterministic code retains authority.
- Log corrections and issue an explicit on-air correction when material.

### 12. Piper and audio

- Generate one durable audio asset per approved line.
- Prefer a persistent Piper service for repeated generation; support CLI fallback.
- Record exact browser playback start/end, not merely generation time.
- Serve assets only from a constrained session audio route.
- Sanitize IDs and prevent path traversal.
- Support cancellation, expiration, failure, and interrupted narration.
- Make narrator routing compatible with a dedicated OBS audio track; retain WAV files even when routed in the programme mix.

### 13. OBS integration

- Use authenticated OBS WebSocket through the companion.
- Keep credentials in environment configuration and never browser bundles or committed files.
- Start/stop recording, monitor recording state, associate output path, and log failures.
- Support a manual-sync mode when OBS automation is disabled.
- Recommend crash-resistant recording format and remux/export afterwards.
- Document separate tracks for programme mix, simulation, microphone, generated narrator, music, and auxiliary audio where hardware permits.

### 14. Live documentary UI

- Cinema-mode enable/disable and operating mode.
- Start/stop documentary session.
- Current session/recording/simulation time.
- Primary and secondary threads with questions and score explanations.
- Current shot, phase, target, reason, and quality.
- Narration state and service health.
- Promise ledger and predictions.
- Scrollable synchronized timeline.
- Highlight, keep, compress, remove, correction, chapter, and custom manual markers.
- Manual range markers.
- Force-follow, return, release, safe-camera, narration mute, AI pause, and emergency controls.
- Operator amendments must be logged rather than overwriting original classifications.
- Production/debug overlays must be independently hideable from programme output.

### 15. Editorial analysis

- Sample expensive analysis at low frequency and maintain incremental aggregates.
- Separate visible motion from narrative importance.
- Use hysteresis for stagnant ranges and merge nearby compatible ranges.
- Protect setup, anticipation, quiet emotional moments, narration, unresolved questions, and consequences.
- Detect good-audio/bad-picture and good-picture/bad-audio windows.
- Rank highlights with reasons, confidence, and suggested pre/post handles.

### 16. Exports and post-production

Create a complete session package:

```text
sessions/run-014/
  session.json
  video/
  timeline/
    events.jsonl
    event-ranges.jsonl
    camera-ranges.jsonl
    story-threads.json
    predictions.jsonl
    promises.jsonl
    editorial-windows.jsonl
    manual-markers.jsonl
  narration/
    narration.jsonl
    narration.srt
    narration.vtt
    manifest.jsonl
    *.wav
  checkpoints/
  reports/
    editing-report.html
    session-summary.md
    highlights.csv
    stagnant-ranges.csv
    camera-problems.csv
    narration-problems.csv
    unresolved-promises.csv
    recovery-report.md
  editing/
    rough-cut-plan.json
    chapters.ffmetadata
    edit-decisions.edl
  thumbnails/
```

- Generate SRT and WebVTT from actual playback timings.
- Generate chapters, thumbnails, editing report, session summary, highlight/removal/compression lists, unresolved promises, prediction outcomes, camera problems, and narration problems.
- Generate an EDL or equivalent rough-cut plan using source timecodes.
- Optionally use FFmpeg to make a review cut. Never modify the master.
- Post-session processing may use a larger/slower local model, but output remains a suggestion linked to evidence.

### 17. Reproducibility and observability

- Save simulation version, code/build identifier where available, seed, configuration, operator inputs, detector/director versions, and relevant nondeterministic sources.
- Ensure cinema mode does not consume the simulation RNG.
- Provide structured logs and a health endpoint for companion, OBS, Ollama, Piper, storage, clock drift, queue depth, and dropped records.
- Include performance counters and configurable budgets.

### 18. Security

- Bind companion services to loopback by default.
- Authenticate or use a per-session token even on localhost.
- Validate every WebSocket message with size limits and schema.
- Restrict CORS and audio/static routes.
- Keep OBS passwords and paths out of source control.
- Use child-process argument arrays, never concatenate shell commands.
- Sanitize filenames and confine all output beneath the configured sessions directory.
- Redact secrets from diagnostic exports.

## Performance budgets

Measure first, then tune. The implementation must expose configurable targets such as:

- Simulation instrumentation: negligible per-event overhead; no whole-world frame serialization.
- Detectors: distribute work and sample at suitable tick frequencies.
- Editorial scoring: typically 2–5 Hz, not every render frame.
- Camera updates: render-rate interpolation with low-frequency editorial decisions.
- Browser-to-companion batching: bounded by count and time.
- Memory: bounded recent-event buffers and compacted summaries.
- Narration: strict request deadlines and at most two queued lines initially.
- Persistence: backpressure, queue metrics, and explicit dropped/failed-record alarms.

Do not claim a numerical performance target has been met without profiling on the actual simulation.

## Failure and degradation matrix

| Failure | Required behavior |
|---|---|
| Ollama unavailable | Valid deterministic template narration or silence |
| LLM output invalid | Reject, log, use fallback; never speak it |
| Piper unavailable | Subtitle-only narration and saved approved text |
| OBS unavailable | Manual recording mode or metadata-only session |
| Companion disconnected | Buffer in IndexedDB and reconnect idempotently |
| Storage backpressure | Preserve critical events; signal health prominently |
| Camera target lost | Reacquire, widen, then safe overview |
| Thread invalidated | Log invalidation and correct prior interpretation |
| Browser reload | Reconnect/recover session where safely possible |
| Companion crash | Recover append-only logs/checkpoint and mark discontinuity |
| Simulation paused | Recording clock continues; classify the pause explicitly |

## Implementation sequence and gates

### Phase 0 — Repository audit and design lock

- Read repository instructions and inspect architecture, lifecycle, rendering, camera, entities, groups, simulation time, RNG, persistence, UI, build, and tests.
- Map every proposed integration point to real files.
- Produce an implementation map and risk list.
- Finalize schemas, configuration, and compatibility approach before broad edits.

Gate: existing application builds/tests; integration plan cites real code paths; no speculative rewrite.

### Phase 1 — Documentary telemetry foundation

- Core system, clock, event bus, IDs, schemas, adapter, range tracking, JSONL-compatible records, IndexedDB, checkpoints, manual markers, basic controls, export.
- Instrument a representative vertical slice and create extension points for all supported event families.

Gate: events are stable, deduplicated, persisted, recoverable, schema-valid, and do not change seeded simulation outcomes.

### Phase 2 — Story intelligence

- Evidence registry, causal levels, biography memory, thread manager, beats, scoring, promise ledger, prediction tracker, bounded summaries.

Gate: recorded fixtures demonstrate thread creation, dormancy, return, resolution, invalidation, consequence, and no cross-thread identity confusion.

### Phase 3 — Deterministic cinematic director

- Portfolio ranking, switching policy, interruptions, inertia, feasibility, shot planner/state machine, semantic logs, safe fallback, dashboard.

Gate: no rapid oscillation; every cut is explained; major events override; minor events respect continuity; geography and outcomes are held appropriately.

### Phase 4 — Companion and synchronized sessions

- Node companion, validated WebSocket protocol, session manager, timeline writer, heartbeat, acknowledgements, clock sync, recovery, health.

Gate: disconnect/reconnect, duplicate batch, partial write, browser reload, and companion restart tests pass.

### Phase 5 — Factual text narration

- Planner, packets, structured Ollama response, validators, deadlines, expiry, repetition controls, corrections, fallback narrator, subtitle-only UI.

Gate: adversarial fixtures cannot make unsupported claims reach approved output; late narration is discarded; service failure is harmless.

### Phase 6 — TTS and audio lifecycle

- Piper integration, persistent service/CLI fallback, WAV archive, audio server, queue, exact playback timing, human priority, interruptions.

Gate: timings create correct subtitles; stale/cancelled audio does not play; all assets remain traceable.

### Phase 7 — OBS and programme recording

- Authenticated WebSocket, start confirmation/time zero, state monitoring, output association, manual fallback, operational UI.

Gate: metadata aligns with a recorded test event; unexpected OBS stop is detected and logged; secrets are not committed.

### Phase 8 — Editorial intelligence and replay

- Interest windows, stagnation hysteresis, protected context, highlights, replay labeling/buffering, operator amendments.

Gate: quiet meaningful fixtures are kept, empty periods are classified consistently, and replay cannot be confused with live time.

### Phase 9 — Post-production package

- Subtitles, reports, chapters, thumbnails, CSVs, promises/predictions, EDL, rough-cut plan, optional FFmpeg review cut.

Gate: exports are internally consistent, source timecodes are valid, and the master remains untouched.

### Phase 10 — Hardening and long-run validation

- Security review, configuration validation, performance profiling, soak tests, bounded memory, failure injection, accessibility, documentation.

Gate: representative six-hour run completes or is safely recoverable; no unbounded queue/memory growth; operational instructions are reproducible.

## Test strategy

Implement unit, integration, deterministic replay, failure-injection, schema, performance, and end-to-end tests.

Essential scenarios include:

1. Birth develops into parenting and vulnerability threads.
2. Separation begins before danger, becomes pursuit, then resolves in escape or death.
3. Several stories compete without camera oscillation.
4. Emergency overrides a calm story and later returns with a re-entry summary.
5. A quiet unresolved thread is protected from trimming.
6. A claimed cause is downgraded when evidence is only associative.
7. An entity dies suddenly and the camera holds aftermath/consequence.
8. A prediction resolves, fails, or expires without retrospective rewriting.
9. Invalid LLM entity IDs, numbers, causal claims, and premature outcomes are rejected.
10. Narration becomes stale while TTS runs and is never played.
11. Human narration pauses generated narration.
12. OBS start is delayed; session time zero remains correct.
13. Companion disconnects; browser buffers and resumes without duplication.
14. A partial JSONL write is recovered.
15. A replay has correct source and presentation timestamps.
16. Cinema mode on/off produces identical seeded simulation state checkpoints.
17. Long-run memory and queues remain bounded.
18. Exported subtitles, highlights, chapters, and EDL agree with the master timeline.

## Definition of done

The whole system is complete only when:

- All applicable workstreams above are implemented, or a capability absent from the simulation is documented as unsupported with a clean extension point.
- Browser and companion build, lint, type-check where applicable, and pass tests.
- Existing tests remain green.
- Schema validation covers every external and persisted message.
- A deterministic integration fixture and a real recorded smoke test pass.
- Failure modes demonstrably degrade safely.
- A session folder contains the full synchronized archive and valid exports.
- The live dashboard explains story, camera, narration, recording, and health state.
- Installation and operation documentation works on a clean Windows setup.
- No secrets, model binaries, generated recordings, or machine-specific absolute paths are committed.
- No placeholder implementation, silent catch, or untracked TODO remains in required paths.

---

# Copyable master implementation prompt

Copy everything inside the following block into the coding agent that has access to the simulation repository.

```text
You are implementing the complete Cinema Mode for this ecosystem simulation. Work autonomously through the entire task and do not stop after scaffolding or a proof of concept. Inspect the repository first, preserve its architecture and conventions, then implement, test, document, and verify the whole system described below.

MISSION

Turn the existing simulation into a live autonomous documentary production system. The simulation continuously creates authoritative ecological reality. A deterministic documentary layer observes verified state, detects developing events, maintains a portfolio of story threads, ranks narrative opportunities, controls cinematic cameras, plans factual narration, records decisions, and creates a synchronized editorial archive. A local Ollama model converts bounded factual packets into natural prose; it never discovers facts or controls the simulation. Piper speaks only validated approved text. A Node companion manages durable logs, external processes, audio, OBS, recovery, and exports.

HARD RULES

1. The simulation is the only source of truth.
2. Cinema Mode must not alter simulation logic, random-number consumption, or seeded outcomes.
3. Do not infer facts from rendered pixels when authoritative state exists.
4. Do not let the LLM directly select stories, control cameras, or invent motives/outcomes.
5. Every factual narration claim must reference verified evidence and pass validation.
6. Distinguish confirmed observation, deterministic cause, association, hypothesis, prediction, and unknown.
7. Use stable IDs and versioned JSON schemas throughout.
8. Use one companion-authoritative monotonic recording timeline synchronized with OBS.
9. Capture append-only raw records; never replace them with derived summaries.
10. All optional integrations degrade safely and cannot stop the simulation.
11. Never delete or overwrite the master recording.
12. Never commit secrets, generated media, models, or machine-specific paths.
13. Do not download/install Ollama, models, Piper, OBS, FFmpeg, Node, Python, or system packages. Implement detection, configuration, health checks, clear errors, and documentation. The operator will install them after code completion.
14. Do not assume paths or APIs. Inspect real repository code and current installed interfaces.
15. Do not leave required functionality as TODOs, mock-only paths, or empty scaffolding.

FIRST ACTIONS

- Read all repository instructions (including AGENTS.md or equivalents).
- Inspect project structure, package manager, build, tests, simulation loop, time, entities, groups, relationships, environment, RNG, renderer, cameras, UI, save/load, logging, and existing server processes.
- Check working-tree status and preserve unrelated user changes.
- Run the existing validation suite before editing.
- Create a written implementation map using actual paths and identify compatibility risks.
- Convert the specification into a tracked phased plan. Keep at most one phase in progress.

ARCHITECTURE TO IMPLEMENT

Authoritative simulation -> event adapter/detectors -> evidence/ranges/biographies -> story-thread manager -> deterministic ranking/switching -> shot planner/state machine and narration planner -> validated Ollama prose -> Piper audio -> OBS programme -> synchronized editorial archive.

Implement browser documentary modules and a local Node companion. Adapt module names and paths to repository conventions. Reuse existing facilities rather than duplicating them.

CANONICAL DATA

Create versioned schemas and validators for:

- DocumentaryEvent
- EventRange
- CausalEvidence
- StoryThread
- PromiseLedgerEntry
- Prediction
- CameraDecision
- NarrationRequest
- NarrationResult
- NarrationAsset
- EditorialWindow
- SessionCheckpoint
- SessionManifest
- Every browser/companion WebSocket message

All persisted records include schemaVersion, sessionId, stable recordId, recordType, monotonic recordingTimeMs, simulation time, UTC diagnostic time, source/version, payload, and evidence references.

Use causal levels DIRECT, DETERMINISTIC, STRONG_ASSOCIATION, EDITORIAL_HYPOTHESIS, and UNKNOWN. Enforce corresponding narration language.

SIMULATION INSTRUMENTATION

- Introduce stable identities without changing simulation behavior or RNG order.
- Emit authoritative events at state transitions.
- Add sampled multi-tick detectors only where necessary.
- Support all event families that the real simulation can evidence: birth/death, injury, feeding, physiological crisis, threat detection, stalking/pursuit/escape/kill, family/parenting, group formation/split/merge, leadership/conflict, reproduction, migration, territory, scarcity, environmental change, rare behavior, reversals, and delayed consequences.
- Clearly document unsupported concepts rather than manufacturing them.
- Deduplicate/correlate candidates, confirmations, revisions, resolutions, and retractions.
- Track point and range events with pre-roll/post-roll.

STORY INTELLIGENCE

- Make persistent StoryThread the central abstraction.
- Track subjects, explicit narrative question, status/phase, verified facts, hypotheses, causal links, promises, predictions, beats, scores, screen history, minimum hold, cooldown, return deadline, switching cost, and summaries.
- Implement candidate, developing, active, dormant, return-ready, resolved, consequence, archived, and invalidated lifecycle states.
- Implement discovery, decision, complication, reversal, escalation, resolution, consequence, and reflection beats.
- Maintain immediate, developing, and long-arc timescales.
- Merge duplicates, split divergent stories, retire stale stories, and preserve context while off-screen.
- Implement bounded biography and narrative memory with raw-event provenance.
- Implement a promise ledger and prediction outcome tracking.

DETERMINISTIC DIRECTION

- Rank a portfolio using configurable activity, stakes, uncertainty, causal importance, novelty, relationships, history, investment, readiness, visual clarity, production feasibility, switching cost, repetition, and recency.
- Implement narrative inertia, minimum tenure/shot duration, cooldowns, hysteresis, and return deadlines.
- Implement background update, preview, cutaway, full handoff, and emergency override interruption levels.
- Support escalation, causal, contrast, and suspense transitions.
- Log score breakdown and reasons for every selected/rejected candidate and cut.

CAMERA

- Separate editorial shot intent from physical camera motion.
- Implement establishing, tracking, close, context/reveal, tactical overhead, environmental cutaway, map/orientation, diagnostic overlay, subject-perspective where feasible, replay, and safe-overview shots.
- Implement ACQUIRE -> ESTABLISH -> TRACK -> REVEAL_CONTEXT -> HOLD_OUTCOME -> REACTION -> CONSEQUENCE -> RELEASE/TRANSITION grammar.
- Evaluate occlusion, framing, dispersion, speed, terrain, lead time, camera travel, and screen readability.
- Prevent jitter, clipping, rapid cuts, oscillation, and loss of geographical orientation.
- Hold outcomes and aftermath rather than cutting at the decisive instant.
- Log requested/begun/settled/completed/aborted/failed shot states and semantic purpose.
- Add a camera-quality monitor and safe fallback.

NARRATION

- The planner decides if/why speech is required before invoking any model.
- Support introduction, observation, explanation, prediction, escalation, transition, re-entry, resolution, consequence, reflection, correction, and summary.
- Keep configurable silence, speech occupancy (initially 20–35%), word limits, queue maximum, deadlines, expiry, cooldown, and topic repetition controls.
- Maintain separate immediate, thread, and session contexts.
- Build bounded factual packets containing only verified facts, explicitly allowed hypotheses, evidence IDs, intent, forbidden claims, recent topics, and word limit.
- Request JSON-schema structured output from Ollama through the companion.
- Validate schema, IDs, names, quantities, causal wording, tense, state, and premature outcome claims.
- Reject invalid or stale output and use factual deterministic templates or silence.
- Record and visibly correct material errors.
- Support automatic, presenter-assist, hybrid, and silent-capture modes.
- Implement human microphone priority.

COMPANION, PIPER, AND OBS

- Build a loopback-only Node companion with validated/authenticated WebSocket protocol, acknowledgements, idempotent batches, heartbeat, health state, clock sync, session manager, serialized append-only writer, atomic checkpoints, recovery, and constrained asset serving.
- Buffer browser records in IndexedDB during outages and replay without duplicates.
- Integrate Ollama through configurable localhost API with timeouts/abort.
- Integrate Piper through a persistent service when supported and safe CLI argument arrays as fallback. Save every WAV and metadata record. Track generation, ready, playback start/end, interruption, cancellation, failure, and expiry.
- Integrate authenticated OBS WebSocket. Confirm recording before time zero, monitor state, associate output file, and support explicit manual-sync mode.
- Keep credentials only in .env with a committed .env.example.
- Add health checks and graceful degradation for every service.

EDITORIAL UI AND ANALYSIS

- Add Cinema Mode/session controls, operating modes, clocks, service health, current/secondary threads, questions, scores, current shot/reason/quality, narration queue, promise ledger, predictions, and synchronized live timeline.
- Add point/range markers for highlight, keep, compress, remove, correction, chapter, and custom notes.
- Add force-follow, return, release, safe-camera, mute, AI pause, and emergency controls.
- Keep debug/production overlays separable from clean programme output.
- Compute visual activity, event activity, story development, systemic change, explanatory potential, emotional relevance, character importance, narration value, camera quality, and protected context separately.
- Classify STAGNANT_REMOVE, STAGNANT_COMPRESS, QUIET_KEEP, ACTIVE, HIGHLIGHT, and MAJOR_HIGHLIGHT using hysteresis/merge rules.
- Protect setup, anticipation, narration, outcomes, reaction, promises, and quiet meaningful material.
- Record operator amendments without mutating original classifications.
- Implement replay buffering where affordable; label replay and preserve source versus presentation time.

EXPORTS

Produce a self-contained session directory with manifest, recording association, append-only events/ranges/camera/prediction/promise/editorial/marker logs, story snapshots, narration metadata/WAV/SRT/VTT, checkpoints, thumbnails, HTML editing report, Markdown summary, CSV highlights/stagnation/camera/narration issues, unresolved promises, chapter metadata, EDL, and rough-cut plan. Optionally create an FFmpeg review cut while preserving the master.

REPRODUCIBILITY, SECURITY, PERFORMANCE

- Save seed, simulation version/build, configuration, operator inputs, and component versions.
- Prove Cinema Mode does not consume simulation RNG or change seeded checkpoints.
- Bind locally, validate and size-limit messages, restrict CORS/routes, sanitize paths, confine output to the session root, use safe child-process arguments, and redact secrets.
- Add bounded buffers, queue/backpressure metrics, clock drift, service latency, detector/director costs, memory tracking, and alarms for lost records.
- Profile the real simulation; do not invent performance claims.

TESTS

Add unit, schema, integration, deterministic replay, failure-injection, end-to-end, and long-run tests. Cover births/parenting, separation/predation outcomes, competing stories, emergency override and return, quiet protected context, causal downgrades, death aftermath, predictions, adversarial LLM output, stale TTS, human priority, delayed OBS start, reconnect/deduplication, partial-write recovery, replay timing, identical seeded outcomes, bounded queues/memory, and consistent subtitles/highlights/chapters/EDL.

IMPLEMENTATION ORDER

0. Audit/design lock.
1. Telemetry, clock, schemas, persistence, markers.
2. Evidence, biographies, story threads, promises, predictions.
3. Ranking, switching, cameras, dashboard.
4. Companion, synchronized sessions, recovery.
5. Factual text narration and fallbacks.
6. Piper/audio lifecycle.
7. OBS integration.
8. Editorial analysis, highlights, stagnation, replay.
9. Exports and post-production.
10. Security, profiling, soak/failure tests, docs.

Complete and verify each phase before the next, but design contracts end-to-end first so later phases do not require incompatible rewrites.

VALIDATION AND HANDOFF

- Run focused tests while developing and the complete existing/new suite at the end.
- Run formatting, linting, type checks, build, and security-relevant validation available in the repo.
- Perform a real smoke session where locally available services permit it; use controlled fakes only for unavailable external software and state that clearly.
- Review the diff for unintended simulation changes, secrets, absolute paths, generated media, and unrelated edits.
- Provide concise final documentation: architecture, configuration reference, installation guide, operations/runbook, OBS setup, model/TTS setup, troubleshooting, recovery, export workflow, limitations, and extension guide for new event detectors.
- Report exactly what was implemented, validation results, remaining external installation actions, and any simulation capabilities that genuinely do not exist.

Do not stop merely because an external runtime is unavailable. Finish its integration, tests with controlled fakes, health checks, and instructions. Stop only for a genuinely blocking repository ambiguity that cannot be resolved safely from code and would materially change the design.
```

---

# Actions after the implementation prompt completes

These are operator steps, deliberately performed after the coding agent finishes. Commands assume Windows PowerShell and must be adjusted to the paths created by the implementation. Read the generated project documentation first because it should contain the exact supported versions, environment keys, scripts, and health-check command.

## 1. Review the implementation before installing anything

1. Read the coding agent's handoff and validation results.
2. Review `.env.example`, the operations guide, and the generated dependency/version requirements.
3. Confirm the browser app and companion tests pass with controlled service fakes.
4. Confirm no secrets or absolute local paths were committed.
5. Decide where large Ollama models, Piper voices, recordings, and session archives will live. Allow significant free disk space.

## 2. Install Node.js if it is not already suitable

Use the current LTS release supported by the completed project. Download it from the official Node.js site, reopen PowerShell, then verify:

```powershell
node --version
npm --version
```

From the companion directory, use the repository's lockfile/package manager. For npm projects this will usually be:

```powershell
npm ci
```

Do not replace a lockfile with an unpinned install unless the implementation documentation explicitly requires it.

## 3. Install Ollama

Install Ollama for Windows from the official installer. Windows installation exposes the local API at `http://localhost:11434` by default.

If model storage must be moved, set the user-level `OLLAMA_MODELS` environment variable to a dedicated directory, fully quit the Ollama tray process, and relaunch it before downloading models.

Verify:

```powershell
ollama --version
ollama list
```

## 4. Download the live narration model

Start conservatively with the model configured by the implementation. For the design discussed here:

```powershell
ollama pull qwen3.5:2b
```

The official Ollama registry currently lists `qwen3.5:2b` at roughly 2.7 GB. If the machine has comfortable spare memory and live latency remains acceptable, compare:

```powershell
ollama pull qwen3.5:4b
```

For a stronger post-session editorial pass on a capable machine, optionally use:

```powershell
ollama pull qwen3.5:9b
```

Do not assume the largest model is best for live narration. Measure end-to-end deadline success, not only prose quality. Keep model names configurable; do not hard-code them into source.

Test the selected model interactively:

```powershell
ollama run qwen3.5:2b
```

Then run the companion's Ollama health/structured-output test documented by the implementation. It must verify valid JSON-schema output, timeout handling, and an invalid-claim rejection fixture—not merely that the model answers “hello.”

## 5. Install Python for Piper if required

Use a current Python version supported by the completed integration. Verify:

```powershell
py --version
```

Create a dedicated virtual environment outside source-controlled runtime data, or in the implementation's documented ignored tools directory:

```powershell
py -m venv .venv-piper
.\.venv-piper\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install piper-tts
```

If PowerShell blocks activation, follow your organization’s execution-policy rules; do not weaken system-wide security merely for this project. The companion should also support configuring the virtual environment’s Python executable directly.

## 6. Download and test a Piper voice

List available voices:

```powershell
python -m piper.download_voices
```

Download the exact voice chosen in project configuration. For example:

```powershell
New-Item -ItemType Directory -Force -Path '.\runtime\piper-voices'
python -m piper.download_voices --data-dir '.\runtime\piper-voices' en_GB-alan-medium
```

Test synthesis:

```powershell
python -m piper --data-dir '.\runtime\piper-voices' -m en_GB-alan-medium -f '.\runtime\piper-test.wav' -- 'The herd is moving towards the remaining water.'
```

Listen for pronunciation, clipping, and acceptable speed. Run the project's Piper health test and confirm the produced WAV metadata and playback callbacks are recorded. For repeated live lines, use the persistent Piper service mode implemented by the project where available; per-line CLI startup is a fallback.

Piper is GPL-3.0 software. Review licensing obligations before distributing Piper or bundling it with a shipped product.

## 7. Install and configure OBS Studio

Install OBS Studio from its official download page. Modern OBS includes WebSocket support, so a separate obs-websocket plugin should not normally be installed.

In OBS:

1. Run the Auto-Configuration Wizard or configure recording manually.
2. Add the simulation window/browser capture as the clean programme source.
3. Configure the desired canvas, output resolution, frame rate, encoder, and recording directory.
4. Prefer a crash-resistant recording container supported by the installed OBS version; remux later if needed.
5. Open **Tools -> WebSocket Server Settings**.
6. Enable the server and authentication.
7. Use the default loopback port unless the project config says otherwise (commonly `4455`).
8. Generate a strong password and place it only in the companion `.env`.
9. Do not expose the OBS WebSocket port to the internet.

Suggested audio tracks where routing permits:

```text
Track 1  complete programme mix
Track 2  simulation/natural sound
Track 3  human microphone
Track 4  generated narrator
Track 5  music
Track 6  auxiliary/alerts
```

If narrator audio cannot initially be routed separately, retain the individual Piper WAV assets so narration can be replaced in post-production.

## 8. Install FFmpeg if review-cut exports require it

FFmpeg's official download page links to Windows build providers because the project itself distributes source. Install a trusted build linked there, add its `bin` directory to the user PATH if the project expects PATH discovery, and verify:

```powershell
ffmpeg -version
ffprobe -version
```

Configure the companion with an explicit FFmpeg path if supported. Run a harmless probe/export smoke test before a long recording.

## 9. Configure the companion environment

Copy the provided example without committing the resulting secret file:

```powershell
Copy-Item '.env.example' '.env'
```

Populate the exact keys generated by the implementation. They will normally include equivalents of:

```dotenv
COMPANION_HOST=127.0.0.1
COMPANION_PORT=8765
COMPANION_SESSION_TOKEN=generate-a-long-random-value
SESSIONS_DIR=D:\DocumentarySessions

OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_LIVE_MODEL=qwen3.5:2b
OLLAMA_POST_MODEL=qwen3.5:9b

PIPER_PYTHON=C:\path\to\.venv-piper\Scripts\python.exe
PIPER_DATA_DIR=C:\path\to\runtime\piper-voices
PIPER_VOICE=en_GB-alan-medium

OBS_WEBSOCKET_URL=ws://127.0.0.1:4455
OBS_WEBSOCKET_PASSWORD=replace-this

FFMPEG_PATH=C:\path\to\ffmpeg.exe
FFPROBE_PATH=C:\path\to\ffprobe.exe
```

Use the implementation's actual names. Quote or escape Windows paths according to its environment parser. Keep runtime/session directories outside the source tree or explicitly ignored.

## 10. Run dependency and safety checks

With Ollama running and OBS open, run the project's documented preflight command. It should check:

- Browser/companion version compatibility.
- Schema versions.
- Writable and sufficiently spacious session directory.
- Loopback binding and session authentication.
- Ollama API/model presence and structured output.
- Piper executable/service, voice, and WAV output.
- OBS WebSocket authentication and recording-state access.
- FFmpeg/ffprobe when enabled.
- No secrets in browser-delivered configuration.

Resolve every red status before a long session. Yellow optional-service status must correspond to an understood degradation mode.

## 11. Perform staged commissioning

Do not begin with a six-hour autonomous recording.

1. **Five-minute metadata-only test:** cinema mode, events, story threads, camera decisions, markers, IndexedDB, and exports.
2. **Ten-minute subtitle test:** Ollama enabled, Piper disabled. Inspect every claim and rejection log.
3. **Ten-minute TTS test:** verify queue expiry, exact playback timing, speech occupancy, human priority, and WAV archive.
4. **Fifteen-minute OBS test:** verify confirmed time zero, recording path, separate tracks where configured, clock drift, and subtitles.
5. **Failure test:** interrupt Ollama, Piper, companion, and OBS one at a time; confirm safe degradation and recovery.
6. **One-hour soak:** inspect memory, queues, disk growth, camera oscillation, repetitions, stagnant classification, and incomplete promises.
7. **Six-hour commissioning run:** only after all earlier gates pass. Verify finalization and full editorial package.

## 12. Calibrate rather than immediately retrain

Start by tuning deterministic configuration:

- Event thresholds and confirmation windows.
- Thread scoring weights.
- Minimum holds, cooldowns, interruption thresholds, and return deadlines.
- Camera feasibility and shot timing.
- Speech occupancy, word limits, deadlines, and repetition suppression.
- Stagnation hysteresis, pre-roll, and post-roll.

The LLM should not need fine-tuning to begin. Improve factual packets, schema constraints, validators, and fallback templates before considering custom model training.

## Current official references

- Ollama Windows installation: https://docs.ollama.com/windows
- Ollama Windows download: https://ollama.com/download/windows
- Ollama Qwen 3.5 model registry: https://ollama.com/library/qwen3.5
- Piper project: https://github.com/OHF-Voice/piper1-gpl
- Piper CLI installation and voice commands: https://github.com/OHF-Voice/piper1-gpl/blob/main/docs/CLI.md
- OBS download: https://obsproject.com/download
- OBS WebSocket remote-control guide: https://obsproject.com/kb/remote-control-guide
- Node.js downloads: https://nodejs.org/en/download
- FFmpeg download page: https://ffmpeg.org/download.html

Because these tools evolve, re-check their official documentation at installation time rather than treating version numbers in this document as permanent pins.
