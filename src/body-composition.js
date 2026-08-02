const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
import { eatsMeat } from "./species-registry.js";
export const FAT_CALORIES_PER_KG = 7700;

export const BODY_COMPOSITION_PROFILES = Object.freeze({
  grazer: Object.freeze({
    M: Object.freeze({ criticalFatPercent: 5, idealLow: 10, idealHigh: 19, obeseAbove: 30, stomachCaloriesPerKg: 48, leanMetabolism: 1.15, fatMetabolism: .18, lowFatInfertilityTicks: 96 }),
    F: Object.freeze({ criticalFatPercent: 12, idealLow: 17, idealHigh: 28, obeseAbove: 38, stomachCaloriesPerKg: 52, leanMetabolism: 1.08, fatMetabolism: .16, lowFatInfertilityTicks: 72 })
  }),
  hunter: Object.freeze({
    M: Object.freeze({ criticalFatPercent: 4, idealLow: 8, idealHigh: 16, obeseAbove: 27, stomachCaloriesPerKg: 70, leanMetabolism: .78, fatMetabolism: .14, lowFatInfertilityTicks: 120 }),
    F: Object.freeze({ criticalFatPercent: 10, idealLow: 14, idealHigh: 24, obeseAbove: 34, stomachCaloriesPerKg: 76, leanMetabolism: .74, fatMetabolism: .13, lowFatInfertilityTicks: 96 })
  })
});

export function compositionProfile(speciesId, sex) { return BODY_COMPOSITION_PROFILES[speciesId]?.[sex] || BODY_COMPOSITION_PROFILES[eatsMeat(speciesId) ? "hunter" : "grazer"][sex] || BODY_COMPOSITION_PROFILES.grazer.M; }
export function bodyFatPercent(animal) { return animal.bodyMass > 0 ? clamp(animal.fatMass / animal.bodyMass * 100, 0, 99) : 0; }
export function stomachCapacityCalories(animal) { return Math.max(100, (animal.leanMass || animal.bodyMass || 1) * compositionProfile(animal.speciesId, animal.sex).stomachCaloriesPerKg); }
export function stomachFillPercent(animal) { return clamp((animal.stomachCalories || 0) / stomachCapacityCalories(animal) * 100, 0, 100); }

export function migrateBodyComposition(animal = {}) {
  const profile = compositionProfile(animal.speciesId, animal.sex), mass = Math.max(1, Number(animal.bodyMass) || 1), midpoint = (profile.idealLow + profile.idealHigh) / 2 / 100;
  animal.fatMass = Math.max(0, Number.isFinite(Number(animal.fatMass)) ? Number(animal.fatMass) : mass * midpoint);
  animal.leanMass = Math.max(.5, Number.isFinite(Number(animal.leanMass)) ? Number(animal.leanMass) : mass - animal.fatMass);
  animal.bodyMass = animal.leanMass + animal.fatMass;
  animal.stomachCalories = Math.max(0, Number.isFinite(Number(animal.stomachCalories)) ? Number(animal.stomachCalories) : stomachCapacityCalories(animal) * clamp((Number(animal.stomach) || 35) / 100, 0, 1));
  animal.bodyFatPercent = bodyFatPercent(animal); animal.stomach = stomachFillPercent(animal);
  animal.lowFatTicks = Math.max(0, Number(animal.lowFatTicks) || 0); animal.fertilityImpaired = Boolean(animal.fertilityImpaired);
  animal.metabolicCaloriesPerTick = Number(animal.metabolicCaloriesPerTick) || metabolicRate(animal);
  const muscleShare = eatsMeat(animal) ? .62 : .55;
  animal.muscleMass = clamp(Number.isFinite(Number(animal.muscleMass)) ? Number(animal.muscleMass) : animal.leanMass * muscleShare, .2, animal.leanMass);
  animal.enduranceFitness = clamp(Number.isFinite(Number(animal.enduranceFitness)) ? Number(animal.enduranceFitness) : .5, 0, 1);
  animal.strengthTrainingLoad = clamp(Number(animal.strengthTrainingLoad) || 0, 0, 100);
  animal.enduranceTrainingLoad = clamp(Number(animal.enduranceTrainingLoad) || 0, 0, 100);
  return animal;
}

export function recordTrainingStimulus(animal, { strength = 0, endurance = 0, thermal = 0 } = {}) {
  animal.strengthTrainingLoad = clamp((animal.strengthTrainingLoad || 0) + Math.max(0, strength), 0, 100);
  animal.enduranceTrainingLoad = clamp((animal.enduranceTrainingLoad || 0) + Math.max(0, endurance) + Math.max(0, thermal) * .35, 0, 100);
}

export function adaptTrainableCondition(animal, elapsedHours = 1) {
  const profile = compositionProfile(animal.speciesId, animal.sex);
  const idealFat = animal.bodyFatPercent >= profile.idealLow && animal.bodyFatPercent <= profile.idealHigh;
  const fuelled = (animal.stomachCalories || 0) > metabolicRate(animal) * 3 && animal.energy > 45;
  const strengthLoad = animal.strengthTrainingLoad || 0, enduranceLoad = animal.enduranceTrainingLoad || 0;
  const muscleCeiling = Math.max(animal.muscleMass || 0, (animal.leanMass || 1) * (animal.speciesId === "hunter" ? .72 : .66));
  if (fuelled && strengthLoad > 2 && (animal.muscleMass || 0) < muscleCeiling) {
    const gain = Math.min(muscleCeiling - animal.muscleMass, strengthLoad * .00018 * elapsedHours);
    animal.muscleMass += gain; animal.leanMass += gain; animal.stomachCalories = Math.max(0, animal.stomachCalories - gain * 1800);
  }
  if (enduranceLoad > 2 && animal.energy > 35) animal.enduranceFitness = clamp((animal.enduranceFitness || 0) + enduranceLoad * .000025 * elapsedHours, 0, 1);
  animal.strengthTrainingLoad = strengthLoad * Math.pow(.82, elapsedHours); animal.enduranceTrainingLoad = enduranceLoad * Math.pow(.86, elapsedHours);
  animal.bodyMass = animal.leanMass + animal.fatMass;
  return { idealFat, muscleRatio: animal.muscleMass / Math.max(.5, animal.leanMass), enduranceFitness: animal.enduranceFitness };
}

export function improvableConditionNeeds(animal) {
  const profile = compositionProfile(animal.speciesId, animal.sex), fat = bodyFatPercent(animal), targetMuscleRatio = animal.speciesId === "hunter" ? .68 : .62;
  return {
    fatDeficit: Math.max(0, profile.idealLow - fat), fatExcess: Math.max(0, fat - profile.idealHigh),
    muscleDeficit: Math.max(0, targetMuscleRatio - (animal.muscleMass || 0) / Math.max(.5, animal.leanMass || 1)),
    enduranceDeficit: Math.max(0, .72 - (animal.enduranceFitness || 0))
  };
}

export function metabolicRate(animal) {
  const profile = compositionProfile(animal.speciesId, animal.sex);
  return Math.max(1, (animal.leanMass || 0) * profile.leanMetabolism + (animal.fatMass || 0) * profile.fatMetabolism);
}

export function compositionPresentation(animal) {
  const profile = compositionProfile(animal.speciesId, animal.sex), fatPercent = bodyFatPercent(animal);
  return { fatPercent, fatFill: clamp(fatPercent / Math.max(profile.obeseAbove, profile.idealHigh), 0, 1), stomachFill: stomachFillPercent(animal) / 100, critical: fatPercent < profile.criticalFatPercent, profile };
}
