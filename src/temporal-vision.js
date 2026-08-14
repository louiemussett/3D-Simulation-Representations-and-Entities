import { SPECIES_IDS } from "./species-registry.js";
import { biologicalPhenotype, sensoryPhenotype } from "./biological-phenotypes.js";

const clamp = (value, low, high) => Math.max(low, Math.min(high, Number(value) || 0));
const freeze = value => { if (value && typeof value === "object" && !Object.isFrozen(value)) { for (const child of Object.values(value)) freeze(child); Object.freeze(value); } return value; };

export const TEMPORAL_VISION_SCHEMA = 2;
const REPTILES = new Set(["waterline-ambusher", "sunscale-ambusher", "shieldback-colony"]);
const BIRDS = new Set(["carrion-runner", "cold-country-scavenger", "common-ostrich"]);
export const TEMPORAL_VISION_RESEARCH_SOURCES = freeze({
  "temporal-vision-review-2021": { title: "Temporal vision: measures, mechanisms and meaning", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8353166/", role: "comparative-framework" },
  "healy-etal-2013": { title: "Metabolic rate and body size are linked with perception of temporal information", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3791410/", role: "comparative-vertebrate-model" },
  "dog-cff-1989": { title: "Behavioral determination of critical flicker fusion in dogs", url: "https://pubmed.ncbi.nlm.nih.gov/2813532/", role: "close-species-proxy-for-grey-wolf" },
  "chicken-cff-2011": { title: "Behavioural assessment of flicker fusion frequency in chicken", url: "https://www.sciencedirect.com/science/article/pii/S0042698911001519", role: "avian-proxy" }
});

export const TEMPORAL_VISION_PROFILES = freeze(Object.fromEntries(SPECIES_IDS.map(speciesId => {
  const reptile = REPTILES.has(speciesId), bird = BIRDS.has(speciesId), senses = sensoryPhenotype(speciesId) || {};
  const baseHz = reptile ? 34 : bird ? 96 : 62;
  const wolfModel = ["hunter", "ridge-hunter-updated"].includes(speciesId), pheasantProxy = speciesId === "cold-country-scavenger";
  const evidenceGrade = wolfModel ? "close-species-proxy" : pheasantProxy ? "family-proxy" : "composite-model";
  const sourceIds = wolfModel ? ["dog-cff-1989", "temporal-vision-review-2021"] : bird ? ["chicken-cff-2011", "healy-etal-2013", "temporal-vision-review-2021"] : ["healy-etal-2013", "temporal-vision-review-2021"];
  const referenceResolutionHz = Math.round(baseHz * clamp(.72 + Number(senses.motionSensitivity || .8) * .28, .7, 1.35));
  const uncertaintyFraction = wolfModel ? .22 : pheasantProxy ? .28 : .38;
  return [speciesId, {
    schemaVersion: TEMPORAL_VISION_SCHEMA, speciesId,
    referenceResolutionHz,
    plausibleRangeHz: Object.freeze([Math.max(10, Math.round(referenceResolutionHz * (1 - uncertaintyFraction))), Math.round(referenceResolutionHz * (1 + uncertaintyFraction))]),
    lowLightMultiplier: clamp(.58 + Number(senses.lowLight || .6) * .28, .55, .95),
    motionSensitivity: Number(senses.motionSensitivity || .8),
    thermalDependence: reptile ? 1 : 0,
    evidenceGrade,
    confidence: wolfModel ? .48 : pheasantProxy ? .45 : .35,
    sourceIds,
    extractionMethod: wolfModel ? "close-species behavioural proxy" : bird ? "comparative avian proxy plus allometric model" : "comparative allometric model",
    proxyTaxon: wolfModel ? "Canis familiaris" : bird ? "Gallus gallus domesticus" : null,
    knownGap: "Exact-species behavioural temporal-resolution measurements remain required before this profile can pass the exact-species readiness gate."
  }];
})));

export function temporalVisionProfile(subject) { return TEMPORAL_VISION_PROFILES[typeof subject === "string" ? subject : subject?.speciesId] || null; }

export function effectiveTemporalResolution(subject, { illumination = 1, attention = 1, fatigue = subject?.fatigue || 0, thermalPerformance = subject?.thermalPerformance ?? 1 } = {}) {
  const profile = temporalVisionProfile(subject); if (!profile) return null;
  const light = clamp(illumination, 0, 1), lightFactor = profile.lowLightMultiplier + (1 - profile.lowLightMultiplier) * Math.sqrt(light);
  const attentionFactor = clamp(.72 + Number(attention || 0) * .28, .55, 1.18), fatigueFactor = clamp(1 - Number(fatigue || 0) / 180, .38, 1);
  const thermalFactor = profile.thermalDependence ? clamp(.12 + Number(thermalPerformance || 0) * .88, .12, 1) : 1;
  const effectiveHz = profile.referenceResolutionHz * lightFactor * attentionFactor * fatigueFactor * thermalFactor;
  return Object.freeze({ profileId: profile.speciesId, referenceHz: profile.referenceResolutionHz, effectiveHz: Number(effectiveHz.toFixed(2)), sampleIntervalSeconds: Number((1 / Math.max(1, effectiveHz)).toFixed(5)), lightFactor: Number(lightFactor.toFixed(3)), attentionFactor: Number(attentionFactor.toFixed(3)), fatigueFactor: Number(fatigueFactor.toFixed(3)), thermalFactor: Number(thermalFactor.toFixed(3)), evidenceGrade: profile.evidenceGrade, confidence: profile.confidence });
}

export function temporalMotionEstimate(observer, target, sightConfidence, options = {}) {
  const temporal = effectiveTemporalResolution(observer, options), speed = Math.hypot(target.vx || 0, target.vz || 0), profile = temporalVisionProfile(observer);
  if (!temporal || !profile) return Object.freeze({ detected: false, motionConfidence: 0, velocityConfidence: 0, velocityUncertainty: null, temporal: null });
  const temporalRatio = clamp(temporal.effectiveHz / Math.max(1, profile.referenceResolutionHz), .1, 1.2), movementSignal = clamp(speed * 5.5 * profile.motionSensitivity, 0, 1);
  const motionConfidence = clamp(Number(sightConfidence || 0) * temporalRatio * (.22 + movementSignal * .78), 0, 1), velocityConfidence = clamp(motionConfidence * temporalRatio * (speed > .001 ? 1 : .35), 0, 1);
  const uncertainty = speed > .001 ? (1 - velocityConfidence) * Math.max(.04, speed) + speed * temporal.sampleIntervalSeconds : 0;
  return Object.freeze({ detected: speed > .035 && motionConfidence >= .12, motionConfidence: Number(motionConfidence.toFixed(3)), velocityConfidence: Number(velocityConfidence.toFixed(3)), velocityUncertainty: Number(uncertainty.toFixed(4)), temporal });
}

export function validateTemporalVisionProfiles(profiles = TEMPORAL_VISION_PROFILES) {
  const errors = [];
  for (const speciesId of SPECIES_IDS) { const profile = profiles[speciesId]; if (!profile) errors.push(`${speciesId}: missing temporal profile`); else if (!(profile.referenceResolutionHz > 0)) errors.push(`${speciesId}: invalid temporal resolution`); else if (!profile.evidenceGrade) errors.push(`${speciesId}: missing evidence grade`); else if (!Array.isArray(profile.plausibleRangeHz) || profile.plausibleRangeHz[0] > profile.referenceResolutionHz || profile.plausibleRangeHz[1] < profile.referenceResolutionHz) errors.push(`${speciesId}: invalid uncertainty range`); else for (const sourceId of profile.sourceIds || []) if (!TEMPORAL_VISION_RESEARCH_SOURCES[sourceId]) errors.push(`${speciesId}: unknown source ${sourceId}`); }
  return errors;
}
