import test from "node:test";
import assert from "node:assert/strict";
import { cameraFaultRequiresRecovery, finiteMovieCameraPose, movieCameraWatchdogDecision } from "../src/movie-camera-watchdog.js";

const pose = { position: { x: 10, y: 12, z: 10 }, target: { x: 0, y: 1, z: 0 }, fov: 46 };

test("movie camera pose validation rejects non-finite inherited state", () => {
  assert.equal(finiteMovieCameraPose(pose), true);
  assert.equal(finiteMovieCameraPose({ ...pose, target: { ...pose.target, x: Number.NaN } }), false);
  assert.equal(movieCameraWatchdogDecision({ pose: { ...pose, position: { ...pose.position, y: Number.NaN } } }).action, "RECOVER");
});

test("movie camera watchdog distinguishes a transient obstruction from a sustained failure", () => {
  assert.equal(movieCameraWatchdogDecision({ pose, metrics: { valid: false, reason: "subject-occlusion" }, invalidSeconds: .4 }).action, "HOLD");
  assert.deepEqual(movieCameraWatchdogDecision({ pose, metrics: { valid: false, reason: "subject-occlusion" }, invalidSeconds: 1.2 }), { action: "RECOVER", reason: "subject-occlusion" });
  assert.deepEqual(movieCameraWatchdogDecision({ pose, renderEmptySeconds: 1.3 }), { action: "RECOVER", reason: "empty-render-output" });
});

test("all camera fault reports request physical recovery", () => {
  for (const code of ["CAMERA_BLANK_VIEW", "CAMERA_TOO_DISTANT", "CAMERA_LOOP", "SUBJECT_OUT_OF_FRAME", "CONTROL_FAILED"]) assert.equal(cameraFaultRequiresRecovery(code), true, code);
  assert.equal(cameraFaultRequiresRecovery("FACTUAL_ERROR"), false);
});
