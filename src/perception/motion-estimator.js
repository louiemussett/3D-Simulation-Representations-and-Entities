import { createMotionObservation } from "./motion-observation.js";

const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, Number(value) || 0));
const hash = (text) => { let value = 2166136261; for (let index = 0; index < text.length; index++) { value ^= text.charCodeAt(index); value = Math.imul(value, 16777619); } return value >>> 0; };
const unit = (key) => hash(key) / 0xffffffff;
const signed = (key) => unit(key) * 2 - 1;

function measuredPosition(observer, target, confidence, tick) {
  const distance = Math.hypot(target.x - observer.x, target.z - observer.z), sigma = Math.max(.015, (1 - confidence) * (.18 + distance * .035));
  const key = `${observer.worldSeed || 0}:${observer.id}:${target.id}:${tick}:position`;
  return { x: target.x + signed(`${key}:x`) * sigma, z: target.z + signed(`${key}:z`) * sigma, sigma };
}

export function estimateObserverMotion(observer = {}, target = {}, options = {}) {
  const tick = Number(options.tick ?? observer.tick ?? 0), confidence = clamp(options.confidence), motionConfidence = clamp(options.motionConfidence), velocityConfidence = Math.min(motionConfidence, clamp(options.velocityConfidence));
  const measurement = measuredPosition(observer, target, confidence, tick), prior = options.prior || null, elapsed = Math.max(1, tick - Number(prior?.lastUpdatedTick ?? tick - 1));
  let velocityEstimate = null, accelerationEstimate = null, directionUncertainty = Math.PI, speedRange = null;
  if (prior?.position?.estimate && velocityConfidence >= .18) {
    const raw = { x: (measurement.x - prior.position.estimate.x) / elapsed, z: (measurement.z - prior.position.estimate.z) / elapsed }, old = prior.velocity?.estimate;
    const alpha = .32 + velocityConfidence * .48;
    velocityEstimate = old ? { x: old.x + (raw.x - old.x) * alpha, z: old.z + (raw.z - old.z) * alpha } : raw;
    const uncertainty = Math.max(.02, Number(options.velocityUncertainty || 0) + measurement.sigma / elapsed), speed = Math.hypot(velocityEstimate.x, velocityEstimate.z);
    speedRange = { minimum: Math.max(0, speed - uncertainty), maximum: speed + uncertainty };
    directionUncertainty = clamp(uncertainty / Math.max(.02, speed), 0, 1) * Math.PI;
    if (old && elapsed > 0 && velocityConfidence >= .42) accelerationEstimate = { x: (velocityEstimate.x - old.x) / elapsed, z: (velocityEstimate.z - old.z) / elapsed };
  }
  const measuredSpeed = velocityEstimate ? Math.hypot(velocityEstimate.x, velocityEstimate.z) : null, accumulated = Math.max(1, Number(prior?.temporal?.accumulatedEvidenceTicks || 0) + elapsed);
  let motionState = "unknown";
  if (velocityEstimate && velocityConfidence >= .55 && measuredSpeed <= .025 && accumulated >= 3) motionState = "stationary";
  else if (velocityEstimate && velocityConfidence >= .32) motionState = measuredSpeed > .035 ? (accelerationEstimate && Math.hypot(accelerationEstimate.x, accelerationEstimate.z) > .035 ? "accelerating" : "moving") : "possibly-moving";
  else if (motionConfidence >= .12) motionState = "possibly-moving";
  const distanceEstimate = Math.hypot(measurement.x - observer.x, measurement.z - observer.z), positionVariance = measurement.sigma ** 2;
  return createMotionObservation({
    observationId: `${observer.id}:${target.id}`, observerId: observer.id, subjectAssociationId: target.id, observedTick: tick, lastUpdatedTick: tick,
    position: { estimate: measurement, covariance: { xx: positionVariance, xz: 0, zz: positionVariance }, confidence, source: "deterministic-visual-measurement" },
    bearing: { radians: Math.atan2(measurement.z - observer.z, measurement.x - observer.x), uncertaintyRadians: Math.atan2(measurement.sigma, Math.max(.01, distanceEstimate)), confidence },
    distance: { estimate: distanceEstimate, minimum: Math.max(0, distanceEstimate - measurement.sigma * 2), maximum: distanceEstimate + measurement.sigma * 2, confidence },
    motionState, motionConfidence,
    velocity: { estimate: velocityEstimate, speedRange, directionUncertaintyRadians: directionUncertainty, covariance: { xx: Number(options.velocityUncertainty || .1) ** 2, xz: 0, zz: Number(options.velocityUncertainty || .1) ** 2 }, confidence: velocityEstimate ? velocityConfidence : 0 },
    acceleration: { estimate: accelerationEstimate, confidence: accelerationEstimate ? velocityConfidence * .62 : 0, uncertainty: Number(options.velocityUncertainty || 0) * 1.5 },
    temporal: { effectiveResolutionHz: options.temporal?.effectiveHz || 0, sampleIntervalTicks: elapsed, accumulatedEvidenceTicks: accumulated, recognitionLatencyTicks: Math.ceil((1 - confidence) * 2), observationAgeTicks: 0 },
    visibility: options.visibility,
    clutter: options.clutter,
    provenance: { channel: options.channel || "vision", evidenceIds: options.evidenceIds || [], profileVersion: 1, estimatorVersion: 1 }
  });
}

export function ageMotionObservation(observation, ticks = 1) {
  const age = Math.max(0, Number(ticks) || 0), growth = .08 * age, position = observation.position, velocity = observation.velocity;
  return createMotionObservation({ ...observation, position: { ...position, covariance: { xx: position.covariance.xx + growth ** 2, xz: position.covariance.xz, zz: position.covariance.zz + growth ** 2 }, confidence: clamp(position.confidence - age * .06) }, motionConfidence: clamp(observation.motionConfidence - age * .09), velocity: { ...velocity, confidence: clamp(velocity.confidence - age * .12), covariance: velocity.covariance ? { xx: velocity.covariance.xx + growth ** 2, xz: velocity.covariance.xz, zz: velocity.covariance.zz + growth ** 2 } : null }, temporal: { ...observation.temporal, observationAgeTicks: observation.temporal.observationAgeTicks + age } });
}
