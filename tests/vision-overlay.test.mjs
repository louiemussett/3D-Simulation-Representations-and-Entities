import test from "node:test";
import assert from "node:assert/strict";
import { buildGroundVisionSector } from "../src/vision-overlay.js";

test("vision sector vertices conform to the supplied terrain", () => {
  const viewer = { speciesId: "hunter", x: 0, z: 0, orientation: 0, stationaryTicks: 0 };
  const sector = buildGroundVisionSector(viewer, 6, (x, z) => x * 0.5 + z * 0.25, { angularSegments: 6, radialSegments: 3, lift: 0.05, isVisible: () => true });
  assert.ok(sector.positions.length > 0);
  for (let index = 0; index < sector.positions.length; index += 3) {
    const x = sector.positions[index], y = sector.positions[index + 1], z = sector.positions[index + 2];
    assert.ok(Math.abs(y - (x * 0.5 + z * 0.25 + 0.05)) < 1e-5);
  }
});

test("occluded samples are omitted from the diagnostic mesh", () => {
  const viewer = { speciesId: "hunter", x: 0, z: 0, orientation: 0, stationaryTicks: 0 };
  const full = buildGroundVisionSector(viewer, 6, () => 0, { angularSegments: 6, radialSegments: 3, isVisible: () => true });
  const clipped = buildGroundVisionSector(viewer, 6, () => 0, { angularSegments: 6, radialSegments: 3, isVisible: (x) => x < 3 });
  assert.ok(clipped.positions.length < full.positions.length);
});

test("ground sector follows authoritative head direction", () => {
  const viewer = { speciesId: "hunter", x: 0, z: 0, orientation: 0, headYaw: Math.PI / 2, sensoryFocusTicks: 0 };
  const sector = buildGroundVisionSector(viewer, 4, () => 0, { angularSegments: 8, radialSegments: 2, isVisible: () => true });
  let meanX = 0, meanZ = 0;
  for (let index = 0; index < sector.positions.length; index += 3) { meanX += sector.positions[index]; meanZ += sector.positions[index + 2]; }
  assert.ok(meanZ > Math.abs(meanX));
});
