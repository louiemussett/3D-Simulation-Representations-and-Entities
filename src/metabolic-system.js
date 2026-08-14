import { biologicalPhenotype } from "./biological-phenotypes.js";
import { bodyFatPercent, compositionProfile, FAT_CALORIES_PER_KG, metabolicRate, stomachCapacityCalories } from "./body-composition.js";

const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, value));
const sumGut = gut => gut.carbohydrate + gut.fat + gut.protein + gut.fermentation;

export const SPECIES_METABOLIC_TRAITS = Object.freeze({
  grazer: { basalScale: .95, aerobicCapacity: 1.05, muscleGlycogenCapacity: .85, glycogenReplenishment: .62, fatMobilisation: .9, proteinCatabolismResistance: 1.1, fermentationType: "foregut", fermentationCapacity: 1.35, dietaryProteinRequirement: .16, fastingAdaptation: 1.05, ketoneAdaptation: .72, digestiveHeat: .3, adrenalineSensitivity: .9, adrenalineRecovery: 1 },
  hunter: { basalScale: 1.05, aerobicCapacity: 1.5, muscleGlycogenCapacity: 1.25, glycogenReplenishment: .8, fatMobilisation: 1.3, proteinCatabolismResistance: 1.5, fermentationType: "none", fermentationCapacity: 0, dietaryProteinRequirement: .68, fastingAdaptation: 1.55, ketoneAdaptation: 1.4, digestiveHeat: .08, adrenalineSensitivity: 1.25, adrenalineRecovery: 1.1 },
  "valley-grazer-updated": { basalScale: .92, aerobicCapacity: 1.25, muscleGlycogenCapacity: 1, glycogenReplenishment: .62, fatMobilisation: 1.15, proteinCatabolismResistance: 1.25, fermentationType: "foregut", fermentationCapacity: 1.55, dietaryProteinRequirement: .16, fastingAdaptation: 1.25, ketoneAdaptation: .85, digestiveHeat: .31, adrenalineSensitivity: 1.12, adrenalineRecovery: 1.08 },
  "ridge-hunter-updated": { basalScale: 1.02, aerobicCapacity: 1.65, muscleGlycogenCapacity: 1.3, glycogenReplenishment: .82, fatMobilisation: 1.42, proteinCatabolismResistance: 1.65, fermentationType: "none", fermentationCapacity: 0, dietaryProteinRequirement: .7, fastingAdaptation: 1.7, ketoneAdaptation: 1.48, digestiveHeat: .08, adrenalineSensitivity: 1.28, adrenalineRecovery: 1.2 },
  "meadow-nibbler": { basalScale: 1.35, aerobicCapacity: .65, muscleGlycogenCapacity: .65, glycogenReplenishment: 1.05, fatMobilisation: 1.15, proteinCatabolismResistance: .75, fermentationType: "hindgut", fermentationCapacity: .65, dietaryProteinRequirement: .2, fastingAdaptation: .65, ketoneAdaptation: .55, digestiveHeat: .17, adrenalineSensitivity: 1.45, adrenalineRecovery: 1.25 },
  "great-plains-grazer": { basalScale: .82, aerobicCapacity: 1.35, muscleGlycogenCapacity: .8, glycogenReplenishment: .55, fatMobilisation: 1.05, proteinCatabolismResistance: 1.3, fermentationType: "foregut", fermentationCapacity: 1.9, dietaryProteinRequirement: .14, fastingAdaptation: 1.3, ketoneAdaptation: .85, digestiveHeat: .34, adrenalineSensitivity: .72, adrenalineRecovery: .9 },
  "woodland-browser": { basalScale: 1, aerobicCapacity: .95, muscleGlycogenCapacity: .9, glycogenReplenishment: .8, fatMobilisation: .95, proteinCatabolismResistance: 1, fermentationType: "foregut", fermentationCapacity: 1.05, dietaryProteinRequirement: .2, fastingAdaptation: .95, ketoneAdaptation: .7, digestiveHeat: .22, adrenalineSensitivity: 1.05, adrenalineRecovery: 1.05 },
  "brush-fox": { basalScale: 1.2, aerobicCapacity: .8, muscleGlycogenCapacity: 1.15, glycogenReplenishment: 1.15, fatMobilisation: 1.15, proteinCatabolismResistance: 1.05, fermentationType: "none", fermentationCapacity: 0, dietaryProteinRequirement: .62, fastingAdaptation: .9, ketoneAdaptation: 1.15, digestiveHeat: .08, adrenalineSensitivity: 1.4, adrenalineRecovery: 1.2 },
  "shadow-stalker": { basalScale: .82, aerobicCapacity: .55, muscleGlycogenCapacity: 1.4, glycogenReplenishment: .68, fatMobilisation: 1.25, proteinCatabolismResistance: 1.55, fermentationType: "none", fermentationCapacity: 0, dietaryProteinRequirement: .7, fastingAdaptation: 1.75, ketoneAdaptation: 1.5, digestiveHeat: .07, adrenalineSensitivity: 1.5, adrenalineRecovery: .72 },
  "great-omnivore": { basalScale: .78, aerobicCapacity: 1.15, muscleGlycogenCapacity: 1.1, glycogenReplenishment: .9, fatMobilisation: 1.5, proteinCatabolismResistance: 1.65, fermentationType: "mixed", fermentationCapacity: .45, dietaryProteinRequirement: .35, fastingAdaptation: 1.85, ketoneAdaptation: 1.5, digestiveHeat: .14, adrenalineSensitivity: .9, adrenalineRecovery: 1 },
  "dryland-runner": { basalScale: .9, aerobicCapacity: 1.8, muscleGlycogenCapacity: 1.35, glycogenReplenishment: .8, fatMobilisation: 1.2, proteinCatabolismResistance: 1.35, fermentationType: "foregut", fermentationCapacity: 1.15, dietaryProteinRequirement: .16, fastingAdaptation: 1.35, ketoneAdaptation: 1, digestiveHeat: .23, adrenalineSensitivity: 1.25, adrenalineRecovery: 1.35 },
  "highland-grazer": { basalScale: 1.08, aerobicCapacity: 1.25, muscleGlycogenCapacity: 1.05, glycogenReplenishment: .7, fatMobilisation: 1.3, proteinCatabolismResistance: 1.3, fermentationType: "foregut", fermentationCapacity: 1.3, dietaryProteinRequirement: .17, fastingAdaptation: 1.25, ketoneAdaptation: 1.05, digestiveHeat: .32, adrenalineSensitivity: 1, adrenalineRecovery: .9 },
  "armoured-browser": { basalScale: .72, aerobicCapacity: .72, muscleGlycogenCapacity: .6, glycogenReplenishment: .6, fatMobilisation: .85, proteinCatabolismResistance: 1.6, fermentationType: "foregut", fermentationCapacity: 1.7, dietaryProteinRequirement: .15, fastingAdaptation: 1.5, ketoneAdaptation: .9, digestiveHeat: .3, adrenalineSensitivity: .55, adrenalineRecovery: .75 },
  "pack-breaker": { basalScale: 1, aerobicCapacity: 1.75, muscleGlycogenCapacity: 1.3, glycogenReplenishment: .8, fatMobilisation: 1.4, proteinCatabolismResistance: 1.7, fermentationType: "none", fermentationCapacity: 0, dietaryProteinRequirement: .72, fastingAdaptation: 1.85, ketoneAdaptation: 1.5, digestiveHeat: .08, adrenalineSensitivity: 1.2, adrenalineRecovery: 1.25 },
  "carrion-runner": { basalScale: .88, aerobicCapacity: 1.5, muscleGlycogenCapacity: .9, glycogenReplenishment: .72, fatMobilisation: 1.35, proteinCatabolismResistance: 1.65, fermentationType: "none", fermentationCapacity: 0, dietaryProteinRequirement: .6, fastingAdaptation: 1.7, ketoneAdaptation: 1.55, digestiveHeat: .06, adrenalineSensitivity: 1, adrenalineRecovery: 1.3 },
  "waterline-grazer": { basalScale: 1, aerobicCapacity: .8, muscleGlycogenCapacity: .8, glycogenReplenishment: .68, fatMobilisation: .9, proteinCatabolismResistance: 1, fermentationType: "foregut", fermentationCapacity: 1.15, dietaryProteinRequirement: .17, fastingAdaptation: .9, ketoneAdaptation: .7, digestiveHeat: .26, adrenalineSensitivity: .9, adrenalineRecovery: .9 },
  "brush-nibbler": { basalScale: 1.3, aerobicCapacity: .62, muscleGlycogenCapacity: .65, glycogenReplenishment: 1, fatMobilisation: 1.1, proteinCatabolismResistance: .72, fermentationType: "hindgut", fermentationCapacity: .6, dietaryProteinRequirement: .22, fastingAdaptation: .62, ketoneAdaptation: .5, digestiveHeat: .16, adrenalineSensitivity: 1.4, adrenalineRecovery: 1.2 },
  "waterline-ambusher": { basalScale: .22, aerobicCapacity: .45, muscleGlycogenCapacity: 1.35, glycogenReplenishment: .4, fatMobilisation: .55, proteinCatabolismResistance: 1.9, fermentationType: "none", fermentationCapacity: 0, dietaryProteinRequirement: .68, fastingAdaptation: 2, ketoneAdaptation: 1.45, digestiveHeat: .05, adrenalineSensitivity: 1.45, adrenalineRecovery: .5 },
  "northern-shaggy-grazer": { basalScale: .88, aerobicCapacity: 1.25, muscleGlycogenCapacity: 1, glycogenReplenishment: .62, fatMobilisation: 1.45, proteinCatabolismResistance: 1.45, fermentationType: "foregut", fermentationCapacity: 1.5, dietaryProteinRequirement: .16, fastingAdaptation: 1.55, ketoneAdaptation: 1.2, digestiveHeat: .36, adrenalineSensitivity: .85, adrenalineRecovery: .9 },
  "highland-prowler": { basalScale: 1.02, aerobicCapacity: 1.2, muscleGlycogenCapacity: 1.2, glycogenReplenishment: .75, fatMobilisation: 1.35, proteinCatabolismResistance: 1.45, fermentationType: "none", fermentationCapacity: 0, dietaryProteinRequirement: .68, fastingAdaptation: 1.5, ketoneAdaptation: 1.35, digestiveHeat: .08, adrenalineSensitivity: 1.25, adrenalineRecovery: 1.05 },
  "little-opportunist": { basalScale: 1.18, aerobicCapacity: 1, muscleGlycogenCapacity: .9, glycogenReplenishment: 1.1, fatMobilisation: 1.1, proteinCatabolismResistance: 1, fermentationType: "mixed", fermentationCapacity: .25, dietaryProteinRequirement: .35, fastingAdaptation: 1, ketoneAdaptation: 1, digestiveHeat: .12, adrenalineSensitivity: 1.15, adrenalineRecovery: 1.15 },
  "cold-country-scavenger": { basalScale: .8, aerobicCapacity: 1.55, muscleGlycogenCapacity: 1, glycogenReplenishment: .62, fatMobilisation: 1.55, proteinCatabolismResistance: 1.75, fermentationType: "none", fermentationCapacity: 0, dietaryProteinRequirement: .58, fastingAdaptation: 1.85, ketoneAdaptation: 1.65, digestiveHeat: .07, adrenalineSensitivity: .95, adrenalineRecovery: 1.15 },
  "sunscale-ambusher": { basalScale: .16, aerobicCapacity: .35, muscleGlycogenCapacity: 1.45, glycogenReplenishment: .32, fatMobilisation: .48, proteinCatabolismResistance: 2.1, fermentationType: "none", fermentationCapacity: 0, dietaryProteinRequirement: .7, fastingAdaptation: 2.2, ketoneAdaptation: 1.5, digestiveHeat: .04, adrenalineSensitivity: 1.55, adrenalineRecovery: .45 },
  "shieldback-colony": { basalScale: .62, aerobicCapacity: .72, muscleGlycogenCapacity: .65, glycogenReplenishment: .58, fatMobilisation: .95, proteinCatabolismResistance: 1.5, fermentationType: "foregut", fermentationCapacity: 1.05, dietaryProteinRequirement: .18, fastingAdaptation: 1.4, ketoneAdaptation: 1.05, digestiveHeat: .25, adrenalineSensitivity: .65, adrenalineRecovery: .8 },
  "wild-boar": { basalScale: 1, aerobicCapacity: 1.05, muscleGlycogenCapacity: 1, glycogenReplenishment: 1, fatMobilisation: 1.1, proteinCatabolismResistance: 1.1, fermentationType: "mixed", fermentationCapacity: .3, dietaryProteinRequirement: .28, fastingAdaptation: 1.15, ketoneAdaptation: 1, digestiveHeat: .14, adrenalineSensitivity: 1.1, adrenalineRecovery: 1 },
  "african-elephant": { basalScale: .72, aerobicCapacity: 1.2, muscleGlycogenCapacity: .8, glycogenReplenishment: .55, fatMobilisation: .9, proteinCatabolismResistance: 1.5, fermentationType: "hindgut", fermentationCapacity: 2.2, dietaryProteinRequirement: .13, fastingAdaptation: 1.45, ketoneAdaptation: .8, digestiveHeat: .32, adrenalineSensitivity: .65, adrenalineRecovery: .8 },
  dromedary: { basalScale: .75, aerobicCapacity: 1.6, muscleGlycogenCapacity: 1.05, glycogenReplenishment: .65, fatMobilisation: 1.65, proteinCatabolismResistance: 1.55, fermentationType: "foregut", fermentationCapacity: 1.55, dietaryProteinRequirement: .15, fastingAdaptation: 2, ketoneAdaptation: 1.35, digestiveHeat: .24, adrenalineSensitivity: .9, adrenalineRecovery: 1.2 },
  "common-ostrich": { basalScale: .9, aerobicCapacity: 1.7, muscleGlycogenCapacity: 1.45, glycogenReplenishment: .85, fatMobilisation: 1.2, proteinCatabolismResistance: 1.2, fermentationType: "hindgut", fermentationCapacity: .8, dietaryProteinRequirement: .2, fastingAdaptation: 1.3, ketoneAdaptation: 1, digestiveHeat: .18, adrenalineSensitivity: 1.45, adrenalineRecovery: 1.25 }
});

