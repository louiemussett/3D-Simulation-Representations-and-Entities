import test from "node:test";
import assert from "node:assert/strict";
import { environmentSenseCadence, routineEnvironmentScanDue } from "../src/population-performance.js";

test("routine environment sensing is staggered even at default population", () => {
  assert.equal(environmentSenseCadence(22), 3);
  assert.equal(environmentSenseCadence(64), 4);
  assert.equal(environmentSenseCadence(220), 6);
  assert.equal(environmentSenseCadence(700), 8);
});

test("routine scans stagger deterministically by decision order", () => {
  const animal = { speciesId: "grazer", decisionOrder: 3, actionState: { key: "rest" } };
  assert.equal(routineEnvironmentScanDue(animal, 3, 220), true);
  assert.equal(routineEnvironmentScanDue(animal, 2, 220), false);
});

test("hunters and urgent animals retain responsive environment sensing", () => {
  assert.equal(routineEnvironmentScanDue({ speciesId: "hunter", decisionOrder: 0, actionState: { key: "rest" } }, 2, 700), true);
  assert.equal(routineEnvironmentScanDue({ speciesId: "grazer", decisionOrder: 0, actionState: { key: "flee" } }, 1, 700), true);
  assert.equal(routineEnvironmentScanDue({ speciesId: "grazer", decisionOrder: 0, lastHit: { tick: 9 }, actionState: { key: "rest" } }, 10, 700), true);
  assert.equal(routineEnvironmentScanDue({ speciesId: "grazer", decisionOrder: 0, actionState: { key: "rest" } }, 1, 700, true), true);
});
