const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

export function closePredatorScent(observer, other, smellRange) {
  if (observer?.speciesId !== "grazer" || other?.speciesId !== "hunter" || !other.alive) return null;
  const range = Math.max(2.5, (Number(smellRange) || 0) * .8);
  const distance = Math.hypot((observer.x || 0) - (other.x || 0), (observer.z || 0) - (other.z || 0));
  if (distance > range) return null;
  return { type: "predator", targetId: other.id, x: other.x, z: other.z, confidence: clamp(.88 - distance / Math.max(1, range) * .42, .46, .88), age: 0, channel: "smell" };
}

export function closePreyContact(observer, other) {
  if (observer?.speciesId !== "hunter" || other?.speciesId !== "grazer" || !other.alive) return null;
  const distance = Math.hypot((observer.x || 0) - (other.x || 0), (observer.z || 0) - (other.z || 0));
  const range = Math.max(1.4, (observer.collisionRadius || .3) + (other.collisionRadius || .3) + .9);
  if (distance > range) return null;
  return { type: "animal", targetId: other.id, identifiedSpecies: other.speciesId, speciesId: other.speciesId, coarseClass: "animal", apparentMass: Number(other.bodyMass) || 0, x: other.x, z: other.z, confidence: clamp(1 - distance / range * .35, .65, 1), age: 0, channel: "proximity" };
}

export function collectiveThreatPoint(members = [], signals = []) {
  const evidence = members.flatMap((member) => member.threatAssessment?.contributors || []).concat(signals)
    .filter((item) => Number.isFinite(item?.x) && Number.isFinite(item?.z) && (item.type === "predator" || ["alarm", "threat"].includes(item.signalKind)));
  return evidence.sort((left, right) => (right.confidence || 0) - (left.confidence || 0))[0] || null;
}