export function metabolicProfile(subject = {}) {
  const phenotype = biologicalPhenotype(subject), digestion = phenotype?.digestion || {}, thermal = phenotype?.thermoregulation || {}, locomotion = phenotype?.locomotion || {};
  const stomach = digestion.stomach || "simple", fermenter = /ferment/.test(stomach), hindgut = /hindgut/.test(stomach), carnivore = (digestion.meat || 0) > Math.max(digestion.grass || 0, digestion.shrub || 0);
  const ectotherm = thermal.strategy === "ectotherm", heterotherm = thermal.strategy === "heterotherm";
  const derived = {
    basalScale: ectotherm ? .22 : heterotherm ? .68 : 1,
    aerobicCapacity: locomotion.endurance || 1,
    muscleGlycogenCapacity: Math.max(.45, (locomotion.sprintDuration || 1) * (carnivore ? 1.15 : 1)),
    glycogenReplenishment: carnivore ? .72 : fermenter ? .62 : 1,
    fatMobilisation: carnivore ? 1.25 : ectotherm ? .55 : 1,
    proteinCatabolismResistance: (digestion.fastingTolerance || 1) * (carnivore ? 1.2 : 1),
    fermentationType: fermenter ? (hindgut ? "hindgut" : "foregut") : "none",
    fermentationCapacity: fermenter ? (digestion.mealCapacity || 1) * (hindgut ? .8 : 1.35) : 0,
    dietaryProteinRequirement: carnivore ? .65 : .18,
    fastingAdaptation: digestion.fastingTolerance || 1,
    ketoneAdaptation: carnivore ? 1.35 : heterotherm ? 1.2 : .8,
    digestiveHeat: fermenter ? (hindgut ? .16 : .28) : carnivore ? .08 : .12,
    temperatureSensitivity: ectotherm ? 1.7 : heterotherm ? .75 : .25,
    adrenalineSensitivity: Math.max(.65, locomotion.acceleration || 1),
    adrenalineRecovery: Math.max(.45, locomotion.recovery || 1)
  };
  return Object.freeze({ ...derived, ...(SPECIES_METABOLIC_TRAITS[typeof subject === "string" ? subject : subject.speciesId] || {}) });
}

