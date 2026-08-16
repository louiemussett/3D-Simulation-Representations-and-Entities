import { classifyProximityRelationship, migrateProximityRelationship, recordRelationshipOutcome, relationshipMemory } from "./proximity-relationships.js";
import { perceivedProximityObservation } from "./proximity-perception.js";
import { proximitySpeciesProfile } from "./proximity-profile.js";
import { constructProximityBands } from "./proximity-bands.js";
import { migrateProximityStates, updateProximityState } from "./proximity-state.js";

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const stableUnit = (value = "") => { let hash = 2166136261; for (const character of String(value)) { hash ^= character.charCodeAt(0); hash = Math.imul(hash, 16777619); } return (hash >>> 0) / 4294967295; };

export function migratePersonalSpace(animal = {}) {
  const seed = stableUnit(animal.id);
  animal.personalSpaceTrait = Number.isFinite(animal.personalSpaceTrait) ? clamp(animal.personalSpaceTrait, 0, 1) : clamp(seed * .72 + (Number(animal.aggression) || .5) * .28, 0, 1);
  animal.intrusionTolerance = Number.isFinite(animal.intrusionTolerance) ? clamp(animal.intrusionTolerance, 0, 1) : clamp(stableUnit(`${animal.id}:tolerance`) * .78 + (1 - (Number(animal.aggression) || .5)) * .22, 0, 1);
  animal.proximityRelationships = Object.fromEntries(Object.entries(animal.proximityRelationships || {}).map(([targetId, record]) => [targetId, migrateProximityRelationship(record, animal.id, targetId)]));
  migrateProximityStates(animal);
  return animal;
}

export function proximityRelationship(actor = {}, targetId) {
  migratePersonalSpace(actor);
  return relationshipMemory(actor, targetId);
}

export function learnProximityRelationship(actor = {}, targetId, outcome, tick = 0, strength = 1) {
  migratePersonalSpace(actor); return recordRelationshipOutcome(actor, targetId, outcome, tick, strength);
}

export function proximityCurves(actor = {}, target = {}, context = {}) {
  const relationship = proximityRelationship(actor, target.id), contactSpan = Number(context.contactSpan) || .5, distance = Math.max(contactSpan, Number(context.distance) || contactSpan);
  const relationshipClass = classifyProximityRelationship(actor, target, { ...context, familiarity: relationship.familiarity });
  const observation = perceivedProximityObservation(actor, context.observation || { targetId: target.id, x: context.estimatedPosition?.x, z: context.estimatedPosition?.z, confidence: context.confidence, channel: context.channel }, { tick: context.tick, estimatedDistance: distance, distanceUncertainty: context.distanceUncertainty, perceivedSpecies: context.perceivedSpecies || target.speciesId, relationshipClass });
  const profile = proximitySpeciesProfile(actor, relationshipClass, { contactSpan }), intentPressure = clamp(Number(context.predatorIntent?.selfTargetLikelihood || 0) * Number(context.predatorIntent?.confidence || 0), 0, 1);
  const bands = constructProximityBands(actor, target, relationship, observation, profile, { ...context, contactSpan, intentPressure });
  const state = updateProximityState(actor, observation, relationshipClass, bands, { ...profile, intentPressure });
  const radius = bands.monitoringEnter;
  const closeness = clamp(1 - (distance - contactSpan) / Math.max(.1, radius - contactSpan), 0, 1), affinity = clamp(Number(context.affinity) || 0, -1, 1), grievance = clamp(Number(context.grievance) || 0, 0, 1), fear = clamp(Number(actor.fear) || 0, 0, 100) / 100;
  const intent = intentPressure;
  const socialAttraction = Math.max(0, affinity) * .42 + relationship.familiarity * .18 + Math.max(0, relationship.trust) * .22 + (context.related ? .25 : 0) + (context.sameGroup ? .18 : 0);
  const mateAttraction = context.compatibleMate ? clamp(Number(actor.libido) || 0) * .3 : 0;
  const attraction = clamp((socialAttraction + mateAttraction) * (.35 + closeness * .65), 0, 1);
  const tolerance = clamp(actor.intrusionTolerance * .48 + relationship.familiarity * .28 + Math.max(0, relationship.trust) * .2 + (context.related ? .2 : 0) + (context.sameGroup ? .16 : 0) - grievance * .35 - intent * .45, 0, 1);
  const avoidance = clamp(closeness * (.25 + actor.personalSpaceTrait * .25) + fear * .42 + grievance * .45 + relationship.threatExpectation * .38 + intent * .85 + (context.predatorRelationship ? .18 : 0) - tolerance * .28, 0, 1.5);
  return Object.freeze({ radius, closeness, attraction, tolerance, avoidance, predatorIntentPressure: intent, relationship: Object.freeze({ ...relationship }), relationshipClass, observation, bands, state });
}

