import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { SPECIES_IDS } from "../src/species-registry.js";
import { ANATOMY_PROFILE_ERRORS } from "../src/anatomy/anatomy-profile-validation.js";
import { SENSOR_ANATOMY_PROFILES } from "../src/anatomy/sensor-anatomy-registry.js";
import { CARTOON_VISUAL_ANATOMY, VISUAL_ANATOMY_SPECIES_IDS } from "../src/anatomy/visual-anatomy-registry.js";
import { anatomyLaboratoryRecord } from "../src/anatomy/anatomy-laboratory.js";

const founders = new Set(["grazer", "hunter", "valley-grazer-updated", "ridge-hunter-updated"]);
const expected = SPECIES_IDS.filter(id => !founders.has(id));
const appSource = await readFile(new URL("../src/app.js", import.meta.url), "utf8");

test("all twenty-four non-founder species have explicit visual and sensor anatomy", () => {
  assert.equal(expected.length, 24);
  assert.deepEqual([...VISUAL_ANATOMY_SPECIES_IDS].sort(), [...expected].sort());
  assert.deepEqual(Object.keys(SENSOR_ANATOMY_PROFILES).sort(), [...expected].sort());
  assert.deepEqual(ANATOMY_PROFILE_ERRORS, []);
});

test("cartoon eyes remain round while iris and pupil anatomy remains species-specific", () => {
  const signatures = new Set();
  for (const speciesId of expected) {
    const eye = CARTOON_VISUAL_ANATOMY[speciesId].eye;
    assert.equal(eye.shape, "round", speciesId);
    assert.ok(eye.iris.radius * eye.iris.dynamicScaleMaximum < .7, `${speciesId} iris remains within readable eye boundary`);
    assert.ok(eye.gaze.inwardLimit <= eye.gaze.outwardLimit, `${speciesId} cannot look through its head`);
    signatures.add(`${eye.iris.colour}:${eye.iris.radius}:${eye.pupil.shape}:${eye.pupil.width}:${eye.pupil.height}:${eye.eyeScale}`);
  }
  assert.ok(signatures.size >= 18, "profiles must not collapse back to one generic eye");
});

test("birds and reptiles never receive mammalian external pinnae", () => {
  for (const speciesId of ["carrion-runner", "cold-country-scavenger", "common-ostrich", "waterline-ambusher", "sunscale-ambusher", "shieldback-colony"]) {
    const ears = SENSOR_ANATOMY_PROFILES[speciesId].sensors.filter(sensor => sensor.type === "audition");
    assert.ok(ears.every(sensor => sensor.receptorType !== "external-pinna" && sensor.visibleGeometryRequired === false), speciesId);
  }
});

test("runtime consumes per-species eye profiles and gives rounded and fan ears pivots", () => {
  assert.match(appSource, /cartoonEyeMaterialFor\(a\.speciesId\)/);
  assert.match(appSource, /anatomyEye\?\.eyeScale/);
  assert.match(appSource, /eye\.userData\.eyeSide < 0 \? clamp\(rawGaze\.x, -outward, inward\)/);
  assert.match(appSource, /pivot\.userData\.visualEarType = earProfile\?\.visualType/);
  assert.match(appSource, /pivot\.userData\.visualEarType = "fan"/);
});

test("founder visuals are excluded from the new anatomy registries", () => {
  for (const speciesId of founders) {
    assert.equal(CARTOON_VISUAL_ANATOMY[speciesId], undefined);
    assert.equal(SENSOR_ANATOMY_PROFILES[speciesId], undefined);
  }
});

test("Laboratory record keeps scientific anchors separate from cartoon presentation", () => {
  const record = anatomyLaboratoryRecord({ id: "rabbit-1", speciesId: "meadow-nibbler" });
  assert.equal(record.animalId, "rabbit-1");
  assert.equal(record.scientificSensors.length, 5);
  assert.equal(record.cartoonPresentation.ear.visualType, "long-lanceolate");
  assert.match(record.separationNotice, /authoritative perception/);
});
