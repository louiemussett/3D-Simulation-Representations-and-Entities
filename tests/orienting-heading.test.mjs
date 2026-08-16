import test from "node:test";
import assert from "node:assert/strict";
import { setAuthoritativeBodyHeading, updateOrienting } from "../src/orienting-system.js";

test("an orienting body turn updates locomotion heading atomically", () => {
  const animal = { orientation: 0, locomotion: { heading: Math.PI, vx: 0, vz: 0, angularVelocity: 1 } };
  setAuthoritativeBodyHeading(animal, Math.PI / 3);
  assert.equal(animal.orientation, Math.PI / 3);
  assert.equal(animal.locomotion.heading, Math.PI / 3);
  assert.equal(animal.locomotion.angularVelocity, 0);
});

test("sustained orienting does not leave a stale locomotion heading to snap back to", () => {
  const animal = { orientation: 0, headYaw: 0, actionState: { key: "listen" }, locomotion: { heading: 0, vx: 0, vz: 0, angularVelocity: 0 } };
  const cue = { targetId: "cue", channel: "sight", bearing: Math.PI, confidence: 1, distance: 5 };
  updateOrienting(animal, [cue], 1);
  updateOrienting(animal, [cue], 2);
  assert.notEqual(animal.orientation, 0);
  assert.equal(animal.locomotion.heading, animal.orientation);
});
