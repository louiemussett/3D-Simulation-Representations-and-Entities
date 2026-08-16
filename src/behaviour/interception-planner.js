const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, Number(value) || 0));
export const INTERCEPTION_REGION_SCHEMA = 1;

export function planInterceptionRegion(origin = {}, hypothesis = {}, options = {}) {
  const centre = hypothesis.locationRegion?.centre || hypothesis.motion?.position?.estimate;
  if (!centre) return null;
  const motion = hypothesis.motion, velocity = motion?.velocity?.estimate, confidence = clamp(motion?.velocity?.confidence ?? hypothesis.locationRegion?.confidence), uncertainty = Math.sqrt(Math.max(0, Number(hypothesis.locationRegion?.covariance?.xx || 0) + Number(hypothesis.locationRegion?.covariance?.zz || 0))), distance = Math.hypot(centre.x - origin.x, centre.z - origin.z), speed = Math.max(.01, Number(options.speed || 1)), horizon = Math.min(Number(options.cap || 4), distance / speed), directionUncertainty = Number(motion?.velocity?.directionUncertaintyRadians ?? Math.PI);
  let mode = "last-known-position";
  if (velocity && confidence >= .68 && directionUncertainty < .5) mode = "direct";
  else if (velocity && confidence >= .4 && directionUncertainty < 1.2) mode = "conservative-lead";
  else if (velocity && confidence >= .2) mode = "corridor";
  else if ((motion?.temporal?.observationAgeTicks || 0) <= 2) mode = "reacquire";
  else mode = "search";
  const leadFactor = mode === "direct" ? 1 : mode === "conservative-lead" ? .55 : mode === "corridor" ? .3 : 0, predicted = { x: centre.x + (velocity?.x || 0) * horizon * leadFactor, z: centre.z + (velocity?.z || 0) * horizon * leadFactor }, radius = uncertainty + horizon * ((1 - confidence) * .35 + directionUncertainty / Math.PI * .4);
  const corridor = Object.freeze([0, .5, 1].map(fraction => Object.freeze({ tick: Number(options.tick || 0) + horizon * fraction, centre: Object.freeze({ x: centre.x + (velocity?.x || 0) * horizon * fraction * leadFactor, z: centre.z + (velocity?.z || 0) * horizon * fraction * leadFactor }), radius: uncertainty + radius * fraction, confidence: clamp(confidence * (1 - fraction * .35)) })));
  return Object.freeze({ schemaVersion: INTERCEPTION_REGION_SCHEMA, generatedTick: Number(options.tick || 0), hypothesisId: hypothesis.hypothesisId, centre: Object.freeze(predicted), covariance: Object.freeze({ xx: radius ** 2, xz: 0, zz: radius ** 2 }), earliestArrivalTick: Number(options.tick || 0) + Math.max(0, horizon - radius / speed), latestArrivalTick: Number(options.tick || 0) + horizon + radius / speed, corridor, mode, confidence, expiryTick: Number(options.tick || 0) + Math.max(2, Math.ceil(horizon)), evidenceIds: Object.freeze([...(hypothesis.provenance?.observationIds || [])]) });
}
