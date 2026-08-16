import test from "node:test";
import assert from "node:assert/strict";
import { environmentSenseCadence, frameSchedulingRate, fullPerceptionCadence, initialActivationCadence, initialPopulationActivationDue, largePopulationVisualStride, routineEnvironmentScanDue, routineFullPerceptionDue } from "../src/population-performance.js";

test("routine environment sensing is staggered even at default population", () => {
  assert.equal(environmentSenseCadence(22), 3);
  assert.equal(environmentSenseCadence(64), 4);
  assert.equal(environmentSenseCadence(100), 16);
  assert.equal(environmentSenseCadence(220), 20);
  assert.equal(environmentSenseCadence(700), 32);
});

test("routine scans stagger deterministically by decision order", () => {
  const animal = { speciesId: "grazer", decisionOrder: 3, actionState: { key: "rest" } };
  assert.equal(routineEnvironmentScanDue(animal, 17, 220), true);
  assert.equal(routineEnvironmentScanDue(animal, 2, 220), false);
});

test("hunters and urgent animals retain responsive environment sensing", () => {
  assert.equal(routineEnvironmentScanDue({ speciesId: "hunter", decisionOrder: 0, actionState: { key: "rest" } }, 2, 700), true);
  assert.equal(routineEnvironmentScanDue({ speciesId: "grazer", decisionOrder: 0, actionState: { key: "flee" } }, 1, 700), true);
  assert.equal(routineEnvironmentScanDue({ speciesId: "grazer", decisionOrder: 0, lastHit: { tick: 9 }, actionState: { key: "rest" } }, 10, 700), true);
  assert.equal(routineEnvironmentScanDue({ speciesId: "grazer", decisionOrder: 0, actionState: { key: "rest" } }, 1, 700, true), true);
});

test("full multimodal perception is staggered while danger remains immediate", () => {
  assert.equal(fullPerceptionCadence(25), 2);
  assert.equal(fullPerceptionCadence(100), 8);
  assert.equal(fullPerceptionCadence(500), 12);
  const routine = { decisionOrder: 3, actionState: { key: "graze" } };
  assert.equal(routineFullPerceptionDue(routine, 5, 100), true);
  assert.equal(routineFullPerceptionDue(routine, 2, 100), false);
  assert.equal(routineFullPerceptionDue(routine, 2, 100, { immediateThreat: true }), true);
  assert.equal(routineFullPerceptionDue(routine, 2, 100, { selected: true }), true);
});

test("30 FPS targets receive scheduling headroom under population load", () => {
  assert.equal(frameSchedulingRate(30, 25), 36);
  assert.equal(frameSchedulingRate(30, 100), 60);
  assert.equal(frameSchedulingRate(60, 100), 60);
  assert.equal(frameSchedulingRate(0, 100), 0);
});

test("large populations stagger only their initial planning activation", () => {
  assert.equal(initialActivationCadence(64), 1);
  assert.equal(initialActivationCadence(100), 8);
  const animal = { decisionOrder: 9 };
  assert.equal(initialPopulationActivationDue(animal, 1, 100), false);
  assert.equal(initialPopulationActivationDue(animal, 2, 100), true);
  assert.equal(initialPopulationActivationDue(animal, 9, 100), true);
  assert.equal(initialPopulationActivationDue(animal, 1, 100, { urgent: true }), true);
  assert.equal(initialPopulationActivationDue(animal, 1, 100, { selected: true }), true);
});

test("large-map performance mode bounds expensive visual synchronization", () => {
  assert.equal(largePopulationVisualStride(100, { performanceMode: false }), 1);
  assert.equal(largePopulationVisualStride(79, { performanceMode: true }), 1);
  assert.equal(largePopulationVisualStride(100, { performanceMode: true }), 6);
  assert.equal(largePopulationVisualStride(100, { performanceMode: true, selected: true }), 3);
  assert.equal(largePopulationVisualStride(300, { performanceMode: true }), 10);
});
