const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
import { eatsMeat, isCarnivore } from "./species-registry.js";
export const VISION_PROFILE = Object.freeze({
  grazer: { centralAcuity: .72, peripheralAcuity: .56, movementSensitivity: .88, recognitionThresholds: { class: .18, species: .43, individual: .76 }, rangeFalloff: 1.45, fov: Math.PI * 1.72, binocular: Math.PI * .42, attentionCapacity: 6, trackingPersistence: 8, memoryDecay: .075 },
  hunter: { centralAcuity: .94, peripheralAcuity: .32, movementSensitivity: .72, recognitionThresholds: { class: .16, species: .36, individual: .68 }, rangeFalloff: 1.2, fov: Math.PI * 1.18, binocular: Math.PI * .58, attentionCapacity: 3, trackingPersistence: 12, memoryDecay: .055 }
});
export function gradedObservation(observer, target, vision, profile = VISION_PROFILE[observer.speciesId] || VISION_PROFILE[eatsMeat(observer) ? "hunter" : "grazer"]) {
  const bearing = Math.atan2(target.z - observer.z, target.x - observer.x), offset = Math.abs(Math.atan2(Math.sin(bearing - (observer.orientation || 0)), Math.cos(bearing - (observer.orientation || 0))));
  const region = offset <= profile.binocular / 2 ? "central" : "peripheral";
  const motion = Math.hypot(target.vx || 0, target.vz || 0), acuity = region === "central" ? profile.centralAcuity : profile.peripheralAcuity;
  const confidence = clamp((vision.confidence || 0) * acuity + Math.min(.24, motion * profile.movementSensitivity * .12), 0, 1), t = profile.recognitionThresholds;
  return { id: `${observer.id}:${target.id}`, targetId: target.id, type: target.speciesId === observer.speciesId ? "conspecific" : target.speciesId, detectedMotion: motion > .035 && confidence >= .12, coarseClass: confidence >= t.class ? (isCarnivore(target) ? "predator" : "animal") : null, identifiedSpecies: confidence >= t.species ? target.speciesId : null, identifiedIndividual: confidence >= t.individual ? target.id : null, x: target.x, z: target.z, vx: confidence >= t.species ? target.vx || 0 : null, vz: confidence >= t.species ? target.vz || 0 : null, velocityConfidence: confidence >= t.species ? confidence : 0, confidence, bearing, region, occlusionReason: vision.visible ? null : vision.reason, observedTick: observer.tick ?? 0 };
}
export function degradeObservation(record, ticks, profile = VISION_PROFILE.grazer) {
  const decay = Math.max(0, ticks) * profile.memoryDecay;
  return { ...record, confidence: clamp(record.confidence - decay, 0, 1), velocityConfidence: clamp((record.velocityConfidence || 0) - decay * 1.8, 0, 1), identifiedIndividual: record.confidence - decay * 1.35 >= profile.recognitionThresholds.individual ? record.identifiedIndividual : null, identifiedSpecies: record.confidence - decay >= profile.recognitionThresholds.species ? record.identifiedSpecies : null, vx: (record.velocityConfidence || 0) - decay * 1.8 > 0 ? record.vx : null, vz: (record.velocityConfidence || 0) - decay * 1.8 > 0 ? record.vz : null, age: ticks };
}
