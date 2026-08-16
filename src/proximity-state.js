import { proximityBandAtDistance } from "./proximity-bands.js";
export const PROXIMITY_STATE_SCHEMA = 1;

export function migrateProximityStates(animal = {}) { animal.proximityStates ||= {}; return animal.proximityStates; }

export function updateProximityState(animal = {}, observation, relationshipClass, bands, context = {}) {
  migrateProximityStates(animal); const key = observation.perceivedEntityKey, prior = animal.proximityStates[key] || {};
  const distance = Math.max(0, Number(observation.estimatedDistance) || 0), currentBand = bands.preferredMinimum <= distance && distance <= bands.preferredMaximum ? "comfortable" : proximityBandAtDistance(distance, bands, prior.currentBand || "neutral");
  const previousBand = prior.currentBand || "neutral", threatIndex = { neutral: 0, monitoring: 1, vigilance: 2, withdrawal: 3, flight: 4, defence: 5 }[currentBand] || 0;
  const tooFar = distance > bands.preferredMaximum, tooClose = distance < bands.preferredMinimum;
  const attractionPressure = context.bonded && tooFar ? Math.min(1.5, (distance - bands.preferredMaximum) / Math.max(.2, bands.attractionOuter - bands.preferredMaximum)) : 0;
  const crowdingPressure = tooClose ? Math.min(1.5, (bands.preferredMinimum - distance) / Math.max(.2, bands.preferredMinimum - bands.contactTolerance)) : 0;
  const threatPressure = threatIndex / 5 * (1 + Math.max(0, Number(context.intentPressure) || 0) * .5);
  const compositePressure = Math.max(attractionPressure, crowdingPressure, threatPressure);
  const state = { schemaVersion: PROXIMITY_STATE_SCHEMA, observerId: animal.id, perceivedEntityKey: key, otherEntityId: observation.perceivedIndividualId, relationshipClass,
    currentBand, previousBand, bandEnteredTick: currentBand === previousBand ? prior.bandEnteredTick ?? observation.tick : observation.tick,
    attractionPressure, crowdingPressure, threatPressure, carePressure: context.care ? attractionPressure : 0, affiliationPressure: context.bonded ? attractionPressure : 0,
    autonomyPressure: context.competitive ? crowdingPressure : 0, compositePressure, pressureTrend: compositePressure - Number(prior.compositePressure || 0), estimatedDistance: distance,
    estimatedPosition: Number.isFinite(observation.estimatedPosition?.x) && Number.isFinite(observation.estimatedPosition?.z) ? { x: Number(observation.estimatedPosition.x), z: Number(observation.estimatedPosition.z) } : prior.estimatedPosition || null,
    estimatedClosingSpeed: observation.estimatedClosingSpeed, estimatedIntent: observation.estimatedIntent, escapeMargin: distance - bands.flightEnter,
    preferredMinimum: bands.preferredMinimum, preferredMaximum: bands.preferredMaximum,
    activeEntryThreshold: bands[`${currentBand}Enter`] ?? null, activeReleaseThreshold: bands[`${currentBand}Release`] ?? null,
    retainedSinceTick: prior.retainedSinceTick ?? observation.tick, lastEvaluatedTick: observation.tick,
    lastMeaningfulChangeTick: currentBand === previousBand && Math.abs(compositePressure - Number(prior.compositePressure || 0)) < .08 ? prior.lastMeaningfulChangeTick ?? observation.tick : observation.tick,
    primaryEvidenceIds: observation.authoritativeEvidenceRefs, uncertainty: observation.distanceUncertainty,
    explanationCode: currentBand === "comfortable" ? "inside-preferred-band" : currentBand === "neutral" && attractionPressure > 0 ? "bonded-entity-too-far" : `${relationshipClass}:${currentBand}` };
  animal.proximityStates[key] = state;
  const retained = Object.entries(animal.proximityStates).sort(([, a], [, b]) => b.lastEvaluatedTick - a.lastEvaluatedTick).slice(0, 48);
  animal.proximityStates = Object.fromEntries(retained); return state;
}
