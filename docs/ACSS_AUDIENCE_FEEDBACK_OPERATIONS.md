# ACSS Audience Feedback and Preference Learning

## Implemented operating model

Cinema Mode now has four deliberately separate evidence-to-learning paths:

```text
authoritative simulation outcome → forecast calibration
measured camera/narration outcome → production-policy learning
viewer review or preference       → audience-profile learning
reported technical fault          → fault diagnosis and safe correction
```

These stores cannot substitute for one another. A low scene rating cannot make an
ecological proposition false. A confirmed camera loop cannot be treated as an
unpopular artistic preference. Written feedback cannot directly edit model weights,
simulation state, executable code or ecological evidence.

The implementation keeps the local LLM and OBS paths optional and unchanged. The
audience system is deterministic and works with both disabled.

## First-run preference review

When Cinema Mode starts with an unprimed audience profile, **Audience learning and
fault reports** opens automatically. At the top, select a named local profile,
create a new personal profile, create a shared-audience profile, or start a guest
session. The quick review then records:

- the primary documentary interest;
- preferred camera distance and motion;
- preferred narration depth;
- selected topics;
- four direct either/or comparisons.

Choose **Use these preferences** to apply the session layer. Leave **Remember
explicit choices** selected to retain explicit choices locally. Clear it for a
session-only configuration. **Skip for now** leaves the documentary usable without
inventing answers.

The author only uses a learned preference to rank alternatives that already passed
ecological, subject-policy, camera-feasibility and story-continuity constraints.
Preference adjustments are bounded; they cannot rescue an invalid shot.

## Per-scene review

The compact review row is available during every Cinema scene:

- thumbs down or up;
- rating from one to five;
- an optional reason tag;
- **More like this** or **Less like this**;
- **Undo last review**.

Inputs submitted before the short debounce window closes form one feedback episode,
not several independent votes. The episode is bound to the exact presentation,
contract, situation, story thread and measured camera outcome. Undo applies an exact
inverse update using the stored deltas; it does not approximate the former profile.

The system learns affinities for interpretable features such as subject class,
topic, shot family, shot size, motion character, narration depth and named subject.
An explanation below the profile status summarizes the strongest current choices.

## Adaptive audience questions

Questions are chosen from uncertain, decision-relevant preferences. They appear only
at safe scene boundaries and are suppressed while:

- narration is playing;
- a critical event is active;
- an interaction is unresolved;
- a fault report is open;
- the session prompt interval has not elapsed.

Prompt frequency tapers as the profile obtains useful confidence. **Not now** closes
one prompt without creating a preference. **Stop questions this session** suppresses
the remainder of the current run. The prompt-consent checkbox disables future
adaptive prompts until re-enabled.

## Implicit signals

Implicit learning is off unless consent is enabled. When enabled, the signals remain
weak and bounded:

- Next Shot is interpreted using exposure time, not as an automatic dislike;
- Keep, Highlight and Favourite are small positive signals;
- Pause alone is neutral;
- ambiguous actions do not update the profile.

Explicit ratings always carry more information than implicit actions. Implicit
behavior cannot create or modify ecological facts.

## Written feedback

Written feedback is parsed locally into a proposed, deterministic interpretation.
The interface shows that interpretation before anything changes. Select **Confirm
interpretation** to apply it or **Discard** to remove it. Unsupported or ambiguous
phrasing remains unapplied; it is never forwarded to the LLM as a hidden instruction.

## Fault reporting and safe recovery

Fault reports are categorized independently from taste. Available reports cover:

- failure to keep the subject in frame;
- excessive distance or proximity;
- camera loops, jumps and obstruction;
- wrong subject or loss of entity identity;
- repeated, unsupported or mistimed narration;
- unrelated terrain during a character story;
- missed event resolution;
- captions, voice, OBS and other technical faults.

Each report is stored with the presentation contract and current camera telemetry.
Where telemetry can confirm or partially corroborate the report, the responsible
production component receives a bounded correction. Repeated confirmed failures can
quarantine one camera family while retaining a stable fallback. Reports with
insufficient evidence remain reports; they do not silently train the policy.

