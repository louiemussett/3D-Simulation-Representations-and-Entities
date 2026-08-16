# Cinema Mode AI: Implementation and Model Evaluation Plan

## Executive decision

Use a three-tier narration system:

1. **Deterministic templates** for urgent, routine, fallback, and precisely timed lines.
2. **Qwen 3.5 4B** as the first production candidate for flexible live narration on the Ryzen 5 5600 / GTX 1070 8 GB / 64 GB desktop.
3. **Qwen 3.5 9B or another benchmark winner** for asynchronous recaps and post-session editorial work only if real workload tests justify it.

Keep **Qwen 3.5 2B** as the safe low-load live profile and **Qwen 3 1.7B** as the already-installed baseline. Do not choose the final model by reputation, parameter count, or prose samples. Select it using a reproducible cinema-mode benchmark that tests factual safety, deadline reliability, narration quality, simulation stability, and OBS recording health together.

Gemma 4 E2B should be an optional comparison candidate, not the default. Its “E2B” label means effective parameters; Ollama currently lists its package at approximately 7.2 GB, which leaves little headroom on an 8 GB GPU shared with rendering and recording. Gemma 4 E4B is larger still. They may run well with partial CPU offload, but that must be demonstrated rather than assumed.

## Corrections and conclusions from the supplied research

### Supported conclusions

- The language model should render authorized facts into natural prose, not discover events or direct cameras.
- The available 30-second speech window permits a stronger live model than an instant-response interface would.
- Overlap Ollama generation with current speech and keep at most one validated passage ready ahead.
- Disable thinking for routine narration.
- Validate every result before TTS.
- Use measured Piper audio duration rather than trusting the model to estimate speaking time.
- Benchmark under the full workload with the simulation, OBS, Piper, director, and persistence active.
- Templates remain essential even when a capable model is installed.

### Claims that must not become design assumptions

- Subjective star ratings or claims such as “four to six times more useful.”
- Assertions that a model will run “comfortably” without measurements on the actual machine.
- The assumption that larger automatically means safer or more factual.
- Treating supported context length as evidence that a small model can reliably reason over an enormous history.
- Treating E2B/E4B as download size or total memory use.
- Assuming 30-second narration should play continuously.

### Narration cadence correction

Thirty seconds is a maximum production opportunity, not a requirement to fill every slot. Nature-documentary pacing should remain event-driven. The default target should still permit speech during roughly 20–35% of the programme, with long natural-sound intervals where appropriate.

The scheduler may prepare one passage while another plays, but it must cancel or revise the prepared passage if:

- its facts change;
- another story becomes primary;
- an emergency interrupts;
- the camera no longer supports it;
- the same topic has already been covered;
- silence is now editorially preferable.

## Responsibility boundary

### Deterministic documentary engine owns

- Event truth and evidence.
- Story-thread state and memory.
- Narrative significance and selection.
- Camera subject and shot purpose.
- Whether narration is needed.
- Narration function, deadline, target duration, and allowed claims.
- Causal confidence.
- Character names and relationships.
- Corrections, interruption policy, and fallback choice.

### LLM owns only

- Sentence construction.
- Concise connection of supplied facts.
- Variation within a controlled documentary style.
- Re-entry, transition, recap, and explanation phrasing.

### LLM must never own

- Selecting which event matters.
- Inferring hidden intentions or emotions.
- Predicting without an explicit permitted prediction.
- Resolving an event that remains open.
- Changing names, quantities, relationships, or causal strength.
- Deciding whether its own output is safe.

## Runtime profiles

Implement profiles as configuration rather than divergent code paths.

### `template_only`

- No Ollama dependency.
- Urgent events, status transitions, factual corrections, and degraded operation.
- Exact phrase construction from verified fields.
- Suitable for the ThinkPad and for maximum recording stability.

### `live_low_load`

- Primary candidate: `qwen3.5:2b`.
- Alternative baseline: `qwen3:1.7b`.
- Short transitions and single-thread explanations.
- Strict context and output limits.

### `live_quality`

