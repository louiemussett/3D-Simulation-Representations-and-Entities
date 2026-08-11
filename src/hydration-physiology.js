const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
import { SPECIES, eatsMeat } from "./species-registry.js";
import { biologicalPhenotype, foodWaterEfficiency } from "./biological-phenotypes.js";

export const HYDRATION_CAPACITY_MULTIPLIER = 2;

export const HYDRATION_PROFILES = Object.freeze({
  grazer: Object.freeze({
    key: "moderately drought-tolerant ruminant",
    maximumFluidDeficit: 22,
    reserveCurve: 1.6,
    mild: 5,
    moderate: 8,
    severe: 11,
    critical: 15,
    fatal: 19,
    lactationDemand: 1.58,
    foodMoistureEfficiency: 1.15,
  }),
  hunter: Object.freeze({
    key: "generalized mammalian carnivore",
    maximumFluidDeficit: 14,
    reserveCurve: 1,
    mild: 4,
    moderate: 6,
    severe: 8,
    critical: 10,
    fatal: 12,
    lactationDemand: 1.48,
    foodMoistureEfficiency: 1,
  }),
});

const DEFAULT_PROFILE = HYDRATION_PROFILES.hunter;

export function hydrationProfile(animal = {}) {
  const direct = HYDRATION_PROFILES[animal.speciesId]; if (direct) return direct;
  const species = SPECIES[animal.speciesId], base = eatsMeat(animal) ? DEFAULT_PROFILE : HYDRATION_PROFILES.grazer;
  const hydration = biologicalPhenotype(animal)?.hydration || {};
  return { ...base, key: `${species?.habitat || "general"} ${species?.guild || "animal"}`, maximumFluidDeficit: clamp(base.maximumFluidDeficit * (hydration.dehydrationTolerance || 1) * (species?.thirstRate < .5 ? 1.15 : species?.thirstRate > .9 ? .82 : 1), 8, 34), reserveCurve: clamp(base.reserveCurve * (hydration.capacity || 1), .7, 2.4), foodMoistureEfficiency: clamp((hydration.grassWater || hydration.preyWater || 0) * 1.5, .2, 1.8) };
}

export function hydrationPercent(animal = {}) {
  return clamp(Number(animal.hydration) || 0, 0, 100);
}

// The UI bar describes the remaining reserve. Veterinary dehydration is a
// body-mass fluid deficit, so it is derived on a much smaller, species-specific
// scale instead of treating every missing bar point as 1% clinical dehydration.
export function fluidDeficitPercent(animal = {}) {
  const reserveUsed = (100 - hydrationPercent(animal)) / 100;
  const profile = hydrationProfile(animal);
  return Math.pow(reserveUsed, profile.reserveCurve) * profile.maximumFluidDeficit;
}

export function migrateHydrationCapacity(animal = {}) {
  if (animal.hydrationCapacityMultiplier === HYDRATION_CAPACITY_MULTIPLIER) return animal;
  // Preserve the old percentage deficit across the doubled reservoir. A save
  // at 80% therefore resumes at 90%, rather than becoming critically dry when
  // interpreted under the new body-water model.
  animal.hydration = clamp(100 - (100 - hydrationPercent(animal)) / HYDRATION_CAPACITY_MULTIPLIER, 0, 100);
  animal.hydrationCapacityMultiplier = HYDRATION_CAPACITY_MULTIPLIER;
  return animal;
}

// Severity follows percentage of total body water lost. Hydration remains a
// readable 0–100 saturation value; doubled storage changes how quickly that
// percentage falls, rather than changing every UI and behavioural threshold.
export function dehydrationState(animal = {}) {
  const profile = hydrationProfile(animal), loss = fluidDeficitPercent(animal);
  const common = { loss, fluidDeficit: loss, reserve: hydrationPercent(animal), profile: profile.key };
  if (loss < profile.mild) return Object.freeze({ ...common, key: "hydrated", label: "adequately hydrated", speed: 1, perception: 1, enduranceRecovery: 1, canSprint: true, canHunt: true, optionalHunt: true, canMate: true, fatiguePerHour: 0, healthDamagePerHour: 0, fatalRisk: false });
  if (loss < profile.moderate) return Object.freeze({ ...common, key: "mild", label: "mild dehydration", speed: .97, perception: .98, enduranceRecovery: .92, canSprint: true, canHunt: true, optionalHunt: true, canMate: true, fatiguePerHour: .025 * loss, healthDamagePerHour: 0, fatalRisk: false });
  if (loss < profile.severe) return Object.freeze({ ...common, key: "moderate", label: "moderate dehydration", speed: .87, perception: .9, enduranceRecovery: .68, canSprint: true, canHunt: true, optionalHunt: animal.speciesId !== "hunter", canMate: false, fatiguePerHour: .15 + (loss - profile.moderate) * .08, healthDamagePerHour: 0, fatalRisk: false });
  if (loss < profile.critical) return Object.freeze({ ...common, key: "severe", label: "severe dehydration", speed: .65, perception: .74, enduranceRecovery: .36, canSprint: false, canHunt: false, optionalHunt: false, canMate: false, fatiguePerHour: .52 + (loss - profile.severe) * .14, healthDamagePerHour: .04 + (loss - profile.severe) * .025, fatalRisk: false });
  const fatalExcess = Math.max(0, loss - profile.fatal);
  const vulnerability = 1
    + clamp(((Number(animal.bodyTemperature) || 38) - 39) * .12, 0, .65)
    + (animal.pregnant ? .12 : 0)
    + ((animal.lactation || 0) > 0 ? .2 : 0)
    + clamp((animal.injuries?.length || 0) * .08, 0, .32)
    + clamp((1 - (Number(animal.bodyCondition) || 1)) * .6, 0, .3);
  return Object.freeze({ ...common, key: "critical", label: "critical dehydration", speed: clamp(.48 - (loss - profile.critical) * .035, .14, .48), perception: clamp(.62 - (loss - profile.critical) * .025, .28, .62), enduranceRecovery: .14, canSprint: false, canHunt: false, optionalHunt: false, canMate: false, fatiguePerHour: clamp((1.1 + (loss - profile.critical) * .28) * vulnerability, 1.1, 6), healthDamagePerHour: clamp((.18 + (loss - profile.critical) * .16 + fatalExcess * .55) * vulnerability, .18, 8), fatalRisk: loss >= profile.fatal });
}

