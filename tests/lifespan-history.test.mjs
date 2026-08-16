import test from "node:test";
import assert from "node:assert/strict";
import { lifespanQuality, migrateLifeHistory, recordEmergencyExertion, recordInjurySustained, recordLifeExperience } from "../src/lifespan-history.js";

test("a low-stress life retains high lifetime condition without projecting a death age", () => {
  const animal = { age: 0, fear: 0, energy: 100, hydration: 100, stomach: 50, fatigue: 0, injuries: [], actionState: { key: "rest" } };
  for (let hour = 0; hour < 240; hour += 1) recordLifeExperience(animal);
  assert.equal(lifespanQuality(animal), 1);
});
test("fear fleeing injury deprivation and exertion reduce lifetime condition", () => {
  const animal = { age: 0, fear: 100, energy: 0, hydration: 0, stomach: 0, fatigue: 100, tempStress: 100, movementNoise: 1, injuries: [{ severity: 1 }], actionState: { key: "flee" } };
  for (let hour = 0; hour < 240; hour += 1) recordLifeExperience(animal);
  assert.ok(lifespanQuality(animal) < .1);
});
test("recovered injuries and emergency exertion retain a bounded lifetime cost", () => {
  const animal = { age: 0, lifeHistory: { observedHours: 100, weightedBurdenHours: 0 } }, before = lifespanQuality(animal);
  recordInjurySustained(animal); recordEmergencyExertion(animal); assert.ok(lifespanQuality(animal) < before); assert.ok(lifespanQuality(animal) >= 0);
});
test("older saves migrate to a neutral lifetime-condition estimate", () => {
  const animal = { age: 100 }, history = migrateLifeHistory(animal); assert.equal(history.observedHours, 2400); assert.equal(lifespanQuality(animal), .5);
});