- Initial candidate: `qwen3.5:4b`.
- Used for 15–35-second narration passages, re-entry, multi-fact explanation, and short recaps.
- Remains resident when resources allow.

### `editorial_async`

- Initial candidate: `qwen3.5:9b`.
- Optional candidates: Gemma 4 E2B or another locally benchmarked model.
- Used for five-minute summaries, chapter descriptions, story connections, post-session reports, and retrospective scripts.
- Must be pre-emptible or disabled while live generation needs GPU access.

### `automatic`

- Chooses among installed benchmark-approved profiles using current service health, GPU headroom, generation latency, queue state, and recording health.
- Downgrades rapidly; upgrades conservatively at safe boundaries.
- Never switches models mid-request.

## AI subsystem components

```text
NarrationPlanner
  -> NarrationSlotScheduler
  -> EvidencePacketBuilder
  -> PromptCompiler
  -> OllamaClient
  -> StructuredResponseParser
  -> ClaimExtractor
  -> DeterministicClaimValidator
  -> DurationController
  -> NarrationApprover
  -> PiperQueue
  -> PlaybackTracker
  -> TopicMemory / CorrectionLedger / Metrics
```

### NarrationPlanner

Inputs:

- Current and secondary story threads.
- Current shot and camera feasibility.
- Recent verified events.
- Promise ledger and pending corrections.
- Recent narration topics and speech occupancy.
- Current natural-sound value.
- Time remaining in current audio.
- Service health and runtime profile.

Output is a deterministic intent or `SILENCE`:

```json
{
  "intentId": "intent-0043",
  "decision": "NARRATE",
  "function": "REENTRY_EXPLANATION",
  "threadId": "thread-mara-calf",
  "priority": 0.78,
  "earliestStartMs": 480000,
  "latestUsefulStartMs": 497000,
  "targetDurationMs": 24000,
  "reason": "Thread returned after 94 seconds and has materially developed"
}
```

### NarrationSlotScheduler

Use explicit states:

```text
IDLE
ACCUMULATING
GENERATING
VALIDATING
REPAIRING
SYNTHESIZING
READY_NEXT
NOW_PLAYING
EXPIRED
CANCELLED
FAILED
```

Allow only:

- one `NOW_PLAYING` item;
- one `READY_NEXT` item;
- one speculative `GENERATING` item.

The speculative item may be cancelled without affecting the ready item. Do not build a long narration backlog because live facts age quickly.

### Scheduling policy

For a passage currently playing:

```text
0–40% elapsed    accumulate developments; avoid premature topic choice
40–65% elapsed   select provisional next intent if editorially justified
55–85% elapsed   generate and validate
after validation synthesize with Piper and measure exact WAV duration
before playback  perform final freshness and camera-compatibility check
```

This is adaptive, not a fixed timeline. Urgent corrections and emergency events bypass normal scheduling and use a short template or short high-priority generation.

## Evidence packet schema

The LLM packet should be compact, typed, and self-contained:

```json
{
  "schema_version": 1,
  "request_id": "narreq-0043",
  "task": "render_documentary_narration",
  "function": "REENTRY_EXPLANATION",
  "language": "en-GB",
  "style": {
    "tone": "observational, restrained, scientifically grounded",
    "personification": "forbidden_without_evidence",
    "dramatic_intensity": 0.45
  },
  "timing": {
    "target_words": 56,
    "minimum_words": 48,
    "maximum_words": 62,
    "target_duration_ms": 24000,
    "latest_useful_result_ms": 496000
  },
  "camera": {
    "shot_type": "TRACKING_MEDIUM",
    "visible_subject_ids": ["A-MARA"],
    "visible_facts": ["Mara is moving north along the eastern riverbank"]
  },
  "thread": {
    "id": "thread-mara-calf",
    "question": "Will Mara return to her calf?",
    "phase": "ESCALATION",
    "previously_established": [
      "Mara separated from herd H17",
      "Mara's calf remains with herd H17"
    ]
  },
  "verified_facts": [
    {
      "fact_id": "fact-91",
      "claim": "Mara is 620 metres from her calf",
      "status": "CURRENT",
      "evidence_ids": ["evt-201", "snapshot-39"]
    }
  ],
  "permitted_interpretations": [
    {
      "interpretation_id": "interp-4",
      "text": "Increasing distance may make reunion more difficult",
      "causal_level": "EDITORIAL_HYPOTHESIS"
    }
  ],
  "permitted_predictions": [],
  "forbidden_claims": [
    "Mara deliberately abandoned the calf",
    "Mara is frightened",
    "Mara knows the herd's location",
    "The calf is in immediate danger"
  ],
  "continuity": {
    "previous_text": "Mara paused beside the river as the herd continued west.",
    "avoid_topics": ["initial separation"],
    "required_reentry_context": "Mara and her calf remain apart"
  }
}
```

