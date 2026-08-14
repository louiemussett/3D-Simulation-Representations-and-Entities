import test from "node:test";
import assert from "node:assert/strict";
import { precipitationBand, weatherOverlayLegend, weatherShaderLayerIndex, weatherVisualBudget } from "../src/weather-visuals.js";
import { activePrecipitationIntensity, localizedWeatherPresentation, precipitationFromAtmosphere, weatherFieldRefreshDue, weatherFieldRefreshMarker, weatherSystemActivity } from "../src/localized-weather.js";

test("precipitation legend distinguishes dry, rain severity, and snow", () => {
  assert.equal(precipitationBand(.01, 12).key, "none");
  assert.equal(precipitationBand(.2, 12).key, "light");
  assert.equal(precipitationBand(.9, 12).key, "severe");
  assert.equal(precipitationBand(.2, -2).key, "snow");
});

test("weather budgets scale down for large maps and off disables cloud geometry", () => {
  assert.deepEqual(weatherVisualBudget("off", 1, false), { cloudClusters: 0, precipitationShafts: 0, localDrops: 700, splashes: 120 });
  assert.ok(weatherVisualBudget("high", 1, true).cloudClusters < weatherVisualBudget("high", 1, false).cloudClusters);
  assert.ok(weatherVisualBudget("cinematic", 1.35, false).precipitationShafts > weatherVisualBudget("low", .45, false).precipitationShafts);
});

test("scientific overlay layers have stable shader indices and legends", () => {
  assert.equal(weatherShaderLayerIndex("precipitation"), 0);
  assert.equal(weatherShaderLayerIndex("visibility"), 3);
  assert.equal(weatherOverlayLegend("ground-wetness").title, "Ground wetness");
});

test("humidity and cloud do not create rain without a lifting mechanism", () => {
  assert.equal(precipitationFromAtmosphere({ humidity: .92, rainfallScale: 1.2 }), 0);
  assert.equal(precipitationFromAtmosphere({ humidity: .82, lowPressure: .8, highPressure: .9, rainfallScale: 1.2 }), 0);
  const cloudyDry = localizedWeatherPresentation({ rain: 0, humidity: .82, cloudCover: .76, pressure: -.1 });
  assert.equal(cloudyDry.precipitationIntensity, 0);
  assert.equal(cloudyDry.precipitationType, "none");
  assert.equal(cloudyDry.cloudCover, .76);
});

test("fronts and wet windward uplift can form localized precipitation", () => {
  assert.ok(precipitationFromAtmosphere({ humidity: .76, lowPressure: .78, rainfallScale: 1.2 }) > .15);
  assert.ok(precipitationFromAtmosphere({ humidity: .72, uplift: .15, rainfallScale: 1.1 }) > .05);
  assert.equal(activePrecipitationIntensity(.03), 0);
  assert.equal(precipitationBand(.03, 12).key, "none");
});

test("low-pressure cells deterministically form and dissipate", () => {
  const system = { kind: "low", radius: 60, activityPhase: .1, periodHours: 72 };
  const cycle = Array.from({ length: 72 }, (_, hour) => weatherSystemActivity(system, 0, hour));
  assert.equal(Math.min(...cycle), 0);
  assert.ok(Math.max(...cycle) > .99);
  assert.ok(cycle.some(value => value === 0));
  assert.ok(cycle.some(value => value > .5));
});

test("weather textures refresh when storm activity changes even without material movement", () => {
  const systems = [{ kind: "low", x: 2, z: 3, radius: 60 }];
  const marker = weatherFieldRefreshMarker(systems, 2);
  assert.equal(weatherFieldRefreshDue(marker, systems, 16, 2), false);
  assert.equal(weatherFieldRefreshDue(marker, systems, 16, 3), true);
});
