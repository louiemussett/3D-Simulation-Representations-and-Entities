import test from "node:test";
import assert from "node:assert/strict";
import { closePredatorScent, closePreyContact, collectiveThreatPoint } from "../src/group-threat-response.js";

test("a nearby hunter supplies direct body-scent evidence outside the view cone", () => {
  const evidence = closePredatorScent({ speciesId: "grazer", x: 0, z: 0 }, { id: "hunter-1", speciesId: "hunter", alive: true, x: 2, z: 0 }, 5);
  assert.equal(evidence.type, "predator"); assert.equal(evidence.channel, "smell"); assert.ok(evidence.confidence >= .46);
  assert.equal(closePredatorScent({ speciesId: "grazer", x: 0, z: 0 }, { speciesId: "hunter", alive: true, x: 20, z: 0 }, 5), null);
});

test("a hunter recognises prey at body proximity without requiring forward sight", () => {
  const evidence = closePreyContact({ speciesId: "hunter", x: 0, z: 0, collisionRadius: .3 }, { id: "g", speciesId: "grazer", alive: true, bodyMass: 65, x: 1, z: 0, collisionRadius: .3 });
  assert.equal(evidence.targetId, "g"); assert.equal(evidence.channel, "proximity");
  assert.equal(evidence.identifiedSpecies, "grazer"); assert.equal(evidence.apparentMass, 65);
  assert.equal(closePreyContact({ speciesId: "hunter", x: 0, z: 0 }, { speciesId: "grazer", alive: true, x: 4, z: 0 }), null);
});

test("a group alert retains the strongest perceived predator direction", () => {
  const members = [{ threatAssessment: { contributors: [{ type: "predator", targetId: "h", x: 4, z: 2, confidence: .8 }] } }, { threatAssessment: { contributors: [] } }];
  assert.deepEqual(collectiveThreatPoint(members), { type: "predator", targetId: "h", x: 4, z: 2, confidence: .8 });
});
