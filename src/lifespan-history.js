const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

export function migrateLifeHistory(animal = {}) {
  const priorHours = Math.max(0, finite(animal.age) * 24), source = animal.lifeHistory || {};
  const observedHours = Math.max(0, finite(source.observedHours, priorHours));
  animal.lifeHistory = {
    observedHours,
    weightedBurdenHours: Math.max(0, finite(source.weightedBurdenHours, observedHours * 0.5)),
    fearHours: Math.max(0, finite(source.fearHours)), fleeingHours: Math.max(0, finite(source.fleeingHours)),
    injuryHours: Math.max(0, finite(source.injuryHours)), extremeExertionHours: Math.max(0, finite(source.extremeExertionHours)),
    thermalStressHours: Math.max(0, finite(source.thermalStressHours)), deprivationHours: Math.max(0, finite(source.deprivationHours)),
    injuriesSustained: Math.max(0, Math.floor(finite(source.injuriesSustained))), emergencyExertions: Math.max(0, Math.floor(finite(source.emergencyExertions)))
  };
  return animal.lifeHistory;
}

export function recordLifeExperience(animal = {}, elapsedHours = 1) {
  const history = migrateLifeHistory(animal);
  const fear = clamp(finite(animal.fear) / 100, 0, 1), fleeing = animal.actionState?.key === "flee" ? 1 : 0;
  const injury = clamp((animal.injuries || []).reduce((sum, item) => sum + finite(item.severity), 0) / 1.5, 0, 1);
  const exertion = clamp(Math.max(finite(animal.fatigue) - 65, 0) / 35 + (["chase", "flee"].includes(animal.actionState?.key) ? finite(animal.movementNoise) * 0.35 : 0), 0, 1);
  const thermal = clamp(finite(animal.tempStress) / 100, 0, 1);
  const deprivation = clamp(Math.max(30 - finite(animal.energy, 100), 30 - finite(animal.hydration, 100), 10 - finite(animal.stomach, 35), 0) / 30, 0, 1);
  history.observedHours += elapsedHours; history.fearHours += fear * elapsedHours; history.fleeingHours += fleeing * elapsedHours; history.injuryHours += injury * elapsedHours;
  history.extremeExertionHours += exertion * elapsedHours; history.thermalStressHours += thermal * elapsedHours; history.deprivationHours += deprivation * elapsedHours;
  history.weightedBurdenHours += (fear * .28 + fleeing * .16 + injury * .22 + exertion * .14 + thermal * .10 + deprivation * .10) * elapsedHours;
  return history;
}

export function lifespanQuality(animal = {}) {
  const history = migrateLifeHistory(animal); if (history.observedHours <= 0) return 1;
  const lastingShockHours = history.injuriesSustained * 8 + history.emergencyExertions * 18;
  return clamp(1 - (history.weightedBurdenHours + lastingShockHours) / history.observedHours, 0, 1);
}
export function recordInjurySustained(animal = {}) { migrateLifeHistory(animal).injuriesSustained += 1; }
export function recordEmergencyExertion(animal = {}) { migrateLifeHistory(animal).emergencyExertions += 1; }
