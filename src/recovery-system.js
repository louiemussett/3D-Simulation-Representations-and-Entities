import { migrateUtilisationState } from "./activity-utilisation.js";
import { initializeMetabolism } from "./metabolic-system.js";
import { migrateStressResponse } from "./stress-response.js";

const clamp = (value, low = 0, high = 100) => Math.max(low, Math.min(high, Number(value) || 0));
const depthOrder = ["none", "active", "alert-rest", "deep-rest", "sleep-like"];
export const RECOVERY_PROFILES = Object.freeze({
  none: Object.freeze({ movement: "normal", aerobic: .12, anaerobic: .08, stress: .04, travel: .04, combat: .03, tissue: 0, digestion: 1, vision: 1, hearing: 1, smell: 1, wakeDelay: 0, wakeThreshold: 0 }),
  active: Object.freeze({ movement: "slow", aerobic: .7, anaerobic: .55, stress: .35, travel: .2, combat: .18, tissue: .05, digestion: .9, vision: .95, hearing: 1, smell: 1, wakeDelay: 0, wakeThreshold: .1 }),
  "alert-rest": Object.freeze({ movement: "none", aerobic: 1.2, anaerobic: .9, stress: .75, travel: .7, combat: .55, tissue: .18, digestion: 1.1, vision: .8, hearing: .9, smell: .9, wakeDelay: 1, wakeThreshold: .24 }),
  "deep-rest": Object.freeze({ movement: "none", aerobic: 2, anaerobic: 1.3, stress: 1.4, travel: 1.8, combat: 1.25, tissue: 1.3, digestion: 1.25, vision: .4, hearing: .65, smell: .75, wakeDelay: 2, wakeThreshold: .48 }),
  "sleep-like": Object.freeze({ movement: "none", aerobic: 3, anaerobic: 1.8, stress: 2.2, travel: 2.5, combat: 1.8, tissue: 1.7, digestion: 1.2, vision: .05, hearing: .3, smell: .5, wakeDelay: 3, wakeThreshold: .7 })
});

export function migrateRecoveryState(animal = {}) {
  if (animal.recoveryState?.schema === 1) return animal.recoveryState;
  const action = animal.actionState?.key, legacyRest = ["rest", "sleep", "digest", "collapse"].includes(action), fatigue = clamp(animal.fatigue || 0), depth = !legacyRest ? "none" : action === "collapse" || fatigue > 88 ? "sleep-like" : fatigue > 65 ? "deep-rest" : "alert-rest";
  animal.recoveryState = { schema: 1, depth, reason: legacyRest ? (action === "collapse" ? "emergency" : "exertion") : null, causes: legacyRest ? [{ kind: "exertion", amount: fatigue }] : [], startedAt: null, minimumUntil: null, maximumUntil: null, targetDebt: {}, interruptedCount: 0, lastInterruptedAt: null, waking: false, wakeStartedAt: null, wakeUntil: null, wakeReason: null };
  return animal.recoveryState;
}

export function recoveryNeeds(animal = {}) {
  const utilisation = migrateUtilisationState(animal), metabolism = initializeMetabolism(animal), stress = migrateStressResponse(animal), debts = { ...utilisation.recoveryDebt, anaerobic: clamp(metabolism.anaerobicDebt), stress: Math.max(utilisation.recoveryDebt.stress || 0, stress.recoveryDebt || 0) };
  const causes = Object.entries(debts).map(([kind, amount]) => ({ kind, amount: clamp(amount) })).filter(item => item.amount > 2).sort((a, b) => b.amount - a.amount), primary = causes[0] || { kind: "none", amount: 0 }, maximum = primary.amount;
  const recommendedDepth = maximum >= 78 || (debts.stress > 62 && debts.anaerobic > 45) ? "sleep-like" : maximum >= 48 ? "deep-rest" : maximum >= 20 ? "alert-rest" : maximum >= 7 ? "active" : "none";
  const minimumDuration = ({ none: 0, active: 2, "alert-rest": 6, "deep-rest": 12, "sleep-like": 20 })[recommendedDepth];
  const completionTargets = Object.fromEntries(causes.map(item => [item.kind, Math.max(2, item.amount * ({ active: .65, "alert-rest": .45, "deep-rest": .3, "sleep-like": .2 }[recommendedDepth] || 1))]));
  return Object.freeze({ recommendedDepth, primaryCause: primary.kind, causes, minimumDuration, completionTargets });
}

export function selectRecoveryDepth(animal, environment = {}, socialContext = {}) {
  const need = recoveryNeeds(animal); let index = depthOrder.indexOf(need.recommendedDepth); const threat = clamp(environment.threatConfidence || 0, 0, 1), cover = clamp(environment.cover || 0, 0, 1), trusted = clamp(socialContext.trustedCompanions || 0, 0, 8), vigilant = clamp(socialContext.vigilantCompanions || 0, 0, 8), unprotectedDependent = Boolean(socialContext.unprotectedDependent);
  if (threat > .55) index = Math.min(index, 1); else if (threat > .25 || unprotectedDependent) index = Math.min(index, 2); else if (cover > .55 || trusted + vigilant >= 2) index = Math.min(4, index + (need.recommendedDepth === "alert-rest" ? 1 : 0));
  return Object.freeze({ ...need, selectedDepth: depthOrder[Math.max(0, index)], constrainedBySafety: depthOrder[index] !== need.recommendedDepth });
}