export function pregnancyHydrationMultiplier(animal = {}, gestationDays = 0) {
  if (!animal.pregnant || !(gestationDays > 0)) return 1;
  const progress = clamp((Number(animal.pregnant.age) || 0) / gestationDays, 0, 1);
  if (animal.pregnant.mode === "surface-eggs") {
    const extraEggs = Math.max(0, (Number(animal.pregnant.offspringCount) || 1) - 1);
    return 1.02 + progress * .04 + Math.min(.06, extraEggs * .005);
  }
  const base = progress < .33 ? 1.04 : progress < .67 ? 1.1 : animal.speciesId === "grazer" ? 1.22 : 1.18;
  const extraOffspring = Math.max(0, (Number(animal.pregnant.offspringCount) || 1) - 1);
  return base + Math.min(.08, extraOffspring * .02);
}

export function hourlyHydrationDemand(animal = {}, species = {}, weather = {}, context = {}) {
  return hourlyHydrationDemandBreakdown(animal, species, weather, context).total;
}

// Additive attribution of the multiplicative demand model. Each factor is
// applied in sequence, so the parts sum exactly to total and accounting can
// distinguish baseline, heat, activity, pregnancy and lactation losses.
export function hourlyHydrationDemandBreakdown(animal = {}, species = {}, weather = {}, context = {}) {
  const base = Math.max(0, Number(species.thirstRate) || .65);
  const heat = 1 + clamp(((Number(weather.temp) || 18) - 20) * .035, 0, .8);
  const action = animal.actionState?.key || "";
  const movement = action === "chase" ? 1.7 : ["flee", "attack"].includes(action) ? 1.58 : action === "patrol" ? 1.34 : animal.actionState?.moving ? 1.24 : 1;
  const profile = hydrationProfile(animal);
  const pregnancy = Math.max(1, Number(context.pregnancyHydrationMultiplier ?? context.pregnancyNeedMultiplier) || 1);
  const dependentCount = Math.max(1, animal.offspringIds?.length || 1);
  const lactation = (animal.lactation || 0) > 0 ? Math.min(profile.key.includes("ruminant") ? 1.8 : 1.7, profile.lactationDemand + (dependentCount - 1) * .07) : 1;
  const reproduction = pregnancy * lactation;
  const bodyScale = clamp(Math.sqrt(Math.max(1, animal.bodyMass || species.adultMass || 1) / Math.max(1, species.adultMass || animal.bodyMass || 1)), .75, 1.35);
  const capacity = Math.max(1, Number(context.capacityMultiplier) || HYDRATION_CAPACITY_MULTIPLIER);
  const basal = base * bodyScale / capacity;
  const thermal = basal * (heat - 1);
  const activity = (basal + thermal) * (movement - 1);
  const pregnancyDemand = (basal + thermal + activity) * (pregnancy - 1);
  const lactationDemand = (basal + thermal + activity + pregnancyDemand) * (lactation - 1);
  return Object.freeze({ total: basal + thermal + activity + pregnancyDemand + lactationDemand, basal, thermal, activity, pregnancy: pregnancyDemand, lactation: lactationDemand });
}

export function forageHydrationGain(bite = 0, cell = {}, animal = {}) {
  const moisture = clamp(Number(cell.ecoMoisture ?? cell.moisture) || 0, 0, 1);
  const plantFactor = cell.plantType === "shrub" ? 5 : 7;
  const food = cell.plantType === "shrub" ? "shrub" : "grass", efficiency = foodWaterEfficiency(animal, food) || HYDRATION_PROFILES.grazer.foodMoistureEfficiency;
  return Math.max(0, bite) * plantFactor * (.45 + moisture * .75) * efficiency / HYDRATION_CAPACITY_MULTIPLIER;
}

export function carcassHydrationGain(meal = 0, corpse = {}, animal = {}) {
  const freshness = clamp(1 - (Number(corpse.age) || 0) / 96, .18, 1);
  return Math.max(0, meal) * 1.05 * freshness * (foodWaterEfficiency(animal, "carrion") || hydrationProfile(animal).foodMoistureEfficiency) / HYDRATION_CAPACITY_MULTIPLIER;
}

// Drinking is a continuous acquisition activity. Scaling its gain by elapsed
// ecological time keeps the 60/180/360-minute observation modes equivalent.
export function drinkingHydrationGain(elapsedHours = 0, ratePerHour = 144) {
  return Math.max(0, Number(elapsedHours) || 0) * Math.max(0, Number(ratePerHour) || 0);
}
