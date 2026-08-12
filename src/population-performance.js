export function environmentSenseCadence(population) {
  if (population <= 32) return 3;
  if (population <= 96) return 4;
  if (population <= 192) return 5;
  if (population <= 384) return 6;
  if (population <= 768) return 8;
  return 10;
}

export function routineEnvironmentScanDue(animal, tick, population, responsive = false) {
  let cadence = environmentSenseCadence(population);
  if (animal.speciesId === "hunter") cadence = Math.min(cadence, 2);
  const urgent = (animal.threatAssessment?.overallConfidence || 0) >= .25
    || (animal.lastHit?.tick ?? -Infinity) >= tick - 2
    || ["flee", "chase", "stalk", "track-scent", "search"].includes(animal.actionState?.key);
  if (responsive || urgent || cadence === 1) return true;
  const order = Number.isInteger(animal.decisionOrder) ? animal.decisionOrder : 0;
  return (order + tick) % cadence === 0;
}
