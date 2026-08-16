# Living Laboratory state ownership

This document is the human-readable companion to `src/architecture/system-ownership.js`.

## Rules

- The simulation clock owns tick and ecological time.
- Physiology systems own body state. Need states and capabilities are derived.
- The perception pipeline owns observations. Threat and intent assessments are observer-owned interpretations.
- The commitment system owns the current commitment identity and its event ledger.
- Need-plan execution owns satisfier method target phase and parallel obligations.
- Locomotion owns movement requests routes and authoritative animal position changes.
- Environment systems own terrain vegetation water weather and physical traces.
- Persistence owns serialized schema and migration. Runtime indexes are reconstructed.
- Presentation owns no biological truth and may not feed camera DOM mesh or audio state into animal decisions.

## Extraction rule

Structural extraction must preserve execution order random-number consumption saved state and authoritative hashes. Biological redesign follows only after parity has passed.
