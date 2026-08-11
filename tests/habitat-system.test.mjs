import test from "node:test";
import assert from "node:assert/strict";
import { HABITAT_DENSITY_BANDS, applyHabitatProfile, habitatColourRgb, habitatProfile } from "../src/habitat-system.js";
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
