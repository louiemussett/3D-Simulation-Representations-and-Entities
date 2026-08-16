const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

export function pregnancyTermMultiplier(offspringCount, mode = "live-birth") {
  const count = Math.max(1, Math.floor(Number(offspringCount) || 1));
  const additional = count - 1;
  return mode === "surface-eggs" ? Math.min(1.6, 1 + additional * .06) : Math.min(2, 1 + additional * .18);
}

export function pregnancyProgress(pregnant, gestationDays) {
  if (!pregnant || !Number.isFinite(gestationDays) || gestationDays <= 0) return 0;
  return clamp((Number(pregnant.age) || 0) / gestationDays, 0, 1);
}

export function pregnancyHormonalCycle(pregnant, gestationDays) {
  if (!pregnant) return null;
  const progress = pregnancyProgress(pregnant, gestationDays);
  if (progress < .12) return { phase: "implantation", progesterone: .62, estrogen: .28, prolactin: .08, oxytocin: .02 };
  if (progress < .4) return { phase: "early pregnancy", progesterone: .86, estrogen: .42, prolactin: .2, oxytocin: .03 };
  if (progress < .75) return { phase: "mid pregnancy", progesterone: 1, estrogen: .62, prolactin: .44, oxytocin: .06 };
  if (progress < .92) return { phase: "late pregnancy", progesterone: .9, estrogen: .82, prolactin: .72, oxytocin: .16 };
  return { phase: "pre-labour", progesterone: .58, estrogen: 1, prolactin: .94, oxytocin: .72 };
}

export function pregnancyPhysiology(pregnant, gestationDays, mode = "live-birth") {
  if (!pregnant) return { offspringCount: 0, progress: 0, termMultiplier: 1, weightMultiplier: 1, needMultiplier: 1, bodyLinearScale: 1, hormoneCycle: null };
  const offspringCount = Math.max(1, Math.floor(Number(pregnant.offspringCount) || 1));
  const progress = pregnancyProgress(pregnant, gestationDays);
  const termMultiplier = pregnancyTermMultiplier(offspringCount, mode);
  const currentMultiplier = 1 + (termMultiplier - 1) * progress;
  return { offspringCount, progress, termMultiplier, weightMultiplier: currentMultiplier, needMultiplier: currentMultiplier, bodyLinearScale: Math.cbrt(currentMultiplier), hormoneCycle: mode === "surface-eggs" ? null : pregnancyHormonalCycle(pregnant, gestationDays) };
}

export function chooseOffspringCount(litterRange, randomValue) {
  const minimum = Math.max(1, Math.floor(Number(litterRange?.[0]) || 1));
  const maximum = Math.max(minimum, Math.floor(Number(litterRange?.[1]) || minimum));
  const roll = clamp(Number(randomValue) || 0, 0, 1 - Number.EPSILON);
  return minimum + Math.floor(roll * (maximum - minimum + 1));
}

export function maternalConditionScore(animal, profile = {}) {
  const criticalFat = Math.max(1, Number(profile.criticalFatPercent) || 10);
  const idealFat = Math.max(criticalFat + 1, Number(profile.idealLow) || criticalFat + 5);
  const fat = Number.isFinite(animal?.bodyFatPercent) ? animal.bodyFatPercent : idealFat;
  const fatScore = clamp((fat - criticalFat * .35) / (idealFat - criticalFat * .35), 0, 1);
  const energy = clamp((Number(animal?.energy) || 0) / 75, 0, 1);
  const hydration = clamp((Number(animal?.hydration) || 0) / 72, 0, 1);
  const health = clamp((Number(animal?.health) || 0) / 82, 0, 1);
  return clamp(fatScore * .48 + energy * .17 + hydration * .15 + health * .2, 0, 1);
}

export function conceptionProbability(animal, profile, baseChance = .78) {
  const condition = maternalConditionScore(animal, profile);
  const critical = (Number(animal?.bodyFatPercent) || 0) < (Number(profile?.criticalFatPercent) || 10);
  const impaired = Boolean(animal?.fertilityImpaired);
  const conditionFactor = .04 + .96 * condition ** 2.25;
  return clamp(baseChance * conditionFactor * (critical ? .52 : 1) * (impaired ? .58 : 1), .015, .92);
}

export function pregnancyDailyLossRisk(animal, pregnant, gestationDays, profile = {}) {
  const progress = pregnancyProgress(pregnant, gestationDays);
  const condition = maternalConditionScore(animal, profile);
  const earlySensitivity = progress < .12 ? 2.8 : progress < .35 ? 1.65 : progress < .7 ? .8 : .48;
  const lowConditionRisk = (1 - condition) ** 2 * .12 * earlySensitivity;
  const viabilityRisk = (1 - clamp(Number(pregnant?.viability) || 0, 0, 1)) ** 1.5 * .08;
  const acuteRisk = (Number(animal?.health) < 45 ? .055 : 0) + (Number(animal?.hydration) < 22 ? .045 : 0);
  return clamp(.0007 * earlySensitivity + lowConditionRisk + viabilityRisk + acuteRisk, .0002, .42);
}

export function prenatalHealthOutcome(pregnant, mother, profile, randomValue) {
  const conception = clamp(Number(pregnant?.conditionAtConception) || .5, 0, 1);
  const gestational = clamp(Number(pregnant?.averageMaternalCondition) || conception, 0, 1);
  const viability = clamp(Number(pregnant?.viability) || 0, 0, 1);
  const current = maternalConditionScore(mother, profile);
  const quality = clamp(conception * .25 + gestational * .35 + viability * .25 + current * .15, 0, 1);
  const fullHealthChance = clamp(.04 + .9 * quality ** 2.1, .04, .94);
  if (clamp(Number(randomValue) || 0, 0, 1) < fullHealthChance) return { health: 100, healthCap: 100, quality, fullHealth: true };
  const healthCap = Math.round(clamp(58 + quality * 40, 58, 98));
  return { health: Math.round(clamp(42 + quality * 50, 42, healthCap)), healthCap, quality, fullHealth: false };
}

export function migratePregnancyState(animal, species) {
  if (!animal?.pregnant) { if (animal) animal.pregnancyHormones = null; return animal; }
  if (!Number.isFinite(animal.pregnant.offspringCount) || animal.pregnant.offspringCount < 1) animal.pregnant.offspringCount = Math.max(1, Math.floor(Number(species?.litter?.[0]) || 1));
  animal.pregnant.viability = clamp(Number.isFinite(animal.pregnant.viability) ? animal.pregnant.viability : 1, 0, 1);
  animal.pregnant.conditionAtConception = clamp(Number.isFinite(animal.pregnant.conditionAtConception) ? animal.pregnant.conditionAtConception : animal.pregnant.viability, 0, 1);
  animal.pregnant.averageMaternalCondition = clamp(Number.isFinite(animal.pregnant.averageMaternalCondition) ? animal.pregnant.averageMaternalCondition : animal.pregnant.conditionAtConception, 0, 1);
  animal.pregnant.conditionSamples = Math.max(1, Math.floor(Number(animal.pregnant.conditionSamples) || 1));
  animal.pregnant.lossChecksThroughDay = Number.isFinite(Number(animal.pregnant.lossChecksThroughDay)) ? Math.max(-1, Math.floor(Number(animal.pregnant.lossChecksThroughDay))) : -1;
  animal.pregnancyHormones = species?.reproduction?.mode === "surface-eggs" ? null : pregnancyHormonalCycle(animal.pregnant, species?.gestation);
  return animal;
}
