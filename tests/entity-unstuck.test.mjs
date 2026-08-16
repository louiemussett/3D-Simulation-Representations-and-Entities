import test from "node:test";
import assert from "node:assert/strict";
import { nearestSafeUnstuckDestination } from "../src/entity-unstuck.js";

test("unstuck recovery chooses the nearest supported unoccupied destination", () => {
  const entity = { id: "VG1", x: 0, z: 0 };
  const destination = nearestSafeUnstuckDestination(entity, [
    { id: 1, x: .1, z: 0 },
    { id: 2, x: 1, z: 0 },
    { id: 3, x: 2, z: 0 },
    { id: 4, x: 3, z: 0 }
  ], {
    minimumMove: .75,
    bodyRadius: .3,
    supportsBody: (x) => x !== 1,
    occupied: [{ id: "VG2", alive: true, x: 2, z: 0, bodyRadius: .3 }]
  });
  assert.deepEqual(destination, { id: 4, x: 3, z: 0, distance: 3 });
});

test("unstuck recovery refuses unsupported or occupied-only choices", () => {
  const entity = { id: "VG1", x: 0, z: 0 };
  assert.equal(nearestSafeUnstuckDestination(entity, [{ id: 1, x: 1, z: 0 }], { supportsBody: () => false }), null);
  assert.equal(nearestSafeUnstuckDestination(entity, [{ id: 1, x: 1, z: 0 }], { bodyRadius: .3, occupied: [{ id: "VG2", x: 1, z: 0, bodyRadius: .3 }] }), null);
});
