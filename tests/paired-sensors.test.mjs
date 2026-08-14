import test from "node:test";
import assert from "node:assert/strict";
import { FOUNDER_SENSOR_ANCHORS, sensorDefinitions } from "../src/sensor-anatomy.js";
import { evaluateVision } from "../src/vision-model.js";
import { binauralEstimate } from "../src/auditory-localisation.js";
import { updateOrienting } from "../src/orienting-system.js";
import { currentPerceptionDeterministicHash } from "../src/perception-baselines.js";

test("current paired-sensor output has a deterministic baseline", () => assert.equal(currentPerceptionDeterministicHash(), "b5545cd0"));

test("founders receive invisible paired sensor anchors without visual geometry", () => {
  for (const speciesId of ["grazer", "hunter"]) {
    assert.equal(FOUNDER_SENSOR_ANCHORS[speciesId].visibleGeometryRequired, false);
    const sensors = sensorDefinitions({ speciesId });
    assert.deepEqual(sensors.filter(sensor => sensor.type === "eye").map(sensor => sensor.id), ["left-eye", "right-eye"]);
    assert.deepEqual(sensors.filter(sensor => sensor.id.endsWith("-ear")).map(sensor => sensor.id), ["left-ear", "right-ear"]);
    assert.ok(sensors.every(sensor => sensor.visibleGeometryRequired === false));
  }
});

test("each eye traces its own line of sight and integrates monocular detection", () => {
  const viewer = { speciesId: "hunter", x: 0, z: 0, orientation: 0 };
  const result = evaluateVision(viewer, { x: 6, z: 0 }, { range: 12, surfaceHeight: () => 0, coverOpacity: (x, z) => x > 1 && x < 5 && z > .01 ? .9 : 0 });
  assert.equal(result.visible, true); assert.equal(result.monocular, true); assert.equal(result.binocular, false);
  assert.deepEqual(result.detectedBy, ["left-eye"]);
  assert.equal(result.eyeObservations.find(item => item.sensorId === "right-eye").reason, "cover");
});

test("paired ears expose deterministic level and timing differences", () => {
  const estimate = binauralEstimate({ id: "RH1", speciesId: "hunter", orientation: 0 }, 0, [50, 52, 54]);
  assert.equal(estimate.available, true); assert.ok(estimate.interauralLevelDifferenceDb > 0); assert.ok(estimate.interauralTimeDifferenceSeconds > 0); assert.ok(estimate.rightLevelDb > estimate.leftLevelDb);
});

test("ear definitions expose retained orientation independently for each side", () => {
  const ears = sensorDefinitions({ speciesId: "hunter", orientingState: { leftEarYaw: .4, rightEarYaw: .2 } }).filter(sensor => sensor.id.endsWith("-ear"));
  assert.deepEqual(ears.map(ear => ear.currentYawRadians), [.4, .2]);
});

test("orienting moves ears and head before a stationary body follows a sustained cue", () => {
  const animal = { id: "VG1", speciesId: "grazer", orientation: 0, headYaw: 0, actionState: { key: "listen" }, locomotion: { vx: 0, vz: 0 } }, cue = { targetId: "RH1", channel: "sight", bearing: Math.PI / 2, confidence: .9 };
  updateOrienting(animal, [cue], 1); const firstBody = animal.orientation;
  assert.equal(firstBody, 0); assert.ok(animal.headYaw > 0); assert.ok(animal.orientingState.leftEarYaw > 0);
  updateOrienting(animal, [cue], 2); assert.ok(animal.orientation > firstBody); assert.equal(animal.orientingState.sustainedTicks, 2);
});

test("moving animals do not body-switch toward transient sensory cues", () => {
  const animal = { id: "VG1", speciesId: "grazer", orientation: 0, headYaw: 0, actionState: { key: "listen" }, locomotion: { vx: .2, vz: 0 } }, cue = { targetId: "RH1", channel: "sight", bearing: Math.PI, confidence: .9 };
  updateOrienting(animal, [cue], 1); updateOrienting(animal, [cue], 2);
  assert.equal(animal.orientation, 0); assert.ok(Math.abs(animal.headYaw) > 0);
});
