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
