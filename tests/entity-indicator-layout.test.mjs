import test from "node:test";
import assert from "node:assert/strict";
import { entityIndicatorLayout } from "../src/entity-indicator-layout.js";

test("overhead icons retain their proportions across entity sizes", () => {
  const dependent = entityIndicatorLayout(.25), adult = entityIndicatorLayout(1), large = entityIndicatorLayout(1.4);
  assert.ok(dependent.face.y < adult.face.y && adult.face.y < large.face.y);
  assert.equal(dependent.face.size, adult.face.size);
  assert.equal(adult.face.size, large.face.size);
  assert.equal(dependent.pregnancy.x, adult.pregnancy.x);
  assert.equal(dependent.courtship.stepY, adult.courtship.stepY);
});

test("larger icon windows also move temporary badges outward", () => {
  const standard = entityIndicatorLayout(1, 1), large = entityIndicatorLayout(1, 1.5);
  assert.ok(large.signal.size > standard.signal.size);
  assert.ok(large.signal.x > standard.signal.x);
  assert.ok(large.injury.x > standard.injury.x);
  assert.ok(large.courtship.stepY > standard.courtship.stepY);
});
