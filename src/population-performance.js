export function environmentSenseCadence(population) {
  if (population <= 32) return 3;
  if (population <= 96) return 4;
  if (population <= 128) return 16;
  if (population <= 256) return 20;
  if (population <= 512) return 24;
  return 32;
}

// Full multimodal perception includes paired-eye LOS, acoustic propagation,
// trace interpretation and predictive evidence fusion. Stagger routine work
// deterministically while allowing danger and selected subjects to bypass it.
export function fullPerceptionCadence(population) {
  if (population <= 32) return 2;
  if (population <= 64) return 3;
  if (population <= 128) return 8;
  if (population <= 256) return 10;
  if (population <= 512) return 12;
  return 16;
}

export function routineFullPerceptionDue(animal, tick, population, { selected = false, immediateThreat = false } = {}) {
  const urgent = immediateThreat || selected
    || (animal.threatAssessment?.overallConfidence || 0) >= .25
    || (animal.lastHit?.tick ?? -Infinity) >= tick - 2
    || ["flee", "defend", "attack", "chase", "stalk", "track-scent"].includes(animal.actionState?.key);
  if (urgent) return true;
  const cadence = fullPerceptionCadence(population), order = Number.isInteger(animal.decisionOrder) ? animal.decisionOrder : 0;
  return (order + tick) % cadence === 0;
}

export function frameSchedulingRate(targetFps, population) {
  const target = Math.max(0, Number(targetFps) || 0);
  if (!target) return 0;
  // A 30 Hz ecological display needs scheduling headroom because even a
  // budgeted authoritative tick periodically occupies the browser main thread.
  if (target <= 30) return population >= 80 ? 60 : 36;
  return target;
}

export function initialActivationCadence(population) {
  if (population <= 64) return 1;
  if (population <= 128) return 8;
  if (population <= 256) return 12;
  return 16;
}

export function initialPopulationActivationDue(animal, tick, population, { urgent = false, selected = false } = {}) {
  const cadence = initialActivationCadence(population);
  if (urgent || selected || cadence === 1 || tick > cadence) return true;
  const order = Number.isInteger(animal?.decisionOrder) ? animal.decisionOrder : 0;
  return order % cadence === Math.max(0, tick - 1) % cadence;
}

export function largePopulationVisualStride(population, { selected = false, performanceMode = false } = {}) {
  if (!performanceMode || population < 80) return 1;
  return selected ? 3 : population <= 128 ? 6 : population <= 256 ? 8 : 10;
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
