import test from "node:test";
import assert from "node:assert/strict";
import { mapOverviewFrame, observerCameraEnvelope, terrainBounds } from "../src/map-overview-camera.js";

test("map overview centres and frames the complete world", () => {
  const frame = mapOverviewFrame([
    { x: -90, z: -60, elevation: -2 },
    { x: 110, z: 80, elevation: 18 }
  ]);
  assert.deepEqual(frame.target, { x: 10, y: 8, z: 10 });
  assert.ok(frame.distance > 200);
  assert.ok(frame.position.y > frame.position.x);
});

test("map overview has a safe fallback for an empty world", () => {
  const frame = mapOverviewFrame([]);
  assert.deepEqual(frame.target, { x: 0, y: 0, z: 0 });
  assert.ok(Number.isFinite(frame.distance));
});

test("overview framing remains finite and aspect-aware at large map scales", () => {
  for (const size of [90, 300, 1500]) {
    const world = [{ x: -size, z: -size, elevation: -8 }, { x: size, z: size, elevation: 90 }];
    const landscape = mapOverviewFrame(world, { aspect: 16 / 9 });
    const portrait = mapOverviewFrame(world, { aspect: 9 / 16 });
    assert.ok(Number.isFinite(landscape.distance));
    assert.ok(portrait.distance > landscape.distance);
  }
});

test("observer zoom levels scale the map-relative orbit ceiling", () => {
  const bounds = terrainBounds([{ x: -750, z: -500 }, { x: 750, z: 500, elevation: 120 }]);
  const mapSized = observerCameraEnvelope(bounds, { zoomLevel: "map-sized" });
  const far = observerCameraEnvelope(bounds, { zoomLevel: "far" });
  const veryFar = observerCameraEnvelope(bounds, { zoomLevel: "very-far" });
  const extreme = observerCameraEnvelope(bounds, { zoomLevel: "extreme" });
  assert.deepEqual([far.zoomLimitDistance / mapSized.zoomLimitDistance, veryFar.zoomLimitDistance / mapSized.zoomLimitDistance, extreme.zoomLimitDistance / mapSized.zoomLimitDistance], [1.5, 2.5, 4]);
});

test("camera clipping and haze always finish beyond the terrain", () => {
  const bounds = terrainBounds([{ x: -1500, z: -1000, elevation: -20 }, { x: 1500, z: 1000, elevation: 180 }]);
  const natural = observerCameraEnvelope(bounds, { cameraPosition: { x: 3100, y: 2400, z: 2900 }, zoomLevel: "extreme", hazeMode: "natural" });
  assert.ok(natural.cameraFarPlane > natural.farthestTerrainDistance);
  assert.ok(natural.fogFar > natural.farthestTerrainDistance);
  assert.equal(observerCameraEnvelope(bounds, { hazeMode: "off" }).fogFar, null);
});
