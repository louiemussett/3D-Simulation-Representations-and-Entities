const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, Number(value) || 0));
export const PROXIMITY_OBSERVATION_SCHEMA = 1;

export function perceivedProximityObservation(observer = {}, evidence = {}, context = {}) {
  const estimatedPosition = {
    x: Number.isFinite(evidence.x) ? evidence.x : Number.isFinite(context.estimatedPosition?.x) ? context.estimatedPosition.x : null,
    z: Number.isFinite(evidence.z) ? evidence.z : Number.isFinite(context.estimatedPosition?.z) ? context.estimatedPosition.z : null
  };
  const derivedDistance = Number.isFinite(estimatedPosition.x) && Number.isFinite(estimatedPosition.z) ? Math.hypot(estimatedPosition.x - Number(observer.x || 0), estimatedPosition.z - Number(observer.z || 0)) : null;
  const confidence = clamp(evidence.confidence ?? context.confidence ?? .5), channel = evidence.channel || context.channel || "unknown";
  const uncertainty = Math.max(0, Number(evidence.uncertainty ?? evidence.positionError ?? context.positionUncertainty ?? (1 - confidence) * Math.max(1, derivedDistance || 1)));
  const body = evidence.bodyCues || {}, heading = Number.isFinite(body.heading) ? body.heading : Number.isFinite(evidence.heading) ? evidence.heading : null;
  const closingSpeed = Number.isFinite(evidence.closingSpeed) ? evidence.closingSpeed : Number.isFinite(context.closingSpeed) ? context.closingSpeed : 0;
  return Object.freeze({
    schemaVersion: PROXIMITY_OBSERVATION_SCHEMA, tick: Number(evidence.tick ?? evidence.observedTick ?? context.tick ?? 0), observerId: observer.id || null,
    perceivedEntityKey: evidence.targetId ? `entity:${evidence.targetId}` : evidence.hypothesisId || `hypothesis:${channel}:${Math.round((estimatedPosition.x || 0) * 10)},${Math.round((estimatedPosition.z || 0) * 10)}`,
    authoritativeEvidenceRefs: [evidence.evidenceId || evidence.id].filter(Boolean), perceivedSpecies: evidence.speciesId || body.speciesId || context.perceivedSpecies || null,
    speciesConfidence: clamp(evidence.speciesConfidence ?? confidence), perceivedIndividualId: evidence.targetId || null, individualConfidence: evidence.targetId ? clamp(evidence.identityConfidence ?? confidence) : 0,
    perceivedRelationshipClass: context.relationshipClass || null, estimatedPosition, positionUncertainty: uncertainty,
    estimatedDistance: Number.isFinite(context.estimatedDistance) ? Math.max(0, context.estimatedDistance) : derivedDistance, distanceUncertainty: Math.max(0, Number(context.distanceUncertainty ?? uncertainty)),
    estimatedHeading: heading, headingConfidence: heading == null ? 0 : clamp(body.headingConfidence ?? confidence), estimatedClosingSpeed: closingSpeed,
    closingSpeedUncertainty: Math.max(0, Number(context.closingSpeedUncertainty ?? (1 - confidence) * Math.max(.1, Math.abs(closingSpeed)))), estimatedAcceleration: Number(evidence.acceleration || context.acceleration || 0),
    perceivedPosture: body.posture || body.activity || evidence.activity || "unknown", postureConfidence: clamp(body.postureConfidence ?? confidence),
    estimatedIntent: context.estimatedIntent || "unknown", intentConfidence: clamp(context.intentConfidence), visibleDependants: context.visibleDependants || [], visibleAllies: context.visibleAllies || [],
    currentChannelEvidence: Object.freeze({ channel, confidence }), provenance: evidence.provenance || channel
  });
}
