# Predictive Documentary Author V2 (preserved recovery implementation)

> Historical document. V3/ACSS is the commissioned implementation. See
> `ACSS_PREDICTIVE_AUTHOR_IMPLEMENTATION_REPORT.md` and
> `ACSS_PREDICTIVE_AUTHOR_OPERATIONS.md`. V2 remains selectable only as an explicit
> recovery/comparison mode and does not train or control the V3 author.

The authored-knowledge redesign is implemented in `src/documentary-author/` and integrated through `DocumentarySystem.authorCycle()`.

## Runtime modes

Cinema Mode → Live documentary studio → Authored knowledge offers:

- **Predictive author** (`V2_ACTIVE`): V2 selects silence/coverage, emits evidence-bounded narration contracts and supplies adaptive camera intentions.
- **Predictive shadow audit** (`V2_SHADOW`): V2 records evidence, propositions, situations, predictions and decisions while the established deterministic narrator remains audible.
- **Legacy deterministic** (`LEGACY`): bypasses V2 selection and uses the preserved implementation.

The selection persists in browser local storage. Documentary manifests and production-event records include the author mode.

## Implemented pipeline

```text
scene + Laboratory archive
→ bounded immutable evidence
→ epistemically typed propositions
→ versioned claims
→ compressed documentary world model
→ typed situations
→ bounded predictions
→ audience novelty and question memory
→ eligible editorial candidates including silence
→ scored selection with commitment hysteresis
→ narration and camera contracts
→ deterministic semantic realisation
→ presentation trace and outcome evaluation
```

Archive fields are examined as evidence but are not directly spoken as raw field names. Communicable propositions remain separate from supporting archive evidence.

## Laboratory entity names

Enable **Entity names** under Laboratory → Entity overlays or Observer → Perception and presentation → Body and social cues.

- Disabled by default.
- Remembered locally between runs.
- Displays `name`, then `label`, then stable entity ID as fallback.
- Laboratory/observer presentation only.
- Hidden in Movie Mode and Body-only mode.
- Hidden at distant presentation tiers to control clutter.
- Does not alter perception, memory, decisions or social recognition.

## Safety and boundedness

- Evidence, propositions, situations, predictions, audience memory, traces and queues have hard limits.
- Evidence and propositions are immutable.
- Claims are append-only revisions.
- Unsupported camera/narration subject combinations fail validation.
- Unknown epistemic state permits questions or silence, not confident assertion.
- Predictors may abstain and their outcomes are normalised.
- Bounded correction exists but remains disabled by default until enough outcome evidence is available.
- The prior system remains in `Backups/CinemaAuthoredKnowledge-2026-07-28`.

## Verification

```powershell
npm.cmd run check:documentary-author
node --test tests/predictive-documentary-author.test.mjs tests/entity-name-overlay.test.mjs
npm.cmd test
```

Browser automation remains subject to the previously observed local `chrome-headless-shell.exe` crash. Logic and static validation do not require headless Chrome.
