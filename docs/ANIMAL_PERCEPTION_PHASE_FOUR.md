# Animal Perception Phase 4 — Reciprocal Attention and Stalking

Phase 4 adds observer-owned reciprocal-attention estimates and uses them to control stalking. It does not give either animal access to the other animal's authoritative sensor geometry or private decision state.

## Predator estimate of prey exposure

The hunter estimates whether visible prey may be attending to its approach from normalized observations only:

- observed prey body and head heading;
- visible scanning or listening cues;
- observed group size;
- the hunter's own movement and noise;
- observable cover, range, and observation confidence.

The estimate is probabilistic and records its confidence and evidence contributions. It does not read prey eye cones, sensor anchors, attention allocation, or decisions.

## Prey estimate of predator targeting

The prey receives a safe projection of its existing predator-intent inference. This includes estimated targeting probability, attack imminence, confidence, and the observed predator identity. It remains the prey observer's inference and does not reveal the predator's actual target.

## Stalking controller

A stalking predator now selects one of three phases:

- `move` when estimated exposure is low;
- `freeze` briefly when exposure is high;
- `reroute` to an observation-derived flank when freezing no longer reduces risk or exposure is moderate.

Freezing is bounded to prevent indefinite inaction. Reroute points are calculated only from hunter position and the prey's observed position, then constrained to world bounds. Existing pursuit, contact, recovery, and abandonment gates remain authoritative.

## Information boundary

The reciprocal-attention module rejects inputs containing authoritative sensor definitions, sensor anchors, vision cones, authoritative attention, private target IDs, or private decision state. Simulation integration passes normalized perception contacts rather than prey entities into the exposure estimator.

The Valley Grazer and Ridge Hunter visual construction is untouched.
