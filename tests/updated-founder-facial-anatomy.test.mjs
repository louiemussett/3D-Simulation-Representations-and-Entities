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
  assert.match(appSource, /inner\.userData\.isInnerEar = true/);
});

test("non-original animal eyes use dynamic spherical iris pupil and glint shading", () => {
  assert.match(appSource, /createCartoonEyeballMaterial/);
  assert.match(appSource, /deerFace \? mats\.deerCartoonEye : wolfFace \? mats\.wolfCartoonEye : mats\.genericCartoonEye/);
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