function capacities(animal) {
  const lean = Math.max(.5, animal.leanMass || animal.bodyMass || 1), profile = metabolicProfile(animal);
  return { blood: lean * 5, liver: lean * 18, muscle: lean * 15 * profile.muscleGlycogenCapacity, gut: stomachCapacityCalories(animal) * 1.8 };
}

export function initializeMetabolism(animal = {}) {
  if (animal.metabolism?.schema >= 1) {
    animal.metabolism.schema = 2;
    animal.metabolism.thermalLoad = Math.max(0, Number(animal.metabolism.thermalLoad) || 0);
    animal.metabolism.cumulative ||= {};
    animal.metabolism.cumulative.aerobicWork = Math.max(0, Number(animal.metabolism.cumulative.aerobicWork) || 0);
    animal.metabolism.cumulative.anaerobicWork = Math.max(0, Number(animal.metabolism.cumulative.anaerobicWork) || 0);
    animal.metabolism.cumulative.emergencyWork = Math.max(0, Number(animal.metabolism.cumulative.emergencyWork) || 0);
    syncLegacyEnergy(animal); return animal.metabolism;
  }
  const limits = capacities(animal), stage = animal.lifeStage || "adult", reserve = ({ dependent: { blood: .95, liver: .9, muscle: 0, gut: .9 }, juvenile: { blood: .9, liver: .86, muscle: .72, gut: .72 }, subadult: { blood: .86, liver: .82, muscle: .8, gut: .62 }, old: { blood: .72, liver: .66, muscle: .6, gut: .55 } })[stage] || { blood: .84, liver: .8, muscle: .82, gut: .55 }, gutFill = clamp(Number(animal.stomach) || 35, 0, 100) / 100, stomach = limits.gut * gutFill * reserve.gut, fermenter = metabolicProfile(animal).fermentationType !== "none";
  animal.metabolism = {
    schema: 2,
    gut: { carbohydrate: stomach * (fermenter ? .18 : .3), fat: stomach * .18, protein: stomach * .22, fermentation: stomach * (fermenter ? .42 : .3) },
    bloodFuel: limits.blood * reserve.blood,
    liverGlycogen: limits.liver * reserve.liver,
    muscleGlycogen: limits.muscle * reserve.muscle,
    anaerobicDebt: clamp(Number(animal.anaerobicDebt) || 0, 0, 100),
    stressLoad: clamp(Number(animal.adrenalineRecoveryDebt) || 0, 0, 100),
    ketoneAdaptation: clamp(Number(animal.ketoneAdaptation) || 0, 0, 1),
    proteinCatabolisedKg: Math.max(0, Number(animal.proteinCatabolisedKg) || 0),
    phase: "post-absorptive",
    lastFuelMix: { gut: 0, blood: 0, liver: 0, muscle: 0, fat: 0, protein: 0 },
    thermalLoad: 0,
    cumulative: { ingested: stomach, expended: 0, storedAsFat: 0, proteinLost: 0, aerobicWork: 0, anaerobicWork: 0, emergencyWork: 0 }
  };
  syncLegacyEnergy(animal);
  return animal.metabolism;
}