export function beginRecovery(animal, depth, reason, tick = 0, needs = recoveryNeeds(animal)) {
  const state = migrateRecoveryState(animal), selected = depthOrder.includes(depth) ? depth : needs.recommendedDepth; state.depth = selected; state.reason = reason || needs.primaryCause; state.causes = needs.causes; state.startedAt = tick; state.minimumUntil = tick + (needs.minimumDuration || 0); state.maximumUntil = tick + Math.max(8, (needs.minimumDuration || 1) * 5); state.targetDebt = { ...needs.completionTargets }; state.waking = false; state.wakeReason = null; return state;
}

export function advanceRecovery(animal, { activitySteps = 1, safe = true } = {}) {
  const state = migrateRecoveryState(animal), utilisation = migrateUtilisationState(animal), metabolism = initializeMetabolism(animal), stress = migrateStressResponse(animal), profile = RECOVERY_PROFILES[state.depth] || RECOVERY_PROFILES.none, step = Math.max(.01, Number(activitySteps) || 1) * (safe ? 1 : .65);
  utilisation.aerobicLoad = clamp(utilisation.aerobicLoad - profile.aerobic * step); utilisation.muscularLoad = clamp(utilisation.muscularLoad - profile.anaerobic * .55 * step);
  const rates = { exertion: profile.anaerobic, travel: profile.travel, combat: profile.combat, thermal: profile.aerobic * .55, dehydration: profile.aerobic * .25, injury: profile.tissue, stress: profile.stress };
  for (const [kind, rate] of Object.entries(rates)) utilisation.recoveryDebt[kind] = clamp((utilisation.recoveryDebt[kind] || 0) - rate * step);
  metabolism.anaerobicDebt = clamp(metabolism.anaerobicDebt - profile.anaerobic * step); metabolism.thermalLoad = clamp((metabolism.thermalLoad || 0) - profile.aerobic * .4 * step); stress.recoveryDebt = clamp(stress.recoveryDebt - profile.stress * step); stress.cumulativeExposure = clamp(stress.cumulativeExposure - profile.stress * .2 * step);
  animal.fatigue = clamp(100 - Math.max(0, 100 - utilisation.aerobicLoad - utilisation.recoveryDebt.travel * .25)); return state;
}

const debtFor = (animal, kind) => kind === "anaerobic" ? initializeMetabolism(animal).anaerobicDebt : kind === "stress" ? Math.max(migrateStressResponse(animal).recoveryDebt, migrateUtilisationState(animal).recoveryDebt.stress) : migrateUtilisationState(animal).recoveryDebt[kind] || 0;
export function recoveryComplete(animal, tick = 0) { const state = migrateRecoveryState(animal); if (state.depth === "none") return true; if (tick < (state.minimumUntil || 0)) return false; const target = state.targetDebt[state.reason] ?? 5; return debtFor(animal, state.reason) <= target || tick >= (state.maximumUntil || Infinity); }

export function recoveryPerceptionProfile(recoveryState = {}) { const profile = RECOVERY_PROFILES[recoveryState.depth || "none"] || RECOVERY_PROFILES.none; return Object.freeze({ vision: profile.vision, hearing: profile.hearing, smell: profile.smell, wakeDelay: profile.wakeDelay, wakeThreshold: profile.wakeThreshold }); }

export function interruptRecovery(animal, stimulus = {}, tick = 0) {
  const state = migrateRecoveryState(animal), profile = recoveryPerceptionProfile(state), modality = stimulus.modality || "hearing", sensitivity = profile[modality] ?? 1, familiarity = stimulus.familiarAlarm ? 1.65 : 1, physical = stimulus.physicalContact ? 4 : 1, score = clamp(stimulus.intensity || 0, 0, 1) * clamp(stimulus.proximity ?? 1, 0, 1) * sensitivity * familiarity * physical;
  if (score < profile.wakeThreshold) return Object.freeze({ woke: false, score, threshold: profile.wakeThreshold }); state.waking = true; state.wakeStartedAt = tick; state.wakeUntil = tick + profile.wakeDelay; state.wakeReason = stimulus.kind || modality; state.interruptedCount += 1; state.lastInterruptedAt = tick; return Object.freeze({ woke: true, score, threshold: profile.wakeThreshold, readyAt: state.wakeUntil });
}

export function finishWaking(animal, tick = 0) { const state = migrateRecoveryState(animal); if (!state.waking || tick < (state.wakeUntil || 0)) return false; state.waking = false; state.depth = "none"; state.reason = null; state.minimumUntil = null; state.maximumUntil = null; return true; }
