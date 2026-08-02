import test from "node:test";
import assert from "node:assert/strict";
import { cameraPresentationMetrics, cinemaPopulationPresentation, constrainCameraToTerrain, followTargetPreservingOrbit, populationPresentationForDistance, usesAggregateAnimalMarkers } from "../src/camera-ground.js";

test("camera and orbit target cannot pass through rendered ground", () => {
  const camera = { x: 4, y: -5, z: 2 }, target = { x: 1, y: -8, z: 1 };
  const result = constrainCameraToTerrain(camera, target, (x) => x, { cameraClearance: 2, targetClearance: .1 });
  assert.equal(camera.y, 6); assert.equal(target.y, 1.1); assert.equal(result.clearance, 2);
});

test("near-ground camera cannot trigger strategic or distant presentation", () => {
  const metrics = cameraPresentationMetrics({ x: 0, y: 3, z: 300 }, { x: 0, y: 0, z: 0 }, 2);
  assert.equal(metrics.strategic, false); assert.equal(metrics.presentationDistance, 8);
});

test("high wide camera remains eligible for strategic presentation", () => {
  const metrics = cameraPresentationMetrics({ x: 0, y: 180, z: 300 }, { x: 0, y: 0, z: 0 }, 0);
  assert.equal(metrics.strategic, true); assert.ok(metrics.presentationDistance > 175);
});

test("numbered overview markers replace individual animal meshes", () => {
  assert.equal(usesAggregateAnimalMarkers(110), false);
  assert.equal(usesAggregateAnimalMarkers(110.01), true);
  assert.equal(usesAggregateAnimalMarkers(180), true);
});

test("population presentation follows measured camera distance", () => {
  assert.equal(populationPresentationForDistance(110), "entity");
  assert.equal(populationPresentationForDistance(110.01), "group");
  assert.equal(populationPresentationForDistance(260), "group");
  assert.equal(populationPresentationForDistance(260.01), "region");
});

test("Cinema cannot override population distance rules with an authored scale", () => {
  assert.equal(cinemaPopulationPresentation("wide", 80), "entity");
  assert.equal(cinemaPopulationPresentation("close", 180), "group");
  assert.equal(cinemaPopulationPresentation("medium", 300), "region");
});

test("locked following preserves camera zoom and viewing offset", () => {
  const camera = { x: 20, y: 30, z: 20 }, target = { x: 0, y: 2, z: 0 };
  const before = { x: camera.x - target.x, y: camera.y - target.y, z: camera.z - target.z };
  followTargetPreservingOrbit(camera, target, { x: 10, y: 4, z: -5 }, .25);
  assert.deepEqual({ x: camera.x - target.x, y: camera.y - target.y, z: camera.z - target.z }, before);
});
