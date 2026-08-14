const ENTITY_CONSTELLATION_DEFAULTS = Object.freeze({
  largeMapPerformanceMode: false,
  observerZoomLevel: "far",
  observerHazeMode: "natural",
  entityPanelScale: .4,
  entityPublicPanelScale: .4,
  entitySelectedPanelScale: .4,
  entityPanelTextScale: 1.3,
  entityPanelStyle: "classic-rail",
  entityPanelContentPreset: "custom",
  entityBubbleScale: 1,
  // Bubbles always originate above the animal. Retain the field only so old
  // preferences migrate deterministically instead of restoring panel anchoring.
  entityBubbleOrigin: "head",
  entityPanelIdentityVisible: true,
  entityPanelExpressionVisible: true,
  entityPanelPublicCueVisible: true,
  entityPanelHealthVisible: true,
  entityPanelConcernVisible: false,
  entityPanelForecastEffectVisible: false,
  entityPanelMetabolicVisible: false,
  entityPanelPerformanceVisible: false,
  entityPanelThoughtVisible: true,
  entityPanelForecastVisible: true,
  // Retained as migration data for saves made before the constellation became
  // one uniformly scaled surface. Runtime panel composition no longer reads
  // these component scales.
  entityIdentityScale: 1,
  entityExpressionScale: 1.25,
  entityIconScale: 1.25,
  thoughtScale: 1.25,
  predictionScale: 1.25,
  // Identity/status panels are optional. Private thought and forecast bubbles
  // have their own switches and remain available without a panel.
  entityAttachedPanelsVisible: false,
  entityPanelsVisible: false,
  entityPublicPanelsVisible: false,
  entitySelectedPresentationVisible: false,
  instrumentExpressionVisible: true,
  instrumentPublicCueVisible: true,
  instrumentThoughtVisible: true,
  instrumentForecastVisible: true
});

const graphicsPresetDefinition = (overrides) => Object.freeze({
  ...ENTITY_CONSTELLATION_DEFAULTS,
  ...overrides
});

