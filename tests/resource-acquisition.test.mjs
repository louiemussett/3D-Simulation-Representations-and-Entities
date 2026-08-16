import test from "node:test";
import assert from "node:assert/strict";
import { confirmResourceMemory, failResourceMemory, migrateResourceAcquisition, recordResourceContact, resourceAcquisitionTotals, resourceMemoryEligible, resourceSearchRadius } from "../src/resource-acquisition.js";

test("vague resource memories are search regions and failed claims enter a growing cooldown", () => {
  const animal = {}, memory = { type: "water", x: 4, z: 3, confidence: .52, uncertainty: 5, startingMemory: true };
  assert.equal(resourceSearchRadius(memory), 6.25);
  failResourceMemory(animal, memory, 10, { cooldown: 12 });
  assert.equal(resourceMemoryEligible(memory, 20), false);
  assert.equal(resourceMemoryEligible(memory, 22), true);
  const firstDuration = memory.disprovenUntil - 10;
  failResourceMemory(animal, memory, 30, { cooldown: 12 });
  assert.ok(memory.disprovenUntil - 30 > firstDuration);
  assert.ok(memory.confidence < .1);
});

test("confirmed contacts are aggregated by resource type", () => {
  const animal = migrateResourceAcquisition({});
  confirmResourceMemory(animal, "water", 4);
  recordResourceContact(animal, "water", 5);
  recordResourceContact(animal, "water", 6);
  const totals = resourceAcquisitionTotals([animal]);
  assert.deepEqual(totals.water, { failures: 0, resolved: 1, contacts: 2, suppressed: 0 });
  assert.equal(totals.food.contacts, 0);
});

test("legacy and malformed acquisition records cannot crash resource failure handling", () => {
  const animal = { resourceAcquisition: { water: "legacy", food: null, carcass: [] } };
  migrateResourceAcquisition(animal);
  assert.equal(animal.resourceAcquisition.water.failures, 0);
  failResourceMemory(animal, { type: "plant", x: 1, z: 2, confidence: .5 }, 9);
  assert.equal(animal.resourceAcquisition.food.failures, 1);
  const unknown = { type: "unknown-legacy-resource", x: 3, z: 4, confidence: .5 };
  assert.doesNotThrow(() => failResourceMemory(animal, unknown, 10));
  assert.equal(unknown.resourceAcquisitionFailureIgnored, true);
});

test("unknown contact and confirmation types are rejected without dereferencing undefined state", () => {
  const animal = {};
  assert.equal(confirmResourceMemory(animal, "unknown", 1), false);
  assert.equal(recordResourceContact(animal, "unknown", 1), false);
});
