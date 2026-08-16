const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, Number(value) || 0));
const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
export const ESCAPE_PLAN_SCHEMA = 1;

export function planEscapeFromThreat(observer = {}, hypotheses = [], options = {}) {
  const active = hypotheses.filter(item => item?.locationRegion?.centre);
  if (!active.length) return null;
  let awayX = 0, awayZ = 0, uncertainty = 0, confidence = 0;
  for (const threat of active) {
    const centre = threat.locationRegion.centre, dx = finite(observer.x) - finite(centre.x), dz = finite(observer.z) - finite(centre.z), length = Math.max(.001, Math.hypot(dx, dz)), weight = .35 + clamp(threat.danger?.overall ?? threat.targeting?.probability) * .65;
    awayX += dx / length * weight; awayZ += dz / length * weight; confidence += clamp(threat.locationRegion.confidence) * weight;
    uncertainty += Math.sqrt(Math.max(0, finite(threat.locationRegion.covariance?.xx) + finite(threat.locationRegion.covariance?.zz))) * weight;
  }
  const length = Math.max(.001, Math.hypot(awayX, awayZ)), baseX = awayX / length, baseZ = awayZ / length, side = ((Number(observer.decisionOrder || 0) + Number(options.tick || 0)) & 1) ? 1 : -1, uncertaintyPenalty = clamp(uncertainty / Math.max(1, active.length * 3));
  const lateral = uncertaintyPenalty * .32 * side, direction = { x: baseX - baseZ * lateral, z: baseZ + baseX * lateral }, directionLength = Math.hypot(direction.x, direction.z) || 1;
  direction.x /= directionLength; direction.z /= directionLength;
  const distance = Math.max(2, Number(options.distance || 6)), destination = { x: finite(observer.x) + direction.x * distance, z: finite(observer.z) + direction.z * distance };
  return Object.freeze({ schemaVersion: ESCAPE_PLAN_SCHEMA, planId: `escape:${observer.id}:${active.map(item => item.hypothesisId).sort().join("+")}`, commitmentId: options.commitmentId || null, observerId: observer.id, generatedTick: Number(options.tick || 0), threatHypothesisIds: Object.freeze(active.map(item => item.hypothesisId)), threatRegion: Object.freeze({ centres: Object.freeze(active.map(item => item.locationRegion.centre)), uncertainty }), escapeDirection: Object.freeze(direction), directionConfidence: clamp(confidence / active.length * (1 - uncertaintyPenalty * .45)), safeCorridorWidth: 1 + uncertainty * .65, destinationRegion: Object.freeze({ centre: Object.freeze(destination), radius: .6 + uncertainty }), routeRisk: clamp(options.routeRisk), terrainCost: Math.max(0, Number(options.terrainCost || 0)), coverBenefit: clamp(options.coverBenefit), groupBenefit: clamp(options.groupBenefit), uncertaintyPenalty, mode: uncertaintyPenalty >= .45 ? "uncertain-threat-conservative" : "burst-away", reconsiderationConditions: Object.freeze(["threat-region-materially-changed", "route-invalid", "physical-contact", "safe-separation-reached"]), provenance: Object.freeze({ source: "observer-owned-threat-hypotheses", evidenceIds: Object.freeze(active.flatMap(item => item.provenance?.observationIds || [])) }) });
}
