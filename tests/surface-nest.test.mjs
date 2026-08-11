import test from "node:test";
import assert from "node:assert/strict";
import { advanceSurfaceNestCare, surfaceNestHatchCount } from "../src/surface-nest.js";

const nest = (careMode) => ({ status: "incubating", careMode, count: 10, viability: 1, unattendedDays: 0 });

test("obligate nests fail only after seven unattended days", () => {
  const six = advanceSurfaceNestCare(nest("obligate"), 6, []);
  assert.equal(six.status, "incubating");
  const seven = advanceSurfaceNestCare(six, 1, []);
  assert.equal(seven.status, "failed");
  assert.equal(surfaceNestHatchCount(seven), 0);
});

test("attended and communal nests lose viability but do not automatically fail", () => {
  for (const careMode of ["attended", "brooded", "communal"]) {
    const unattended = advanceSurfaceNestCare(nest(careMode), 20, []);
    assert.equal(unattended.status, "incubating");
    assert.equal(unattended.viability, .8);
    assert.equal(surfaceNestHatchCount(unattended), 8);
    const recovered = advanceSurfaceNestCare(unattended, 1, ["caregiver"]);
    assert.equal(recovered.unattendedDays, 0);
    assert.deepEqual(recovered.guardedBy, ["caregiver"]);
  }
});

test("unattended tortoise nests incubate without inventing parental care", () => {
  const unattended = advanceSurfaceNestCare(nest("unattended"), 30, []);
  assert.equal(unattended.status, "incubating");
  assert.equal(unattended.viability, 1);
  assert.equal(surfaceNestHatchCount(unattended), 10);
});
