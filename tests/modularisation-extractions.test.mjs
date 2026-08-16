import assert from "node:assert/strict";
import test from "node:test";
import { applyThreatAssessment, assessThreatEvidence } from "../src/perception/threat-assessment.js";
import { createWorldSnapshot, snapshotAnimalForPersistence } from "../src/persistence/world-codec.js";
import { createWorldQueries } from "../src/simulation/world-queries.js";
import { updatePredatorIntentObservations } from "../src/perception/predator-intent-observer.js";

test("extracted threat assessment preserves the legacy scoring contract", () => {
  const animal = { id: "deer", fear: 10, predatorIntentEstimates: [{ selfTargetLikelihood: .5, confidence: .4 }] };
  const contacts = [{ type: "predator", targetId: "wolf", channel: "sight", confidence: .8, motionConfidence: .5 }];
  const assessment = assessThreatEvidence(animal, contacts, { herbivore: true, rememberedThreat: () => .2 });
  const expectedScore = Math.min(100, .8 * 52 * (.75 + .25 * .5) + .2 * 35 + .5 * .4 * 34);
  assert.equal(assessment.overallConfidence, expectedScore / 100);
  applyThreatAssessment(animal, assessment, () => .25);
  assert.equal(animal.threatAssessment, assessment);
  assert.equal(animal.fear, 10 + Math.max(3, expectedScore * .5) + .25 * 8);
});

test("non-herbivores retain no herbivore threat assessment", () => {
  const animal = { threatAssessment: { overallConfidence: 1 }, fear: 0 };
  applyThreatAssessment(animal, assessThreatEvidence(animal, [], { herbivore: false }));
  assert.equal(animal.threatAssessment, null);
});

test("world codec excludes runtime and presentation resources", () => {
  const world = { seed: 7, animals: [{ id: "A", visualMove: {}, rss: {}, predictiveCycle: {}, acousticObservations: [{}], decisionTrace: { evidence: [], predictive: { private: true } } }], occupied: new Map(), entityIndex: {}, hexWorld: {}, cells: [{}], soundEvents: [{}], signalEmissions: [{}], environmentSoundSources: [{}] };
  const snapshot = createWorldSnapshot(world, { worldSchema: 6, needPlanSchema: 4, saveSlotName: "test", savedAt: "fixed" });
  for (const key of ["occupied", "entityIndex", "hexWorld", "cells", "soundEvents", "signalEmissions", "environmentSoundSources"]) assert.equal(key in snapshot, false);
  assert.equal("visualMove" in snapshot.animals[0], false); assert.equal("predictive" in snapshot.animals[0].decisionTrace, false);
  assert.equal(snapshot.savedAt, "fixed"); assert.equal(snapshot.saveSlotName, "test");
  assert.deepEqual(snapshotAnimalForPersistence(world.animals[0]).decisionTrace, { evidence: [] });
});

test("world queries expose reads without renderer or DOM authority", () => {
  const animal = { id: "A" }, world = { animals: [animal] };
  const queries = createWorldQueries({ getWorld: () => world, animalById: id => id === "A" ? animal : null, corpseById: () => null, nearbyAnimals: () => [animal], nearbyCorpses: () => [], cellAt: (x, z) => ({ x, z }), weatherAt: () => ({ rain: 0 }), surfaceHeight: () => 2 });
  assert.equal(queries.animalById("A"), animal); assert.equal(queries.surfaceHeight(0, 0), 2); assert.equal("renderer" in queries, false);
});

test("predator intent extraction consumes attended observations and preserves occlusion hysteresis", () => {
  const predator = { id: "wolf", alive: true }, animal = { id: "deer", x: 0, z: 0, receivedSignals: [], predatorIntentEstimates: [] }, remembered = [];
  const contact = { channel: "sight", type: "predator", targetId: "wolf", x: 4, z: 0, vx: -.12, vz: 0, heading: Math.PI, headHeading: Math.PI, confidence: .8, bodyCues: { activity: "chase" } };
  const context = { herbivore: true, tick: 4, animalById: () => predator, rememberedThreat: () => .2, rememberEpisode: (...args) => remembered.push(args) };
  const estimate = updatePredatorIntentObservations(animal, [contact], context);
  assert.equal(estimate.predatorId, "wolf"); assert.equal(animal.reciprocalAttention.updatedTick, 4); assert.ok(estimate.attackImminence > 0);
  const retained = updatePredatorIntentObservations(animal, [], { ...context, tick: 5 });
  assert.equal(retained.predatorId, "wolf"); assert.ok(retained.confidence < estimate.confidence);
});
