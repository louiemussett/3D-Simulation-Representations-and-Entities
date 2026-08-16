import { lifeHistoryFor } from "./life-history-registry.js";
import { MINUTES_PER_DAY } from "./simulation-clock.js";

const finite = (value) => Number.isFinite(Number(value));
const push = (violations, type, id, detail) => violations.push({ type, id: id || "unknown", detail });

/**
 * Audits persisted reproductive state without advancing the simulation. The
 * result is deliberately data-only so ecology runs can compare it across
 * seeds and observation paces.
 */
export function reproductiveIntegrityAudit(world = {}, { initialPopulation = null } = {}) {
  const animals = Array.isArray(world.animals) ? world.animals : [];
  const nests = Array.isArray(world.nests) ? world.nests : [];
  const violations = [];

  for (const animal of animals) {
    let profile;
    try { profile = lifeHistoryFor(animal.speciesId); }
    catch { push(violations, "missing-profile", animal.id, animal.speciesId); continue; }
    const reproduction = profile.reproduction;
    const pregnancy = animal.pregnant;
    if (pregnancy) {
      const eggLayer = reproduction.mode === "surface-eggs";
      const duration = eggLayer ? reproduction.preLayDays : reproduction.gestationDays;
      if (eggLayer && pregnancy.phase !== "pre-lay") push(violations, "impossible-stage", animal.id, `egg layer in ${pregnancy.phase || "unknown"}`);
      if (!eggLayer && pregnancy.phase === "pre-lay") push(violations, "impossible-stage", animal.id, "live bearer in pre-lay");
      if (eggLayer && animal.pregnancyHormones) push(violations, "egg-hormones", animal.id, "egg layer has mammalian pregnancy hormones");
      if (!finite(pregnancy.age) || pregnancy.age < 0 || pregnancy.age > duration + 1) push(violations, "impossible-duration", animal.id, `age ${pregnancy.age}; duration ${duration}`);
      if (!finite(pregnancy.offspringCount) || pregnancy.offspringCount < reproduction.broodRange[0] || pregnancy.offspringCount > reproduction.broodRange[1]) push(violations, "runaway-brood", animal.id, String(pregnancy.offspringCount));
    }
    if (reproduction.mode === "surface-eggs" && (Number(animal.lactation) > 0 || Number(animal.postpartum) > 0)) push(violations, "egg-mammal-care", animal.id, "egg layer has lactation or postpartum suppression");
    for (const [year, count] of Object.entries(animal.reproductiveState?.broodsByYear || {})) {
      if (!finite(count) || Number(count) < 0) push(violations, "invalid-brood-history", animal.id, `year ${year}: ${count}`);
      if (Number.isFinite(reproduction.maxBroodsPerYear) && Number(count) > reproduction.maxBroodsPerYear) push(violations, "annual-brood-limit", animal.id, `year ${year}: ${count}/${reproduction.maxBroodsPerYear}`);
    }
    if (animal.birthTick != null) {
      if (!(animal.parentIds || []).length || !animal.traitArchitecture || !(animal.timeline || []).some((entry) => String(entry).startsWith("born day"))) push(violations, "invalid-birth-history", animal.id, "natural offspring lacks parent, inheritance, or birth evidence");
    }
  }

  for (const nest of nests) {
    let profile;
    try { profile = lifeHistoryFor(nest.speciesId); }
    catch { push(violations, "missing-profile", nest.id, nest.speciesId); continue; }
    const reproduction = profile.reproduction;
    if (reproduction.mode !== "surface-eggs") push(violations, "impossible-nest", nest.id, "live bearer owns a surface nest");
    if (!reproduction.nestCare || nest.careMode !== reproduction.nestCare) push(violations, "invalid-nest-care", nest.id, String(nest.careMode));
    if (!finite(nest.count) || nest.count < reproduction.broodRange[0] || nest.count > reproduction.broodRange[1]) push(violations, "runaway-clutch", nest.id, String(nest.count));
    const expectedHatchMinute = Number(nest.laidMinute) + reproduction.incubationDays * MINUTES_PER_DAY;
    if (!finite(nest.laidMinute) || !finite(nest.hatchMinute) || Number(nest.hatchMinute) !== expectedHatchMinute) push(violations, "invalid-incubation", nest.id, `${nest.laidMinute} → ${nest.hatchMinute}`);
    if (nest.motherId && !nest.motherSnapshot) push(violations, "missing-parent-snapshot", nest.id, "mother snapshot unavailable");
    if (!["incubating", "hatched", "failed"].includes(nest.status)) push(violations, "invalid-nest-state", nest.id, String(nest.status));
  }

  const livingBySpecies = animals.filter((animal) => animal.alive).reduce((counts, animal) => { counts[animal.speciesId] = (counts[animal.speciesId] || 0) + 1; return counts; }, {});
  const founderSpeciesExtinct = initialPopulation?.bySpecies ? Object.entries(initialPopulation.bySpecies).filter(([, count]) => Number(count) > 0).map(([id]) => id).filter((id) => !livingBySpecies[id]) : [];
  const byType = violations.reduce((counts, violation) => { counts[violation.type] = (counts[violation.type] || 0) + 1; return counts; }, {});
  return {
    ok: violations.length === 0,
    ecologicalMinute: Number(world.ecologicalMinute) || 0,
    animals: animals.length,
    nests: nests.length,
    naturalOffspring: animals.filter((animal) => animal.birthTick != null).length,
    founderSpeciesExtinct,
    byType,
    violations
  };
}
