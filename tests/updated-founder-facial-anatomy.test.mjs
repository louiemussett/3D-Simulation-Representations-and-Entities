import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { SPECIES_VISUAL_DESIGNS } from "../src/species-registry.js";

const appSource = await readFile(new URL("../src/app.js", import.meta.url), "utf8");

test("updated founders request real pinnae while original founder recipes remain frozen", () => {
  assert.ok(SPECIES_VISUAL_DESIGNS["valley-grazer-updated"].features.some(feature => feature.kind === "large-ears"));
  assert.ok(SPECIES_VISUAL_DESIGNS["ridge-hunter-updated"].features.some(feature => feature.kind === "pointed-ears"));
  assert.equal(SPECIES_VISUAL_DESIGNS.grazer, null);
  assert.equal(SPECIES_VISUAL_DESIGNS.hunter, null);
  assert.match(appSource, /geos\.animalEar = new THREE\.ExtrudeGeometry/);
  assert.match(appSource, /geos\.animalEar\.center\(\)/);
  assert.match(appSource, /geos\.deerEar = createCuppedLeafEarGeometry\(\)/);
  assert.match(appSource, /geos\.deerEarInner = createCuppedLeafInnerGeometry\(\)/);
  assert.match(appSource, /surfaceVertexCount = \(rows \+ 1\) \* rowStride/);
  assert.match(appSource, /const earPosition = deerFace \? \[side \* \.125, \.115, -\.005\]/);
  assert.match(appSource, /rootPad\.userData\.isEarRoot = true/);
  assert.match(appSource, /geos\.deerAntlerSegment = new THREE\.CylinderGeometry/);
  assert.match(appSource, /geos\.deerAntlerPedicle = new THREE\.CylinderGeometry/);
  assert.match(appSource, /animal\?\.speciesId === "valley-grazer-updated"/);
  assert.match(appSource, /antlerRoot\.userData\.antlerSide = side/);
  assert.match(appSource, /mesh\.userData\.isDeerAntlerSegment = true/);
  assert.match(appSource, /joint\.userData\.isDeerAntlerJoint = true/);
  assert.match(appSource, /pedicle\.userData\.isDeerAntlerPedicle = true/);
  assert.match(appSource, /const updatedStag = a\.speciesId === "valley-grazer-updated"/);
  assert.match(appSource, /animal\.sex !== "M" \|\| \["dependent", "juvenile"\]\.includes\(animal\.lifeStage\)/);
  assert.match(appSource, /-side \* \.62/);
  assert.match(appSource, /if \(deerFace\) earMaterial\.side = THREE\.DoubleSide/);
  assert.match(appSource, /updateVisibleEarDynamics/);
  assert.match(appSource, /inner\.userData\.isInnerEar = true/);
});

test("non-original animal eyes use dynamic spherical iris pupil and glint shading", () => {
  assert.match(appSource, /createCartoonEyeballMaterial/);
  assert.match(appSource, /deerFace \? mats\.deerCartoonEye : wolfFace \? mats\.wolfCartoonEye : cartoonEyeMaterialFor\(a\.speciesId\)/);
  assert.match(appSource, /new THREE\.Mesh\(geos\.eye, eyeMaterial\)/);
  assert.match(appSource, /vEyeSurface=normalize\(position\)/);
  assert.match(appSource, /pupilDistance/);
  assert.match(appSource, /readableEyeYaw = constrainedVisualEyeYaw\(side, requestedEyeYaw\)/);
  assert.match(appSource, /eye\.userData\.dynamicCartoonEye = true/);
  assert.match(appSource, /uniforms\.irisScale\.value/);
  assert.match(appSource, /uniforms\.pupilScale\.value/);
  assert.match(appSource, /if \(a\.speciesId === "grazer"\)[\s\S]*?new THREE\.Mesh\(geos\.eye, mats\.eye\)/);
  assert.match(appSource, /else if \(a\.speciesId === "hunter"\)[\s\S]*?new THREE\.Mesh\(geos\.eye, mats\.eye\)/);
});
