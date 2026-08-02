import test from "node:test";
import assert from "node:assert/strict";
import { mapOverviewFrame } from "../src/map-overview-camera.js";

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
