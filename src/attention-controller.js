import { VISION_PROFILE } from "./perception-observation.js";
export function observationPriority(observer, observation, currentTargetId = null) {
  const threat = observation.coarseClass === "predator" || (observer.speciesId === "grazer" && observation.identifiedSpecies === "hunter") ? 5 : 0;
  const goal = observation.targetId === currentTargetId ? 3 : 0, movement = observation.detectedMotion ? 1.5 : 0, social = observation.type === "conspecific" ? .55 : 0;
  const bias = observer.speciesId === "hunter" && observation.identifiedSpecies === "grazer" ? 2 : observer.speciesId === "grazer" && observation.region === "peripheral" ? .65 : 0;
  return threat + goal + movement + social + bias + observation.confidence * 2 - (observation.age || 0) * .08;
}
export function allocateAttention(observer, observations, previousTracks = [], options = {}) {
  const profile = options.profile || VISION_PROFILE[observer.speciesId] || VISION_PROFILE.grazer, currentTargetId = options.currentTargetId;
  const persistence = new Map(previousTracks.map((track) => [track.targetId, track]));
  const merged = observations.map((o) => ({ ...o, trackingAge: persistence.has(o.targetId) ? (persistence.get(o.targetId).trackingAge || 0) + 1 : 0 }));
  return merged.sort((a, b) => observationPriority(observer, b, currentTargetId) - observationPriority(observer, a, currentTargetId) || String(a.targetId).localeCompare(String(b.targetId))).slice(0, profile.attentionCapacity);
}
