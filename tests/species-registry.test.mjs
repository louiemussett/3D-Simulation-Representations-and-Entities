import test from "node:test";
import assert from "node:assert/strict";
import {
  ECOLOGY_POPULATION_LEVELS, ECOLOGY_PRESETS, ECOLOGY_PRESET_POPULATIONS, FOOD_ECOLOGY, LOW_PREDATOR_FOUNDER_THRESHOLD, SPATIAL_ECOLOGY, SPECIES, SPECIES_IDS,
  carcassPreference, ecologyPresetCounts, ecologyWarnings, enabledSpeciesCounts, foodPreferenceSummary,
  isSustainableForage, needsPregnantPredatorFounder, plantPreference, preyCompatible, speciesCategoryTotals
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

test("compact ecology variants each contain eight valid species and viable hunters", () => {
  const compactNames = ["compact", "compact-large", "compact-small", "compact-open", "compact-woodland"];
  for (const name of compactNames) {
    const ids = ECOLOGY_PRESETS[name];
    assert.equal(ids.length, 8, name);
    assert.equal(new Set(ids).size, 8, `${name} has no duplicates`);
    assert.ok(ids.every(id => SPECIES_IDS.includes(id)), `${name} contains only registered species`);
    for (const hunterId of ids.filter(id => SPECIES[id].hunting)) {
      assert.ok(ids.some(preyId => preyCompatible(hunterId, preyId)), `${name}: ${hunterId} has compatible prey`);
    }
  }
  assert.ok(ECOLOGY_PRESETS["compact-small"].every(id => ["tiny", "small"].includes(SPECIES[id].sizeClass)));
  assert.equal(ECOLOGY_PRESETS["compact-large"].filter(id => SPECIES[id].sizeClass === "large").length, 6);
});

test("calculated carnivore food-web presets contain literal predators and compatible preferred prey", () => {
  const foodWebs = ["ridge-hunter-web", "brush-fox-web", "shadow-stalker-web", "pack-breaker-web", "waterline-ambusher-web", "highland-prowler-web", "sunscale-ambusher-web"];
  for (const name of foodWebs) {
    const ids = ECOLOGY_PRESETS[name], central = ECOLOGY_PRESET_POPULATIONS[name];
    assert.ok(ids.length >= 2, name);
    assert.ok(ids.every(id => central[id] >= 1), `${name} has literal central counts`);
    for (const predatorId of ids.filter(id => SPECIES[id].hunting)) assert.ok(ids.some(preyId => preyCompatible(predatorId, preyId)), `${name}: ${predatorId} has compatible prey`);
  }
});

test("population levels scale calculated presets from 20 to 200 percent", () => {
  assert.deepEqual(ECOLOGY_POPULATION_LEVELS.map(level => level.percent), [20, 50, 100, 150, 200]);
  const central = ecologyPresetCounts("pack-breaker-web", 100);
  assert.equal(central["pack-breaker"], 1);
  assert.equal(central["great-plains-grazer"] + central["armoured-browser"] + central["northern-shaggy-grazer"], 28);
  const minimal = ecologyPresetCounts("pack-breaker-web", 20), maximum = ecologyPresetCounts("pack-breaker-web", 200);
  assert.equal(minimal["great-plains-grazer"] + minimal["armoured-browser"] + minimal["northern-shaggy-grazer"], 5);
  assert.equal(maximum["great-plains-grazer"] + maximum["armoured-browser"] + maximum["northern-shaggy-grazer"], 56);
});

test("one or two hunting founders receive the low-population pregnancy safeguard", () => {
  assert.equal(LOW_PREDATOR_FOUNDER_THRESHOLD, 2);
  assert.equal(needsPregnantPredatorFounder("hunter", 1), true);
  assert.equal(needsPregnantPredatorFounder("hunter", 2), true);
  assert.equal(needsPregnantPredatorFounder("hunter", 3), false);
  assert.equal(needsPregnantPredatorFounder("grazer", 1), false);
  assert.equal(needsPregnantPredatorFounder("carrion-runner", 1), false);
  assert.equal(needsPregnantPredatorFounder("great-omnivore", 1), true);
});

test("the all-species calculated preset enables every registered species", () => {
  const counts = ecologyPresetCounts("full", 100);
  assert.equal(Object.values(counts).filter(value => value > 0).length, 22);
  assert.ok(SPECIES_IDS.every(id => counts[id] >= 1));
});

test("exact counts preserve disabled species and calculate ecological totals", () => {
  const counts = enabledSpeciesCounts({ grazer: 7, hunter: 2, "great-omnivore": 1 });
  assert.equal(counts.grazer, 7);
  assert.equal(counts["meadow-nibbler"], 0);
  assert.deepEqual(speciesCategoryTotals(counts), { herbivores: 7, carnivores: 3 });
});

test("forage and prey specialisms constrain food webs", () => {
  assert.equal(plantPreference("woodland-browser", "shrub"), 1.2);
  assert.equal(plantPreference("woodland-browser", "grass"), .08);
  assert.equal(plantPreference("grazer", "tree"), 0);
  assert.equal(isSustainableForage("woodland-browser", "shrub"), true);
  assert.equal(isSustainableForage("woodland-browser", "grass"), false);
  assert.equal(isSustainableForage("grazer", "shrub"), false);
  assert.equal(preyCompatible("brush-fox", "meadow-nibbler"), true);
  assert.equal(preyCompatible("brush-fox", "great-plains-grazer"), false);
  assert.equal(preyCompatible("pack-breaker", "great-plains-grazer"), true);
});

test("every species has explicit food and spatial ecology metadata", () => {
  assert.deepEqual(Object.keys(FOOD_ECOLOGY).sort(), [...SPECIES_IDS].sort());
  assert.deepEqual(Object.keys(SPATIAL_ECOLOGY).sort(), [...SPECIES_IDS].sort());
  for (const id of SPECIES_IDS) {
    assert.equal(typeof FOOD_ECOLOGY[id].plants, "object", `${id} plant preferences`);
    assert.equal(typeof FOOD_ECOLOGY[id].carrion, "object", `${id} carcass preferences`);
    assert.ok(Number.isFinite(SPATIAL_ECOLOGY[id].territoriality), `${id} territoriality`);
  }
});

test("browsers can eat tree foliage while grazing specialists cannot", () => {
  assert.equal(isSustainableForage("woodland-browser", "tree"), true);
  assert.equal(isSustainableForage("armoured-browser", "tree"), true);
  assert.equal(isSustainableForage("grazer", "tree"), false);
});

test("carcass source species changes consumer preference", () => {
  assert.ok(carcassPreference("brush-fox", "meadow-nibbler") > carcassPreference("brush-fox", "great-plains-grazer"));
  assert.ok(carcassPreference("pack-breaker", "great-plains-grazer") > carcassPreference("pack-breaker", "meadow-nibbler"));
  const summary = foodPreferenceSummary("woodland-browser");
  assert.ok(summary.preferredPlants.includes("shrub"));
  assert.ok(summary.avoidedPlants.includes("grass"));
});

test("configuration warnings expose missing prey dependencies", () => {
  const warnings = ecologyWarnings({ "pack-breaker": 2 }, {});
  assert.ok(warnings.some(message => message.includes("no enabled compatible prey")));
});