export const GRAPHICS_PRESETS = Object.freeze({
  low: graphicsPresetDefinition({ iconTextureQuality: 1, renderScale: .65, adaptiveMinScale: .5, adaptiveMaxScale: .65, vegetationStride: 4, animalDetail: .72, diagnosticScale: 1.25, effects: false, contactShadows: false, adaptiveResolution: true, frameCap: 30, weatherCloudQuality: "low", weatherLocalPrecipitation: true, weatherDistantShafts: false, weatherCloudShadows: true, weatherWetGround: true, weatherSplashes: false, weatherLightning: false, weatherHaze: true, weatherParticleDensity: .45 }),
  balanced: graphicsPresetDefinition({ iconTextureQuality: 2, renderScale: 1, adaptiveMinScale: .65, adaptiveMaxScale: 1, vegetationStride: 2, animalDetail: 1, diagnosticScale: 1.25, effects: true, contactShadows: true, adaptiveResolution: true, frameCap: 30, weatherCloudQuality: "high", weatherLocalPrecipitation: true, weatherDistantShafts: true, weatherCloudShadows: true, weatherWetGround: true, weatherSplashes: true, weatherLightning: true, weatherHaze: true, weatherParticleDensity: .75 }),
  high: graphicsPresetDefinition({ iconTextureQuality: 4, renderScale: 1.25, adaptiveMinScale: .75, adaptiveMaxScale: 1.25, vegetationStride: 1, animalDetail: 1.22, diagnosticScale: 1.25, effects: true, contactShadows: true, adaptiveResolution: true, frameCap: 60, weatherCloudQuality: "cinematic", weatherLocalPrecipitation: true, weatherDistantShafts: true, weatherCloudShadows: true, weatherWetGround: true, weatherSplashes: true, weatherLightning: true, weatherHaze: true, weatherParticleDensity: 1 }),
  ultra: graphicsPresetDefinition({ iconTextureQuality: 8, renderScale: 1.5, adaptiveMinScale: .75, adaptiveMaxScale: 1.5, vegetationStride: 1, animalDetail: 1.5, diagnosticScale: 1.25, effects: true, contactShadows: true, adaptiveResolution: true, frameCap: 60, weatherCloudQuality: "cinematic", weatherLocalPrecipitation: true, weatherDistantShafts: true, weatherCloudShadows: true, weatherWetGround: true, weatherSplashes: true, weatherLightning: true, weatherHaze: true, weatherParticleDensity: 1.35 })
});
const FIRST_RUN_GRAPHICS_DEFAULTS = graphicsPresetDefinition({
  iconTextureQuality: 2,
  renderScale: 1,
  adaptiveMinScale: .75,
  adaptiveMaxScale: 1.25,
  vegetationStride: 2,
  animalDetail: 1,
  diagnosticScale: 1.25,
  effects: true,
  contactShadows: true,
  adaptiveResolution: true,
  frameCap: 30,
  weatherCloudQuality: "high",
  weatherLocalPrecipitation: true,
  weatherDistantShafts: true,
  weatherCloudShadows: true,
  weatherWetGround: true,
  weatherSplashes: true,
  weatherLightning: true,
  weatherHaze: true,
  weatherScientificOverlay: false,
  weatherOverlayLayer: "precipitation",
  weatherParticleDensity: .75
});
export const READABLE_INTERFACE_DEFAULTS = Object.freeze({
  interfaceScale: .85,
  fontScale: 1.15,
  smallTextScale: 1.3,
  bodyTextScale: 1.15,
  controlTextScale: 1,
  headingTextScale: 1,
  titleTextScale: .75
});
// Reference/Documentation previews are transient explanatory thumbnails. They
// never need the 4x/8x texture tiers used by close world-space symbols, and
// allowing those tiers here multiplies both data-URL work and retained image
// memory for no meaningful readability gain.
export const DOCUMENTATION_PREVIEW_QUALITY_CAP = 2;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const nearest = (value, choices) => choices.reduce((best, choice) => Math.abs(choice - value) < Math.abs(best - value) ? choice : best, choices[0]);
export function documentationPreviewQuality(iconTextureQuality = 2) {
  const quality = [1, 2, 4, 8].includes(Number(iconTextureQuality)) ? Number(iconTextureQuality) : 2;
  return Math.min(quality, DOCUMENTATION_PREVIEW_QUALITY_CAP);
}
export function normalizeGraphicsSettings(value = {}) {
  const namedPreset = GRAPHICS_PRESETS[value.preset];
  const base = namedPreset || FIRST_RUN_GRAPHICS_DEFAULTS;
  const preset = namedPreset ? value.preset : "custom";
  const renderScale = clamp(Number(value.renderScale ?? base.renderScale), .5, 1.5);
  const adaptiveMaxScale = clamp(Number(value.adaptiveMaxScale ?? value.renderScale ?? base.adaptiveMaxScale), .5, 1.5);
  const adaptiveMinScale = clamp(Number(value.adaptiveMinScale ?? base.adaptiveMinScale), .5, adaptiveMaxScale);
  const entityIconScale = clamp(Number(value.entityIconScale ?? base.entityIconScale), .75, 2);
  const thoughtScale = clamp(Number(value.thoughtScale ?? base.thoughtScale), .75, 2);
  const requestedPanelTextScale = Number(value.entityPanelTextScale ?? base.entityPanelTextScale);
  // Older saves had only a generic entity-icon size and a thought size. Use
  // their smaller normalized value as the new panel minimum, then let the
  // responsive card grow only when a larger child would otherwise overflow.
  const hasLegacyComponentScale = value.entityIconScale != null || value.thoughtScale != null || value.predictionScale != null || value.entityIdentityScale != null || value.entityExpressionScale != null;
  const panelScaleChoices = [.1, .2, .3, .4, .5, .6, .8, 1, 1.25, 1.5];
  const migratedPanelScale = hasLegacyComponentScale
    ? nearest(clamp(Math.min(entityIconScale, thoughtScale) / 1.25, .1, 1.5), panelScaleChoices)
    : base.entityPanelScale;
  const hasOldPanelConfiguration = value.entityPanelScale != null || value.instrumentExpressionVisible != null || value.instrumentPublicCueVisible != null || value.instrumentThoughtVisible != null || value.instrumentForecastVisible != null;
  // Saves made before public rails and selected instruments had independent
  // controls migrate their single panel scale to both surfaces. Once either
  // dedicated value exists, it is authoritative for that surface.
  const legacyPanelScale = nearest(clamp(Number(value.entityPanelScale ?? migratedPanelScale), .1, 1.5), panelScaleChoices);
  const entityPublicPanelScale = nearest(clamp(Number(value.entityPublicPanelScale ?? legacyPanelScale), .1, 1.5), panelScaleChoices);
  const entitySelectedPanelScale = nearest(clamp(Number(value.entitySelectedPanelScale ?? legacyPanelScale), .1, 1.5), panelScaleChoices);
  // This dedicated value separates optional identity/status panels from the
  // private bubbles. Old combined switches deliberately migrate to the new
  // panel-off default instead of making a removed panel reappear.
  const entityAttachedPanelsVisible = value.entityAttachedPanelsVisible ?? false;
  const entityPublicPanelsVisible = entityAttachedPanelsVisible !== false;
  const entitySelectedPresentationVisible = entityAttachedPanelsVisible !== false;
  // The experimental design and information presets were removed. Retain
  // stable compatibility fields so older saves load without data loss, but
  // always render the proven thick rail plus selected main instrument.
  const entityPanelStyle = "classic-rail";
  const entityPanelContentPreset = "custom";
  const moduleValue = (name, legacyName, fallback) => value[name] ?? (legacyName ? value[legacyName] : undefined) ?? fallback;
  const iconTextureQuality = [1, 2, 4, 8].includes(Number(value.iconTextureQuality ?? base.iconTextureQuality)) ? Number(value.iconTextureQuality ?? base.iconTextureQuality) : 2;
  const requestedFrameCap = Number(value.frameCap ?? base.frameCap);
  // The renderer has two intentional pacing targets. Migrate the removed
  // 45-FPS option down to the stable default and the former unlimited option
  // to the hard 60-FPS ceiling.
  const frameCap = requestedFrameCap === 45 ? 30 : requestedFrameCap === 0 ? 60 : [30, 60].includes(requestedFrameCap) ? requestedFrameCap : base.frameCap;
  return {
    preset,
    largeMapPerformanceMode: value.largeMapPerformanceMode === true,
    observerZoomLevel: ["map-sized", "far", "very-far", "extreme"].includes(value.observerZoomLevel) ? value.observerZoomLevel : "far",
    observerHazeMode: ["off", "light", "natural"].includes(value.observerHazeMode) ? value.observerHazeMode : "natural",
    iconTextureQuality,
    documentationPreviewQuality: documentationPreviewQuality(iconTextureQuality),
    renderScale,
    adaptiveMinScale,
    adaptiveMaxScale,
    vegetationStride: clamp(Math.round(Number(value.vegetationStride ?? base.vegetationStride)), 1, 5),
    animalDetail: clamp(Number(value.animalDetail ?? base.animalDetail), .6, 1.6),
    // `entityPanelScale` remains a compatibility alias for old saves and
    // extensions. Runtime layout uses the two explicit values below.
    entityPanelScale: entitySelectedPanelScale,
    entityPublicPanelScale,
    entitySelectedPanelScale,
    entityPanelTextScale: nearest(clamp(Number.isFinite(requestedPanelTextScale) ? requestedPanelTextScale : base.entityPanelTextScale, .75, 2), [.75, .9, 1, 1.15, 1.3, 1.5, 2]),
    entityPanelStyle,
    entityPanelContentPreset,
    entityBubbleScale: nearest(clamp(Number(value.entityBubbleScale ?? base.entityBubbleScale), .5, 1.5), [.5, .75, 1, 1.25, 1.5]),
    entityBubbleOrigin: "head",
    entityPanelIdentityVisible: moduleValue("entityPanelIdentityVisible", null, base.entityPanelIdentityVisible) !== false,
    entityPanelExpressionVisible: moduleValue("entityPanelExpressionVisible", "instrumentExpressionVisible", base.entityPanelExpressionVisible) !== false,
    entityPanelPublicCueVisible: moduleValue("entityPanelPublicCueVisible", "instrumentPublicCueVisible", base.entityPanelPublicCueVisible) !== false,
    entityPanelHealthVisible: moduleValue("entityPanelHealthVisible", null, hasOldPanelConfiguration ? true : base.entityPanelHealthVisible) !== false,
    entityPanelConcernVisible: moduleValue("entityPanelConcernVisible", null, hasOldPanelConfiguration ? true : base.entityPanelConcernVisible) !== false,
    entityPanelForecastEffectVisible: moduleValue("entityPanelForecastEffectVisible", null, hasOldPanelConfiguration ? true : base.entityPanelForecastEffectVisible) !== false,
    entityPanelMetabolicVisible: moduleValue("entityPanelMetabolicVisible", null, hasOldPanelConfiguration ? true : base.entityPanelMetabolicVisible) !== false,
    entityPanelPerformanceVisible: moduleValue("entityPanelPerformanceVisible", null, hasOldPanelConfiguration ? true : base.entityPanelPerformanceVisible) !== false,
    entityPanelThoughtVisible: moduleValue("entityPanelThoughtVisible", "instrumentThoughtVisible", base.entityPanelThoughtVisible) !== false,
    entityPanelForecastVisible: moduleValue("entityPanelForecastVisible", "instrumentForecastVisible", base.entityPanelForecastVisible) !== false,
    // Legacy component fields round-trip without data loss, but the active
    // renderer uses the dedicated public/selected root scale; these legacy
    // child values are retained only for round-trip compatibility.
    entityIdentityScale: clamp(Number(value.entityIdentityScale ?? base.entityIdentityScale), .75, 1.5),
    entityExpressionScale: clamp(Number(value.entityExpressionScale ?? value.entityIconScale ?? base.entityExpressionScale), .75, 2),
    entityIconScale,
    thoughtScale,
    predictionScale: clamp(Number(value.predictionScale ?? value.thoughtScale ?? base.predictionScale), .75, 2),
    // Compatibility alias: old integrations still understand this as the
    // complete presentation being visible only when both surfaces are shown.
    entityPanelsVisible: entityPublicPanelsVisible !== false && entitySelectedPresentationVisible !== false,
    entityAttachedPanelsVisible,
    entityPublicPanelsVisible: entityPublicPanelsVisible !== false,
    entitySelectedPresentationVisible: entitySelectedPresentationVisible !== false,
    instrumentExpressionVisible: moduleValue("entityPanelExpressionVisible", "instrumentExpressionVisible", base.instrumentExpressionVisible) !== false,
    instrumentPublicCueVisible: moduleValue("entityPanelPublicCueVisible", "instrumentPublicCueVisible", base.instrumentPublicCueVisible) !== false,
    instrumentThoughtVisible: moduleValue("entityPanelThoughtVisible", "instrumentThoughtVisible", base.instrumentThoughtVisible) !== false,
    instrumentForecastVisible: moduleValue("entityPanelForecastVisible", "instrumentForecastVisible", base.instrumentForecastVisible) !== false,
    diagnosticScale: clamp(Number(value.diagnosticScale ?? base.diagnosticScale), .75, 1.75),
    diagnosticTextScale: clamp(Number(value.diagnosticTextScale ?? 1.15), .85, 1.5),
    interfaceScale: clamp(Number(value.interfaceScale ?? READABLE_INTERFACE_DEFAULTS.interfaceScale), .85, 1.3),
    fontScale: clamp(Number(value.fontScale ?? READABLE_INTERFACE_DEFAULTS.fontScale), .85, 1.3),
    smallTextScale: clamp(Number(value.smallTextScale ?? READABLE_INTERFACE_DEFAULTS.smallTextScale), .75, 1.75),
    bodyTextScale: clamp(Number(value.bodyTextScale ?? READABLE_INTERFACE_DEFAULTS.bodyTextScale), .75, 1.75),
    controlTextScale: clamp(Number(value.controlTextScale ?? READABLE_INTERFACE_DEFAULTS.controlTextScale), .75, 1.75),
    headingTextScale: clamp(Number(value.headingTextScale ?? READABLE_INTERFACE_DEFAULTS.headingTextScale), .75, 1.75),
    titleTextScale: clamp(Number(value.titleTextScale ?? READABLE_INTERFACE_DEFAULTS.titleTextScale), .75, 1.75),
    effects: value.effects ?? base.effects,
    contactShadows: value.contactShadows ?? base.contactShadows,
    weatherCloudQuality: ["off", "low", "high", "cinematic"].includes(value.weatherCloudQuality ?? base.weatherCloudQuality) ? (value.weatherCloudQuality ?? base.weatherCloudQuality) : "high",
    weatherLocalPrecipitation: value.weatherLocalPrecipitation ?? base.weatherLocalPrecipitation ?? true,
    weatherDistantShafts: value.weatherDistantShafts ?? base.weatherDistantShafts ?? true,
    weatherCloudShadows: value.weatherCloudShadows ?? base.weatherCloudShadows ?? true,
    weatherWetGround: value.weatherWetGround ?? base.weatherWetGround ?? true,
    weatherSplashes: value.weatherSplashes ?? base.weatherSplashes ?? true,
    weatherLightning: value.weatherLightning ?? base.weatherLightning ?? true,
    weatherHaze: value.weatherHaze ?? base.weatherHaze ?? true,
    weatherScientificOverlay: value.weatherScientificOverlay === true,
    weatherOverlayLayer: ["precipitation", "cloud-cover", "ground-wetness", "visibility", "storm"].includes(value.weatherOverlayLayer) ? value.weatherOverlayLayer : "precipitation",
    weatherParticleDensity: nearest(clamp(Number(value.weatherParticleDensity ?? base.weatherParticleDensity ?? .75), .35, 1.5), [.35, .45, .6, .75, 1, 1.35, 1.5]),
    adaptiveResolution: value.adaptiveResolution ?? base.adaptiveResolution,
    frameCap
  };
}
export function graphicsPreset(name) { return normalizeGraphicsSettings({ preset: name }); }
