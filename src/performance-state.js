import { metabolicPresentation } from "./metabolic-system.js";

const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, Number(value) || 0));
const debtValues = animal => Object.values(animal.utilisation?.recoveryDebt || {}).map(value => clamp(value, 0, 100));

export function burstReserve(animal = {}) {
  const fuel = metabolicPresentation(animal), injury = (animal.injuries || []).reduce((factor, item) => factor * (1 - clamp(item.severity) * .3), 1);
  const hydration = clamp((animal.hydration || 0) / 55), thermal = clamp(1 - (animal.tempStress || 0) / 100, .15, 1), muscle = clamp(.85 + ((animal.muscleMass || 0) / Math.max(.5, animal.leanMass || 1) - .45) * .45, .7, 1.1);
  return clamp(fuel.muscle * injury * hydration * thermal * muscle) * 100;
}

export function recoveryBurden(animal = {}) {
  const debts = debtValues(animal), anaerobic = clamp(metabolicPresentation(animal).anaerobicDebt, 0, 100);
  if (!debts.length) return anaerobic;
  const maximum = Math.max(anaerobic, ...debts), mean = debts.reduce((sum, value) => sum + value, anaerobic) / (debts.length + 1);
  return clamp(maximum * .7 + mean * .3, 0, 100);
}

export function enduranceHeadroom(animal = {}) {
  const utilisation = animal.utilisation || {}, debts = utilisation.recoveryDebt || {}, injury = (animal.injuries || []).reduce((sum, item) => sum + clamp(item.severity, 0, 1) * 18, 0);
  const burden = (utilisation.aerobicLoad || 0) * .58 + (debts.travel || 0) * .22 + (debts.thermal || 0) * .1 + (debts.dehydration || 0) * .1 + injury;
  return clamp(100 - burden, 0, 100);
}

export function movementCapability(animal = {}) {
  const endurance = enduranceHeadroom(animal), burst = burstReserve(animal), fuel = metabolicPresentation(animal), hydration = clamp((animal.hydration || 0) / 45), thermal = clamp(1 - (animal.tempStress || 0) / 95, .1, 1);
  return Object.freeze({ canTravel: endurance > 5 && hydration > .08 && thermal > .1 && (animal.health || 0) > 0, canSprint: burst >= 10 && endurance >= 18 && hydration > .25 && thermal > .3, endurance, burst, accessibleFuel: clamp((fuel.blood + fuel.liver) / 2) * 100, recovery: recoveryBurden(animal) });
}

export function performanceState(animal = {}) {
  const movement = movementCapability(animal), utilisation = animal.utilisation || {}, stress = animal.stressResponse || {}, recovery = animal.recoveryState || {};
  return Object.freeze({ ...movement, zone: utilisation.currentZone || "sustainable", requestedPace: utilisation.requestedPace || "walk", affordablePace: utilisation.affordablePace || "walk", recoveryDepth: recovery.depth || "none", recoveryCause: recovery.reason || null, stressState: stress.state || "baseline", stressIntensity: clamp(stress.intensity) * 100 });
}
