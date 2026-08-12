import test from "node:test";
import assert from "node:assert/strict";
import { SPECIES_IDS } from "../src/species-registry.js";
import { BIOLOGICAL_PHENOTYPES, digestiveEfficiency, directVisionRangeMultiplier, foodWaterEfficiency, phenotypeSummary, thermalPerformance, validateBiologicalPhenotypes } from "../src/biological-phenotypes.js";

test("every catalogue species has a valid authoritative biological phenotype", () => {
  assert.equal(Object.keys(BIOLOGICAL_PHENOTYPES).length, SPECIES_IDS.length);
  assert.deepEqual(validateBiologicalPhenotypes(SPECIES_IDS), []);
});

test("original species retain their defining sensory and digestive biology", () => {
  assert.ok(BIOLOGICAL_PHENOTYPES.grazer.senses.visualField > BIOLOGICAL_PHENOTYPES.hunter.senses.visualField);
  assert.ok(BIOLOGICAL_PHENOTYPES.hunter.senses.binocularOverlap > BIOLOGICAL_PHENOTYPES.grazer.senses.binocularOverlap);
  assert.ok(digestiveEfficiency("grazer", "grass") > digestiveEfficiency("great-omnivore", "grass"));
  assert.ok(digestiveEfficiency("hunter", "meat") > 1);
});

test("special sensory experiences remain bounded and ecologically distinct", () => {
  assert.ok(BIOLOGICAL_PHENOTYPES["sunscale-ambusher"].senses.infrared > 1);
  assert.ok(BIOLOGICAL_PHENOTYPES["shieldback-colony"].morphology.armour > .7);
  assert.ok(BIOLOGICAL_PHENOTYPES["brush-nibbler"].senses.ultraviolet > 0);
  assert.ok(directVisionRangeMultiplier("shieldback-colony") < directVisionRangeMultiplier("highland-prowler"));
});

test("temperature and food water traits produce functional differences", () => {
  assert.ok(thermalPerformance("sunscale-ambusher", .2) < thermalPerformance("sunscale-ambusher", .65));
  assert.equal(thermalPerformance("grazer", .2), 1);
  assert.ok(foodWaterEfficiency("dryland-runner", "grass") > foodWaterEfficiency("waterline-grazer", "grass"));
  assert.ok(phenotypeSummary("carrion-runner").some(line => line.includes("surface eggs")));
});
