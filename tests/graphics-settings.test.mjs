import test from "node:test";
import assert from "node:assert/strict";
import { graphicsPreset, normalizeGraphicsSettings, READABLE_INTERFACE_DEFAULTS } from "../src/graphics-settings.js";
test("low graphics reduce render work without changing simulation settings", () => { const low = graphicsPreset("low"), ultra = graphicsPreset("ultra"); assert.ok(low.renderScale < ultra.renderScale); assert.ok(low.vegetationStride > ultra.vegetationStride); assert.equal(low.frameCap, 30); });
test("custom graphics values remain bounded", () => { const value = normalizeGraphicsSettings({ renderScale: 9, vegetationStride: 0, animalDetail: .1, frameCap: 17 }); assert.equal(value.renderScale, 1.5); assert.equal(value.vegetationStride, 1); assert.equal(value.animalDetail, .6); assert.equal(value.frameCap, 30); });
test("removed frame-rate choices migrate to supported limits", () => { assert.equal(normalizeGraphicsSettings({ frameCap: 45 }).frameCap, 30); assert.equal(normalizeGraphicsSettings({ frameCap: 0 }).frameCap, 60); assert.equal(normalizeGraphicsSettings({ frameCap: 60 }).frameCap, 60); });
test("new users begin on the authored custom default profile", () => {
  const defaults = normalizeGraphicsSettings({});
  assert.equal(defaults.preset, "custom");
  assert.deepEqual(
    [defaults.renderScale, defaults.adaptiveMinScale, defaults.adaptiveMaxScale, defaults.vegetationStride, defaults.animalDetail, defaults.iconTextureQuality, defaults.frameCap],
    [1, .75, 1.25, 2, 1, 2, 30]
  );
});
test("adaptive resolution defaults on and can be disabled", () => { assert.equal(normalizeGraphicsSettings({}).adaptiveResolution, true); assert.equal(normalizeGraphicsSettings({ adaptiveResolution: false }).adaptiveResolution, false); });
test("large-map performance mode is opt-in and remains a local graphics preference", () => { assert.equal(normalizeGraphicsSettings({}).largeMapPerformanceMode, false); assert.equal(normalizeGraphicsSettings({ largeMapPerformanceMode: true }).largeMapPerformanceMode, true); });
test("observer zoom and haze preferences default safely and round-trip", () => {
  assert.deepEqual([normalizeGraphicsSettings({}).observerZoomLevel, normalizeGraphicsSettings({}).observerHazeMode], ["far", "natural"]);
  const saved = normalizeGraphicsSettings({ observerZoomLevel: "extreme", observerHazeMode: "off" });
  assert.deepEqual([normalizeGraphicsSettings(saved).observerZoomLevel, normalizeGraphicsSettings(saved).observerHazeMode], ["extreme", "off"]);
  assert.deepEqual([normalizeGraphicsSettings({ observerZoomLevel: "invalid", observerHazeMode: "invalid" }).observerZoomLevel, normalizeGraphicsSettings({ observerZoomLevel: "invalid", observerHazeMode: "invalid" }).observerHazeMode], ["far", "natural"]);
});
test("adaptive thresholds are bounded and lower never exceeds upper", () => { const value = normalizeGraphicsSettings({ preset: "custom", adaptiveMinScale: 1.5, adaptiveMaxScale: .75 }); assert.equal(value.adaptiveMinScale, .75); assert.equal(value.adaptiveMaxScale, .75); });
test("entity constellations expose one bounded uniform panel scale", () => {
  assert.equal(normalizeGraphicsSettings({}).entityPanelScale, .4);
  assert.equal(normalizeGraphicsSettings({}).entityPublicPanelScale, .4);
  assert.equal(normalizeGraphicsSettings({}).entitySelectedPanelScale, .4);
  assert.equal(normalizeGraphicsSettings({ entityPanelScale: .1, entityPanelStyle: "classic-rail" }).entityPanelScale, .1);
  assert.equal(normalizeGraphicsSettings({ entityPanelScale: 9 }).entityPanelScale, 1.5);
});

test("public thick rails and the selected main panel have independent scales", () => {
  const settings = normalizeGraphicsSettings({ entityPublicPanelScale: .2, entitySelectedPanelScale: 1.25 });
  assert.equal(settings.entityPublicPanelScale, .2);
  assert.equal(settings.entitySelectedPanelScale, 1.25);
  assert.equal(settings.entityPanelScale, 1.25);
});

