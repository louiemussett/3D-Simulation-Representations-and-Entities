import test from "node:test";
import assert from "node:assert/strict";
import { visualHeadYawRadians, visualSensorYawRadians } from "../src/sensor-anatomy.js";

test("Three.js presentation yaw is the inverse of authoritative sensory yaw", () => {
  assert.equal(visualHeadYawRadians({ headYaw: .42 }), -.42);
  assert.equal(visualSensorYawRadians({ yawDegrees: 60 }), -Math.PI / 3);
  assert.equal(visualSensorYawRadians({ yawDegrees: -60 }), Math.PI / 3);
});

test("neutral head and sensor orientation remain neutral", () => {
  assert.equal(visualHeadYawRadians({}), 0);
  assert.equal(visualSensorYawRadians({}), 0);
});
