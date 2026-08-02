import test from "node:test";
import assert from "node:assert/strict";
import { lifespanMultiplier, migrateLifeHistory, projectedMaximumAge, projectedSenescenceAge, recordEmergencyExertion, recordInjurySustained, recordLifeExperience } from "../src/lifespan-history.js";

test("a low-stress life can approach three times the species baseline", () => {
  const animal = { age: 0, fear: 0, energy: 100, hydration: 100, stomach: 50, fatigue: 0, injuries: [], actionState: { key: "rest" } };
  for (let hour = 0; hour < 240; hour += 1) recordLifeExperience(animal);
  assert.equal(lifespanMultiplier(animal), 3); assert.equal(projectedMaximumAge(animal, 420), 1260); assert.equal(projectedSenescenceAge(animal, 310, 420), 930);
});
test("fear fleeing injury deprivation and exertion reduce projected lifespan", () => {
  const animal = { age: 0, fear: 100, energy: 0, hydration: 0, stomach: 0, fatigue: 100, tempStress: 100, movementNoise: 1, injuries: [{ severity: 1 }], actionState: { key: "flee" } };
  for (let hour = 0; hour < 240; hour += 1) recordLifeExperience(animal);
  assert.ok(lifespanMultiplier(animal) < 1.2); assert.ok(projectedMaximumAge(animal, 420) < 504);
});
test("recovered injuries and emergency exertion retain a bounded lifetime cost", () => {
  const animal = { age: 0, lifeHistory: { observedHours: 100, weightedBurdenHours: 0 } }, before = lifespanMultiplier(animal);
  recordInjurySustained(animal); recordEmergencyExertion(animal); assert.ok(lifespanMultiplier(animal) < before); assert.ok(lifespanMultiplier(animal) >= 1);
});
test("older saves migrate to a neutral two-times estimate", () => {
  const animal = { age: 100 }, history = migrateLifeHistory(animal); assert.equal(history.observedHours, 2400); assert.equal(lifespanMultiplier(animal), 2);
});
