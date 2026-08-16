import { inferPredatorIntent, shouldRecomputePredatorIntent } from "../predator-intent-inference.js";
import { preyTargetingEstimate } from "../reciprocal-attention.js";
import { createThreatHypothesis } from "./threat-hypothesis.js";

const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, Number(value) || 0));

export function updatePredatorIntentObservations(animal, attendedContacts = [], context = {}) {
  if (!context.herbivore) {
    animal.predatorIntentEstimates = []; animal.predatorIntentEstimate = null; animal.reciprocalAttention = null; return null;
  }
  const tick = Number(context.tick || 0), previousById = new Map((animal.predatorIntentEstimates || []).map(item => [item.predatorId, item]));
  const visiblePrey = attendedContacts.filter(item => item.channel === "sight" && item.type === "conspecific" && item.targetId), estimates = [];
  for (const contact of attendedContacts.filter(item => item.channel === "sight" && item.type === "predator" && item.targetId)) {
    if (context.entityExists && !context.entityExists(contact.targetId)) continue;
    const previous = previousById.get(contact.targetId), distance = contact.distanceEstimate ?? Math.hypot(animal.x - contact.x, animal.z - contact.z), bearingToObserver = Math.atan2(animal.z - contact.z, animal.x - contact.x);
    const radialX = (animal.x - contact.x) / Math.max(.01, distance), radialZ = (animal.z - contact.z) / Math.max(.01, distance);
    const velocityResolved = Number.isFinite(contact.vx) && Number.isFinite(contact.vz) && (contact.velocityConfidence || 0) >= .18;
    const observedClosingSpeed = velocityResolved ? contact.vx * radialX + contact.vz * radialZ : null;
    const observablePosture = ({ "evaluate-prey": "evaluate", "track-scent": "stalk", stalk: "stalk", chase: "chase", attack: "attack" })[contact.bodyCues?.activity] || (contact.bodyCues?.activity === "urgent" ? "chase" : "patrol");
    const observedSpeed = velocityResolved ? Math.hypot(contact.vx, contact.vz) : null;
    const evidence = { distance, bearingToObserver, bodyHeading: contact.heading, headHeading: contact.headHeading, closingSpeed: observedClosingSpeed, closingAcceleration: previous && observedClosingSpeed != null && previous.closingSpeed != null ? observedClosingSpeed - previous.closingSpeed : null, routeDirectness: observedClosingSpeed != null && observedSpeed > .02 ? clamp(observedClosingSpeed / observedSpeed, 0, 1) : null, trackingDuration: previous && previous.selfTargetLikelihood > .3 ? (previous.trackingDuration || 0) + 1 : 0, observablePosture, observationConfidence: contact.confidence, motionState: contact.motionState || contact.motionObservation?.motionState || "unknown", motionConfidence: contact.motionConfidence || 0, velocityConfidence: contact.velocityConfidence || 0, velocityUncertainty: contact.velocityUncertainty ?? null, directionUncertainty: contact.directionUncertainty ?? contact.motionObservation?.velocity?.directionUncertaintyRadians ?? null, observationAge: contact.age || 0, environmentalClutter: contact.environmentalMotionClutter?.clutterIntensity || 0, alternativePrey: visiblePrey.length, rememberedThreat: context.rememberedThreat(animal, contact.targetId), companionWarning: (animal.receivedSignals || []).some(signal => ["threat", "alarm"].includes(signal.signalKind)) ? .45 : 0 };
    const inferred = shouldRecomputePredatorIntent(previous, evidence, tick) ? inferPredatorIntent(evidence, previous) : previous;
    estimates.push({ ...inferred, predatorId: contact.targetId, tick, x: contact.x, z: contact.z, distance, locationRegion: contact.motionObservation ? { centre: contact.motionObservation.position.estimate, covariance: contact.motionObservation.position.covariance, confidence: contact.motionObservation.position.confidence } : null, motionObservation: contact.motionObservation || null, bodyHeading: contact.heading, headHeading: contact.headHeading, closingSpeed: observedClosingSpeed, trackingDuration: evidence.trackingDuration, observablePosture, observationId: contact.evidenceId || contact.id });
  }
  for (const prior of previousById.values()) if (!estimates.some(item => item.predatorId === prior.predatorId) && tick - prior.tick <= 2) estimates.push({ ...prior, confidence: prior.confidence * .68 });
  animal.predatorIntentEstimates = estimates.sort((left, right) => right.selfTargetLikelihood * right.confidence - left.selfTargetLikelihood * left.confidence);
  animal.predatorIntentEstimate = animal.predatorIntentEstimates[0] || null;
  animal.threatHypotheses = estimates.map(estimate => { const contact = attendedContacts.find(item => item.targetId === estimate.predatorId && item.channel === "sight"); return contact ? createThreatHypothesis(animal, contact, estimate, { tick, createdTick: previousById.get(estimate.predatorId)?.createdTick ?? tick, probableCount: estimates.length }) : null; }).filter(Boolean);
  animal.reciprocalAttention = { ...(animal.reciprocalAttention || {}), predatorTargeting: preyTargetingEstimate(animal.predatorIntentEstimate), updatedTick: tick };
  animal.predatorTrackingCost = clamp((animal.predatorIntentEstimate?.detectionLikelihood || 0) * (animal.predatorIntentEstimate?.confidence || 0) * .32, 0, .28);
  const strongest = animal.predatorIntentEstimate;
  if (strongest?.selfTargetLikelihood > .72 && strongest.confidence > .48 && tick >= (animal.lastIntentMemoryTick || -99) + 8) {
    animal.lastIntentMemoryTick = tick;
    context.rememberEpisode(animal, strongest.predatorId, "inferred-pursuit", tick, { x: strongest.x, z: strongest.z, confidence: strongest.confidence, threat: strongest.selfTargetLikelihood, source: "observer-owned-threat-hypothesis" });
  }
  return animal.predatorIntentEstimate;
}