export function ingestNutrients(animal, { calories = 0, carbohydrate = .3, fat = .25, protein = .25, fermentable = .2 } = {}) {
  const metabolism = initializeMetabolism(animal), total = Math.max(0, calories), fractions = [carbohydrate, fat, protein, fermentable].map(value => Math.max(0, value)), divisor = Math.max(.0001, fractions.reduce((sum, value) => sum + value, 0));
  metabolism.gut.carbohydrate += total * fractions[0] / divisor;
  metabolism.gut.fat += total * fractions[1] / divisor;
  metabolism.gut.protein += total * fractions[2] / divisor;
  metabolism.gut.fermentation += total * fractions[3] / divisor;
  metabolism.cumulative.ingested += total;
  syncLegacyEnergy(animal);
  return total;
}

export function fillMetabolicReserves(animal, { gut = 1, blood = 1, liver = 1 } = {}) {
  const metabolism = initializeMetabolism(animal), limits = capacities(animal);
  const existingGut = sumGut(metabolism.gut);
  const fallbackFractions = { carbohydrate: .3, fat: .18, protein: .22, fermentation: .3 };
  const fractions = existingGut > 0
    ? Object.fromEntries(Object.entries(metabolism.gut).map(([key, value]) => [key, Math.max(0, value) / existingGut]))
    : fallbackFractions;
  const targetGut = limits.gut * clamp(Number(gut) || 0);
  for (const key of Object.keys(metabolism.gut)) metabolism.gut[key] = targetGut * (fractions[key] ?? fallbackFractions[key] ?? 0);
  metabolism.bloodFuel = limits.blood * clamp(Number(blood) || 0);
  metabolism.liverGlycogen = limits.liver * clamp(Number(liver) || 0);
  syncLegacyEnergy(animal);
  return metabolism;
}

