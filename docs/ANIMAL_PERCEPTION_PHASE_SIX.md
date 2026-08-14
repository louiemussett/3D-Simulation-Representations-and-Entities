# Animal Perception Phase 6 — Persistent Physical Traces

Phase 6 extends the bounded surface-evidence field with persistent vegetation, track, injury, and water-crossing consequences. These records are simulation state rather than randomly placed visual effects.

## Vegetation disturbance

Movement through grass, shrubs, and woodland understory now updates a persistent disturbance value on the terrain cell. Contact pressure, gait, speed, and vegetation density control its strength. Disturbance gradually recovers, with local rain modestly accelerating recovery.

The trace field also records the responsible entity, species, contact position, substrate, age, and intensity. Stationary animals do not bend vegetation merely because they occupy a cell.

## Track degradation and overwriting

Footprints retain substrate-specific decay. Local rain and elapsed time degrade them, while substrate retention determines how quickly their form disappears.

When a later animal crosses the same cell, its physical contact partially overwrites earlier prints. Earlier records retain reduced intensity together with `overwrittenBy` and overwrite-age provenance. A new print therefore does not silently delete all earlier evidence, but sufficiently strong traffic can make it unusable.

## Bleeding and blood trails

Injuries now carry a bounded bleeding component based on severity and injury mechanism. Bleeding declines during healing. An impact deposits immediate blood evidence, including fatal impacts, and a moving injured animal leaves a path-sampled blood trail.

Blood on land and blood dispersed in water are separate trace types with different decay. Rain washes land blood; water disperses aquatic blood quickly. The records expose injury evidence without granting observers the injured animal's current location.

## Natural water crossings

Movement across land/water boundaries produces authoritative:

- water-entry disturbance;
- water-exit evidence;
- wakes while moving through water;
- temporary body/coat wetness;
- wet transferred footprints after leaving water.

Ordinary ground scent and footprints are not deposited beneath open water. Water movement washes older scent, prints, and dispersed blood in the affected cell. Wetness fades after the animal returns to land.

All records remain bounded per cell and across the world. The original Valley Grazer and Ridge Hunter visual construction remains unchanged.
