# Animal Perception Phase 7 — Wind and Scent

Phase 7 adds local airflow, airborne scent transport, deterministic plume intermittency, and crosswind casting. It preserves ground-contact scent from Phases 5–6 as a separate physical channel.

## Local wind vectors

Each queried terrain cell derives a local vector from the regional weather wind. The calculation modifies direction and speed using:

- neighbouring elevation gradients;
- contour deflection;
- wind exposure and shelter;
- terrain wind channels;
- canopy, shrub, and grass obstruction.

The scientific weather arrows now display these local vectors rather than repeating one global direction everywhere.

## Airborne scent plumes

Living animals emit bounded scent packets into their current cell. Each ecological-hour update:

- retains a decaying portion locally;
- advects part into the most downwind neighbouring cell;
- applies local wind speed and direction;
- merges repeated emissions from the same source;
- enforces per-cell and global storage limits.

The saved plume field records source provenance internally, but ordinary animal observations report scent at the observer with uncertainty. They do not reveal the source's current coordinates.

## Deterministic intermittency

Airborne and ground scent detection is filamentary rather than continuously guaranteed. Pulse and filament availability are derived from source, observer, cell, and simulation tick. Identical state therefore produces identical detection without consuming simulation randomness.

An animal can temporarily lose a real plume even while remaining near it. Confidence remains distinct from scent concentration.

## Casting behavior

When a predator detects airborne prey scent, it moves a bounded distance upwind. When the filament disappears, it alternates left and right across the local wind to reacquire it. Casting uses only:

- the observer's position;
- its last detected plume direction and time;
- the local wind vector;
- deterministic individual phase.

It never receives the scent source's authoritative position. Existing remembered ground trails remain the fallback after plume evidence expires.

The Valley Grazer and Ridge Hunter visual construction remains unchanged.
