const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, Number(value) || 0));
const angleDifference = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

export const RECIPROCAL_ATTENTION_SCHEMA = 1;
export const STALKING_PHASES = Object.freeze(["move", "freeze", "reroute"]);

// This projection is intentionally observation-only. It accepts no prey entity,
// eye cone, sensor anchor, attention allocation, or private decision target.
export function estimatePredatorExposure(hunter = {}, preyObservation = {}, context = {}) {
  const boundary = validateReciprocalAttentionInput(preyObservation);
  if (!boundary.valid) throw new TypeError(`Reciprocal attention accepts observations only; forbidden fields: ${boundary.forbiddenPresent.join(", ")}`);
  if (!preyObservation || !Number.isFinite(preyObservation.x) || !Number.isFinite(preyObservation.z)) return Object.freeze({ schemaVersion: RECIPROCAL_ATTENTION_SCHEMA, level: "unknown", probability: .5, confidence: 0, reason: "insufficient observable prey evidence" });
  const distance = Math.hypot(preyObservation.x - hunter.x, preyObservation.z - hunter.z), bearingToHunter = Math.atan2(hunter.z - preyObservation.z, hunter.x - preyObservation.x);
  const bodyAlignment = Number.isFinite(preyObservation.heading) ? clamp(1 - angleDifference(preyObservation.heading, bearingToHunter) / Math.PI) : null;
  const headAlignment = Number.isFinite(preyObservation.headHeading) ? clamp(1 - angleDifference(preyObservation.headHeading, bearingToHunter) / Math.PI) : bodyAlignment;
  const visibleAttention = preyObservation.bodyCues?.headMovement === "scanning" ? .22 : preyObservation.bodyCues?.headMovement === "listening" ? .13 : 0;
  const groupVigilance = clamp((Number(context.observedGroupSize || 1) - 1) * .055, 0, .25), movementExposure = clamp(Number(context.hunterMovement || 0) * .75), noiseExposure = clamp(Number(context.hunterNoise || 0) * .7), cover = clamp(context.observableCover || 0), confidence = clamp(Number(preyObservation.confidence || 0) * (.55 + (bodyAlignment != null ? .16 : 0) + (headAlignment != null ? .16 : 0) + (preyObservation.motionConfidence != null ? .08 : 0)));
  const proximity = clamp(1 - distance / Math.max(1, Number(context.referenceDistance || 18)));
  const probability = clamp((bodyAlignment ?? .35) * .18 + (headAlignment ?? bodyAlignment ?? .35) * .28 + visibleAttention + groupVigilance + movementExposure * .18 + noiseExposure * .14 + proximity * .12 - cover * .32);
  return Object.freeze({ schemaVersion: RECIPROCAL_ATTENTION_SCHEMA, level: probability >= .72 ? "high" : probability >= .38 ? "moderate" : "low", probability, confidence, distance, evidence: Object.freeze({ bodyAlignment, headAlignment, visibleAttention, groupVigilance, movementExposure, noiseExposure, proximity, observableCover: cover }), informationBoundary: "normalized-observation-only" });
}

export function preyTargetingEstimate(intent = null) {
  if (!intent) return Object.freeze({ schemaVersion: RECIPROCAL_ATTENTION_SCHEMA, level: "unknown", probability: 0, imminence: 0, confidence: 0, informationBoundary: "observer-inference-only" });
  return Object.freeze({ schemaVersion: RECIPROCAL_ATTENTION_SCHEMA, predatorId: intent.predatorId || null, level: intent.level || "unknown", probability: clamp(intent.selfTargetLikelihood), imminence: clamp(intent.attackImminence), confidence: clamp(intent.confidence), informationBoundary: "observer-inference-only" });
}

export function migrateStalkingState(hunter = {}, tick = 0) {
  const prior = hunter.stalkingState || {};
  hunter.stalkingState = { schemaVersion: RECIPROCAL_ATTENTION_SCHEMA, phase: STALKING_PHASES.includes(prior.phase) ? prior.phase : "move", phaseStartedTick: Number(prior.phaseStartedTick ?? tick), targetId: prior.targetId || null, exposure: clamp(prior.exposure || 0), exposureConfidence: clamp(prior.exposureConfidence || 0), freezeTicks: Math.max(0, Number(prior.freezeTicks || 0)), rerouteSide: prior.rerouteSide === -1 ? -1 : 1, reason: prior.reason || "initial approach" };
  return hunter.stalkingState;
}

export function chooseStalkingAction(hunter = {}, exposure = {}, context = {}) {
  const state = migrateStalkingState(hunter, context.tick || 0), probability = clamp(exposure.probability ?? .5), confidence = clamp(exposure.confidence || 0), distance = Number(context.distance || Infinity), chaseRange = Number(context.chaseRange || 7), phaseAge = Math.max(0, Number(context.tick || 0) - state.phaseStartedTick);
  let phase = "move", reason = "estimated exposure remains low";
  if (distance <= chaseRange) { phase = "move"; reason = "inside chase transition range"; }
  else if (probability >= .68 && confidence >= .3 && state.freezeTicks < 2) { phase = "freeze"; reason = "high estimated prey exposure"; }
  else if ((probability >= .42 && confidence >= .25 && phaseAge >= 1) || state.freezeTicks >= 2) { phase = "reroute"; reason = state.freezeTicks >= 2 ? "freeze limit reached; changing approach" : "moderate estimated exposure favours a covered flank"; }
  if (phase !== state.phase) { state.phase = phase; state.phaseStartedTick = Number(context.tick || 0); if (phase === "reroute") state.rerouteSide *= -1; }
  state.targetId = context.targetId || state.targetId; state.exposure = probability; state.exposureConfidence = confidence; state.freezeTicks = phase === "freeze" ? state.freezeTicks + 1 : 0; state.reason = reason;
  return Object.freeze({ phase, reason, rerouteSide: state.rerouteSide, exposure: probability, confidence });
}

export function stalkingReroutePoint(hunter = {}, preyObservation = {}, side = 1, offset = 3) {
  const dx = preyObservation.x - hunter.x, dz = preyObservation.z - hunter.z, length = Math.max(.001, Math.hypot(dx, dz)), forwardX = dx / length, forwardZ = dz / length;
  const advance = Math.min(Math.max(1.5, length * .32), 4.5), lateral = Math.min(Math.max(1.25, offset), Math.max(1.25, length * .45));
  return Object.freeze({ x: hunter.x + forwardX * advance - forwardZ * lateral * side, z: hunter.z + forwardZ * advance + forwardX * lateral * side, source: "observation-derived-stalking-reroute" });
}

export function validateReciprocalAttentionInput(observation = {}) {
  const forbidden = ["sensorDefinitions", "sensorAnchors", "visionCone", "authoritativeAttention", "privateTargetId", "decisionState"];
  return Object.freeze({ valid: !forbidden.some(key => Object.hasOwn(observation, key)), forbiddenPresent: Object.freeze(forbidden.filter(key => Object.hasOwn(observation, key))) });
}
