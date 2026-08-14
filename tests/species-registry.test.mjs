import test from "node:test";
import assert from "node:assert/strict";
import {
  ALLOWED_SILHOUETTE_BODY_PROFILES, ALLOWED_SILHOUETTE_HEAD_PROFILES, ECOLOGY_POPULATION_LEVELS, ECOLOGY_PRESETS, ECOLOGY_PRESET_POPULATIONS, FOOD_ECOLOGY, LOW_PREDATOR_FOUNDER_THRESHOLD, SPATIAL_ECOLOGY, SPECIES, SPECIES_IDS, SPECIES_VISUAL_DESIGNS, WORLD_SCALE_ECOLOGY_DESIGNS,
  carcassPreference, ecologyPresetCounts, ecologyPresetForWorldScale, ecologyRosterForWorldScale, ecologyWarnings, enabledSpeciesCounts, foodPreferenceSummary,
  isSustainableForage, needsPregnantPredatorFounder, plantPreference, preyCompatible, speciesCategoryTotals, validateSpeciesVisualDesigns
} from "../src/species-registry.js";

test("the catalogue retains the two generic originals while world rosters vary by scale", () => {
  assert.ok(SPECIES_IDS.length >= 2);
  assert.equal(SPECIES.grazer.label, "Valley Grazer");
  assert.equal(SPECIES.hunter.label, "Ridge Hunter");
  assert.equal(SPECIES.grazer.realLifeBasis, "average deer");
  assert.equal(SPECIES.hunter.realLifeBasis, "average grey wolf");
  assert.equal(ECOLOGY_PRESETS.original.length, 2);
  assert.deepEqual([1, 2, 3, 4].map(span => ecologyRosterForWorldScale(span).length), [6, 14, 20, SPECIES_IDS.length]);
  assert.deepEqual([1, 2, 3, 4].map(ecologyPresetForWorldScale), ["compact", "balanced", "expanded", "full"]);
  assert.equal(SPECIES_IDS.length, 28);
  assert.deepEqual(ECOLOGY_PRESETS.original, ["grazer", "hunter"]);
  assert.deepEqual(ECOLOGY_PRESETS["updated-originals"], ["valley-grazer-updated", "ridge-hunter-updated"]);
  assert.equal(SPECIES_VISUAL_DESIGNS.grazer, null);
  assert.equal(SPECIES_VISUAL_DESIGNS.hunter, null);
  assert.ok(SPECIES_VISUAL_DESIGNS["valley-grazer-updated"]);
  assert.ok(SPECIES_VISUAL_DESIGNS["ridge-hunter-updated"]);
  assert.equal(SPECIES.grazer.enabledByDefault, true);
  assert.equal(SPECIES.hunter.enabledByDefault, true);
  assert.equal(SPECIES["valley-grazer-updated"].enabledByDefault, false);
  assert.equal(SPECIES["ridge-hunter-updated"].enabledByDefault, false);
  for (const design of Object.values(WORLD_SCALE_ECOLOGY_DESIGNS)) assert.ok(design.factors.length >= 3);
});

test("specialist ecology variants each contain eight valid species and viable hunters", () => {
  const compactNames = ["compact-large", "compact-small", "compact-open", "compact-woodland"];
  for (const name of compactNames) {
    const ids = ECOLOGY_PRESETS[name];
    assert.equal(ids.length, 8, name);
    assert.equal(new Set(ids).size, 8, `${name} has no duplicates`);
    assert.ok(ids.every(id => SPECIES_IDS.includes(id)), `${name} contains only registered species`);
    for (const hunterId of ids.filter(id => SPECIES[id].hunting)) {
      assert.ok(ids.some(preyId => preyCompatible(hunterId, preyId)), `${name}: ${hunterId} has compatible prey`);
    }
  }
  assert.ok(ECOLOGY_PRESETS["compact-small"].filter(id => ["tiny", "small"].includes(SPECIES[id].sizeClass)).length >= 6);
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

test("the extensive calculated preset enables every registered species", () => {
  const counts = ecologyPresetCounts("full", 100);
  assert.equal(Object.values(counts).filter(value => value > 0).length, SPECIES_IDS.length);
  assert.ok(SPECIES_IDS.every(id => counts[id] >= 1));
});

test("real species have valid silhouette-first recipes and no visible limbs", () => {
  assert.deepEqual(validateSpeciesVisualDesigns(), []);
  for (const id of SPECIES_IDS.filter(id => !SPECIES[id].generic)) {
    assert.ok(SPECIES[id].scientificName, `${id} scientific name`);
    const visual = SPECIES_VISUAL_DESIGNS[id];
    assert.ok(visual?.bodyShape && visual?.headShape, `${id} body/head design`);
    assert.ok(ALLOWED_SILHOUETTE_BODY_PROFILES.includes(visual.bodyShape), `${id} body profile`);
    assert.ok(ALLOWED_SILHOUETTE_HEAD_PROFILES.includes(visual.headShape), `${id} head profile`);
    assert.ok(visual.featureGroups.length <= 3, `${id} logical feature budget`);
    assert.ok(visual.featureGroups.every(feature => ["head", "body"].includes(feature.attach)), `${id} features attach only to head or body`);
    assert.ok(visual.featureGroups.every(feature => !/^(?:leg|foot|arm|wing)(?:$|-)|^folded-wings$/.test(feature.kind)), `${id} has no limb or wing feature`);
    assert.ok(Array.isArray(visual.markings), `${id} markings`);
  }
  assert.equal(SPECIES_VISUAL_DESIGNS.grazer, null);
  assert.equal(SPECIES_VISUAL_DESIGNS.hunter, null);
  assert.equal(SPECIES_VISUAL_DESIGNS["sunscale-ambusher"].bodyShape, "curved-tube");
  assert.ok(SPECIES_VISUAL_DESIGNS["woodland-browser"].featureGroups.some(feature => feature.kind === "broad-antlers"));
  assert.ok(SPECIES_VISUAL_DESIGNS["little-opportunist"].markings.some(marking => marking.kind === "robber-mask"));
  assert.ok(SPECIES_VISUAL_DESIGNS["african-elephant"].featureGroups.some(feature => feature.kind === "curved-trunk"));
  assert.ok(SPECIES_VISUAL_DESIGNS["shieldback-colony"].markings.some(marking => marking.kind === "shell-panels"));
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
