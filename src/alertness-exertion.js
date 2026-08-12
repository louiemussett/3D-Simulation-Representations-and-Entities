import { recordEmergencyExertion } from "./lifespan-history.js";
import { SPECIES, eatsMeat } from "./species-registry.js";
import { initializeMetabolism, spendMetabolicEnergy } from "./metabolic-system.js";

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

export const EXERTION_PROFILES = Object.freeze({
  grazer: Object.freeze({ sprintCapacity: 100, sprintDrain: 22, sprintPace: 1.18, adrenalineDrain: .012, freezeChance: .34, freezeMin: 2, freezeSpan: 3, emergencyHealthMin: 20, emergencyHealthSpan: 45, collapseTicks: 5, sprintCooldownTicks: 10 }),
  hunter: Object.freeze({ sprintCapacity: 216, sprintDrain: 30, sprintPace: 1.28, adrenalineDrain: .01, freezeChance: .18, freezeMin: 1, freezeSpan: 2, emergencyHealthMin: 30, emergencyHealthSpan: 50, collapseTicks: 7, sprintCooldownTicks: 10 })
});

export function exertionProfile(animal = {}) {
  const speciesId = typeof animal === "string" ? animal : animal.speciesId;
  if (EXERTION_PROFILES[speciesId]) return EXERTION_PROFILES[speciesId];
  const species = SPECIES[speciesId], base = eatsMeat(speciesId) ? EXERTION_PROFILES.hunter : EXERTION_PROFILES.grazer, endurance = species?.enduranceMultiplier || 1;
  return { ...base, sprintCapacity: Math.round(base.sprintCapacity * Math.max(.55, Math.min(1.8, endurance))), sprintPace: base.sprintPace * (species?.speed || 1) };
}

export function migrateExertionState(animal = {}) {
  const profile = exertionProfile(animal);
  animal.sprintEnergy = clamp(Number.isFinite(Number(animal.sprintEnergy)) ? Number(animal.sprintEnergy) : profile.sprintCapacity, 0, profile.sprintCapacity);
  animal.emergencyReserve = clamp(Number.isFinite(Number(animal.emergencyReserve)) ? Number(animal.emergencyReserve) : 1, 0, 1);
  animal.alertPauseUntil = Number(animal.alertPauseUntil) || 0;
  animal.collapseUntil = Number(animal.collapseUntil) || 0;
  animal.sprintRecoveryBlockedUntil = Number(animal.sprintRecoveryBlockedUntil) || 0;
  animal.exertionRecoveryMultiplier = clamp(Number(animal.exertionRecoveryMultiplier) || 1, .25, 1);
  if (animal.lifeStage === "dependent") { animal.sprintEnergy = 0; animal.emergencyReserve = 0; }
  return animal;
}

export function lifeStageExertion(stage = "adult") {
  return Object.freeze({
    canSprint: stage !== "dependent",
    canUseEmergency: stage !== "dependent",
    emergencyRecoveryMultiplier: stage === "juvenile" ? .42 : stage === "subadult" ? .58 : stage === "old" ? .72 : 1,
    permanentHealthLoss: stage === "adult" ? [1, 3] : stage === "old" ? [5, 12] : [0, 0],
    immediateHealthLoss: stage === "old" ? [24, 52] : stage === "adult" ? [4, 10] : [0, 0]
  });
}

export function focusMultipliers(stationaryTicks = 0) {
  if (stationaryTicks >= 3) return Object.freeze({ vision: 2.2, hearingRange: 1.7, hearingAccuracy: 5 });
  if (stationaryTicks >= 1) return Object.freeze({ vision: 1.55, hearingRange: 1.3, hearingAccuracy: 2.5 });
  return Object.freeze({ vision: 1, hearingRange: 1, hearingAccuracy: 1 });
}

export function sensoryAttention({ stationaryTicks = 0, headStillTicks = 0, feeding = false } = {}) {
  if (feeding) return Object.freeze({ focusTicks: 0, vision: .5, hearingRange: .5, hearingAccuracy: .5, smell: .5 });
  const focusTicks = Math.min(Math.max(0, stationaryTicks), Math.max(0, headStillTicks));
  return Object.freeze({ focusTicks, ...focusMultipliers(focusTicks), smell: 1 });
}

export function hearingRangeForProfile(speciesId, baseVision, stationaryTicks = 0, lifeStage = "adult", perceptionScale = 1) {
  const speciesHearing = speciesId === "hunter" ? 0.10 : 0.25;
  return Math.max(2, Math.round(baseVision * 10 * speciesHearing * (lifeStage === "dependent" ? 0.55 : 1) * perceptionScale * focusMultipliers(stationaryTicks).hearingRange));
}