Use IDs in structured data but do not make the model reproduce internal IDs in spoken text.

## Structured LLM result

Require JSON-schema output from Ollama:

```json
{
  "text": "...",
  "claims": [
    {
      "surface_text": "...",
      "support_type": "VERIFIED_FACT",
      "support_ids": ["fact-91"]
    }
  ],
  "mentioned_subject_ids": ["A-MARA"],
  "used_interpretation_ids": ["interp-4"],
  "used_prediction_ids": [],
  "word_count": 56
}
```

The model-provided claim map is advisory. The deterministic validator must independently inspect the final text.

Recommended Ollama request controls:

- Local `/api/chat` endpoint.
- `stream: false` for the initial simple implementation; add streaming only for early cancellation/metrics if justified.
- JSON schema in `format` and repeated compactly in the prompt.
- `think: false` for routine narration.
- Low temperature, initially `0` for safety evaluation and later a small benchmarked value for stylistic variation.
- Strict maximum output token budget.
- `keep_alive` long enough to avoid repeated model loading during a session.
- Abort controller and hard deadline.
- Record Ollama's `load_duration`, `prompt_eval_count`, `prompt_eval_duration`, `eval_count`, `eval_duration`, `total_duration`, and completion reason.

Do not use a huge rolling chat transcript. The engine owns memory and supplies the relevant summary in each packet.

## Deterministic validation pipeline

Validation must be layered:

1. HTTP success and request identity.
2. JSON parse.
3. JSON-schema validation.
4. Result is still before its deadline.
5. Thread and shot are still relevant.
6. Word-count and formatting limits.
7. Known names and relationships only.
8. Numbers must match allowed facts or approved rounding rules.
9. Outcome-state consistency: no resolution while developing.
10. Causal-language strength does not exceed evidence level.
11. No unsupported emotion, intention, knowledge, fear, hope, purpose, or certainty.
12. No unsupported spatial/visual claim.
13. No forbidden claim or close semantic equivalent.
14. No excessive overlap with recent narration.
15. No prompt leakage, analysis, headings, stage directions, or model commentary.
16. Claim-map support IDs exist and are compatible.
17. Final freshness check immediately before TTS and playback.

Use deterministic entity dictionaries, numeric extraction, prohibited epistemic verbs, state-machine checks, and evidence lookup first. An optional second model must not be the only validator.

### Repair policy

- Mechanically repair harmless punctuation or whitespace.
- Shorten deterministic trailing clauses when only length is invalid and meaning remains intact.
- Regenerate once with precise validation errors if time allows.
- Otherwise use a template or silence.
- Never repeatedly regenerate past the deadline.

### Causal wording policy

Examples:

```text
DIRECT / DETERMINISTIC
"The drying river has forced the herd onto the northern route."

STRONG_ASSOCIATION
"As the river has dried, the herd has increasingly used the northern route."

EDITORIAL_HYPOTHESIS
"The loss of water may be drawing the herd towards the northern route."

UNKNOWN
Do not state a causal relationship.
```

## Passage duration control

Do not ask the model to estimate seconds. Maintain a measured voice profile:

```json
{
  "voice": "en_GB-alan-medium",
  "median_words_per_minute": 136.4,
  "duration_model_version": 3,
  "samples": 240,
  "punctuation_adjustments": {
    "comma_ms": 90,
    "sentence_end_ms": 230
  }
}
```

