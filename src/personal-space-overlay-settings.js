export const PERSONAL_SPACE_OVERLAY_SETTINGS_KEY = "rss-personal-space-overlay-settings-v1";

export const DEFAULT_PERSONAL_SPACE_OVERLAY_SETTINGS = Object.freeze({
  enabled: false,
  relationshipMode: "primary",
  scope: "selected",
  preferredBand: true,
  minimumBoundary: true,
  maximumBoundary: true,
  releaseThreshold: true,
  directionArrows: true,
  attractionPressure: true,
  avoidancePressure: true,
  threatPressure: true,
  affiliationCarePressure: true,
  courtshipPressure: true,
  currentBand: true,
  uncertainty: false,
  truthVsPerceived: false,
  relationshipLabels: true,
  opacity: 70,
  maximumEntities: 5,
  legacyFallback: true,
  laboratoryDetails: true,
});

const booleanKeys = Object.keys(DEFAULT_PERSONAL_SPACE_OVERLAY_SETTINGS)
  .filter((key) => typeof DEFAULT_PERSONAL_SPACE_OVERLAY_SETTINGS[key] === "boolean");

export function normalizePersonalSpaceOverlaySettings(value = {}) {
  const source = value && typeof value === "object" ? value : {};
  const normalized = { ...DEFAULT_PERSONAL_SPACE_OVERLAY_SETTINGS };
  normalized.relationshipMode = ["primary", "several"].includes(source.relationshipMode) ? source.relationshipMode : normalized.relationshipMode;
  normalized.scope = ["selected", "nearby", "visible"].includes(source.scope) ? source.scope : normalized.scope;
  for (const key of booleanKeys) if (typeof source[key] === "boolean") normalized[key] = source[key];
  normalized.opacity = Math.max(15, Math.min(100, Math.round(Number(source.opacity) || normalized.opacity)));
  normalized.maximumEntities = Math.max(1, Math.min(20, Math.round(Number(source.maximumEntities) || normalized.maximumEntities)));
  return normalized;
}

export function loadPersonalSpaceOverlaySettings(storage) {
  try { return normalizePersonalSpaceOverlaySettings(JSON.parse(storage?.getItem(PERSONAL_SPACE_OVERLAY_SETTINGS_KEY) || "{}")); }
  catch { return normalizePersonalSpaceOverlaySettings(); }
}

export function savePersonalSpaceOverlaySettings(storage, settings) {
  const normalized = normalizePersonalSpaceOverlaySettings(settings);
  try { storage?.setItem(PERSONAL_SPACE_OVERLAY_SETTINGS_KEY, JSON.stringify(normalized)); } catch {}
  return normalized;
}

export function pressureChannelsForState(state = {}, settings = DEFAULT_PERSONAL_SPACE_OVERLAY_SETTINGS) {
  const relationship = String(state.relationshipClass || "");
  return {
    threat: settings.threatPressure ? Number(state.threatPressure || 0) : 0,
    avoidance: settings.avoidancePressure ? Math.max(Number(state.crowdingPressure || 0), Number(state.autonomyPressure || 0)) : 0,
    attraction: settings.attractionPressure ? Number(state.attractionPressure || 0) : 0,
    affiliationCare: settings.affiliationCarePressure ? Math.max(Number(state.affiliationPressure || 0), Number(state.carePressure || 0)) : 0,
    courtship: settings.courtshipPressure && /mate|courtship|reproductive/.test(relationship) ? Math.max(.2, Number(state.attractionPressure || 0)) : 0,
  };
}

export function dominantPressureChannel(state, settings) {
  return Object.entries(pressureChannelsForState(state, settings)).sort((left, right) => right[1] - left[1])[0] || ["neutral", 0];
}
