const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

export function gaussian(random) {
  const u = Math.max(Number.EPSILON, Math.min(1 - Number.EPSILON, Number(random()) || 0));
  const v = Math.max(Number.EPSILON, Math.min(1 - Number.EPSILON, Number(random()) || 0));
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function offspringTraitArchitecture({ mother, father, prenatalQuality = 1, random }) {
  const quality = clamp(Number(prenatalQuality) || 0, 0, 1);
  const overall = clamp(gaussian(random), -2.75, 2.75);
  const difficultPregnancyDivergence = (1 - quality) * .75;
  const divergence = clamp(Math.abs(gaussian(random)) * (.48 + difficultPregnancyDivergence), 0, 2.8);
  const raw = Array.from({ length: 8 }, () => gaussian(random));
  const mean = raw.reduce((sum, value) => sum + value, 0) / raw.length;
  const deviations = raw.map((value) => (value - mean) * divergence);
  const parentMean = (key, fallback) => {
    const values = [mother?.[key], father?.[key]].filter(Number.isFinite);
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : fallback;
  };
  const broad = overall * .075;
  const trait = (index, base, low, high, scale = .12) => clamp(base * (1 + broad + deviations[index] * scale), low, high);
  const values = {
    sizeTrait: trait(0, parentMean("sizeTrait", 1), .62, 1.48, .09),
    aggression: clamp(parentMean("aggression", .5) + overall * .025 + deviations[1] * .13, .03, .98),
    scentSkill: trait(2, parentMean("scentSkill", 1), .4, 1.75),
    waterSkill: trait(3, parentMean("waterSkill", 1), .4, 1.75),
    foodSkill: trait(4, parentMean("foodSkill", 1), .4, 1.75),
    mateSkill: trait(5, parentMean("mateSkill", 1), .4, 1.75),
    careAffinity: trait(6, parentMean("careAffinity", .65), .08, 1.25, .16),
    memoryPersistence: trait(7, parentMean("memoryPersistence", 1), .45, 1.8, .15),
    healthPotential: clamp(1 + broad + deviations[0] * .08, .58, 1.2),
    strengthPotential: clamp(1 + broad + (deviations[0] + deviations[1]) * .055, .62, 1.35),
  };
  const spread = Math.sqrt(deviations.reduce((sum, value) => sum + value * value, 0) / deviations.length);
  const profile = divergence >= 1.45 ? "highly divergent" : divergence >= .8 ? "specialised" : "balanced";
  const overallBand = overall <= -1.35 ? "broadly disadvantaged" : overall >= 1.35 ? "broadly exceptional" : "typical range";
  return { overallScore: overall, divergenceScore: divergence, observedSpread: spread, profile, overallBand, prenatalQuality: quality, values };
}

export function applyOffspringTraitArchitecture(animal, architecture) {
  if (!animal || !architecture?.values) return animal;
  Object.assign(animal, architecture.values);
  animal.memoryPersistence = architecture.values.memoryPersistence;
  animal.traitArchitecture = {
    overallScore: architecture.overallScore,
    divergenceScore: architecture.divergenceScore,
    observedSpread: architecture.observedSpread,
    profile: architecture.profile,
    overallBand: architecture.overallBand,
    prenatalQuality: architecture.prenatalQuality,
  };
  return animal;
}