Initial word target:

```text
targetWords = targetSeconds * measuredWpm / 60
```

Then synthesize and inspect the actual WAV duration. Use a duration tolerance appropriate to the editorial slot, for example ±2 seconds for a 25-second passage. If audio is too long:

1. Prefer a precomputed shorter approved variant if available.
2. Otherwise regenerate/shorten only if the slot remains relevant.
3. Never time-stretch narration aggressively without an explicit audio-quality policy.

Update the measured voice profile from successful generated assets while separating narration modes and punctuation patterns if useful.

## Template narrator

Templates are a primary production component, not merely an error message.

Create templates by narration function and event family with:

- required facts;
- optional clauses;
- causal-level wording;
- short/medium variants;
- re-entry and correction forms;
- language and voice-duration estimates;
- repetition keys.

Examples:

```text
BIRTH_SHORT:
"A new {speciesLabel} has been born in {groupLabel}."

SEPARATION_REENTRY:
"{subjectName} and {relationName} remain apart. The distance between them is now {distanceLabel}."

CORRECTION:
"A correction: {correctedFact}. {clarifyingFact}."
```

Templates must pass through the same evidence and playback logging pipeline as LLM text.

## Model arbitration and resource management

### Do not keep all models loaded

On an 8 GB GTX 1070, simultaneous resident live and editorial models may force offload or contention. Implement a model manager:

- Pin only the selected live model during live sessions when profiling shows this is beneficial.
- Do not start asynchronous editorial generation when a live request is expected soon.
- Pause/cancel editorial work if live deadline risk rises.
- Unload models deliberately at session boundaries or when switching profiles.
- Record load time separately from generation time.

### Automatic downgrade triggers

Downgrade `4B -> 2B -> existing 1.7B -> templates` when a rolling window shows any configured threshold breach:

- narration ready-deadline misses;
- model load thrashing;
- simulation tick instability;
- sustained FPS regression;
- OBS render/encoding lag or dropped frames;
- GPU memory pressure;
- TTS queue delay;
- validation failure rate;
- companion resource pressure.

Upgrade only after a cooldown and at a story/narration boundary.

### Circuit breaker

Open the LLM circuit after repeated timeouts, invalid outputs, or API failures. Continue with templates/silence, probe health at increasing intervals, and close only after successful schema-valid test responses.

## Benchmark programme

### Candidate set

Minimum:

```text
qwen3:1.7b       existing baseline
qwen3.5:2b       safe candidate
qwen3.5:4b       recommended initial production candidate
qwen3.5:9b       quality/async candidate
gemma3:1b        legacy baseline if installed
template_only    deterministic control
```

Optional:

```text
gemma4:e2b       only after resource-headroom review
```

Do not download every candidate blindly. Detect installed models first, benchmark those, then add the next candidate deliberately.

### Evaluation corpus

Create at least 150–250 version-controlled evidence packets distributed across:

- Simple observation.
- Multi-fact explanation.
- Re-entry after absence.
- Causal levels.
- Prediction versus outcome.
- Developing versus resolved events.
- Corrections.
- Relationship continuity.
- Similar names and IDs.
- Numerical distances/times/populations.
- Camera-visible versus off-camera facts.
- Rare behavior.
- Quiet observation.
- Emergency short lines.
- Contradictory or superseded facts.
- Prompt-injection-like strings originating in operator labels.
- No-worthy-narration cases.
- Repetition over simulated hour-long sequences.

Each packet needs machine-checkable allowed claims, forbidden claims, expected entities, permissible number transformations, timing target, and human quality rubric.

### Run modes

For each candidate:

1. Cold model load.
2. Warm isolated generation.
3. Repeated 100+ packet batch.
4. Full live stack: Three.js simulation, director, persistence, Piper, and OBS recording.
5. One-hour soak with realistic narration cadence.
6. Failure/recovery and model-switch tests.

Randomize model/order where possible to reduce thermal and sequence bias. Repeat critical tests across multiple runs.

### Metrics

