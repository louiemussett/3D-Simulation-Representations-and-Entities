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