export function personalSpaceRadius(animal = {}, contactSpan = .5) {
  migratePersonalSpace(animal);
  const stage = ({ dependent: .42, juvenile: .5, subadult: .58, adult: .72, old: .82 })[animal.lifeStage] ?? .7;
  const temperament = .16 + animal.personalSpaceTrait * 1.28 + clamp(Number(animal.aggression) || .5, 0, 1) * .24;
  const vulnerability = clamp((100 - (Number(animal.health) || 100)) / 100 + (Number(animal.fear) || 0) / 180, 0, .8);
  return Math.max(contactSpan + .16, contactSpan + stage * temperament + vulnerability * .55);
}

export function assessPersonalSpace(actor = {}, target = {}, context = {}) {
  migratePersonalSpace(actor);
  const distance = Number(context.distance);
  if (!target.alive || !Number.isFinite(distance) || actor.id === target.id) return null;
  const sameSpecies = actor.speciesId === target.speciesId, affinity = clamp(Number(context.affinity) || 0, -1, 1), grievance = clamp(Number(context.grievance) || 0, 0, 1);
  const predatorRelationship = Boolean(context.predatorRelationship || actor.speciesId === "grazer" && target.speciesId === "hunter");
  const curves = proximityCurves(actor, target, { ...context, predatorRelationship });
  const radius = curves.radius, band = curves.state.currentBand;
  if (band === "neutral" && curves.state.attractionPressure <= 0) return null;
  const intrusion = clamp(1 - Math.max(0, distance - (Number(context.contactSpan) || .5)) / Math.max(.1, radius - (Number(context.contactSpan) || .5)), 0, 1);
  const tolerance = actor.intrusionTolerance, aggression = clamp(Number(actor.aggression) || .5, 0, 1), fear = clamp(Number(actor.fear) || 0, 0, 100) / 100, allies = Math.max(0, Number(context.allies) || 0), roll = clamp(Number(context.roll) || 0, 0, .999999);
  if (!sameSpecies) {
    if (predatorRelationship) {
      if (band === "monitoring") return { kind: "orient", needId: "safety", satisfierId: "monitor-threat", methodId: "orient-monitor", pressure: Math.max(.12, curves.state.threatPressure), radius, curves };
      if (band === "vigilance") return { kind: curves.predatorIntentPressure > .25 ? "warn" : "orient", needId: "safety", satisfierId: "assess-threat", methodId: "focused-vigilance", pressure: Math.max(.3, curves.state.threatPressure), radius, curves };
      if (band === "defence" && allies >= 2 && aggression + (Number(actor.careAffinity) || .5) > 1.05 && fear < .72 && curves.predatorIntentPressure < .82) return { kind: "rally-defence", needId: "safety", satisfierId: "defend", methodId: "group-defence", pressure: curves.avoidance + allies * .12, radius, curves };
      return { kind: "retreat", needId: "safety", satisfierId: band === "flight" || band === "defence" ? "create-distance" : "controlled-withdrawal", methodId: band === "flight" || band === "defence" ? "flee-perceived-threat" : "withdraw-from-threat", pressure: Math.max(curves.avoidance + fear, curves.state.threatPressure), radius, curves };
    }
    return { kind: curves.avoidance > .72 ? "retreat" : curves.state.attractionPressure > .25 || curves.attraction > .55 ? "affiliate" : "orient", pressure: Math.max(curves.avoidance, curves.attraction, intrusion, curves.state.compositePressure), radius, curves, deferToPredation: true };
  }
  if (context.compatibleMate && affinity > -.25 && (Number(actor.libido) || 0) > .35 && curves.avoidance < 1) return { kind: "courtship", pressure: curves.attraction + (Number(actor.libido) || 0), radius, curves };
  if (curves.state.attractionPressure > .05) return { kind: "affiliate", needId: curves.relationshipClass === "caregiver" || curves.relationshipClass === "dependent" ? "care" : "affiliation", satisfierId: "restore-relationship-band", methodId: "approach-bonded-entity", pressure: curves.state.attractionPressure, radius, curves };
  if (context.related || context.sameGroup || affinity >= .28) {
    if (affinity >= .48 || context.related || curves.attraction > .55) return { kind: roll < .7 ? "affiliate" : "ignore", pressure: intrusion + curves.attraction, radius, curves };
    return { kind: roll < .55 ? "orient" : "ignore", pressure: intrusion, radius, curves };
  }
  const hostility = aggression * .62 + grievance * .85 + intrusion * .35 + actor.personalSpaceTrait * .16 + curves.avoidance * .18 - Math.max(tolerance, curves.tolerance) * .52 - fear * .45;
  if (hostility > .94 && allies >= 2) return { kind: "rally-aggression", pressure: hostility + allies * .08, radius, curves };
  if (hostility > .86) return { kind: "attack", pressure: hostility, radius, curves };
  if (fear + (Number(actor.submissionTrait) || 0) * .45 > .72) return { kind: "retreat", pressure: fear + intrusion, radius, curves };
  if (hostility > .58) return { kind: "warn", pressure: hostility, radius, curves };
  return { kind: roll < .28 + Math.max(tolerance, curves.tolerance) * .5 ? "ignore" : "orient", pressure: Math.max(intrusion, curves.avoidance), radius, curves };
}
