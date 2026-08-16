const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, Number(value) || 0));

export const MOTION_OBSERVATION_SCHEMA = 1;
export const MOTION_STATES = Object.freeze(["unknown", "stationary", "possibly-moving", "moving", "accelerating"]);

const covariance = (value = {}, fallback = 1) => Object.freeze({
  xx: Math.max(0, Number(value.xx ?? fallback) || 0),
  xz: Number(value.xz || 0),
  zz: Math.max(0, Number(value.zz ?? fallback) || 0)
});

export function createMotionObservation(value = {}) {
  const position = value.position || {}, velocity = value.velocity || {}, acceleration = value.acceleration || {};
  const motionState = MOTION_STATES.includes(value.motionState) ? value.motionState : "unknown";
  const velocityConfidence = clamp(velocity.confidence), motionConfidence = clamp(value.motionConfidence);
  const velocityEstimate = velocity.estimate && Number.isFinite(velocity.estimate.x) && Number.isFinite(velocity.estimate.z)
    ? Object.freeze({ x: Number(velocity.estimate.x), z: Number(velocity.estimate.z) }) : null;
  return Object.freeze({
    schemaVersion: MOTION_OBSERVATION_SCHEMA,
    observationId: String(value.observationId || value.id || "motion:unknown"),
    observerId: value.observerId || null,
    subjectAssociationId: value.subjectAssociationId || value.targetId || null,
    observedTick: Number(value.observedTick || 0),
    lastUpdatedTick: Number(value.lastUpdatedTick ?? value.observedTick ?? 0),
    position: Object.freeze({ estimate: Object.freeze({ x: Number(position.estimate?.x || 0), z: Number(position.estimate?.z || 0) }), covariance: covariance(position.covariance, 1), confidence: clamp(position.confidence), source: position.source || "observer-estimate" }),
    bearing: Object.freeze({ radians: Number(value.bearing?.radians || 0), uncertaintyRadians: Math.max(0, Number(value.bearing?.uncertaintyRadians || 0)), confidence: clamp(value.bearing?.confidence) }),
    distance: Object.freeze({ estimate: Math.max(0, Number(value.distance?.estimate || 0)), minimum: Math.max(0, Number(value.distance?.minimum || 0)), maximum: Math.max(0, Number(value.distance?.maximum || 0)), confidence: clamp(value.distance?.confidence) }),
    motionState,
    motionConfidence,
    velocity: Object.freeze({ estimate: velocityEstimate, speedRange: velocity.speedRange ? Object.freeze({ minimum: Math.max(0, Number(velocity.speedRange.minimum || 0)), maximum: Math.max(0, Number(velocity.speedRange.maximum || 0)) }) : null, directionUncertaintyRadians: Math.max(0, Number(velocity.directionUncertaintyRadians || 0)), covariance: velocityEstimate ? covariance(velocity.covariance, 1) : null, confidence: Math.min(motionConfidence, velocityConfidence) }),
    acceleration: Object.freeze({ estimate: acceleration.estimate && Number.isFinite(acceleration.estimate.x) && Number.isFinite(acceleration.estimate.z) ? Object.freeze({ x: Number(acceleration.estimate.x), z: Number(acceleration.estimate.z) }) : null, confidence: Math.min(velocityConfidence, clamp(acceleration.confidence)), uncertainty: Math.max(0, Number(acceleration.uncertainty || 0)) }),
    temporal: Object.freeze({ effectiveResolutionHz: Number(value.temporal?.effectiveResolutionHz || 0), sampleIntervalTicks: Math.max(0, Number(value.temporal?.sampleIntervalTicks || 0)), accumulatedEvidenceTicks: Math.max(0, Number(value.temporal?.accumulatedEvidenceTicks || 0)), recognitionLatencyTicks: Math.max(0, Number(value.temporal?.recognitionLatencyTicks || 0)), observationAgeTicks: Math.max(0, Number(value.temporal?.observationAgeTicks || 0)) }),
    visibility: Object.freeze({ leftEyeConfidence: clamp(value.visibility?.leftEyeConfidence), rightEyeConfidence: clamp(value.visibility?.rightEyeConfidence), integration: value.visibility?.integration || "unknown", exposedFractionEstimate: clamp(value.visibility?.exposedFractionEstimate ?? 1), occlusionConfidence: clamp(value.visibility?.occlusionConfidence) }),
    clutter: Object.freeze({ total: clamp(value.clutter?.total), vegetationMotion: clamp(value.clutter?.vegetationMotion), rainMotion: clamp(value.clutter?.rainMotion), observerMotion: clamp(value.clutter?.observerMotion), backgroundContrast: clamp(value.clutter?.backgroundContrast), maskingReason: value.clutter?.maskingReason || null }),
    provenance: Object.freeze({ channel: value.provenance?.channel || "vision", evidenceIds: Object.freeze([...(value.provenance?.evidenceIds || [])]), profileVersion: value.provenance?.profileVersion || 1, estimatorVersion: value.provenance?.estimatorVersion || 1 })
  });
}

export function validateMotionObservation(observation = {}) {
  const errors = [];
  if (observation.schemaVersion !== MOTION_OBSERVATION_SCHEMA) errors.push("unsupported schema");
  if (!MOTION_STATES.includes(observation.motionState)) errors.push("invalid motion state");
  if (observation.motionState === "unknown" && observation.velocity?.estimate && observation.velocity.confidence <= 0) errors.push("unknown motion cannot expose unqualified velocity");
  if ((observation.velocity?.confidence || 0) > (observation.motionConfidence || 0)) errors.push("velocity confidence exceeds motion confidence");
  if ((observation.acceleration?.confidence || 0) > (observation.velocity?.confidence || 0)) errors.push("acceleration confidence exceeds velocity confidence");
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
}
