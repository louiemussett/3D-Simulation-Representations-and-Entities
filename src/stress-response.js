import { initializeMetabolism } from "./metabolic-system.js";
import { migrateUtilisationState } from "./activity-utilisation.js";

const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, Number(value) || 0));

export function migrateStressResponse(animal = {}) {
  if (animal.stressResponse?.schema === 1) return animal.stressResponse;
  const legacyExposure = (1 - clamp(animal.emergencyReserve ?? 1)) * 35;
  animal.stressResponse = { schema: 1, state: legacyExposure > 20 ? "recovery" : "baseline", intensity: 0, triggerId: null, triggerKind: null, threatConfidence: 0, activatedAt: null, lastThreatAt: null, fuelMobilisation: 0, voluntaryLimitOverride: 0, painSuppression: 0, attentionBias: 0, cumulativeExposure: legacyExposure, recoveryDebt: legacyExposure };
  return animal.stressResponse;
}

export function assessStressTrigger(animal = {}, threat = {}, context = {}) {
  const confidence = clamp(threat.confidence ?? threat.overallConfidence ?? 0), distance = Math.max(0, Number(threat.distance) || 0), proximity = clamp(1 - distance / Math.max(1, context.detectionRange || 12)), targeting = clamp(threat.targetingLikelihood ?? threat.selfTargetLikelihood ?? .5), healthVulnerability = clamp((70 - (animal.health || 0)) / 70), memory = clamp(context.memorySensitivity ?? .25), groupSafety = clamp(context.groupSupport ?? 0), offspring = context.protectingOffspring ? .2 : 0, reactivity = clamp(.55 + (animal.fear || 0) / 180 + (animal.aggression || 0) * .2, .35, 1.35);
  const score = clamp(confidence * (.35 + proximity * .65) * (.5 + targeting * .5) * (1 + healthVulnerability * .3 + memory * .15 + offspring) * reactivity * (1 - groupSafety * .25));
  return Object.freeze({ score, confidence, proximity, targeting, activate: score >= .32, acute: score >= .62 });
}

export function activateStressResponse(animal, trigger = {}, tick = 0) {
  const state = migrateStressResponse(animal), metabolism = initializeMetabolism(animal), intensity = clamp(trigger.intensity ?? trigger.score ?? .5), totalBefore = metabolism.bloodFuel + metabolism.liverGlycogen + metabolism.muscleGlycogen;
  const mobilised = Math.min(metabolism.liverGlycogen, intensity * Math.max(1, (animal.leanMass || animal.bodyMass || 1) * 1.5)); metabolism.liverGlycogen -= mobilised; metabolism.bloodFuel += mobilised;
  state.state = intensity >= .62 ? "acute" : "alert"; state.intensity = Math.max(state.intensity, intensity); state.triggerId = trigger.triggerId || trigger.id || null; state.triggerKind = trigger.triggerKind || trigger.kind || "threat"; state.threatConfidence = clamp(trigger.confidence ?? intensity); state.activatedAt ??= tick; state.lastThreatAt = tick; state.fuelMobilisation += mobilised; state.voluntaryLimitOverride = clamp(intensity * .75); state.painSuppression = clamp(intensity * .58); state.attentionBias = clamp(intensity * .85); state.cumulativeExposure += intensity * 1.8; state.recoveryDebt += intensity * 2.2;
  const totalAfter = metabolism.bloodFuel + metabolism.liverGlycogen + metabolism.muscleGlycogen; if (Math.abs(totalBefore - totalAfter) > 1e-6) throw new Error("Stress mobilisation must conserve metabolic substrate");
  migrateUtilisationState(animal).recoveryDebt.stress = clamp(migrateUtilisationState(animal).recoveryDebt.stress + intensity * 1.5, 0, 100);
  return state;
}

export function advanceStressResponse(animal, { threatPresent = false, safeCover = 0, activitySteps = 1 } = {}) {
  const state = migrateStressResponse(animal), step = Math.max(.01, Number(activitySteps) || 1);
  if (threatPresent) { state.intensity = clamp(state.intensity + .04 * step); state.state = state.intensity >= .62 ? "acute" : "alert"; }
  else { state.intensity = clamp(state.intensity - (.08 + clamp(safeCover) * .06) * step); state.voluntaryLimitOverride = clamp(state.voluntaryLimitOverride - .1 * step); state.painSuppression = clamp(state.painSuppression - .08 * step); state.attentionBias = clamp(state.attentionBias - .07 * step); state.state = state.intensity > .35 ? "declining" : state.recoveryDebt > 8 ? "recovery" : "baseline"; if (state.state === "baseline") { state.triggerId = null; state.triggerKind = null; state.activatedAt = null; } }
  state.recoveryDebt = Math.max(0, state.recoveryDebt - (threatPresent ? .02 : .18) * step); state.cumulativeExposure = Math.max(0, state.cumulativeExposure - .025 * step);
  animal.emergencyReserve = clamp(1 - state.recoveryDebt / 100); return state;
}

export function stressPerformanceModifiers(animal = {}) { const state = migrateStressResponse(animal), intensity = clamp(state.intensity); return Object.freeze({ acceleration: 1 + intensity * .22, force: 1 + intensity * .18, burstRecruitment: 1 + intensity * .16, voluntaryLimit: 1 + state.voluntaryLimitOverride * .25, digestion: 1 - intensity * .48, heat: 1 + intensity * .55, water: 1 + intensity * .35, pain: 1 - state.painSuppression * .5 }); }
export function stressPerceptionModifiers(animal = {}) { const attention = migrateStressResponse(animal).attentionBias; return Object.freeze({ vision: 1 + attention * .18, hearing: 1 + attention * .24, smell: 1 + attention * .08, threatRelevance: 1 + attention * .65, unrelatedAttention: 1 - attention * .35 }); }
export function canEmergencyOverride(animal = {}) { const state = migrateStressResponse(animal), metabolism = initializeMetabolism(animal); return state.intensity >= .55 && state.recoveryDebt < 92 && (metabolism.bloodFuel + metabolism.liverGlycogen + metabolism.muscleGlycogen) > 1 && (animal.health || 0) > 8 && (animal.hydration || 0) > 8; }
