import test from "node:test";
import assert from "node:assert/strict";
import { animalEyePosition, ellipsoidSurfaceValue } from "../src/animal-face-geometry.js";

test("grazer eyeball centres sit on the head surface instead of floating ahead", () => {
  const headRadii = { x: .42 * .43, y: .42 * .4, z: .42 * .45 };
  for (const side of [-1, 1]) {
    const position = animalEyePosition("grazer", side);
    const surface = ellipsoidSurfaceValue(position, headRadii);
    assert.ok(surface >= .9 && surface <= 1.12, `eye surface value ${surface}`);
    assert.ok(position.z < headRadii.z);
  }
});

test("eye placement scales with its head and remains symmetric", () => {
  const left = animalEyePosition("hunter", -1, 2), right = animalEyePosition("hunter", 1, 2);
  assert.equal(left.x, -right.x);
  assert.equal(left.y, right.y);
  assert.equal(left.z, right.z);
  assert.deepEqual(right, { x: .16, y: .14, z: .16 });
});
