import test from "node:test";
import assert from "node:assert/strict";
import { graphicsPreset, normalizeGraphicsSettings, READABLE_INTERFACE_DEFAULTS } from "../src/graphics-settings.js";
test("low graphics reduce render work without changing simulation settings", () => { const low = graphicsPreset("low"), ultra = graphicsPreset("ultra"); assert.ok(low.renderScale < ultra.renderScale); assert.ok(low.vegetationStride > ultra.vegetationStride); assert.equal(low.frameCap, 30); });
test("custom graphics values remain bounded", () => { const value = normalizeGraphicsSettings({ renderScale: 9, vegetationStride: 0, animalDetail: .1, frameCap: 17 }); assert.equal(value.renderScale, 1.5); assert.equal(value.vegetationStride, 1); assert.equal(value.animalDetail, .6); assert.equal(value.frameCap, 30); });
test("removed frame-rate choices migrate to supported limits", () => { assert.equal(normalizeGraphicsSettings({ frameCap: 45 }).frameCap, 30); assert.equal(normalizeGraphicsSettings({ frameCap: 0 }).frameCap, 60); assert.equal(normalizeGraphicsSettings({ frameCap: 60 }).frameCap, 60); });
test("new users begin on the balanced preset", () => { assert.equal(normalizeGraphicsSettings({}).preset, "balanced"); });
test("adaptive resolution defaults on and can be disabled", () => { assert.equal(normalizeGraphicsSettings({}).adaptiveResolution, true); assert.equal(normalizeGraphicsSettings({ adaptiveResolution: false }).adaptiveResolution, false); });
test("adaptive thresholds are bounded and lower never exceeds upper", () => { const value = normalizeGraphicsSettings({ preset: "custom", adaptiveMinScale: 1.5, adaptiveMaxScale: .75 }); assert.equal(value.adaptiveMinScale, .75); assert.equal(value.adaptiveMaxScale, .75); });
test("entity constellations expose one bounded uniform panel scale", () => {
  assert.equal(normalizeGraphicsSettings({}).entityPanelScale, 1);
  assert.equal(normalizeGraphicsSettings({ entityPanelScale: .1 }).entityPanelScale, .6);
  assert.equal(normalizeGraphicsSettings({ entityPanelScale: 9 }).entityPanelScale, 1.5);
});
test("entity panel text scale is independent, discrete and bounded", () => {
  const defaults = normalizeGraphicsSettings({});
  assert.deepEqual([defaults.entityPanelScale, defaults.entityPanelTextScale], [1, 1]);
  assert.equal(normalizeGraphicsSettings({ entityPanelScale: 1.5, entityPanelTextScale: .1 }).entityPanelTextScale, .75);
  assert.equal(normalizeGraphicsSettings({ entityPanelScale: .6, entityPanelTextScale: 9 }).entityPanelTextScale, 1.5);
  assert.equal(normalizeGraphicsSettings({ entityPanelTextScale: 1.12 }).entityPanelTextScale, 1.15);
  assert.equal(normalizeGraphicsSettings({ entityPanelTextScale: "not-a-number" }).entityPanelTextScale, 1);
  assert.equal(normalizeGraphicsSettings({ entityPanelTextScale: 1.3 }).entityPanelScale, 1);
  const saved = normalizeGraphicsSettings({ preset: "custom", entityPanelTextScale: 1.3 });
  assert.equal(normalizeGraphicsSettings(saved).entityPanelTextScale, 1.3);
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
test("the complete entity-panel surface can be hidden without losing child preferences", () => {
  const hidden = normalizeGraphicsSettings({ entityPanelsVisible: false, instrumentExpressionVisible: false, instrumentPublicCueVisible: true, instrumentThoughtVisible: false, instrumentForecastVisible: true });
  assert.equal(hidden.entityPanelsVisible, false);
  assert.deepEqual([hidden.instrumentExpressionVisible, hidden.instrumentPublicCueVisible, hidden.instrumentThoughtVisible, hidden.instrumentForecastVisible], [false, true, false, true]);
  const restored = normalizeGraphicsSettings({ ...hidden, entityPanelsVisible: true });
  assert.equal(restored.entityPanelsVisible, true);
  assert.deepEqual([restored.instrumentExpressionVisible, restored.instrumentPublicCueVisible, restored.instrumentThoughtVisible, restored.instrumentForecastVisible], [false, true, false, true]);
});
test("content visibility remains independent of uniform panel size", () => {
  const result = normalizeGraphicsSettings({ entityPanelScale: 1.5, instrumentExpressionVisible: false, instrumentPublicCueVisible: true, instrumentThoughtVisible: false, instrumentForecastVisible: true });
  assert.equal(result.entityPanelScale, 1.5);
  assert.deepEqual([result.instrumentExpressionVisible, result.instrumentPublicCueVisible, result.instrumentThoughtVisible, result.instrumentForecastVisible], [false, true, false, true]);
});
test("interface and font scaling are independent and bounded", () => {
  const defaults = normalizeGraphicsSettings({});
  assert.deepEqual([defaults.interfaceScale, defaults.fontScale], [.85, 1]);
  const custom = normalizeGraphicsSettings({ preset: "custom", interfaceScale: 4, fontScale: .2 });
  assert.deepEqual([custom.interfaceScale, custom.fontScale], [1.3, .85]);
});
test("semantic typography categories have readable first-run defaults and independent bounds", () => {
  const defaults = normalizeGraphicsSettings({});
  assert.deepEqual(
    [defaults.smallTextScale, defaults.bodyTextScale, defaults.controlTextScale, defaults.headingTextScale, defaults.titleTextScale],
    [1.5, 1.75, 1.3, 1, 1]
  );
  const custom = normalizeGraphicsSettings({ smallTextScale: .1, bodyTextScale: 9, controlTextScale: 1.15, headingTextScale: 1.3, titleTextScale: 1.5 });
  assert.deepEqual([custom.smallTextScale, custom.bodyTextScale, custom.controlTextScale, custom.headingTextScale, custom.titleTextScale], [.75, 1.75, 1.15, 1.3, 1.5]);
});
test("readable interface defaults match the first-run settings labels", () => {
  assert.deepEqual(READABLE_INTERFACE_DEFAULTS, {
    interfaceScale: .85,
    fontScale: 1,
    smallTextScale: 1.5,
    bodyTextScale: 1.75,
    controlTextScale: 1.3,
    headingTextScale: 1,
    titleTextScale: 1
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
