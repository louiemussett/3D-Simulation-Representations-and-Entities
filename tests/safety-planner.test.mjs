import test from "node:test";
import assert from "node:assert/strict";
import { safetyExecutionCompatible } from "../src/safety-planner.js";

test("flight and escape commitments require an escaping action", () => {
  assert.equal(safetyExecutionCompatible("flee-perceived-threat", "travel", "flight"), false);
  assert.equal(safetyExecutionCompatible("flee-perceived-threat", "flee", "flight"), true);
});

test("defence commitments accept defence or survival withdrawal but not exploration", () => {
  assert.equal(safetyExecutionCompatible("physical-defence", "defend", "defence"), true);
  assert.equal(safetyExecutionCompatible("physical-defence", "flee", "defence"), true);
  assert.equal(safetyExecutionCompatible("physical-defence", "wander", "defence"), false);
});
