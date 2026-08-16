# Animal Perception Phase 9 — Laboratory and overlays

Phase 9 adds presentation-only inspection of the perception systems implemented in Phases 1–8. It does not alter animal decisions or expose authoritative state to an animal.

## Entity Laboratory

The selected-animal panel now reports:

- Sensor anatomy, including anatomical parent, local anchor, current orientation, field width, mobility, evidence grade, and whether the sensor is an invisible diagnostic anchor.
- Effective temporal resolution, sampling interval, motion confidence, velocity confidence, and velocity uncertainty for current visual observations.
- A paired comparison between authoritative nearby physical traces and the selected animal's trace observations. Missed evidence remains explicitly marked as missed.
- Current trace-derived prey and threat hypotheses.
- A causal chain from retained evidence through candidate selection, commitment, and action.
- Ranked alternatives and an explicit “Why not flee?” result. When the decision record lacks the required evidence, the panel says so instead of constructing a narrative.

## World overlays

The existing vision overlay now marks the selected animal's eye and thermal sensor anchors. The sound overlay marks ear and vibration anchors. These markers exist only while their diagnostic overlay is enabled.

The Valley Grazer and Ridge Hunter continue to use invisible anchors. No animal geometry, material, silhouette, animation, or normal-world rendering was changed.

## Information boundary

Laboratory truth and diagnostic sensor geometry are presentation data. They do not enter sensory buffers, memory, hypotheses, action selection, or saved simulation truth. Animals continue to act from their own detected evidence and uncertainty.

## Verification

`npm run check:perception` validates the diagnostic transformations alongside paired sensors, temporal vision, reciprocal attention, persistent traces, wind/scent, and evidence fusion.
