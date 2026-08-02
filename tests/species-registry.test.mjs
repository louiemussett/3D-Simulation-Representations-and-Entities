import test from "node:test";
import assert from "node:assert/strict";
import {
  ECOLOGY_PRESETS, SPECIES, SPECIES_IDS, ecologyWarnings, enabledSpeciesCounts,
  isSustainableForage, plantPreference, preyCompatible, speciesCategoryTotals
} from "../src/species-registry.js";

test("the ecology registry contains the original pair and all 22 species", () => {
  assert.equal(SPECIES_IDS.length, 22);
  assert.equal(SPECIES.grazer.label, "Valley Grazer");
  assert.equal(SPECIES.hunter.label, "Ridge Hunter");
  assert.equal(ECOLOGY_PRESETS.original.length, 2);
  assert.equal(ECOLOGY_PRESETS.compact.length, 8);
  assert.equal(ECOLOGY_PRESETS.balanced.length, 12);
  assert.equal(ECOLOGY_PRESETS.expanded.length, 16);
  assert.equal(ECOLOGY_PRESETS.full.length, 22);
});

test("exact counts preserve disabled species and calculate ecological totals", () => {
  const counts = enabledSpeciesCounts({ grazer: 7, hunter: 2, "great-omnivore": 1 });
  assert.equal(counts.grazer, 7);
  assert.equal(counts["meadow-nibbler"], 0);
  assert.deepEqual(speciesCategoryTotals(counts), { herbivores: 7, carnivores: 3 });
});

test("forage and prey specialisms constrain food webs", () => {
  assert.equal(plantPreference("woodland-browser", "shrub"), 1);
  assert.equal(plantPreference("woodland-browser", "grass"), .08);
  assert.equal(plantPreference("grazer", "tree"), 0);
  assert.equal(isSustainableForage("woodland-browser", "shrub"), true);
  assert.equal(isSustainableForage("woodland-browser", "grass"), false);
  assert.equal(isSustainableForage("grazer", "shrub"), false);
  assert.equal(preyCompatible("brush-fox", "meadow-nibbler"), true);
  assert.equal(preyCompatible("brush-fox", "great-plains-grazer"), false);
  assert.equal(preyCompatible("pack-breaker", "great-plains-grazer"), true);
});

test("configuration warnings expose missing prey dependencies", () => {
  const warnings = ecologyWarnings({ "pack-breaker": 2 }, {});
  assert.ok(warnings.some(message => message.includes("no enabled compatible prey")));
});
