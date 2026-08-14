# Animal perception Phase 2 — temporal vision

Temporal vision is modelled as biological sampling capability, never as display
frame rate. Every catalogue species now has a versioned profile containing a
reference temporal resolution, light response, motion sensitivity, thermal
dependence, evidence grade, confidence and an explicit research gap.

All current values are honestly graded `composite-model`; they are not claimed
as exact-species measurements. Birds, mammals and reptiles receive different
starting profile families pending primary-literature replacement.

Effective temporal resolution combines:

- species reference resolution;
- current illumination;
- sensory attention;
- fatigue;
- thermal performance for ectothermic reptiles.

Sight observations now distinguish detection confidence, motion confidence,
velocity confidence and velocity uncertainty. Low-confidence velocity is not
placed into sensory evidence as a precise vector. As observations age, motion
confidence decays and velocity uncertainty grows.

Threat assessment retains visually confirmed predators but slightly discounts
poorly resolved motion. Predictive cognition uses directly observed velocity
only above its confidence threshold; otherwise it falls back to successive
position estimates and expands the predicted region according to uncertainty.

Reptile body-temperature performance therefore changes temporal resolution,
motion certainty and downstream prediction confidence without changing visual
rendering or the simulation tick rate.

