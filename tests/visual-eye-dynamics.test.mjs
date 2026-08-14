import test from "node:test";
import assert from "node:assert/strict";
import { visibleEyeGazeOffset, visibleIrisScale, visiblePupilScale } from "../src/visual-eye-dynamics.js";

test("visible gaze remains inside its bounded eye surface", () => {
  const animal = { x: 0, z: 0, orientation: 0, headYaw: 0 };
  const gaze = visibleEyeGazeOffset(animal, { x: -100, z: 0 });
  assert.ok(gaze.x >= -.14 && gaze.x <= .14);
  assert.ok(gaze.y >= -.07 && gaze.y <= .07);
});

test("pupils dilate in darkness and arousal without exceeding visual bounds", () => {
  const daylight = visiblePupilScale({ illumination: 1, arousal: 0 });
  const darkness = visiblePupilScale({ illumination: 0, arousal: 0 });
  const alarm = visiblePupilScale({ illumination: 0, arousal: 1 });
  assert.ok(darkness > daylight);
  assert.ok(alarm >= darkness);
  assert.ok(alarm <= 1.52);
});

test("cartoon iris emphasis is stronger in darkness and alarm but remains bounded", () => {
  const daylight = visibleIrisScale({ illumination: 1, arousal: 0 });
  const alarm = visibleIrisScale({ illumination: 0, arousal: 1 });
  assert.ok(alarm > daylight);
  assert.ok(daylight >= .84);
  assert.ok(alarm <= 1.24);
});
