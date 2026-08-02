import test from "node:test";
import assert from "node:assert/strict";
import { evidenceRef } from "../src/decision-trace.js";
import { checkedPreyEvidence, choosePreyEvidence, groupObservation, inferPreyAwareness, observedPreyCompatible, stealthNoiseMultiplier } from "../src/hunting-awareness.js";

test("hunter infers notice risk from observable prey heading and attention", () => {
  const hunter = { x: 0, z: 0 };
  assert.equal(inferPreyAwareness(hunter, { x: 4, z: 0, heading: Math.PI, bodyCues: { headMovement: "forward" } }, 1).level, "likely-aware");
  assert.equal(inferPreyAwareness(hunter, { x: 4, z: 0, heading: 0, bodyCues: { headMovement: "forward" } }, 1).level, "apparently-unaware");
});

test("group observation uses only visible contact headings", () => {
  const contacts = [{ targetId: "a", type: "animal", channel: "sight", x: 3, z: 3, heading: 0 }, { targetId: "b", type: "animal", channel: "sight", x: 4, z: 3, heading: 0 }, { targetId: "hidden", type: "animal", channel: "memory", x: 3, z: 4, heading: 1 }];
  const group = groupObservation(contacts, "a"); assert.equal(group.size, 2); assert.equal(group.heading, 0);
});

test("prey evidence compares freshness confidence and remembered visible size", () => {
  const fresh = { type: "preyTrail", age: 1, confidence: .8, x: 2, z: 2 };
  const largeOld = { type: "animal", targetId: "large", age: 8, confidence: .9, bodyCues: { apparentMass: 100 }, x: 8, z: 8 };
  assert.equal(choosePreyEvidence([fresh, largeOld]), largeOld);
});

test("checked or sub-threshold prey evidence is retired immediately", () => {
  const checked = { type: "animal", targetId: "old", age: 1, confidence: .9, checked: true, x: 2, z: 2 };
  const rejected = { type: "preyTrail", age: 1, confidence: .08, x: 3, z: 3 };
  assert.equal(choosePreyEvidence([checked, rejected]), null);
});

test("prey compatibility uses identified observation content rather than a hidden live animal", () => {
  assert.equal(observedPreyCompatible("brush-fox", { type: "animal", identifiedSpecies: "meadow-nibbler", coarseClass: "animal" }), true);
  assert.equal(observedPreyCompatible("brush-fox", { type: "animal", identifiedSpecies: "great-plains-grazer", coarseClass: "animal" }), false);
  assert.equal(observedPreyCompatible("brush-fox", { type: "animal", coarseClass: "animal" }), false);
  assert.equal(observedPreyCompatible("brush-fox", { type: "animal", identifiedSpecies: "meadow-nibbler", coarseClass: "predator" }), false);
});

test("normalized sensory evidence remains usable for prey compatibility", () => {
  const identified = evidenceRef({ type: "animal", targetId: "nibbler-1", x: 2, z: 1, confidence: .8, channel: "sight", identifiedSpecies: "meadow-nibbler", speciesId: "meadow-nibbler", coarseClass: "animal" }, 4);
  const unknown = evidenceRef({ type: "animal", targetId: "unknown-1", x: 2, z: 1, confidence: .8, channel: "sight", coarseClass: "animal" }, 4);
  assert.equal(observedPreyCompatible("brush-fox", identified), true);
  assert.equal(observedPreyCompatible("brush-fox", unknown), false);
});

test("very slow stalking reduces movement sound by ninety-five percent", () => {
  assert.equal(stealthNoiseMultiplier(.22), .05); assert.equal(stealthNoiseMultiplier(.3), 1);
});

test("checked old prey evidence is retired instead of driving back-and-forth movement", () => {
  const memory = { type: "animal", targetId: "H11", confidence: .82 };
  const checked = checkedPreyEvidence(memory);
  assert.equal(checked.checked, true); assert.ok(checked.confidence < .1);
  assert.equal(memory.confidence, .82);
});
