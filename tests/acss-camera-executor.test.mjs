import test from "node:test";
import assert from "node:assert/strict";
import { ConvergentCameraExecutor } from "../src/documentary-author-v3/index.js";

test("ACSS camera converges toward absolute targets without additive drift", () => {
  const camera = new ConvergentCameraExecutor({ maximumSpeed: 8, maximumAcceleration: 12, maximumJerk: 30 }); camera.reset({ position: { x: 0, y: 4, z: 0 }, target: { x: 0, y: 0, z: 0 }, fov: 45 }); const desired = { position: { x: 10, y: 6, z: 2 }, target: { x: 4, y: 1, z: 0 }, fov: 50 }; let previous = camera.state.position.x;
  for (let index = 0; index < 600; index++) { const pose = camera.update(desired, 1 / 60); assert.ok(pose.position.x >= previous - 1e-9); assert.ok(pose.position.x <= 10 + 1e-9); previous = pose.position.x; }
  assert.ok(Math.abs(camera.state.position.x - 10) < .05); assert.ok(Math.abs(camera.state.target.x - 4) < .05);
});

test("ACSS camera bounds acceleration and jerk", () => {
  const camera = new ConvergentCameraExecutor({ maximumSpeed: 5, maximumAcceleration: 4, maximumJerk: 10 }); camera.reset({ position: { x: 0, y: 0, z: 0 }, target: { x: 0, y: 0, z: 0 }, fov: 45 }); let previousAcceleration = 0;
  for (let index = 0; index < 30; index++) { const pose = camera.update({ position: { x: 100, y: 0, z: 0 }, target: { x: 0, y: 0, z: 0 }, fov: 45 }, .05); assert.ok(Math.abs(pose.acceleration.x) <= 4 + 1e-9); assert.ok(Math.abs(pose.acceleration.x - previousAcceleration) <= .5 + 1e-9); previousAcceleration = pose.acceleration.x; }
});