test("the former shared panel scale migrates into both independent controls", () => {
  const settings = normalizeGraphicsSettings({ entityPanelScale: .6 });
  assert.equal(settings.entityPublicPanelScale, .6);
  assert.equal(settings.entitySelectedPanelScale, .6);
});
test("bubble origin always migrates to the animal head", () => {
  assert.equal(normalizeGraphicsSettings({}).entityBubbleOrigin, "head");
  assert.equal(normalizeGraphicsSettings({ entityBubbleOrigin: "head" }).entityBubbleOrigin, "head");
  assert.equal(normalizeGraphicsSettings({ entityBubbleOrigin: "panel" }).entityBubbleOrigin, "head");
  assert.equal(normalizeGraphicsSettings({ entityBubbleOrigin: "both" }).entityBubbleOrigin, "head");
  const saved = normalizeGraphicsSettings({ entityBubbleOrigin: "head", entityBubbleScale: 1.25 });
  assert.deepEqual([saved.entityBubbleOrigin, saved.entityBubbleScale], ["head", 1.25]);
});
test("entity panel text scale is independent, discrete and bounded", () => {
  const defaults = normalizeGraphicsSettings({});
  assert.deepEqual([defaults.entityPanelScale, defaults.entityPanelTextScale], [.4, 1.3]);
  assert.equal(normalizeGraphicsSettings({ entityPanelScale: 1.5, entityPanelTextScale: .1 }).entityPanelTextScale, .75);
  assert.equal(normalizeGraphicsSettings({ entityPanelScale: .6, entityPanelTextScale: 9 }).entityPanelTextScale, 2);
  assert.equal(normalizeGraphicsSettings({ entityPanelTextScale: 1.9 }).entityPanelTextScale, 2);
  assert.equal(normalizeGraphicsSettings({ entityPanelTextScale: 1.12 }).entityPanelTextScale, 1.15);
  assert.equal(normalizeGraphicsSettings({ entityPanelTextScale: "not-a-number" }).entityPanelTextScale, 1.3);
  assert.equal(normalizeGraphicsSettings({ entityPanelTextScale: 1.3 }).entityPanelScale, .4);
  const saved = normalizeGraphicsSettings({ preset: "custom", entityPanelTextScale: 1.3 });
  assert.equal(normalizeGraphicsSettings(saved).entityPanelTextScale, 1.3);
});
test("new worlds use the fixed classic rail and selected main instrument", () => {
  const defaults = normalizeGraphicsSettings({});
  assert.deepEqual(
    [defaults.entityPanelStyle, defaults.entityPanelContentPreset, defaults.entityPanelScale],
    ["classic-rail", "custom", .4]
  );
  assert.deepEqual(
    [defaults.entityPanelIdentityVisible, defaults.entityPanelExpressionVisible, defaults.entityPanelPublicCueVisible, defaults.entityPanelThoughtVisible, defaults.entityPanelForecastVisible],
    [true, true, true, true, true]
  );
  assert.deepEqual(
    [defaults.entityPanelHealthVisible, defaults.entityPanelConcernVisible, defaults.entityPanelForecastEffectVisible, defaults.entityPanelMetabolicVisible, defaults.entityPanelPerformanceVisible],
    [true, false, false, false, false]
  );
  for (const removedStyle of ["identity-mast", "status-mast", "capsule", "context-ribbon", "vital-strip", "predictive-view", "full-instrument"]) assert.equal(normalizeGraphicsSettings({ entityPanelStyle: removedStyle }).entityPanelStyle, "classic-rail");
});
test("older complete-panel saves retain their module choices but use the stable surface pair", () => {
  const migrated = normalizeGraphicsSettings({ entityPanelScale: .6, instrumentThoughtVisible: false });
  assert.equal(migrated.entityPanelStyle, "classic-rail");
  assert.equal(migrated.entityPanelContentPreset, "custom");
  assert.equal(migrated.entityPanelThoughtVisible, false);
  assert.deepEqual([migrated.entityPanelHealthVisible, migrated.entityPanelConcernVisible, migrated.entityPanelForecastEffectVisible, migrated.entityPanelMetabolicVisible, migrated.entityPanelPerformanceVisible], [true, true, true, true, true]);
});
test("explicit uniform scale wins over every legacy component scale", () => {
  const result = normalizeGraphicsSettings({ preset: "custom", entityPanelScale: .8, entityExpressionScale: 2, entityIdentityScale: 1.5, entityIconScale: .75, thoughtScale: 2, predictionScale: .75 });
  assert.equal(result.entityPanelScale, .8);
});
test("component-only legacy saves migrate once and round-trip safely", () => {
  const migrated = normalizeGraphicsSettings({ preset: "custom", entityIconScale: .75, thoughtScale: 1.5, predictionScale: 2 });
  assert.equal(migrated.entityPanelScale, .6);
  assert.equal(normalizeGraphicsSettings(migrated).entityPanelScale, .6);
  const larger = normalizeGraphicsSettings({ preset: "custom", entityIconScale: 1.5, thoughtScale: 2 });
  assert.equal(larger.entityPanelScale, 1.25);
  assert.equal(normalizeGraphicsSettings(larger).entityPanelScale, 1.25);
});
test("selected instrument channels default on and remain independently disableable", () => {
  const defaults = normalizeGraphicsSettings({});
  assert.deepEqual(
    [defaults.instrumentExpressionVisible, defaults.instrumentPublicCueVisible, defaults.instrumentThoughtVisible, defaults.instrumentForecastVisible],
    [true, true, true, true]
  );
  const custom = normalizeGraphicsSettings({ instrumentExpressionVisible: false, instrumentPublicCueVisible: true, instrumentThoughtVisible: false, instrumentForecastVisible: true });
  assert.deepEqual(
    [custom.instrumentExpressionVisible, custom.instrumentPublicCueVisible, custom.instrumentThoughtVisible, custom.instrumentForecastVisible],
    [false, true, false, true]
  );
});
test("identity and status panels default off without disabling private bubbles", () => {
  const defaults = normalizeGraphicsSettings({});
  assert.deepEqual(
    [defaults.entityAttachedPanelsVisible, defaults.entityPanelsVisible, defaults.entityPublicPanelsVisible, defaults.entitySelectedPresentationVisible],
    [false, false, false, false]
  );
  assert.deepEqual([defaults.entityPanelThoughtVisible, defaults.entityPanelForecastVisible], [true, true]);
});
test("old combined visibility switches cannot silently restore removed panels", () => {
  for (const legacy of [
    { entityPanelsVisible: true },
    { entityPublicPanelsVisible: true, entitySelectedPresentationVisible: true }
  ]) {
    const migrated = normalizeGraphicsSettings(legacy);
    assert.deepEqual([migrated.entityAttachedPanelsVisible, migrated.entityPublicPanelsVisible, migrated.entitySelectedPresentationVisible], [false, false, false]);
  }
});
test("the dedicated optional panel switch controls both stable panel surfaces", () => {
  const visible = normalizeGraphicsSettings({ entityAttachedPanelsVisible: true });
  assert.deepEqual([visible.entityAttachedPanelsVisible, visible.entityPublicPanelsVisible, visible.entitySelectedPresentationVisible, visible.entityPanelsVisible], [true, true, true, true]);
  const hidden = normalizeGraphicsSettings({ entityAttachedPanelsVisible: false });
  assert.deepEqual([hidden.entityAttachedPanelsVisible, hidden.entityPublicPanelsVisible, hidden.entitySelectedPresentationVisible, hidden.entityPanelsVisible], [false, false, false, false]);
});
test("content visibility remains independent of uniform panel size", () => {
  const result = normalizeGraphicsSettings({ entityPanelScale: 1.5, instrumentExpressionVisible: false, instrumentPublicCueVisible: true, instrumentThoughtVisible: false, instrumentForecastVisible: true });
  assert.equal(result.entityPanelScale, 1.5);
  assert.deepEqual([result.instrumentExpressionVisible, result.instrumentPublicCueVisible, result.instrumentThoughtVisible, result.instrumentForecastVisible], [false, true, false, true]);
});
test("interface and font scaling are independent and bounded", () => {
  const defaults = normalizeGraphicsSettings({});
  assert.deepEqual([defaults.interfaceScale, defaults.fontScale], [.85, 1.15]);
  const custom = normalizeGraphicsSettings({ preset: "custom", interfaceScale: 4, fontScale: .2 });
  assert.deepEqual([custom.interfaceScale, custom.fontScale], [1.3, .85]);
});
test("semantic typography categories have readable first-run defaults and independent bounds", () => {
  const defaults = normalizeGraphicsSettings({});
  assert.deepEqual(
    [defaults.smallTextScale, defaults.bodyTextScale, defaults.controlTextScale, defaults.headingTextScale, defaults.titleTextScale],
    [1.3, 1.15, 1, 1, .75]
  );
  const custom = normalizeGraphicsSettings({ smallTextScale: .1, bodyTextScale: 9, controlTextScale: 1.15, headingTextScale: 1.3, titleTextScale: 1.5 });
  assert.deepEqual([custom.smallTextScale, custom.bodyTextScale, custom.controlTextScale, custom.headingTextScale, custom.titleTextScale], [.75, 1.75, 1.15, 1.3, 1.5]);
});
test("readable interface defaults match the first-run settings labels", () => {
  assert.deepEqual(READABLE_INTERFACE_DEFAULTS, {
    interfaceScale: .85,
    fontScale: 1.15,
    smallTextScale: 1.3,
    bodyTextScale: 1.15,
    controlTextScale: 1,
    headingTextScale: 1,
    titleTextScale: .75
  });
});
test("explicit saved interface and typography choices remain untouched", () => {
  const saved = { interfaceScale: 1.15, fontScale: 1.3, smallTextScale: .9, bodyTextScale: 1.15, controlTextScale: 1.5, headingTextScale: 1.3, titleTextScale: 1.75 };
  const normalized = normalizeGraphicsSettings(saved);
  for (const [key, value] of Object.entries(saved)) assert.equal(normalized[key], value, key);
});
test("partial saved settings receive readable defaults only for missing fields", () => {
  const normalized = normalizeGraphicsSettings({ interfaceScale: 1, bodyTextScale: .9, titleTextScale: 1.3 });
  assert.deepEqual(
    {
      interfaceScale: normalized.interfaceScale,
      fontScale: normalized.fontScale,
      smallTextScale: normalized.smallTextScale,
      bodyTextScale: normalized.bodyTextScale,
      controlTextScale: normalized.controlTextScale,
      headingTextScale: normalized.headingTextScale,
      titleTextScale: normalized.titleTextScale
    },
    { ...READABLE_INTERFACE_DEFAULTS, interfaceScale: 1, bodyTextScale: .9, titleTextScale: 1.3 }
  );
});