export function spendMetabolicEnergy(animal, amount, activity = "ordinary") {
  const metabolism = initializeMetabolism(animal), profile = metabolicProfile(animal), demand = Math.max(0, amount), mix = { gut: 0, blood: 0, liver: 0, muscle: 0, fat: 0, protein: 0 };
  let remaining = demand;
  const take = (key, available, limit = Infinity) => { const used = Math.min(remaining, Math.max(0, available()), limit); if (used > 0) { available(-used); mix[key] += used; remaining -= used; } };
  const pool = key => delta => delta === undefined ? metabolism[key] : metabolism[key] = Math.max(0, metabolism[key] + delta);
  if (["sprint", "fight", "climb", "adrenaline"].includes(activity)) take("muscle", pool("muscleGlycogen"), demand * (activity === "sprint" ? .78 : .55));
  take("blood", pool("bloodFuel")); take("liver", pool("liverGlycogen"));
  if (remaining > 0 && (animal.fatMass || 0) > 0) { const available = animal.fatMass * FAT_CALORIES_PER_KG, used = Math.min(remaining, available * Math.min(1, profile.fatMobilisation)); animal.fatMass -= used / FAT_CALORIES_PER_KG; mix.fat += used; remaining -= used; }
  if (remaining > 0 && (animal.muscleMass || 0) > .2) { const protectedMuscle = Math.max(.2, (animal.leanMass || 1) * .32), availableKg = Math.max(0, animal.muscleMass - protectedMuscle), used = Math.min(remaining, availableKg * 4100 / profile.proteinCatabolismResistance); const lostKg = used / 4100; animal.muscleMass -= lostKg; animal.leanMass = Math.max(.5, animal.leanMass - lostKg); metabolism.proteinCatabolisedKg += lostKg; metabolism.cumulative.proteinLost += used; mix.protein += used; remaining -= used; }
  metabolism.lastFuelMix = mix; metabolism.cumulative.expended += demand - remaining;
  if (activity === "ordinary") metabolism.cumulative.aerobicWork += demand - remaining;
  if (["sprint", "fight", "climb"].includes(activity)) metabolism.cumulative.anaerobicWork += demand - remaining;
  if (activity === "adrenaline") metabolism.cumulative.emergencyWork += demand - remaining;
  if (["sprint", "fight", "climb"].includes(activity)) metabolism.anaerobicDebt = clamp(metabolism.anaerobicDebt + demand / Math.max(1, capacities(animal).muscle) * 100, 0, 100);
  syncLegacyEnergy(animal);
  return Object.freeze({ requested: demand, supplied: demand - remaining, deficit: remaining, mix });
}