export function auditoryAttentionThreshold(speciesId, stationaryTicks = 0) {
  if (speciesId !== "grazer") return 0;
  if (stationaryTicks >= 3) return 0.10;
  if (stationaryTicks >= 1) return 0.20;
  return 0.30;
}

export function noticesSound(speciesId, confidence, stationaryTicks = 0) {
  return Number(confidence) >= auditoryAttentionThreshold(speciesId, stationaryTicks);
}

export function enduranceSpeedFactor(fatigue = 0) {
  const endurance = clamp(100 - fatigue, 0, 100);
  if (endurance <= 0) return 0;
  return endurance >= 50 ? 1 : Math.pow(.5, (50 - endurance) / 25);
}

export function alertPauseDuration(speciesId, random = Math.random) {
  const profile = exertionProfile(speciesId);
  return profile.freezeMin + Math.floor(random() * profile.freezeSpan);
}

export function shouldFreeze(speciesId, intensity, random = Math.random) {
  const profile = exertionProfile(speciesId);
  return intensity >= 45 && random() < profile.freezeChance * clamp(intensity / 75, .55, 1.35);
}

export function exertionMode(animal, requestedSprint = false) {
  const profile = exertionProfile(animal);
  if (!requestedSprint) return Object.freeze({ key: "ordinary", pace: null, drain: 0 });
  const stage = lifeStageExertion(animal.lifeStage);
  if (!stage.canSprint) return Object.freeze({ key: "spent", pace: .52, drain: 0 });
  const muscleRatio = clamp((animal.muscleMass || 0) / Math.max(.5, animal.leanMass || 1), .35, .75);
  const muscleCondition = clamp((muscleRatio - .35) / .4, 0, 1), endurance = clamp(Number(animal.enduranceFitness) || 0, 0, 1);
  const speedMultiplier = 2 + muscleCondition * 3;
  const conditionedDrain = profile.sprintDrain / (.65 + endurance * .85);
  const metabolism = initializeMetabolism(animal);
  const authorised = Boolean(animal.emergencyRelease?.released || animal.emergencyReleaseAuthorised || (animal.fatigue || 0) >= 100);
  if (stage.canUseEmergency && authorised && (animal.emergencyReserve || 0) > 0) return Object.freeze({ key: "adrenaline-overdrive", pace: profile.sprintPace * 1.12, drain: profile.adrenalineDrain * 2.1, speedMultiplier: speedMultiplier * 1.08, intensity: 1.8, protocolId: animal.emergencyRelease?.protocolId || "straight-escape-burst" });
  if (metabolism.muscleGlycogen > .01) return Object.freeze({ key: "sprint", pace: profile.sprintPace, drain: conditionedDrain, speedMultiplier });
  if (stage.canUseEmergency && animal.controlledAdrenalineAuthorised && (animal.emergencyReserve || 0) > .001) return Object.freeze({ key: "controlled-adrenaline", pace: profile.sprintPace * 1.04, drain: profile.adrenalineDrain, speedMultiplier: speedMultiplier * .92, intensity: 1 });
  // Emergency release is a behavioural decision, not a reward for reaching
  // total exhaustion. The legacy fatigue gate remains only as a save fallback.
  return Object.freeze({ key: "spent", pace: .52, drain: 0 });
}

