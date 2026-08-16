const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

export function feedingAppetite(animal, context = {}) {
  const stomach = clamp(Number(animal.stomach) || 0, 0, 100);
  const base = animal.speciesId === "hunter" ? 76 : 70;
  const metabolicHunger = clamp(Number(context.metabolicHunger) || 0, 0, 100);
  const energyNeed = metabolicHunger * .18;
  const fatNeed = clamp(Number(context.fatDeficit) || 0, 0, 16) * 1.1;
  const reproductiveNeed = (animal.pregnant ? 10 : 0) + ((animal.lactation || 0) > 0 ? 7 : 0) + (context.dependentNeedsCare ? 5 : 0);
  const thermalNeed = clamp(Number(context.coldStress) || 0, 0, 100) * .1 - clamp(Number(context.heatStress) || 0, 0, 100) * .08;
  const opportunity = clamp(Number(context.foodOpportunity) || 0, 0, 1) * 8;
  const seasonalReserve = context.scarcityExpected ? 7 : 0;
  const goalReserve = context.reserveGoal ? 9 : 0;
  const trait = clamp(((Number(animal.foodSkill) || 1) - 1) * 10, -4, 4);
  const dangerCost = clamp(Math.max(Number(animal.fear) || 0, Number(context.threat) || 0), 0, 100) * .28;
  const target = clamp(base + energyNeed + fatNeed + reproductiveNeed + thermalNeed + opportunity + seasonalReserve + goalReserve + trait - dangerCost, 35, 100);
  return Object.freeze({ target, desire: Math.max(metabolicHunger, target - stomach), willing: stomach < 100 && (metabolicHunger > 42 || stomach + .01 < target), metabolicHunger });
}