export function advanceMetabolism(animal, { elapsedHours = 1, demandMultiplier = 1, temperaturePerformance = 1, pregnant = false, lactating = false, resting = false } = {}) {
  const metabolism = initializeMetabolism(animal), profile = metabolicProfile(animal), limits = capacities(animal), gut = metabolism.gut;
  const stressDigestion = clamp(1 - metabolism.stressLoad / 140, .25, 1), thermalDigestion = clamp(temperaturePerformance, .15, 1.2), digestionRate = Math.max(.01, biologicalPhenotype(animal)?.digestion?.rate || 1) * stressDigestion * thermalDigestion * elapsedHours;
  const absorb = (key, fraction) => { const amount = Math.min(gut[key], gut[key] * fraction * digestionRate); gut[key] -= amount; return amount; };
  const carb = absorb("carbohydrate", .34), dietaryFat = absorb("fat", .2), protein = absorb("protein", .18), fermentation = absorb("fermentation", profile.fermentationType === "foregut" ? .12 : .2);
  let absorbed = carb + dietaryFat + protein + fermentation;
  const fill = (key, capacity, amount) => { const stored = Math.min(amount, Math.max(0, capacity - metabolism[key])); metabolism[key] += stored; return amount - stored; };
  absorbed = fill("bloodFuel", limits.blood, absorbed);
  const liverOffer = absorbed * profile.glycogenReplenishment; absorbed = absorbed - liverOffer + fill("liverGlycogen", limits.liver, liverOffer);
  const muscleOffer = absorbed * profile.glycogenReplenishment; absorbed = absorbed - muscleOffer + fill("muscleGlycogen", limits.muscle, muscleOffer);
  if (absorbed > 0) { const stored = absorbed * .72; animal.fatMass = Math.max(0, (animal.fatMass || 0) + stored / FAT_CALORIES_PER_KG); metabolism.cumulative.storedAsFat += stored; }
  const basal = metabolicRate(animal) * profile.basalScale * Math.max(.1, demandMultiplier) * elapsedHours * (pregnant ? 1.12 : 1) * (lactating ? 1.2 : 1);
  const expenditure = spendMetabolicEnergy(animal, basal, resting ? "rest" : "basal");
  const rapidFraction = clamp((metabolism.bloodFuel + metabolism.liverGlycogen) / Math.max(1, limits.blood + limits.liver));
  const fatPercent = bodyFatPercent(animal), composition = compositionProfile(animal.speciesId, animal.sex), fatAvailable = fatPercent > composition.criticalFatPercent;
  metabolism.ketoneAdaptation = clamp(metabolism.ketoneAdaptation + (rapidFraction < .25 && fatAvailable ? .025 : -.02) * elapsedHours * profile.ketoneAdaptation, 0, 1);
  metabolism.anaerobicDebt = clamp(metabolism.anaerobicDebt - (resting ? 7 : 1.3) * elapsedHours * profile.aerobicCapacity, 0, 100);
  metabolism.stressLoad = clamp(metabolism.stressLoad - (resting ? 4 : .7) * elapsedHours * profile.adrenalineRecovery, 0, 100);
  const proteinUse = metabolism.lastFuelMix.protein || 0;
  metabolism.phase = expenditure.deficit > 0 ? "organ-failure-risk" : proteinUse > 0 ? "protein-catabolism" : fatPercent <= composition.criticalFatPercent ? "critical-fat-depletion" : metabolism.ketoneAdaptation > .55 ? "ketone-adapted" : rapidFraction < .25 ? "fat-mobilisation" : sumGut(gut) > limits.gut * .25 ? "digesting" : rapidFraction < .65 ? "glycogen-depletion" : "post-absorptive";
  animal.bodyMass = Math.max(.5, (animal.leanMass || .5) + (animal.fatMass || 0)); animal.bodyFatPercent = bodyFatPercent(animal);
  if (animal.bodyFatPercent < composition.criticalFatPercent) animal.lowFatTicks = (animal.lowFatTicks || 0) + elapsedHours;
  else animal.lowFatTicks = Math.max(0, (animal.lowFatTicks || 0) - .25 * elapsedHours);
  if (animal.sex === "F" && animal.lowFatTicks >= composition.lowFatInfertilityTicks) animal.fertilityImpaired = true;
  const idealMid = (composition.idealLow + composition.idealHigh) / 2; animal.bodyCondition = Math.max(.45, 1 + (animal.bodyFatPercent - idealMid) / 55);
  if (metabolism.phase === "critical-fat-depletion") animal.health -= .08 * elapsedHours;
  if (metabolism.phase === "protein-catabolism") animal.health -= .12 * elapsedHours;
  if (metabolism.phase === "organ-failure-risk") { animal.health -= (.3 + expenditure.deficit * .01) * elapsedHours; animal.healthCap = Math.max(0, (animal.healthCap ?? 100) - .025 * elapsedHours); }
  syncLegacyEnergy(animal);
  return { demand: basal, deficit: expenditure.deficit, fatPercent, critical: fatPercent < composition.criticalFatPercent, obese: fatPercent > composition.obeseAbove, phase: metabolism.phase, digestiveHeat: (carb + dietaryFat + protein + fermentation) * profile.digestiveHeat };
}

