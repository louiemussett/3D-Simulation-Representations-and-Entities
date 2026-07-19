# Issue ledger

| ID | System | Title | Severity | Status | Baseline reference | Evidence / next check |
|---|---|---|---|---|---|---|
| BB-001 | Terrain | Square board is not fully covered by terrain on some seeds | Major | Reported | §3.1 board edge | Reset several seeds; inspect every corner at map view. |
| BB-002 | Hydrology | Lakes, rivers and streams may be absent visually despite enabled controls | Major | Failed — reverted | §3.1–3.3 | User requested restoration of the earlier shared-terrain water appearance after the separate water-surface attempt failed visually. The project is back on that baseline; BB-002 remains the sole active issue. Any new approach requires approval before editing. |
| BB-003 | Terrain | High relief/mountain settings can generate visually flat terrain | Major | Reported | §3.1 elevation/mountains | Compare identical seed under low vs high relief/mountain setup. |
| BB-004 | Perception | Body orientation, visual cone and actual sight/contact state can disagree | Major | Reported | §5.1–5.2 | Select turning grazer and hunter; compare cone, arrow, sight contacts and fog. |
| BB-005 | Perception | Entity overlays may reveal water/terrain outside actual accessible information | Major | Reported | §2, §5.2 | New entity, no prior movement: check black map, water overlay and memory arrows. |
| BB-006 | Movement | Animal motion can appear to jump, travel backwards or lose track of its target | Major | Reported | §4.2 movement | Follow a locked entity at 1 tick/s through turns, slope and group movement. |
| BB-007 | Ecology | Hunter/grazer interaction may fail to react plausibly to nearby perceived threats/prey | Major | Reported | §4.2 hunting, §5 | Controlled close-contact observation with sight/sound evidence recorded. |
| BB-008 | UI | Overlay labels/markers can be unclear or not match what is drawn | Minor | Reported | §6.3 | Toggle each overlay independently and compare to legend/selected details. |
| BB-009 | Rendering | Terrain/asset animation, shimmer, holes or legacy-looking layers can occur | Major | Reported | §2, §3.1 | Pan/zoom at multiple heights; reset and select entity. |
| BB-010 | Family/social | Parent-child persistence and care can be lost to low-priority actions | Major | Reported | §4.3–4.4 | Follow a mother/dependent separation, distress and reunion. |
| BB-011 | World generation | Terrain, climate, weather and hydrology are generated in the wrong dependency order | Critical | Failed — reverted | §3.1–3.3 | Reverted every BB-011 code change made after the prompt that incorrectly introduced this redesign into the bug-bash cycle: terrain-noise changes, drainage-derived lakes/headwaters, authored-lake removal, and shoreline override removal. The earlier shared-terrain/lake baseline is restored. A full generation redesign remains a separate future task. |

## New issue template

### BB-XXX — title

- **System:**
- **Severity / status:**
- **Seed and setup:**
- **Day/tick/speed:**
- **View/selection:**
- **Steps:**
- **Expected:**
- **Actual:**
- **Evidence:**
- **Frequency:**
- **Fix / verification:**
