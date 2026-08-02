const TWO_PI = Math.PI * 2;
import { eatsMeat } from "./species-registry.js";
import { directVisionRangeMultiplier, isBlind, sensoryPhenotype } from "./biological-phenotypes.js";

export const VISION_PROFILES = Object.freeze({
  grazer: Object.freeze({ movingFov: Math.PI * 1.72, listeningFov: Math.PI * 1.82, scanningFov: Math.PI * 1.92, eyeHeight: 0.48 }),
  hunter: Object.freeze({ movingFov: Math.PI * 0.78, listeningFov: Math.PI * 0.98, scanningFov: Math.PI * 1.2, eyeHeight: 0.52 }),
});

export function visionProfile(speciesId, stationaryTicks = 0) {
  const sensory = sensoryPhenotype(speciesId), fallback = VISION_PROFILES[speciesId] || VISION_PROFILES[eatsMeat(speciesId) ? "hunter" : "grazer"];
  const radians = (sensory?.visualField ?? fallback.movingFov * 180 / Math.PI) * Math.PI / 180;
  const profile = { ...fallback, movingFov: radians, listeningFov: Math.min(TWO_PI, radians * 1.08), scanningFov: Math.min(TWO_PI, radians * 1.2), sensory };
  const fov = stationaryTicks >= 3 ? profile.scanningFov : stationaryTicks >= 1 ? profile.listeningFov : profile.movingFov;
  return { ...profile, fov };
}

export function visionHeading(viewer) { return (viewer.orientation || 0) + (viewer.headYaw || 0); }

export function visionFov(speciesId, stationaryTicks = 0) {
  return visionProfile(speciesId, stationaryTicks).fov;
}

export function angularDifference(a, b) {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}

export function withinVisionCone(viewer, target, range) {
  const dx = target.x - viewer.x, dz = target.z - viewer.z;
  if (Math.hypot(dx, dz) > range) return false;
  const bearing = Math.atan2(dz, dx), focusTicks = viewer.sensoryFocusTicks ?? viewer.focusTicks ?? viewer.stationaryTicks ?? 0;
  return Math.abs(angularDifference(bearing, visionHeading(viewer))) <= visionFov(viewer.speciesId, focusTicks) / 2;
}

// One deterministic query supplies both simulation sight and its diagnostic
// overlay. Cover reduces confidence; it never randomly blinks a visible target
// in and out of existence. Fully opaque vegetation and intervening terrain do
// block the ray.
export function evaluateVision(viewer, target, options = {}) {
  if (isBlind(viewer)) return { visible: false, reason: "blind", distance: Math.hypot(target.x - viewer.x, target.z - viewer.z), confidence: 0 };
  const sensory = sensoryPhenotype(viewer), range = Math.max(0, options.range || 0) * directVisionRangeMultiplier(viewer);
  const dx = target.x - viewer.x, dz = target.z - viewer.z;
  const distance = Math.hypot(dx, dz);
  if (distance > range) return { visible: false, reason: "range", distance, confidence: 0 };
  const bearing = distance > 1e-8 ? Math.atan2(dz, dx) : (viewer.orientation || 0);
  const focusTicks = viewer.sensoryFocusTicks ?? viewer.focusTicks ?? viewer.stationaryTicks ?? 0;
  const bearingOffset = angularDifference(bearing, visionHeading(viewer));
  if (Math.abs(bearingOffset) > visionFov(viewer.speciesId, focusTicks) / 2) return { visible: false, reason: "outside-cone", distance, bearingOffset, confidence: 0 };

  const surfaceHeight = options.surfaceHeight || (() => 0);
  const eyeHeight = options.eyeHeight ?? visionProfile(viewer.speciesId, focusTicks).eyeHeight;
  const targetHeight = options.targetHeight ?? eyeHeight * 0.8;
  const startY = surfaceHeight(viewer.x, viewer.z) + eyeHeight;
  const endY = surfaceHeight(target.x, target.z) + targetHeight;
  const stepLength = Math.max(0.25, options.stepLength || 0.6);
  const steps = Math.max(1, Math.ceil(distance / stepLength));
  let cover = 0;
  for (let index = 1; index < steps; index += 1) {
    const t = index / steps, x = viewer.x + dx * t, z = viewer.z + dz * t;
    const rayY = startY + (endY - startY) * t;
    if (surfaceHeight(x, z) > rayY - (options.terrainClearance ?? 0.05)) return { visible: false, reason: "terrain", distance, bearingOffset, confidence: 0 };
    const localCover = Math.max(0, options.coverOpacity?.(x, z, t) || 0);
    if (localCover >= (options.maxCover ?? 0.72)) return { visible: false, reason: "cover", distance, bearingOffset, confidence: 0 };
    cover += localCover * Math.min(1, stepLength);
    if (cover >= (options.maxCover ?? 0.72)) return { visible: false, reason: "cover", distance, bearingOffset, confidence: 0 };
  }
  const rangeConfidence = 1 - distance / Math.max(1e-8, range);
  const edgeConfidence = 1 - Math.abs(bearingOffset) / Math.max(1e-8, visionFov(viewer.speciesId, focusTicks) / 2);
  const salience = Math.max(0, options.salience ?? 1), acuity = distance <= range * .35 ? sensory?.nearAcuity || 1 : sensory?.farAcuity || 1;
  const confidence = Math.max(0.08, Math.min(1, (0.28 + rangeConfidence * 0.58 + edgeConfidence * 0.14) * (1 - cover) * salience * acuity));
  return { visible: true, reason: "visible", distance, bearingOffset, confidence, cover, spectral: sensory?.colourVision || "dichromatic", ultraviolet: sensory?.ultraviolet || 0, binocular: Math.abs(bearingOffset) <= ((sensory?.binocularOverlap || 0) * Math.PI / 360) };
}

export function visionBoundaryPoint(viewer, range, fraction) {
  const fov = visionFov(viewer.speciesId, viewer.stationaryTicks || 0);
  const angle = (viewer.orientation || 0) - fov / 2 + fov * Math.max(0, Math.min(1, fraction));
  return { x: viewer.x + Math.cos(angle) * range, z: viewer.z + Math.sin(angle) * range, angle: ((angle % TWO_PI) + TWO_PI) % TWO_PI };
}
