# ACSS Predictive Documentary Author: Operations

## What is active

Cinema Mode now has a third-generation author whose present decisions are selected from dependency-closed ensembles of specialised world, behaviour, physiology, spatial, story, audience, camera and production models. It does not alter simulation truth. Its learned values are restricted to forecast calibration, bounded production-policy adjustments and explicit operator preferences.

The default is **ACSS learning shadow**. Shadow mode observes the same candidate scenes and calibrates predictions while the established deterministic director remains on air. Select **ACSS predictive author** to let its valid presentation contracts control subject choice, required story beat, minimum hold and permitted camera families.

## Learning lifecycle

- **Observe only** records beliefs, situations, selected model graphs and outcomes.
- **Calibrate forecasts** updates model reliability but does not adapt production policy.
- **Learn policy in shadow** calibrates forecasts and learns bounded hold/switch/framing policy without putting that policy on air.
- **Bounded active learning** permits validated bounded adjustments while ACSS controls presentation.
- **Validated active profile** is reserved for a profile accepted after long-session evaluation.

Learning is stored locally in `rss-acss-documentary-author-profile-v1`. A backup is written before every saved replacement. **Rollback learning** restores that backup. **Reset learning** removes learned calibration, policy and preferences; it never changes ecological state or fixed model definitions.

## Reading the author mind

Open **Live documentary studio → ACSS author mind**. It reports the current documentary concern, selected method and story beat, number of dependency models selected, lifecycle and learning revision. Revision growth means outcomes have been evaluated; it is not a claim that every learned adjustment is already allowed to direct the camera.

## Commissioned validation

Run these commands from the project root whenever the author is changed:

```powershell
npm.cmd run check
npm.cmd test
node .\scripts\documentary-browser-diagnostic.mjs
npm.cmd run documentary:validate-acss
```

The 29 July 2026 commissioning run passed all four gates. The logic suite passed
624 tests. The browser diagnostic used the real Cinema integration in
`V3_ACTIVE`/`BOUNDED_ACTIVE`, selected a licensed two-animal Character Stories
contract, kept both narration subjects in frame and reported zero runtime errors
and camera discontinuities. Training and held-out validation used disjoint seed
sets. Held-out mean Brier score improved from `0.207285` for the untrained profile
to `0.136133` for the trained profile, all 512 due forecasts resolved, and no
truth, policy, contract or camera safety violation was recorded.

The detailed evidence is in:

- `test-results/acss-browser-commissioning.json`;
- `test-results/acss-validation-report.json`;
- `test-results/acss-validation-certificate.json`.

The generated certificate is a commissioning artifact. Validation proves that a
matching in-memory profile can enter `VALIDATED_ACTIVE`; it does not silently
replace the viewer's browser profile. Use **Bounded active learning** for ordinary
live operation unless an intentionally imported profile has the exact matching
certificate.

The earlier native `chrome-headless-shell.exe` `0xe0000008` fault was not reproduced
by the commissioned diagnostic. A future recurrence is treated as a browser-runner
failure, never as evidence that a Node-only validation is enough to certify live
camera control.
