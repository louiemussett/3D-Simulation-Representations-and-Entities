# Animal Perception Phase 5 — Surface State and Movement Evidence

Phase 5 gives the ground a persistent surface state and makes animal traces consequences of authoritative locomotion rather than decorative random marks.

## Persistent surface moisture

Every terrain cell retains `surfaceMoisture` independently from slower soil moisture. Hourly updates combine localized precipitation, standing water, runoff, substrate retention, slope drainage, temperature, wind, and canopy shelter. The value is saved, deterministically migrated for older worlds, and included in authoritative diagnostics.

Rain therefore leaves a drying history after a weather system moves away. Mud, clay, peat, loam, sand, rock, snow, vegetation, and water retain or shed surface water differently.

## Substrate contact

Each completed locomotion interval calculates a shared contact description from:

- anatomical contact class;
- current substrate and moisture;
- body mass;
- gait, speed, and travelled distance;
- estimated stride length and contact pressure.

The same calculation controls movement-noise strength and the evidence left on the surface.

## Consistent movement evidence

Movement paths are sampled at stride-scale intervals. Each contact can produce:

- footprints where the substrate can retain an impression;
- ground scent transferred along the travelled path;
- disturbed vegetation or loose surface material.

Stationary animals do not manufacture movement evidence. Directly controlled and autonomous animals use the same pipeline. Records include position, source, species, substrate, age, strength, and movement context.

## Persistence and perception

Trace records remain bounded per cell and globally. Their decay depends on age, local rain, wind, and substrate retention. Ground-scent contacts also feed the existing authoritative scent field, allowing animals to detect the travelled route through their normal smell system.

The Valley Grazer and Ridge Hunter rendering branches were not changed.
