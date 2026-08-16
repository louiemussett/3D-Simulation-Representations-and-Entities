import test from "node:test";
import assert from "node:assert/strict";
import { constructProximityBands, proximityBandAtDistance, validateProximityBands } from "../src/proximity-bands.js";
import { perceivedProximityObservation } from "../src/proximity-perception.js";
import { proximitySpeciesProfile } from "../src/proximity-profile.js";
import { classifyProximityRelationship, migrateProximityRelationship, recordRelationshipOutcome } from "../src/proximity-relationships.js";
import { updateProximityState } from "../src/proximity-state.js";
import { assessPersonalSpace, migratePersonalSpace } from "../src/personal-space.js";

const animal = (id, speciesId, extra = {}) => ({ id, speciesId, alive: true, x: 0, z: 0, lifeStage: "adult", health: 100, fear: 0, aggression: .4, ...extra });

function threatFixture(distance = 8, intentPressure = .25) {
  const deer = migratePersonalSpace(animal("deer", "valley-grazer-updated")), wolf = animal("wolf", "ridge-hunter-updated", { x: distance });
  const relationship = migrateProximityRelationship({ threatExpectation: .4 }, deer.id, wolf.id);
  const observation = perceivedProximityObservation(deer, { targetId: wolf.id, x: distance, z: 0, confidence: .8, channel: "sight" }, { tick: 10, estimatedDistance: distance, relationshipClass: "known-predator", estimatedIntent: "attending", intentConfidence: .6 });
  const profile = proximitySpeciesProfile(deer, "known-predator", { contactSpan: .8 });
  const bands = constructProximityBands(deer, wolf, relationship, observation, profile, { intentPressure });
  return { deer, wolf, relationship, observation, profile, bands };
}

test("threat bands are finite, monotonic and use wider release thresholds", () => {
  const { bands } = threatFixture();
  assert.equal(validateProximityBands(bands), true);
  assert.ok(bands.monitoringEnter > bands.vigilanceEnter);
  assert.ok(bands.vigilanceEnter > bands.withdrawalEnter);
  assert.ok(bands.withdrawalEnter > bands.flightEnter);
  assert.ok(bands.flightEnter > bands.defenceEnter);
  assert.ok(bands.withdrawalRelease > bands.withdrawalEnter);
});

test("hysteresis retains withdrawal until its release threshold is crossed", () => {
  const { bands } = threatFixture();
  assert.equal(proximityBandAtDistance(bands.withdrawalEnter - .01, bands, "neutral"), "withdrawal");
  assert.equal(proximityBandAtDistance(bands.withdrawalEnter + .05, bands, "withdrawal"), "withdrawal");
  assert.notEqual(proximityBandAtDistance(bands.withdrawalRelease + .05, bands, "withdrawal"), "withdrawal");
});

test("perceived observation uses sensory position and retains uncertainty", () => {
  const observer = animal("a", "valley-grazer-updated", { x: 2, z: 3 });
  const observation = perceivedProximityObservation(observer, { targetId: "b", x: 5, z: 7, confidence: .6, positionError: 1.25, channel: "sound" }, { tick: 4 });
  assert.equal(observation.estimatedDistance, 5);
  assert.equal(observation.positionUncertainty, 1.25);
  assert.equal(observation.currentChannelEvidence.channel, "sound");
});

test("predator assessment operates beyond the legacy close-contact radius", () => {
  const deer = animal("deer", "grazer", { personalSpaceTrait: .3 }), wolf = animal("wolf", "hunter", { x: 5 });
  const result = assessPersonalSpace(deer, wolf, { tick: 1, distance: 5, estimatedPosition: { x: 5, z: 0 }, confidence: .8, channel: "sight", perceivedType: "predator", contactSpan: .8, predatorRelationship: true, predatorIntent: { selfTargetLikelihood: .25, confidence: .6 } });
  assert.ok(result);
  assert.equal(result.needId, "safety");
  assert.ok(["orient", "warn", "retreat"].includes(result.kind));
  assert.ok(result.curves.radius > 5);
});

test("caregiver and dependent create directional attraction outside their preferred band", () => {
  const mother = migratePersonalSpace(animal("mother", "grazer", { offspringIds: ["young"] })), young = animal("young", "grazer", { motherId: "mother", lifeStage: "dependent", x: 12 });
  assert.equal(classifyProximityRelationship(mother, young, {}), "dependent");
  const result = assessPersonalSpace(mother, young, { tick: 2, distance: 12, estimatedPosition: { x: 12, z: 0 }, confidence: 1, channel: "sight", related: true, contactSpan: .55 });
  assert.ok(result);
  assert.equal(result.kind, "affiliate");
  assert.equal(result.needId, "care");
  assert.ok(result.curves.state.attractionPressure > 0);
});

test("dynamic state is directional and retains band entry across stable evidence", () => {
  const { deer, observation, bands } = threatFixture(4);
  const first = updateProximityState(deer, observation, "known-predator", bands, { threat: true, intentPressure: .3 });
  const second = updateProximityState(deer, { ...observation, tick: 11 }, "known-predator", bands, { threat: true, intentPressure: .3 });
  assert.equal(second.observerId, "deer");
  assert.equal(second.otherEntityId, "wolf");
  assert.equal(second.bandEnteredTick, first.bandEnteredTick);
  assert.deepEqual(second.estimatedPosition, observation.estimatedPosition);
});

test("relationship learning preserves attack history and directional distrust", () => {
  const deer = migratePersonalSpace(animal("deer", "grazer"));
  recordRelationshipOutcome(deer, "wolf", "attack", 20, 1);
  const record = deer.proximityRelationships.wolf;
  assert.equal(record.observerId, "deer");
  assert.equal(record.otherEntityId, "wolf");
  assert.equal(record.attackCount, 1);
  assert.ok(record.trust < 0);
  assert.ok(record.threatExpectation > 0);
});