Unsafe live framing can trigger a reversible safe-camera or replan action. This does
not alter the simulation and does not change unrelated learned preferences.

## Profiles, persistence and privacy

Named profiles are held locally in browser storage with a catalog, checksum,
monotonic revision and profile-specific previous valid backup. A corrupt current
revision is quarantined and the previous checksummed revision is restored. Only
explicit consented choices are persistent. Session preferences, prompt state and
temporary exposure records are cleared when a new documentary session starts.

Shared-audience profiles accept explicit ratings, comparisons and confirmed answers
only. They retain count, mean and disagreement for affected preferences. Implicit
click behavior and individual follow affinity are disabled because several viewers
must not be represented as one inferred personality.

Controls provide:

- profile export as JSON;
- guest mode with no persistent writes;
- clearing the current session layer;
- clearing camera preferences alone;
- rolling back to the previous saved profile;
- resetting the audience profile completely.

The ACSS model profile has a separate rollback and validation lifecycle. Audience
preferences do not grant an unvalidated predictive profile permission to go live.

## When learning changes the programme

The current scene is never mutated merely because its review changes. New preference
information is considered on a later decision boundary. The planner first compiles
hard constraints, then obtains valid camera and narration alternatives, and only
then applies a bounded audience ranking adjustment. This prevents oscillation and
keeps feedback causally attributable.

For example, a confident close-camera preference may move an already valid close
shot ahead of an already valid wide shot. It cannot select a close shot that loses
the subject, violates Character Stories, breaks a return obligation or uses a
quarantined camera family.

## ACSS predictive learning lifecycle

The predictive author still has independent lifecycle states:

1. Observe only: collect decisions and outcomes without modifying learned state.
2. Calibrate forecasts: update resolved, attributable prediction models.
3. Learn policy in shadow: update bounded production choices without putting them on
   air.
4. Bounded active learning: use qualified adjustments while ACSS controls the live
   presentation.
5. Validated active profile: requires a validation certificate.

Forecasts are written to a real ledger with model, dependency, evidence, horizon and
expiry identity. Only resolved forecasts update their responsible model. Dependency
models execute in topological order; unresolved requirements cannot be treated as
evidence merely because they were registered.

A shot ending because its planned duration elapsed is not considered an ecological
resolution. A repeated sentence that was successfully suppressed is recorded as an
avoided duplicate, not as a spoken narration failure.

## Commissioning

Run from the project root:

```powershell
npm.cmd test
npm.cmd run documentary:validate-acss
```

Then perform one short interactive run:

1. Leave OBS and AI off.
2. Select ACSS learning shadow and Observe only.
3. Complete the startup review and rate several scenes.
4. Confirm the explanation changes but the current scene does not jump immediately.
5. Press Next Shot once very early and once after a long viewing period; confirm the
   exposure-aware implicit records differ when consent is on.
6. Submit written feedback, inspect its interpretation, then discard it. Repeat and
   confirm it.
7. Report one camera fault and confirm a safe replan does not affect ecology.
8. Undo a rating and verify the profile revision and explanation return.
9. Export the profile, test guest mode, and start a new run to verify session data is
   cleared while consented persistent choices remain.
10. Only after shadow observation is stable, try ACSS predictive author with bounded
    active learning.

Automated coverage includes schema rejection, explicit and implicit weighting,
exact retraction, guest non-persistence, checksum recovery, prompt taper and safety,
written-feedback confirmation, contextual camera ranking, fault separation,
camera-family quarantine, lifecycle gates, forecast attribution, profile validation,
camera kinematics, shadow isolation and hard Character Stories policy.

## Recovery

Use **Rollback audience profile** for preference corruption and **Rollback learning**
for ACSS model/policy corruption. Use **Reset audience profile** only when the viewer
wants a new baseline. None of these actions changes the ecosystem state.

The pre-implementation source snapshot is:

`Backups/Before-ACSS-Audience-Learning-2026-07-29.zip`

It is a recovery artifact for the implementation itself, separate from the live
profile rollback controls.
