import { physicalContact, scaledContactRange } from "./interaction-spacing.js";
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

export const PREDATION_PHASES = Object.freeze(["idle", "investigate", "assess", "stalk", "chase", "burst-chase", "sustainable-pursuit", "reassess", "active-recovery", "attack", "secure-carcass", "travel-carcass", "feed", "recover"]);
export const HUNT_BALANCE = Object.freeze({
  ordinaryHunger: 35, ordinaryStomach: 55, opportunisticStomach: 48,
  postKillSuppressionTicks: 24 * 60, carcassCommitmentTicks: 6 * 60,
  failedStrikeRecoveryTicks: 30
});

export function createPredationState(tick = 0) {
  return { phase: "idle", targetKind: null, targetId: null, startedTick: tick, phaseStartedTick: tick, lostTicks: 0, noticedTicks: 0, preyAwareness: "unknown", lastKnown: null, reason: null, lastKillTick: null, huntSuppressedUntil: 0, lastHuntOutcome: null, recoveryReason: null, consecutiveFailedStrikes: 0, carcassCommitmentUntil: 0 };
}

export function migratePredationState(animal, tick = 0) {
  const legacy = animal.predation || animal.hunt;
  const state = createPredationState(tick);
  if (legacy?.targetId) {
    state.phase = legacy.phase || (legacy.stage === "pursuit" ? "chase" : legacy.stage === "approach" ? "assess" : "investigate");
    if (!PREDATION_PHASES.includes(state.phase)) state.phase = "investigate";
    state.targetKind = legacy.targetKind || "prey";
    state.targetId = legacy.targetId;
    state.startedTick = Number(legacy.startedTick ?? legacy.started ?? tick);
    state.phaseStartedTick = Number(legacy.phaseStartedTick ?? state.startedTick);
    state.lostTicks = Math.max(0, Number(legacy.lostTicks ?? legacy.lost) || 0);
    state.noticedTicks = Math.max(0, Number(legacy.noticedTicks) || 0);
    state.preyAwareness = legacy.preyAwareness || "unknown";
    state.lastKnown = legacy.lastKnown ? { ...legacy.lastKnown } : null;
    state.reason = legacy.reason || null;
  }
  state.lastKillTick = Number.isFinite(Number(legacy?.lastKillTick)) ? Number(legacy.lastKillTick) : null;
  state.huntSuppressedUntil = Math.max(0, Number(legacy?.huntSuppressedUntil) || 0);
  state.lastHuntOutcome = legacy?.lastHuntOutcome || null;
  state.recoveryReason = legacy?.recoveryReason || null;
  state.consecutiveFailedStrikes = Math.max(0, Math.floor(Number(legacy?.consecutiveFailedStrikes) || 0));
  state.carcassCommitmentUntil = Math.max(0, Number(legacy?.carcassCommitmentUntil) || 0);
  state.nextHuntTick = Number.isFinite(Number(legacy?.nextHuntTick)) ? Number(legacy.nextHuntTick) : null;
  animal.predation = state;
  delete animal.hunt;
  return state;
}

export function transitionPredation(state, phase, tick, patch = {}) {
  if (!PREDATION_PHASES.includes(phase)) throw new Error(`Unknown predation phase: ${phase}`);
  const changed = state?.phase !== phase;
  return { ...(state || createPredationState(tick)), ...patch, phase, phaseStartedTick: changed ? tick : (state?.phaseStartedTick ?? tick) };
}

export function clearPredation(state, tick, reason = null, phase = "idle") {
  const fresh = createPredationState(tick);
  return transitionPredation(fresh, phase, tick, { reason, lastKillTick: state?.lastKillTick ?? null, huntSuppressedUntil: state?.huntSuppressedUntil || 0, lastHuntOutcome: state?.lastHuntOutcome || null, recoveryReason: state?.recoveryReason || null, consecutiveFailedStrikes: state?.consecutiveFailedStrikes || 0, carcassCommitmentUntil: state?.carcassCommitmentUntil || 0, nextHuntTick: state?.nextHuntTick ?? null });
}

export function observePrey(state, contact, tick, awareness = "unknown", group = {}) {
  return transitionPredation(state, state?.phase === "idle" ? "assess" : state.phase, tick, {
    targetKind: "prey", targetId: contact.targetId, lostTicks: 0,
    noticedTicks: awareness === "likely-aware" ? (state?.noticedTicks || 0) + 1 : 0,
    preyAwareness: awareness,
    lastKnown: { x: contact.x, z: contact.z, vx: contact.vx ?? null, vz: contact.vz ?? null, velocityConfidence: contact.velocityConfidence || 0, confidence: contact.confidence || 0, evidenceId: contact.evidenceId || contact.id || null, tick, heading: contact.heading, groupSize: group.size || 1, groupHeading: group.heading ?? null }
  });
}

export function losePrey(state) {
  return { ...state, lostTicks: (state?.lostTicks || 0) + 1 };
}

