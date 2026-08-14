# Animal Perception Phase 8 — Evidence Fusion

Phase 8 converts persistent physical traces into uncertain animal observations, combines observations into bounded prey and threat hypotheses, and uses those beliefs for tracking and search.

## Trace observations

Footprints, vegetation disturbance, blood, ground scent, and water-crossing evidence can now enter an animal's sensory buffer when its biology and current access permit detection.

- Visual traces require current line of sight.
- Chemical traces require the trace to fall inside current smell range.
- A trace observation reports the observed mark, not its source entity's current state.
- Overwritten and degraded traces retain reduced confidence.

## Freshness and identity uncertainty

Trace age is presented as an estimated range and freshness band rather than exact authoritative time. Intensity, substrate retention, rain, degradation, and overwriting affect the estimate.

Species identity requires sufficiently strong evidence. Individual identity additionally requires very strong evidence and prior familiarity. Otherwise the record remains an unidentified movement, injury, prey, or threat trace.

## Evidence hypotheses

Current sight, scent, airborne plume observations, and physical traces are fused into observer-owned hypotheses:

- possible prey;
- possible threat.

Each hypothesis records confidence, freshness, identity uncertainty, estimated location, inferred heading where available, and the bounded evidence IDs that contributed. Multiple weak observations can support a stronger hypothesis without becoming certainty.

## Tracking and search

Predators now use current airborne scent first, crosswind casting after plume loss, and fused trace hypotheses before falling back to older memory or general search.

Route selection considers only locally known, traversable candidate cells. Evidence support is calculated from the animal's sensory buffer—not from the authoritative trace field. Unknown cells and hidden source coordinates cannot win route ranking.

The Valley Grazer and Ridge Hunter visual construction remains unchanged.