#### Hard safety

- Unsupported factual claim rate.
- Forbidden inference rate.
- Entity/name/relationship error rate.
- Numeric error rate.
- Causal-strength violation rate.
- Premature-resolution rate.
- Camera-compatibility violation rate.
- Schema-valid rate.
- Deterministic validator rejection rate.
- Unsafe output escape rate; target must be zero in the test corpus.

#### Deadline and throughput

- Cold/warm load duration.
- Prompt evaluation time.
- Generation time.
- Total time to validated text.
- Piper synthesis time.
- Total time to validated ready WAV.
- P50/P95/P99 latency.
- Deadline success rate.
- Cancellation response time.

#### Editorial quality

- Clarity.
- Naturalness.
- Restraint.
- Continuity.
- Non-repetition.
- Appropriate uncertainty.
- Faithfulness to narration function.
- Word/duration compliance.
- Human preference under blinded comparison.

#### System impact

- Simulation tick-rate distribution and late ticks.
- Render FPS and frame-time percentiles.
- OBS render lag, encoding lag, and dropped frames.
- GPU utilization and VRAM peak.
- CPU per-core utilization.
- System RAM and paging.
- Companion queue depth and persistence latency.
- Piper latency and audio underruns.

### Promotion gates

A live model is eligible only if:

- zero unsupported claims escape deterministic validation in the controlled corpus;
- schema and parsing success meet the configured target;
- at least 99% of routine requests produce a ready WAV before the operational deadline under the full workload;
- simulation and OBS performance stay inside user-approved degradation budgets;
- long-run repetition and factual drift remain acceptable;
- failure modes reliably fall back without stalling the programme.

Use separate gates for urgent short narration and planned long narration. A model may qualify for one but not the other.

## Implementation phases

### Phase AI-0 — Contract and fixture design

- Finalize evidence packet, structured result, causal-language, and validation schemas.
- Build representative fixtures from actual simulation concepts.
- Define latency and system-impact instrumentation.

Gate: fixtures are independently reviewable and machine-checkable.

### Phase AI-1 — Template narrator and narration state machine

- Implement deterministic intent selection, template library, slot scheduler, cancellation, expiry, topic memory, and logging.
- Integrate with subtitles without Ollama or Piper.

Gate: the documentary can narrate safely with no AI installed.

### Phase AI-2 — Ollama client and structured response

- Add configurable client, schema output, thinking disabled, keep-alive, deadlines, aborts, metrics, and circuit breaker.
- No direct browser-to-Ollama access.

Gate: fake and real health tests cover cold/warm response, timeout, malformed JSON, missing model, and cancellation.

### Phase AI-3 — Claim validator

- Implement all deterministic validation layers, causal policy, entity/numeric/state checks, repetition analysis, and repair/fallback.
- Add adversarial tests.

Gate: no unsafe corpus output reaches approval.

### Phase AI-4 — Piper duration loop

- Generate WAV, inspect actual duration, update voice profile, and perform final freshness checks.
- Track exact playback timings.

Gate: speech slots meet tolerance and stale audio never plays.

### Phase AI-5 — Benchmark harness

- Automate candidate detection, corpus runs, workload runs, metrics collection, JSON/CSV/HTML reports, and blinded review exports.
- Record exact model digests and settings.

Gate: repeated runs are comparable and produce a signed-off recommendation rather than a hard-coded winner.

### Phase AI-6 — Runtime profiles and adaptive fallback

- Implement configured profiles, resource monitoring, downgrade/upgrade policy, circuit breaker, and editorial pre-emption.

Gate: injected resource/service failures switch modes without missed critical narration or recording interruption.

### Phase AI-7 — Long-run editorial memory and async model

- Add bounded thread/session summaries and asynchronous editorial tasks.
- Ensure these never compete destructively with live narration.

Gate: a one-hour and then six-hour soak shows bounded context, queues, repetition, and resource use.

## Configuration example

