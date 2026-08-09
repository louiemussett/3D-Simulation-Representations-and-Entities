import test from "node:test";
import assert from "node:assert/strict";
import { animalEyePosition, attachedAnimalEyePosition, ellipsoidSurfaceValue } from "../src/animal-face-geometry.js";
import { SPECIES_IDS, canHunt, speciesProfile } from "../src/species-registry.js";

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

test("all 20 added species attach both eyes to their actual head surface", () => {
  const addedSpecies = SPECIES_IDS.filter(id => !["grazer", "hunter"].includes(id));
  assert.equal(addedSpecies.length, 20);
  for (const speciesId of addedSpecies) {
    const profile = speciesProfile(speciesId), small = ["tiny", "small"].includes(profile.sizeClass), large = profile.sizeClass === "large";
    const tapered = canHunt(speciesId);
    const headScale = {
      x: small ? .3 : large ? .46 : .38,
      y: tapered ? .46 : small ? .3 : .36,
      z: tapered ? .44 : small ? .32 : .39
    };
    const positions = [-1, 1].map(side => attachedAnimalEyePosition({ side, headScale, headKind: tapered ? "tapered" : "rounded" }));
    assert.equal(positions[0].x, -positions[1].x, `${speciesId} eyes must remain symmetric`);
    for (const position of positions) {
      if (!tapered) {
        const radii = { x: .42 * headScale.x, y: .42 * headScale.y, z: .42 * headScale.z };
        assert.ok(Math.abs(ellipsoidSurfaceValue(position, radii) - 1) < 1e-9, `${speciesId} eye must touch its rounded head`);
      } else {
        const halfLength = headScale.y * .5;
        assert.ok(position.z > 0 && position.z < halfLength, `${speciesId} eye must stay behind the muzzle tip`);
        const crossSection = (halfLength - position.z) / (halfLength * 2);
        const radiusX = .46 * headScale.x * crossSection, radiusY = .46 * headScale.z * crossSection;
        const surface = (position.x / radiusX) ** 2 + (position.y / radiusY) ** 2;
        assert.ok(Math.abs(surface - 1) < 1e-9, `${speciesId} eye must touch its tapered head`);
      }
    }
  }
});

test("the original Valley Grazer and Ridge Hunter placements remain unchanged", () => {
  assert.deepEqual(animalEyePosition("grazer", 1), { x: .105, y: .055, z: .145 });
  assert.deepEqual(animalEyePosition("hunter", 1), { x: .08, y: .07, z: .08 });
});
