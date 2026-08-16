import test from "node:test";
import assert from "node:assert/strict";
import { createTerrainRegionField } from "../src/terrain-regions.js";

test("global relief off produces a genuinely flat world", () => {
  const field = createTerrainRegionField(123, 220, { relief: 0, mountains: 2, hills: 2, valleys: 2, ridges: 2, plateaus: 2, roughness: 2 });
  for (const point of [[0, 0], [50, -30], [-92, 81]]) assert.deepEqual(field.sampleAt(...point), { elevation: 0, landform: "plain", dominantFeature: null, featureContribution: 0 });
});

test("every named landform control can be independently disabled", () => {
  const field = createTerrainRegionField(321, 220, { relief: 1, mountains: 0, hills: 0, valleys: 0, ridges: 0, plateaus: 0, roughness: 0 });
  assert.equal(field.features.length, 0);
  assert.equal(field.roughness, 0);
});

test("small non-zero amounts create the requested region types deterministically", () => {
  const settings = { relief: 1, mountains: .05, hills: .05, valleys: .05, ridges: .05, plateaus: .05, roughness: .4 };
  const first = createTerrainRegionField(99, 220, settings), second = createTerrainRegionField(99, 220, settings);
  assert.deepEqual(new Set(first.features.map(feature => feature.kind)), new Set(["mountain", "hill", "valley", "ridge", "plateau"]));
  for (const point of [[0, 0], [17, -42], [-71, 53]]) assert.deepEqual(first.sampleAt(...point), second.sampleAt(...point));
});

test("fine height variation changes local terrain without changing feature counts", () => {
  const base = { relief: 1, mountains: .8, hills: .8, valleys: .8, ridges: .8, plateaus: .8 };
  const smooth = createTerrainRegionField(74, 220, { ...base, roughness: 0 });
  const granular = createTerrainRegionField(74, 220, { ...base, roughness: 1.2 });
  assert.equal(granular.features.length, smooth.features.length);
  assert.notEqual(granular.elevationAt(11.25, -8.75), smooth.elevationAt(11.25, -8.75));
});

test("mountain controls create broad rounded, pyramidal and alpine forms", () => {
  const settings = { relief: 1, mountains: 1, roundedMountains: 1, pyramidalMountains: 1, alpineRanges: 1, mountainBreadth: 1.4, summitSharpness: 1, mountainRangeLength: 1.4, mountainRangeComplexity: 1, hills: 0, valleys: 0, ridges: 0, plateaus: 0, roughness: 0 };
  const field = createTerrainRegionField(912, 300, settings), mountains = field.features.filter(feature => feature.kind === "mountain");
  assert.deepEqual(new Set(mountains.map(feature => feature.profile)), new Set(["rounded-massif", "pyramidal-peak", "alpine-range"]));
  assert.ok(mountains.every(feature => feature.width >= 30), "mountain bases span at least ten percent of this map");
  assert.ok(mountains.find(feature => feature.profile === "alpine-range").summits.length >= 3);
});

test("individual mountain families and breadth remain user-controllable", () => {
  const base = { relief: 1, mountains: 1, roundedMountains: 0, pyramidalMountains: 0, alpineRanges: 1, hills: 0, valleys: 0, ridges: 0, plateaus: 0, roughness: 0 };
  const narrow = createTerrainRegionField(88, 220, { ...base, mountainBreadth: .6, summitSharpness: 2, mountainRangeLength: .6, mountainRangeComplexity: .5 });
  const broad = createTerrainRegionField(88, 220, { ...base, mountainBreadth: 2, summitSharpness: .5, mountainRangeLength: 2, mountainRangeComplexity: 2 });
  assert.ok(narrow.features.every(feature => feature.profile === "alpine-range"));
  assert.ok(broad.features[0].width > narrow.features[0].width * 2);
  assert.ok(broad.features[0].summits.length > narrow.features[0].summits.length);
  assert.notEqual(broad.elevationAt(broad.features[0].cx + broad.features[0].width, broad.features[0].cz), narrow.elevationAt(narrow.features[0].cx + narrow.features[0].width, narrow.features[0].cz));
});