export function predictiveHunger(animal) {
  const metabolism = initializeMetabolism(animal), limits = capacities(animal), gut = sumGut(metabolism.gut) / Math.max(1, limits.gut), rapid = (metabolism.bloodFuel + metabolism.liverGlycogen) / Math.max(1, limits.blood + limits.liver), fat = bodyFatPercent(animal), profile = compositionProfile(animal.speciesId, animal.sex), proteinNeed = metabolicProfile(animal).dietaryProteinRequirement;
  return clamp((1 - gut) * .38 + (1 - rapid) * .34 + clamp((profile.idealLow - fat) / Math.max(1, profile.idealLow)) * .18 + proteinNeed * (metabolism.gut.protein < limits.gut * .04 ? .1 : 0) + metabolism.anaerobicDebt / 100 * .08 + (animal.pregnant || animal.lactation > 0 ? .1 : 0), 0, 1) * 100;
}

export function metabolicJourneyBudget(animal, { distance = 0, sprint = false, climbing = 0, thermalCost = 1 } = {}) {
  const metabolism = initializeMetabolism(animal), cost = Math.max(0, distance) * (sprint ? 1.7 : .75) * Math.max(.5, thermalCost) + Math.max(0, climbing) * 2.2, rapid = metabolism.bloodFuel + metabolism.liverGlycogen, muscle = metabolism.muscleGlycogen;
  return Object.freeze({ cost, available: rapid + (sprint ? muscle : (animal.fatMass || 0) * FAT_CALORIES_PER_KG * .08), viable: sprint ? muscle + rapid >= cost : rapid + (animal.fatMass || 0) * FAT_CALORIES_PER_KG * .08 >= cost, arrivalReserve: Math.max(0, rapid + (sprint ? muscle : 0) - cost), recommendedMode: sprint && muscle >= cost * .55 ? "sprint" : "walk" });
}

