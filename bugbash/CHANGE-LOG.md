# Change and decision log

This log records intentional changes relevant to the bug bash. It is not a replacement for source history; it explains *why* a behaviour changed and how it relates to the design baseline.

| Date | Change / decision | Reason | Affected baseline area | Evidence / follow-up |
|---|---|---|---|---|
| 2026-07-18 | Created bug-bash workspace and design baseline | Establish one comparison standard before broad repair work | All | Begin issue triage from `ISSUE-LEDGER.md`. |
| 2026-07-18 | Terrain generation adjusted to favour broad massifs; high relief/mountain settings no longer allow random prairie selection | User controls should have visible authority over generated terrain | §3.1 | Re-test with fixed seed under contrasting setup values. |
| 2026-07-18 | Water renderer changed to use actual water cells; day-one hydrology safeguard added | Configured rivers/lakes must be visible and drinkable at reset | §3.1–3.3 | Verify BB-002 before closing. |
| 2026-07-18 | Made every configured lake footprint and headwater drainage path active at reset; water surfaces now use each cell's stored lake level | Lakes and streams must be present before the first daily hydrology update, with lakes rendered as a single horizontal surface | §3.1–3.3 | BB-002 is ready for user visual verification; no other issue changed. |
| 2026-07-18 | Replaced the temporary raised per-cell water skin with basin-clipped lake meshes and downhill stream ribbons | Water must meet terrain at its shoreline rather than float over slopes or terrain features | §3.1–3.3 | Re-test BB-002 visually after reset. |
| 2026-07-18 | Replaced separate water meshes with water terrain faces in the shared hex terrain surface | Water must use the same clean continuous rendering pipeline as land, with no detached overlay | §3.1–3.3 | Re-test BB-002 visually after reset. |
| 2026-07-18 | Reopened BB-002 after user visual testing found floating and distorted water geometry; reverted the detached-patch attempt | A visual acceptance failure must be recorded rather than treated as a completed repair | §3.1–3.3 | BB-002 remains the only active issue. Stop after the next documented fix attempt. |
| 2026-07-18 | BB-002 one-attempt repair: retained the real terrain basin and added a flat water-only hex surface at the simulated waterline | A lake bed and a horizontal surface cannot occupy the same terrain vertices without distorting one; this uses the same terrain topology without forcing land to the waterline | §3.1–3.3 | Syntax check passed. Await user visual verification only; do not make another repair until approval. |
| 2026-07-18 | BB-002 visual verification failed: water disappeared after the first landscape refresh | The refresh path clears `groups.water`, while the new water surface was created only during terrain construction and was not rebuilt afterward | §3.1–3.3 | Status set to `Failed — diagnosis required`. Proposed next approach: one dedicated water-surface rebuild called after every water-group clear; await approval before editing. |
| 2026-07-18 | BB-002 one-attempt repair: extracted water-surface creation into a dedicated rebuild function and call it after every water-group clear | The water surface must survive normal landscape refreshes without altering terrain or hydrology | §3.1–3.3 | Syntax check passed. Ready for user visual verification only; await result before another edit. |
| 2026-07-18 | Reverted the separate flat water-surface attempt at the user's request | The separate surface did not match the accepted earlier appearance | §3.1–3.3 | Restored the prior shared-terrain water material and height behaviour. BB-002 remains `Failed — reverted`; no new approach is authorised. |
| 2026-07-18 | Registered BB-011 as the next direct design problem | Terrain, climate, weather and hydrology must be generated in causal order before water and terrain rendering can be repaired robustly | §3.1–3.3 | Write and approve the generation contract before implementation; BB-002 remains unchanged for now. |
| 2026-07-18 | Vision/cone transform, scent range and entity-overlay range corrected | Presentation and behaviour must share the same accessible-information boundaries | §5 | Verify BB-004 and BB-005 before closing. |
| 2026-07-18 | Tree/bush transforms anchored to cells; winter bare/fallen-tree states added | Vegetation should not drift and cover should have ecological states | §3.2 | Verify rendering and cover behaviour. |

| 2026-07-18 | BB-011 one-attempt repair: derived lake basins and headwaters after terrain sampling | Lakes now originate from closed terrain lows and headwaters from high drainage cells; old pre-authored lake ellipses and excavation were removed | §3.1–3.3 | Syntax check passed. Ready for user visual verification only; do not make another BB-011 implementation attempt without the user's result. |

| 2026-07-18 | BB-011 one-attempt terrain repair: added continuous seeded rolling elevation and non-circular hills | Normal relief should produce connected varied ground rather than a mostly flat plain interrupted by radial circular bumps; zero relief remains flat | §3.1 | Syntax check passed. Ready for user visual verification only; do not make another BB-011 implementation attempt without the user's result. |

| 2026-07-18 | BB-011 visual test failed: artificial circular plateaus appeared | Diagnosis: `terrainRenderHeight` raised every cell in an elliptical lake shoreline band to the lake level, creating the visible rings | §3.1 | User approved one follow-up limited to removing that override. |
| 2026-07-18 | BB-011 one-attempt follow-up: removed forced lake shoreline-band elevation | Terrain outside actual water cells now keeps its own elevation instead of being flattened into a circular lake-level plateau | §3.1 | Syntax check passed. Ready for user visual verification only; do not make another BB-011 implementation attempt without the user's result. |

| 2026-07-18 | BB-011 visual verification failed after shoreline-band removal | Circular forms remain and the map visibly changes in two stages | §3.1–3.3 | Diagnosis: reset draws static terrain; the first completed daily hydrology job later rebuilds the terrain with changed water/material state. No further edit made. Proposed next approach: replace split terrain/hydrology derivation with one coherent generation pass. |

| 2026-07-18 | Reverted all post-prompt BB-011 implementation changes | The redesign was incorrectly introduced during a one-issue BB-002 bug-bash cycle and caused unstable terrain/water behaviour | §3.1–3.3 | Restored the prior shared-terrain/lake baseline. Syntax check passed. BB-011 remains `Failed — reverted`; no full redesign is active. |

## Decision template

### DEC-XXX — title

- **Decision:**
- **Reason:**
- **Alternatives considered:**
- **Affected design sections:**
- **Consequences / verification:**
