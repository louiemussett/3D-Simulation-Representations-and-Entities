import test from "node:test";
import assert from "node:assert/strict";
import { environmentalMotionClutter, motionAgainstClutter } from "../src/visual-clutter.js";

test("wind and rain create bounded environmental motion clutter", () => {
  const still = environmentalMotionClutter({ wind: 0, rain: 0, grass: 1, canopy: 1 });
  const storm = environmentalMotionClutter({ wind: 1, rain: 1, grass: 1, canopy: 1 });
  assert.equal(still.intensity, 0);
  assert.ok(storm.intensity > .7 && storm.intensity <= 1);
});

test("the same target motion becomes less certain against moving vegetation", () => {
  const clear = motionAgainstClutter(.45, { intensity: 0, targetContrast: .8 });
  const moving = motionAgainstClutter(.45, { intensity: .9, targetContrast: .8 });
  assert.ok(clear.confidenceMultiplier > moving.confidenceMultiplier);
  assert.match(moving.uncertainBecause, /vegetation|precipitation/);
});
