import test from "node:test";
import assert from "node:assert/strict";
import { endurancePresentation } from "../src/endurance-presentation.js";

test("selected endurance presentation separates fuel from fatigue", () => {
  assert.deepEqual(endurancePresentation(90, 25), { energy: 90, endurance: 75, energyFill: .75, enduranceFill: .75, sprint: 0, sprintFill: 0, emergency: 0, emergencyFill: 0 });
});

test("endurance presentation clamps invalid world values", () => {
  assert.deepEqual(endurancePresentation(999, 140), { energy: 120, endurance: 0, energyFill: 1, enduranceFill: 0, sprint: 0, sprintFill: 0, emergency: 0, emergencyFill: 0 });
});

test("one exertion presentation combines endurance sprint and emergency reserves", () => {
  const state = endurancePresentation(80, 35, 120, 60, .4);
  assert.equal(state.endurance, 65); assert.equal(state.sprint, 60); assert.equal(state.emergency, .4);
});