```json
{
  "ai": {
    "enabled": true,
    "profile": "automatic",
    "ollamaBaseUrl": "http://127.0.0.1:11434",
    "liveModels": ["qwen3.5:4b", "qwen3.5:2b", "qwen3:1.7b"],
    "editorialModel": "qwen3.5:9b",
    "thinking": false,
    "temperature": 0,
    "keepAlive": "30m",
    "generationDeadlineMs": 15000,
    "repairDeadlineMs": 7000,
    "maximumQueuedReady": 1,
    "maximumSpeculative": 1,
    "targetSpeechOccupancy": 0.28,
    "minimumSilenceMs": 8000,
    "circuitBreakerFailures": 3,
    "circuitBreakerProbeMs": 30000
  }
}
```

Defaults must be conservative and every value documented.

## Session records and auditability

For every attempt, save:

- Intent and deterministic reason.
- Exact evidence packet.
- Model name, digest, runtime settings, and prompt-template version.
- Request/response timings and Ollama counters.
- Raw structured response.
- Every validator result and repair.
- Approved/fallback text.
- Piper model/voice and WAV duration.
- Final freshness result.
- Playback start/end/interruption.
- Linked camera shot, thread, evidence, and correction.

Raw model output should be in restricted diagnostic logs, not the public programme metadata by default if it could contain prompt leakage or inappropriate text.

## Acceptance criteria

- Cinema mode operates fully in `template_only` mode.
- No AI output reaches speech without schema, evidence, and freshness validation.
- The LLM cannot introduce a new entity, number, relationship, emotion, intention, cause, or outcome unchecked.
- Thinking is disabled for routine live narration.
- The engine keeps no more than one ready and one speculative item.
- Prepared narration is cancelled when its story or camera context changes.
- Measured WAV duration controls scheduling.
- Model failure never blocks simulation, camera direction, logging, or recording.
- Model choice is configuration backed by benchmark results.
- Full-workload tests include OBS dropped frames and simulation tick stability.
- Live and async workloads cannot contend without arbitration.
- All model requests are local by default and no simulation data is sent to a cloud service unless explicitly added and enabled by the operator.

## Recommended commissioning order for this machine

1. Measure current simulation plus OBS baseline with no AI.
2. Validate template-only narration and Piper.
3. Benchmark the already-installed `qwen3:1.7b`.
4. Benchmark `qwen3.5:2b` under the identical workload.
5. Benchmark `qwen3.5:4b`; make this production live model only if it clears all gates.
6. Test `qwen3.5:9b` for asynchronous/editorial work and optionally live work, without assuming it will qualify.
7. Test Gemma 4 E2B only if there is a specific quality reason and measured GPU/CPU headroom.
8. Run 10-minute, 1-hour, and 6-hour commissioning sessions with failure injection.

## Current primary-source facts used in this plan

- Ollama lists Qwen 3.5 packages at approximately 2.7 GB for 2B, 3.4 GB for 4B, and 6.6 GB for 9B, with a 256K advertised context window.
- Ollama lists Gemma 4 E2B at approximately 7.2 GB and E4B at approximately 9.6 GB.
- Google describes Gemma 4 E2B as 2.3B effective parameters but approximately 5.1B parameters including embeddings; E4B is 4.5B effective and approximately 8B including embeddings.
- Ollama's local chat API supports JSON-schema response format, a `think` control, `keep_alive`, and timing/token counters useful for benchmarking.
- Ollama recommends schema validation in application code and notes that low temperature improves structured-output determinism.

References:

- Qwen 3.5 Ollama tags: https://ollama.com/library/qwen3.5/tags
- Gemma 4 Ollama library: https://ollama.com/library/gemma4
- Google Gemma model overview: https://ai.google.dev/gemma/docs
- Google Gemma 4 model details: https://ai.google.dev/gemma/docs/core
- Ollama structured outputs: https://docs.ollama.com/capabilities/structured-outputs
- Ollama chat API: https://docs.ollama.com/api/chat
- Ollama thinking controls: https://docs.ollama.com/capabilities/thinking
- Ollama model keep-alive guidance: https://docs.ollama.com/faq

Reconfirm these facts when installing or pinning models because registries and runtimes change.
