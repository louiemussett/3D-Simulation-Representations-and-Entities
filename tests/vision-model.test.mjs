import test from "node:test";
import assert from "node:assert/strict";
import { evaluateVision, visionFov, withinVisionCone } from "../src/vision-model.js";

test("a moving predator sees prey in its forward cone", () => {
  const hunter = { speciesId: "hunter", x: 0, z: 0, orientation: 0, stationaryTicks: 0 };
  assert.equal(withinVisionCone(hunter, { x: 8, z: 0 }, 12), true);
  assert.equal(withinVisionCone(hunter, { x: -8, z: 0 }, 12), false);
});

test("stopped listening and sustained scanning widen predator sight", () => {
  assert.ok(visionFov("hunter", 1) > visionFov("hunter", 0));
  assert.ok(visionFov("hunter", 3) > visionFov("hunter", 1));
  const scanning = { speciesId: "hunter", x: 0, z: 0, orientation: 0, stationaryTicks: 3 };
  assert.equal(withinVisionCone(scanning, { x: 0, z: 8 }, 12), true);
});

test("vision range remains an absolute boundary", () => {
  assert.equal(withinVisionCone({ speciesId: "hunter", x: 0, z: 0, orientation: 0, stationaryTicks: 3 }, { x: 13, z: 0 }, 12), false);
});

test("a visible neighbour remains visible without a random attention roll", () => {
  const viewer = { speciesId: "hunter", x: 0, z: 0, orientation: 0, stationaryTicks: 0 };
  const options = { range: 12, surfaceHeight: () => 0, coverOpacity: () => 0 };
  const first = evaluateVision(viewer, { x: 2, z: 0 }, options);
  const second = evaluateVision(viewer, { x: 2, z: 0 }, options);
  assert.equal(first.visible, true);
  assert.deepEqual(second, first);
});

test("intervening terrain blocks the eye ray", () => {
  const viewer = { speciesId: "hunter", x: 0, z: 0, orientation: 0, stationaryTicks: 0 };
  const result = evaluateVision(viewer, { x: 6, z: 0 }, { range: 12, surfaceHeight: (x) => x > 2.5 && x < 3.5 ? 3 : 0 });
  assert.equal(result.visible, false);
  assert.equal(result.reason, "terrain");
});

test("cover lowers confidence and opaque cover blocks without flicker", () => {
  const viewer = { speciesId: "grazer", x: 0, z: 0, orientation: 0, stationaryTicks: 0 };
  const clear = evaluateVision(viewer, { x: 6, z: 0 }, { range: 12, surfaceHeight: () => 0, coverOpacity: () => 0 });
  const partial = evaluateVision(viewer, { x: 6, z: 0 }, { range: 12, surfaceHeight: () => 0, coverOpacity: (x) => x > 2 && x < 2.8 ? 0.2 : 0 });
  const blocked = evaluateVision(viewer, { x: 6, z: 0 }, { range: 12, surfaceHeight: () => 0, coverOpacity: (x) => x > 2 && x < 2.8 ? 0.9 : 0 });
  assert.ok(partial.confidence < clear.confidence);
  assert.equal(blocked.visible, false);
  assert.equal(blocked.reason, "cover");
});

test("grazer and hunter have different eye-field shapes", () => {
  assert.ok(visionFov("grazer", 0) > visionFov("hunter", 0));
});

test("head rotation steers sight without itself widening the field", () => {
  const viewer = { speciesId: "hunter", x: 0, z: 0, orientation: 0, headYaw: Math.PI / 2, stationaryTicks: 8, sensoryFocusTicks: 0 };
  assert.equal(withinVisionCone(viewer, { x: 0, z: 5 }, 8), true);
  assert.equal(withinVisionCone(viewer, { x: 5, z: 0 }, 8), false);
  assert.equal(visionFov(viewer.speciesId, viewer.sensoryFocusTicks), visionFov("hunter", 0));
});