export function syncLegacyEnergy(animal) {
  const metabolism = animal.metabolism; if (!metabolism) return;
  const limits = capacities(animal), accessible = clamp((metabolism.bloodFuel + metabolism.liverGlycogen) / Math.max(1, limits.blood + limits.liver));
  animal.accessibleFuel = accessible * 100;
  animal.energy = animal.accessibleFuel;
  animal.sprintEnergy = clamp(metabolism.muscleGlycogen / Math.max(1, limits.muscle), 0, 1) * (animal.speciesId === "hunter" ? 216 : 100);
  animal.stomachCalories = sumGut(metabolism.gut); animal.stomach = clamp(animal.stomachCalories / Math.max(1, stomachCapacityCalories(animal)) * 100, 0, 100);
  animal.metabolicPhase = metabolism.phase; animal.anaerobicDebt = metabolism.anaerobicDebt; animal.adrenalineRecoveryDebt = metabolism.stressLoad;
}

export function metabolicPresentation(animal) {
  const metabolism = initializeMetabolism(animal), limits = capacities(animal);
  return Object.freeze({ phase: metabolism.phase, gut: clamp(sumGut(metabolism.gut) / limits.gut), blood: clamp(metabolism.bloodFuel / limits.blood), liver: clamp(metabolism.liverGlycogen / limits.liver), muscle: clamp(metabolism.muscleGlycogen / limits.muscle), fatPercent: bodyFatPercent(animal), proteinLostKg: metabolism.proteinCatabolisedKg, anaerobicDebt: metabolism.anaerobicDebt, stressLoad: metabolism.stressLoad, lastFuelMix: metabolism.lastFuelMix });
}