export function predationAbandonReason(state, animal, { lastResortHunt = null } = {}) {
  if (!state?.targetId) return "no target";
  if ((state.lostTicks || 0) > 12) return "prey evidence expired";
  if (animal.capabilities?.canTravel === false) return "no safe travelling pace remains";
  if ((animal.energy || 0) < 7 && !lastResortHunt?.allowed) return "usable energy depleted";
  if ((animal.energy || 0) < 10 && lastResortHunt && !lastResortHunt.allowed) return `last-resort interception is not viable: ${lastResortHunt.reason}`;
  return null;
}

export function lastResortHuntAssessment(animal = {}, context = {}) {
  const evidenceConfidence = clamp(context.evidenceConfidence || 0, 0, 1), burstReserve = Math.max(0, Number(context.burstReserve ?? animal.sprintEnergy) || 0), interception = context.interceptionForecast || {};
  const gates = Object.freeze({
    survivalNeed: huntEmergency(animal),
    currentCompatiblePrey: Boolean(context.currentPreyEvidence && context.compatiblePrey && evidenceConfidence > .18),
    health: (animal.health || 0) >= 40,
    hydration: (animal.hydration || 0) >= 72,
    travel: Boolean(context.atContact || context.canTravel),
    burst: Boolean(context.atContact || (context.canSprint && burstReserve >= 10)),
    metabolicJourney: Boolean(context.atContact || context.journeyViable),
    interception: Boolean(context.atContact || interception.viable),
  });
  const failed = Object.entries(gates).find(([, passed]) => !passed)?.[0] || null;
  const reasons = { survivalNeed: "nutrition is not yet at the survival threshold", currentCompatiblePrey: "no current compatible prey observation cleared the evidence threshold", health: "health is below the emergency hunting floor", hydration: "hydration is below the protected hunting reserve", travel: "no safe travelling pace remains", burst: "usable muscle burst reserve is unavailable", metabolicJourney: "metabolic substrate cannot fund the forecast interception", interception: "the local interception forecast does not support commitment" };
  return Object.freeze({ allowed: failed === null, reason: failed ? reasons[failed] : "current evidence and protected physiological reserves support one bounded interception", evidenceConfidence, burstReserve, gates, interceptionForecast: Object.freeze({ source: interception.source || "current-observation-persistence", viable: Boolean(interception.viable), distance: Number.isFinite(interception.distance) ? interception.distance : null, maximumDistance: Number.isFinite(interception.maximumDistance) ? interception.maximumDistance : null, decision: interception.decision || "unknown", confidence: clamp(interception.confidence || evidenceConfidence, 0, 1) }) });
}

export function predationCommitmentBonus(state) {
  if (!state?.targetId || state.targetKind !== "prey") return 0;
  return ["chase", "burst-chase", "sustainable-pursuit", "attack"].includes(state.phase) ? 220 : 120;
}

export const HUNT_RANGE_SPANS = Object.freeze({ chase: 12, stalk: 7, sprint: 5, recovery: 3, defenders: 4, carcassRivals: 3 });
export function huntRange(actor, target, kind) { return scaledContactRange(actor, target, HUNT_RANGE_SPANS[kind] ?? 1); }
export function contactAttackIntentEligible(intent, hunter, prey, currentTick, currentObservationId = null) {
  if (!intent || intent.decisionTick !== currentTick || intent.hunterId !== hunter?.id || intent.preyId !== prey?.id) return false;
  if (!hunter.alive || !prey.alive || hunter.locomotion?.completedRequestId !== intent.requestId) return false;
  if (hunter.predation?.targetKind !== "prey" || hunter.predation?.targetId !== prey.id) return false;
  if (intent.observationId && currentObservationId && intent.observationId !== currentObservationId) return false;
  return physicalContact(hunter, prey);
}

export function protectiveDefenderEligible(defender, prey) {
  if (!defender?.alive || !prey || defender.id === prey.id || defender.speciesId !== "grazer") return false;
  const directParent = prey.motherId === defender.id || (defender.offspringIds || []).includes(prey.id);
  const dependentGroupMember = prey.lifeStage === "dependent" && Boolean(prey.groupId && defender.groupId === prey.groupId);
  const relationship = Number(defender.relationships?.find?.((entry) => entry.id === prey.id || entry.targetId === prey.id)?.affinity) || 0;
  const matureHerdMate = Boolean(prey.groupId && defender.groupId === prey.groupId && (defender.health || 0) >= 55 && (defender.energy || 0) >= 35 && ((defender.aggression || 0) >= .42 || relationship >= .35));
  return directParent || dependentGroupMember || matureHerdMate;
}

