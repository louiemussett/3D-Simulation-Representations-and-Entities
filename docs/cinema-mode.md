# Cinema Mode architecture

Cinema Mode observes the authoritative ecosystem and produces a synchronized live documentary without changing simulation behavior or consuming its random stream.

## Runtime flow

1. `src/app.js` supplies authoritative birth, death, conception, maturation, mating, activity, camera and narration observations.
2. `src/documentary/system.js` creates versioned records on a monotonic recording timeline.
3. Evidence, biographies and `StoryThreadManager` preserve causal and character context.
4. `DocumentaryPortfolioDirector` ranks a portfolio with inertia and logged alternatives.
5. Existing Movie mode camera templates perform the physical shot while `ShotStateMachine` records semantic grammar.
6. Deterministic template narration remains always available.
7. When connected, the companion sends a bounded evidence packet to Ollama, revalidates structured claims, generates Piper audio and returns a constrained local URL.
8. Browser playback records actual start/end times for subtitles and editing.
9. The companion persists append-only JSONL, recovers incomplete sessions and creates reports and editing exports at finalization.

## Truth boundary

The LLM receives selected verified facts. It cannot select a story, control the camera, inspect raw world state or assert unsupported emotions, intentions, numbers, causes or outcomes. Invalid, late or unavailable output becomes deterministic template narration or silence.

## Supported authoritative events

The current direct Movie adapter supports birth, death/kill evidence, conception, mating and maturation plus authoritative action-based story candidates. The documentary registry can accept other verified event families. Separation, migration, territory, environmental transitions and social changes should be added at their existing authoritative state transition rather than inferred from visual motion.

## Replay

The browser retains a bounded metadata replay buffer with distinct source and presentation times. Encoded video replay is capability-gated because browser video buffering can compromise simulation performance. OBS replay-buffer integration can be added through the companion without changing the metadata contract.

## Reproducibility

The session manifest stores the seed, simulation version and documentary configuration. Documentary IDs and presentation variation are independent of the simulation random stream. `tests/authoritative-state.test.mjs` and the documentary tests remain the determinism gates.