export function applyExertion(animal, mode, tick, random = Math.random) {
  const profile = exertionProfile(animal);
  if (mode.key === "sprint") {
    const expenditure = spendMetabolicEnergy(animal, mode.drain, "sprint");
    if (expenditure.mix.muscle <= .001 || initializeMetabolism(animal).muscleGlycogen <= .01) animal.sprintRecoveryBlockedUntil = Math.max(animal.sprintRecoveryBlockedUntil || 0, tick + profile.sprintCooldownTicks);
  }
  if (mode.key === "controlled-adrenaline") {
    animal.emergencyReserve = Math.max(0, (animal.emergencyReserve || 0) - mode.drain);
    spendMetabolicEnergy(animal, .65, "adrenaline");
    animal.fatigue = clamp((animal.fatigue || 0) + .35, 0, 100);
    const metabolism = initializeMetabolism(animal);
    metabolism.stressLoad = clamp(metabolism.stressLoad + 2.2 * (mode.intensity || 1), 0, 100);
    animal.adrenalineRecoveryDebt = metabolism.stressLoad;
    const stageLimit = animal.lifeStage === "old" ? 42 : animal.lifeStage === "juvenile" ? 58 : 68;
    const excess = Math.max(0, animal.adrenalineRecoveryDebt - stageLimit), vulnerability = clamp((100 - (animal.health || 0)) / 100 + (animal.tempStress || 0) / 100, 0, 2);
    if (excess > 0) animal.health -= excess * .008 * (1 + vulnerability);
    if (excess > 18 && ["adult", "old"].includes(animal.lifeStage)) animal.healthCap = Math.max(0, (animal.healthCap ?? 100) - excess * .0008);
    if (animal.emergencyReserve <= .001) animal.controlledAdrenalineAuthorised = false;
  }
  if (mode.key === "adrenaline-overdrive") {
    const stage = lifeStageExertion(animal.lifeStage), randomUnit = clamp(random(), 0, 1);
    if (!animal.adrenalineOverdriveActive) recordEmergencyExertion(animal);
    animal.adrenalineOverdriveActive = true;
    animal.emergencyReserve = clamp((animal.emergencyReserve || 0) - mode.drain, 0, 1);
    animal.exertionRecoveryMultiplier = Math.min(animal.exertionRecoveryMultiplier || 1, stage.emergencyRecoveryMultiplier);
    spendMetabolicEnergy(animal, 1.2 * mode.intensity, "adrenaline");
    animal.fatigue = clamp((animal.fatigue || 0) + 1.2 * mode.intensity, 0, 100);
    const metabolism = initializeMetabolism(animal); metabolism.stressLoad = clamp(metabolism.stressLoad + 4.5 * mode.intensity, 0, 100); animal.adrenalineRecoveryDebt = metabolism.stressLoad;
    const stageLimit = animal.lifeStage === "old" ? 38 : animal.lifeStage === "juvenile" ? 52 : 62, excess = Math.max(0, metabolism.stressLoad - stageLimit);
    const [immediateMin, immediateMax] = stage.immediateHealthLoss, [permanentMin, permanentMax] = stage.permanentHealthLoss, damageScale = excess / Math.max(1, 100 - stageLimit);
    animal.health -= (immediateMin + randomUnit * (immediateMax - immediateMin)) * damageScale * .18;
    if (permanentMax > 0 && excess > 12) animal.healthCap = Math.max(0, (animal.healthCap ?? 100) - (permanentMin + randomUnit * (permanentMax - permanentMin)) * damageScale * .05);
    if (animal.emergencyReserve <= 0 || metabolism.stressLoad >= 100 || animal.fatigue >= 100) { animal.collapseUntil = tick + profile.collapseTicks; animal.sprintRecoveryBlockedUntil = Math.max(animal.sprintRecoveryBlockedUntil || 0, animal.collapseUntil + profile.sprintCooldownTicks); animal.adrenalineOverdriveActive = false; }
    if (animal.emergencyAudit?.episodes?.length) {
      const episode = animal.emergencyAudit.episodes.at(-1);
      if (episode.status === "active") Object.assign(episode, { usedTick: tick, reserveAfter: animal.emergencyReserve, status: "released" });
    }
    if ((animal.collapseUntil || 0) > tick) animal.emergencyReleaseAuthorised = false;
  }
  return animal;
}

export function recoverExertion(animal, deeplyResting = false, tick = 0, enduranceRecovery = 0) {
  const profile = exertionProfile(animal);
  if (animal.lifeStage === "dependent") { animal.emergencyReserve = 0; animal.fatigue = clamp((animal.fatigue || 0) - Math.max(0, enduranceRecovery), 0, 100); return "endurance"; }
  if ((animal.collapseUntil || 0) > tick) return "collapse";
  const recoveryMultiplier = clamp(animal.exertionRecoveryMultiplier || 1, .25, 1);
  if ((animal.emergencyReserve || 0) < 1) {
    animal.emergencyReserve = clamp((animal.emergencyReserve || 0) + (deeplyResting ? .2 : .05) * recoveryMultiplier, 0, 1);
    return "emergency";
  }
  if ((animal.fatigue || 0) > 0) {
    animal.fatigue = clamp((animal.fatigue || 0) - Math.max(0, enduranceRecovery) * recoveryMultiplier, 0, 100);
    return "endurance";
  }
  if (tick < (animal.sprintRecoveryBlockedUntil || 0)) return "sprint-cooldown";
  if (initializeMetabolism(animal).anaerobicDebt > 0) return "anaerobic-debt";
  animal.exertionRecoveryMultiplier = Math.min(1, recoveryMultiplier + .08);
  return "recovered";
}