export function herdCounterattackChance(defenderCount) { return Math.min(.45, Math.max(0, defenderCount) * .1); }
export function predatorBiteDamage(randomValue, preyVulnerability = 0) { return 42 + clamp(randomValue, 0, 1) * 28 + clamp(preyVulnerability, 0, 1) * 10; }
export function predatorAttackSuccessChance({ preyVulnerability = 0, hunterFatigue = 0, hunterSpeed = 1, defenders = 0 } = {}) {
  return clamp(.58 + clamp(preyVulnerability, 0, 1) * .24 - Math.max(0, hunterFatigue) / 210 + Math.max(0, hunterSpeed) / 10 - Math.max(0, defenders) * .12, .10, .90);
}
export function shouldInitiateChase({ distance = Infinity, chaseRange = 7, aggression = 0, stalkTicks = 0, preyAwareness = "unknown" } = {}) {
  return preyAwareness === "likely-aware" || distance <= chaseRange || aggression >= .55 || stalkTicks >= 3;
}
export function huntRecoveryNeeded(state, animal = {}, targetDistance = Infinity, closeRange = 1.5) {
  if (!state?.targetId || state.targetKind !== "prey" || targetDistance <= closeRange) return false;
  return animal.capabilities?.canTravel === false;
}
export function huntOpportunityBonus({ visiblePrey = false, aggression = 0 } = {}) { return (visiblePrey ? 55 : 0) + clamp(aggression, 0, 1) * 35; }
export function detectedPreyResponse(noticedTicks, distance, chaseRange = 7) { if (noticedTicks < 2) return "assess"; return distance > chaseRange ? "abandon" : "chase"; }
export function urgentCarcassTravel({ hunger = 0, familyUrgency = 0, canSprint = false } = {}) { return Boolean(canSprint && (hunger >= 42 || familyUrgency > 0)); }
export function movementRecoveryRequired(speed, fatigue) { return (Number(speed) || 0) <= .05 || (Number(fatigue) || 0) >= 96; }

export function huntEmergency(animal = {}, dependentUrgency = 0) {
  return Boolean((animal.stomach || 0) < 12 || (animal.energy || 0) < 18 || dependentUrgency > 0);
}

export function huntSuppressed(animal = {}, tick = 0, dependentUrgency = 0) {
  return !huntEmergency(animal, dependentUrgency) && tick < (animal.predation?.huntSuppressedUntil || 0);
}

export function ordinaryHuntEligible(animal = {}, hunger = 0, tick = 0, dependentUrgency = 0) {
  if (huntSuppressed(animal, tick, dependentUrgency)) return false;
  return huntEmergency(animal, dependentUrgency) || (hunger >= HUNT_BALANCE.ordinaryHunger && (animal.stomach || 0) < HUNT_BALANCE.ordinaryStomach);
}

export function opportunisticHuntEligible(animal = {}, visiblePrey = false, tick = 0, dependentUrgency = 0) {
  return Boolean(visiblePrey && !huntSuppressed(animal, tick, dependentUrgency) && (animal.aggression || 0) >= .38 && (animal.energy || 0) > 45 && (animal.fatigue || 0) < 60 && (animal.stomach || 0) < HUNT_BALANCE.opportunisticStomach && (animal.health || 0) > 45);
}

export function closeRangeHuntEligible(animal = {}, closePrey = false, tick = 0, dependentUrgency = 0) {
  return Boolean(closePrey && !huntSuppressed(animal, tick, dependentUrgency) && (animal.energy || 0) > 38 && (animal.fatigue || 0) < 72 && (animal.stomach || 0) < 82 && (animal.health || 0) > 40);
}

export function recordSuccessfulKill(state, tick) {
  return transitionPredation(state, "secure-carcass", tick, { lastKillTick: tick, huntSuppressedUntil: tick + HUNT_BALANCE.postKillSuppressionTicks, carcassCommitmentUntil: tick + HUNT_BALANCE.carcassCommitmentTicks, lastHuntOutcome: "kill", recoveryReason: "feeding and digesting after kill", consecutiveFailedStrikes: 0 });
}

export function recordFailedStrike(state, tick) {
  const failures = (state?.consecutiveFailedStrikes || 0) + 1;
  return { ...state, consecutiveFailedStrikes: failures, lastHuntOutcome: "failed-strike", recoveryReason: failures >= 2 ? "recovering after repeated failed strikes" : state?.recoveryReason, huntSuppressedUntil: failures >= 2 ? Math.max(state?.huntSuppressedUntil || 0, tick + HUNT_BALANCE.failedStrikeRecoveryTicks) : (state?.huntSuppressedUntil || 0) };
}

export function carcassCommitmentRequired(animal = {}, corpse = null, tick = 0, danger = 0) {
  if (!corpse || corpse.biomass <= 0 || corpse.ownerId !== animal.id || danger >= 65 || (animal.stomach || 0) >= 94) return false;
  return tick < (animal.predation?.carcassCommitmentUntil || 0);
}

export function claimedCarcassPenalty(carcass, hunter, hunger = 0, familyUrgency = 0, visiblePrey = false) {
  if (familyUrgency > 0 || hunger >= 72 || carcass?.ownerId === hunter?.id) return 0;
  const livePreyOpportunity = visiblePrey ? 420 : 0;
  return (carcass?.ownerId ? 240 : 0) + livePreyOpportunity;
}
