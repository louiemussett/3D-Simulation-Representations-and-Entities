import { preyCompatible } from "./species-registry.js";

const angleDelta = (left, right) => Math.atan2(Math.sin(left - right), Math.cos(left - right));

export function observedPreyCompatible(predator, observation = {}) {
  const identifiedSpecies = observation.identifiedSpecies || observation.speciesId || null;
  return Boolean(identifiedSpecies && observation.coarseClass !== "predator" && preyCompatible(predator, identifiedSpecies));
}

export function inferPreyAwareness(hunter, contact, groupSize = 1) {
  if (!contact || !Number.isFinite(contact.heading)) return Object.freeze({ level: "unknown", risk: .5 });
  const bearingToHunter = Math.atan2(hunter.z - contact.z, hunter.x - contact.x);
  const gazeDifference = Math.abs(angleDelta(bearingToHunter, contact.heading));
  const scanning = contact.bodyCues?.headMovement === "scanning" || contact.bodyCues?.headMovement === "listening";
  const risk = Math.min(1, (gazeDifference < Math.PI * .3 ? .82 : gazeDifference < Math.PI * .62 ? .42 : .1) + (scanning ? .18 : 0) + Math.min(.2, Math.max(0, groupSize - 1) * .05));
  return Object.freeze({ level: risk >= .72 ? "likely-aware" : risk >= .34 ? "possibly-aware" : "apparently-unaware", risk, gazeDifference });
}

export function groupObservation(contacts, focalId) {
  const visible = contacts.filter((contact) => contact.channel === "sight" && contact.type === "animal" && Number.isFinite(contact.heading));
  const focal = visible.find((contact) => contact.targetId === focalId);
  const neighbours = focal ? visible.filter((contact) => Math.hypot(contact.x - focal.x, contact.z - focal.z) <= 5) : [];
  if (!neighbours.length) return Object.freeze({ size: focal ? 1 : 0, heading: focal?.heading ?? null });
  const x = neighbours.reduce((sum, contact) => sum + Math.cos(contact.heading), 0), z = neighbours.reduce((sum, contact) => sum + Math.sin(contact.heading), 0);
  return Object.freeze({ size: neighbours.length, heading: Math.atan2(z, x) });
}

export function choosePreyEvidence(memories = []) {
  return memories.filter((memory) => (memory.type === "preyTrail" || memory.type === "animal") && !memory.checked && (Number(memory.confidence) || 0) > .1).map((memory) => {
    const mass = Number(memory.bodyCues?.apparentMass) || 0;
    const freshness = Math.max(0, 60 - (Number(memory.age) || 0));
    const score = (Number(memory.confidence) || 0) * 50 + freshness + Math.min(30, mass / 4);
    return { memory, score };
  }).sort((left, right) => right.score - left.score || String(left.memory.targetId || "").localeCompare(String(right.memory.targetId || "")))[0]?.memory || null;
}

export function checkedPreyEvidence(memory = {}) {
  return { confidence: Math.min(.08, Math.max(0, Number(memory.confidence) || 0)), checked: true };
}

export function stealthNoiseMultiplier(pace) { return pace <= .24 ? .05 : 1; }
