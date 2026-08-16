import { createMotionObservation } from "./motion-observation.js";

export const OBSERVER_EVIDENCE_SCHEMA = 1;

export function migrateObserverEvidenceState(animal = {}, tick = 0) {
  animal.observerEvidenceSchema = OBSERVER_EVIDENCE_SCHEMA;
  animal.motionTracks = animal.motionTracks && typeof animal.motionTracks === "object" ? animal.motionTracks : {};
  for (const [targetId, legacy] of Object.entries(animal.motionTracks)) {
    if (legacy?.schemaVersion === 1 && legacy.position?.estimate) continue;
    const x = Number(legacy?.x), z = Number(legacy?.z); if (!Number.isFinite(x) || !Number.isFinite(z)) { delete animal.motionTracks[targetId]; continue; }
    const age = Math.max(0, Number(legacy.age || tick - Number(legacy.observedTick || tick)) || 0), confidence = Math.max(0, Math.min(.55, Number(legacy.confidence || 0) * .65));
    animal.motionTracks[targetId] = createMotionObservation({ observationId: legacy.id || `${animal.id}:${targetId}`, observerId: animal.id, subjectAssociationId: targetId, observedTick: Number(legacy.observedTick || tick), lastUpdatedTick: Number(legacy.observedTick || tick), position: { estimate: { x, z }, covariance: { xx: 1 + age * .2, xz: 0, zz: 1 + age * .2 }, confidence, source: "legacy-observation-migration" }, bearing: { radians: Math.atan2(z - Number(animal.z || 0), x - Number(animal.x || 0)), uncertaintyRadians: .35 + age * .04, confidence }, distance: { estimate: Math.hypot(x - Number(animal.x || 0), z - Number(animal.z || 0)), minimum: 0, maximum: Math.hypot(x - Number(animal.x || 0), z - Number(animal.z || 0)) + 2 + age, confidence }, motionState: "unknown", motionConfidence: 0, velocity: { estimate: null, confidence: 0 }, temporal: { observationAgeTicks: age, accumulatedEvidenceTicks: 0 }, provenance: { channel: "memory", evidenceIds: [legacy.evidenceId || legacy.id].filter(Boolean), profileVersion: 1, estimatorVersion: 1 } });
  }
  animal.threatHypotheses = Array.isArray(animal.threatHypotheses) ? animal.threatHypotheses.filter(item => item?.schemaVersion === 1 && item.observerId === animal.id) : [];
  animal.preyHypotheses = animal.preyHypotheses && typeof animal.preyHypotheses === "object" ? animal.preyHypotheses : {};
  return animal;
}
