# Bug-bash charter

## Objective

Compare the running prototype to the documented intended design, identify reproducible mismatches, repair them without concealing regressions, and keep an understandable record of what changed.

## Session rhythm

1. Pick one system area: terrain/hydrology, perception, movement, ecology, social behaviour, UI, saves, or performance.
2. Use a new or named seed and record the exact world-setup values.
3. Observe without editing first. Capture a screenshot/video/save when something is wrong.
4. Add one ledger issue per distinct defect. Do not merge unrelated failures merely because they appear together.
5. Triage: reproduce, compare against the design baseline, assign severity, decide whether it is a defect, a deliberate limitation, or a new feature request.
6. Make the smallest coherent fix.
7. Re-run the original reproduction and one nearby regression check. Record the evidence and any side effect.

## Required issue record

```text
ID and short title:
System area:
Seed and world setup:
Simulation day/tick and speed:
View / selected entity or group:
Steps to reproduce:
Expected result (cite design-baseline section):
Actual result:
Evidence (screenshot, video, save, console message):
Frequency: always / intermittent / once / not yet reproduced
Severity: blocker / major / minor / visual
Status: reported / reproduced / fixing / fixed-awaiting-check / verified / deferred / not-a-bug
Fix and regression checks:
```

## Severity

| Level | Meaning |
|---|---|
| Blocker | Simulation cannot run, is black/blank, corrupts save/world state, or a core view/action is unusable with no practical workaround. |
| Major | A major intended system gives false results or is materially unavailable: e.g. entities gain hidden information, water cannot be found/rendered, movement breaks, or terrain controls are ignored. |
| Minor | A feature works with a workaround but is misleading or inconsistent. |
| Visual | Cosmetic/legibility issue with no change to simulation behaviour. |

Severity is impact, not how annoying the issue feels. Priority can still consider how often a system is used and whether it blocks other diagnosis.

## Evidence rules

- A screenshot is useful evidence, but it should be paired with seed, setup and steps where possible.
- Preserve a failing save/seed. Do not overwrite it with a repaired state.
- Mark an issue **not yet reproduced** rather than guessing at a fix.
- An issue is **verified** only after the original reproduction and a nearby check pass.
- A feature request should be recorded separately from a bug. It can become a design change only after updating the baseline/change log.

## Change-control rules

- No silent design changes during a bug fix.
- If the intended result changes, record why in `CHANGE-LOG.md` and update the relevant baseline section.
- Do not delete failed or superseded records; mark them superseded and link the replacement.
- Prefer one system area per repair pass. A broad rewrite needs an explicit design note first.

## Research basis

This structure follows the common emphasis on reproducible steps, expected vs actual results, environment information, severity and explicit triage workflows in [Atlassian's bug-report guidance](https://www.atlassian.com/software/jira/templates/bug-report) and [bug-triage guidance](https://www.atlassian.com/agile/software-development/bug-triage). The exact format is simplified for a single local prototype.
