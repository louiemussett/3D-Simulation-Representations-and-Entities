# Animal perception Phase 0 baseline

Captured on 2026-08-14 before any Phase 1 biological changes.

| Contract | Deterministic hash |
|---|---:|
| Combined Phase 0 snapshot | `2b49c409` |
| Valley Grazer and Ridge Hunter visual structure | `d31f1155` |
| Founder sensory phenotypes | `4f85cfeb` |
| Clear-line-of-sight vision fixture | `a58d0449` |

The executable source of these records is `src/perception-baselines.js`. The
founder visual record now supplies the unchanged body, head and Ridge Hunter
tail dimensions used by the renderer, so a later edit cannot update rendering
without also invalidating the baseline test.

## Extracted boundaries

- `environment-interface.js`: read-only terrain, height, cover and weather queries.
- `vision-interface.js`: the single authoritative visibility query used by simulation presentation.
- `scent-model.js`: existing scent deposition and decay, detached from application globals.
- `perception-orchestrator.js`: classification of detected contacts into sight, hearing, signal and map-reveal channels.

These extractions intentionally preserve all current coefficients, thresholds,
sensor phenotypes, random-number use and decision behaviour. They are seams for
later scientific work, not new biological models.

