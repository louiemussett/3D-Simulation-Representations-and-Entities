import test from "node:test";
import assert from "node:assert/strict";
import { HABITAT_DENSITY_BANDS, applyHabitatProfile, habitatColourRgb, habitatProfile } from "../src/habitat-system.js";
import { HexWorld } from "../src/hex-world.js";
import { HABITAT_ECOLOGY, SPECIES_IDS, habitatSuitability, selectHabitatWeighted } from "../src/species-registry.js";

const cell = overrides => ({ temperature: 16, humidity: .52, ecoMoisture: .52, groundwater: 55, biomass: .65, grassHeight: .45, plantType: "grass", canopyCover: 0, floodFrequency: 0, ...overrides });

test("habitats derive from hydrology, temperature and vegetation structure", () => {
  assert.equal(habitatProfile(cell({ wetland: true, floodFrequency: .7, ecoMoisture: .9, groundwater: 100 })).type, "marsh");
  assert.equal(habitatProfile(cell({ wetland: true, woodland: true, plantType: "tree", canopyCover: .78, ecoMoisture: .86 })).type, "wooded-swamp");
  assert.equal(habitatProfile(cell({ woodland: true, plantType: "tree", canopyCover: .78, temperature: 25, ecoMoisture: .8, humidity: .82, groundwater: 75 })).type, "humid-tropical-forest");
  assert.equal(habitatProfile(cell({ temperature: 36, ecoMoisture: .03, humidity: .06, groundwater: 2, biomass: .02 })).type, "hot-desert");
  assert.equal(habitatProfile(cell({ temperature: -8, ecoMoisture: .05, humidity: .1, groundwater: 3, biomass: .02 })).type, "cold-desert");
});

test("eight density levels and colour darkening expose gradual vegetation transitions", () => {
  const sparse = habitatProfile(cell({ woodland: true, plantType: "tree", canopyCover: .2, biomass: .12 }));
  const denseCell = cell({ woodland: true, plantType: "tree", canopyCover: .94, biomass: 1.15, understoryDensity: .72 });
  const dense = habitatProfile(denseCell);
  assert.equal(HABITAT_DENSITY_BANDS, 8);
  assert.ok(dense.densityBand > sparse.densityBand);
  const sparseColour = habitatColourRgb(cell({ woodland: true, plantType: "tree", canopyCover: .2, biomass: .12 }));
  const denseColour = habitatColourRgb(denseCell);
  assert.ok(denseColour.reduce((sum, value) => sum + value, 0) < sparseColour.reduce((sum, value) => sum + value, 0));
  const mutable = denseCell; applyHabitatProfile(mutable);
  assert.equal(mutable.habitatDensityBand, dense.densityBand);
  assert.equal(mutable.plantCommunity, dense.plantCommunity);
});

test("woodland structure phases canopy and colour instead of using one forest value", () => {
  const sparseCell = cell({ woodland: true, plantType: "tree", woodlandDensity: .25, canopyCover: undefined, biomass: .42 });
  const denseCell = cell({ woodland: true, plantType: "tree", woodlandDensity: .92, canopyCover: undefined, biomass: .9 });
  const sparse = habitatProfile(sparseCell), dense = habitatProfile(denseCell);
  assert.ok(sparse.canopy < dense.canopy);
  assert.ok(sparse.densityBand < dense.densityBand);
  assert.ok(habitatColourRgb(sparseCell).reduce((sum, value) => sum + value, 0) > habitatColourRgb(denseCell).reduce((sum, value) => sum + value, 0));
});

test("generated forests have lighter edges and multiple structural density bands", () => {
  const world = new HexWorld(1337, { size: 48, hexDetail: 500, startSeason: "Spring", windDirection: "west", windStrength: 1, stormIntensity: 1, rainShadow: 1, sedimentTransport: 1, relief: .15, mountains: 1, hills: 1, valleys: 1, ridges: .55, plateaus: .35, roughness: .3, rivers: 1.25, riverWidthVariation: 1, riverPatternDiversity: 1, lakes: 1.25, woodland: 1, trees: 1, bushes: 1, longGrass: 1, rainfall: 1.2, northTemperature: 8, southTemperature: 24, coldestTemperature: -12, hottestTemperature: 36, temperatureVariation: 1, climate: 1 });
  const forest = world.cells.filter(item => item.woodland), edges = forest.filter(item => item.neighbours.some(neighbour => !neighbour.woodland)), interiors = forest.filter(item => item.neighbours.length && item.neighbours.every(neighbour => neighbour.woodland));
  const meanDensity = items => items.reduce((sum, item) => sum + item.woodlandDensity, 0) / items.length;
  assert.ok(new Set(forest.map(item => item.habitatDensityBand)).size >= 3);
  assert.ok(edges.length && interiors.length);
  assert.ok(meanDensity(edges) < meanDensity(interiors));
});

test("every species has a bounded structural habitat profile", () => {
  assert.deepEqual(Object.keys(HABITAT_ECOLOGY).sort(), [...SPECIES_IDS].sort());
  for (const id of SPECIES_IDS) {
    const profile = HABITAT_ECOLOGY[id];
    assert.ok(profile.preferred.length >= 1, `${id} preferred habitat`);
    assert.ok(profile.tolerated.length >= 1, `${id} tolerated habitat`);
    assert.ok(profile.moisture[0] <= profile.moisture[1], `${id} moisture range`);
    assert.ok(profile.temperature[0] <= profile.temperature[1], `${id} temperature range`);
  }
});

test("habitat suitability affects deterministic local choice", () => {
  const meadow = cell({ habitatType: "short-grassland", waterAvailability: .48, canopyDensity: .1, understoryDensity: .22 });
  const desert = cell({ habitatType: "hot-desert", temperature: 38, waterAvailability: .05, canopyDensity: 0, understoryDensity: .02 });
  assert.ok(habitatSuitability("grazer", meadow) > habitatSuitability("grazer", desert));
  assert.ok(habitatSuitability("dromedary", desert) > habitatSuitability("dromedary", meadow));
  assert.equal(selectHabitatWeighted("grazer", [meadow, desert], 0), meadow);
});
