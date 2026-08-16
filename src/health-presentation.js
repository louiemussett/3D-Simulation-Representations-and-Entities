export function normaliseHealth(health, healthCap = 100) {
  const cap = Math.max(0, Math.min(100, Number.isFinite(healthCap) ? healthCap : 100));
  return { healthCap: cap, health: Math.max(0, Math.min(cap, Number.isFinite(health) ? health : cap)) };
}

export function healthPresentation(health, healthCap = 100) {
  const normal = normaliseHealth(health, healthCap);
  const acuteRatio = normal.healthCap > 0 ? normal.health / normal.healthCap : 0;
  const acuteTier = acuteRatio <= .25 ? "critical" : acuteRatio <= .5 ? "severe" : acuteRatio <= .75 ? "injured" : "stable";
  return {
    ...normal, acuteRatio, acuteTier,
    currentFill: normal.health / 100,
    recoverableEmpty: (normal.healthCap - normal.health) / 100,
    permanentlyUnavailable: (100 - normal.healthCap) / 100
  };
}

export function clampAnimalHealth(animal) {
  const normal = normaliseHealth(animal.health, animal.healthCap);
  animal.health = normal.health; animal.healthCap = normal.healthCap;
  return animal;
}
