import test from "node:test";
import assert from "node:assert/strict";
import { fanSurfaceHeight, stableGroundSupport } from "../src/terrain-surface.js";

const surface = {
  centre: { x: 0, y: 2, z: 0 },
  corners: [
    { x: 1, y: 4, z: 0 }, { x: .5, y: 4, z: 1 }, { x: -.5, y: 2, z: 1 },
    { x: -1, y: 2, z: 0 }, { x: -.5, y: 2, z: -1 }, { x: .5, y: 4, z: -1 },
  ],
};

test("entity ground height matches the rendered triangle fan", () => {
  assert.equal(fanSurfaceHeight(surface, 0, 0), 2);
  assert.equal(fanSurfaceHeight(surface, .5, 0), 3);
  assert.equal(fanSurfaceHeight(surface, 1, 0), 4);
});

test("surface lookup safely falls back to the centre", () => {
  assert.equal(fanSurfaceHeight(surface, 4, 4), 2);
});

test("rough terrain pose is bounded and supported above the footprint", () => {
  const support = stableGroundSupport(0, 0, 0, (x, z) => x > 0.2 ? 8 : z > 0.2 ? -5 : 0, { footprint: 0.4, maxTilt: Math.PI / 8 });
  assert.ok(Math.abs(support.pitch) <= Math.PI / 8);
  assert.ok(Math.abs(support.roll) <= Math.PI / 8);
  assert.ok(support.height >= 0);
  assert.ok(support.height < 1);
});

test("a full animal footprint is lifted above an uphill head sample", () => {
  const hill = (x) => x <= 0 ? 0 : x * 1.5;
  const torsoOnly = stableGroundSupport(0, 0, 0, hill, { footprint: .38, maxTilt: Math.PI / 8, maxLift: .36 });
  const fullAnimal = stableGroundSupport(0, 0, 0, hill, { footprint: 1.08, maxTilt: Math.PI / 8, maxLift: 1.43 });
  assert.ok(fullAnimal.height > torsoOnly.height, "forward head clearance raises the complete animal on an uphill face");
  assert.ok(fullAnimal.height >= hill(1.08) - Math.sin(Math.PI / 8) * 1.08 - .001);
});

test("diagonal hill terrain cannot submerge an animal between cardinal samples", () => {
  const diagonalCrest = (x, z) => x > .45 && z > .45 ? 1.25 : 0;
  const support = stableGroundSupport(0, 0, 0, diagonalCrest, { footprint: 1, maxTilt: Math.PI / 8, maxLift: 1.4 });
  assert.ok(support.height > .8, "radial support detects the raised diagonal terrain triangle");
});
