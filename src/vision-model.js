const TWO_PI = Math.PI * 2;
import { eatsMeat } from "./species-registry.js";
import { directVisionRangeMultiplier, isBlind, sensoryPhenotype } from "./biological-phenotypes.js";
import { sensorAnatomicalEyeHeight, sensorDefinitions, sensorWorldAnchor } from "./sensor-anatomy.js";

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

export function eyeDetection(viewer, bearing, sensory = sensoryPhenotype(viewer)) {
  const heading = visionHeading(viewer), total = (sensory?.visualField || 0) * Math.PI / 180, overlap = Math.min(total, (sensory?.binocularOverlap || 0) * Math.PI / 180);
  const eyeField = (total + overlap) / 2, separation = Math.max(0, total - overlap) / 2;
  const left = Math.abs(angularDifference(bearing, heading - separation / 2)) <= eyeField / 2;
  const right = Math.abs(angularDifference(bearing, heading + separation / 2)) <= eyeField / 2;
  return Object.freeze({ left, right, binocular: left && right, detectedBy: Object.freeze([...(left ? ["left-eye"] : []), ...(right ? ["right-eye"] : [])]) });
}

function traceEyeRay(anchor, target, options, endY) {
  const dx = target.x - anchor.x, dz = target.z - anchor.z, distance = Math.hypot(dx, dz), stepLength = Math.max(.25, options.stepLength || .6), steps = Math.max(1, Math.ceil(distance / stepLength));
  let cover = 0; const layers = new Set();
  for (let index = 1; index < steps; index += 1) {
    const t = index / steps, x = anchor.x + dx * t, z = anchor.z + dz * t, rayY = anchor.y + (endY - anchor.y) * t;
    if (options.surfaceHeight(x, z) > rayY - (options.terrainClearance ?? .05)) return Object.freeze({ visible: false, reason: "terrain", cover });
    const coverSample = options.coverOpacity?.(x, z, t) || 0, localCover = Math.max(0, typeof coverSample === "object" ? Number(coverSample.opacity || 0) : Number(coverSample || 0));
    if (typeof coverSample === "object") for (const layer of coverSample.layers || [coverSample.layer].filter(Boolean)) layers.add(layer);
    if (localCover >= (options.maxCover ?? .72)) return Object.freeze({ visible: false, reason: "cover", cover: cover + localCover, layers: Object.freeze([...layers]) });
    cover += localCover * Math.min(1, stepLength);
    if (cover >= (options.maxCover ?? .72)) return Object.freeze({ visible: false, reason: "cover", cover, layers: Object.freeze([...layers]) });
  }
  return Object.freeze({ visible: true, reason: "visible", cover, layers: Object.freeze([...layers]) });
}

export function integrateEyeObservations(observations) {
  const visible = observations.filter(observation => observation.visible), detectedBy = visible.map(observation => observation.sensorId), binocular = detectedBy.includes("left-eye") && detectedBy.includes("right-eye");
  const confidenceScale = binocular ? 1.05 : visible.length ? .88 : 0;
  const visibleBodyFraction = visible.length ? visible.reduce((sum, observation) => sum + Number(observation.visibleBodyFraction || 0), 0) / visible.length : 0;
  return Object.freeze({ visible: visible.length > 0, binocular, monocular: visible.length === 1, detectedBy: Object.freeze(detectedBy), confidenceScale, visibleBodyFraction, observations: Object.freeze(observations) });
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
  options = { ...options, surfaceHeight };
  const eyeHeight = options.eyeHeight ?? sensorAnatomicalEyeHeight(viewer);
  const targetHeight = options.targetHeight ?? eyeHeight * 0.8;
  const endY = surfaceHeight(target.x, target.z) + targetHeight;
  const eyeSensors = sensorDefinitions(viewer).filter(sensor => sensor.type === "eye");
  const eyeObservations = eyeSensors.map(sensor => {
    const anchor = sensorWorldAnchor(viewer, sensor, { eyeHeight, surfaceHeight }), sensorBearing = Math.atan2(target.z - anchor.z, target.x - anchor.x), insideField = Math.abs(angularDifference(sensorBearing, anchor.heading)) <= Number(sensor.fieldDegrees || 0) * Math.PI / 360;
    if (!insideField) return Object.freeze({ sensorId: sensor.id, visible: false, reason: "outside-eye-field", anchor });
    const bodyRays = [.28, .62, 1].map(fraction => traceEyeRay(anchor, target, options, surfaceHeight(target.x, target.z) + targetHeight * fraction));
    const visibleRays = bodyRays.filter(ray => ray.visible), visibleBodyFraction = visibleRays.length / bodyRays.length;
    const representative = visibleRays.sort((left, right) => left.cover - right.cover)[0] || bodyRays[0];
    return Object.freeze({ sensorId: sensor.id, anchor, visible: visibleRays.length > 0, reason: visibleRays.length ? "visible" : representative.reason, cover: representative.cover, visibleBodyFraction, occlusionLayers: Object.freeze([...new Set(bodyRays.flatMap(ray => ray.layers || []))]), bodyRays: Object.freeze(bodyRays) });
  });
  const integrated = integrateEyeObservations(eyeObservations);
  if (!integrated.visible) {
    const blocked = eyeObservations.find(observation => ["terrain", "cover"].includes(observation.reason));
    return { visible: false, reason: blocked?.reason || "outside-eye-field", distance, bearingOffset, confidence: 0, binocular: false, monocular: false, detectedBy: integrated.detectedBy, eyeObservations: integrated.observations };
  }
  const cover = Math.min(...eyeObservations.filter(observation => observation.visible).map(observation => observation.cover || 0));
  const rangeConfidence = 1 - distance / Math.max(1e-8, range);
  const edgeConfidence = 1 - Math.abs(bearingOffset) / Math.max(1e-8, visionFov(viewer.speciesId, focusTicks) / 2);
  const salience = Math.max(0, options.salience ?? 1), acuity = distance <= range * .35 ? sensory?.nearAcuity || 1 : sensory?.farAcuity || 1;
  const confidence = Math.max(0.08, Math.min(1, (0.28 + rangeConfidence * 0.58 + edgeConfidence * 0.14) * (1 - cover) * (.42 + integrated.visibleBodyFraction * .58) * salience * acuity * integrated.confidenceScale));
  return { visible: true, reason: "visible", distance, bearingOffset, confidence, cover, visibleBodyFraction: integrated.visibleBodyFraction, spectral: sensory?.colourVision || "dichromatic", ultraviolet: sensory?.ultraviolet || 0, binocular: integrated.binocular, monocular: integrated.monocular, detectedBy: integrated.detectedBy, eyeObservations: integrated.observations };
}

export function visionBoundaryPoint(viewer, range, fraction) {
  const fov = visionFov(viewer.speciesId, viewer.stationaryTicks || 0);
  const angle = (viewer.orientation || 0) - fov / 2 + fov * Math.max(0, Math.min(1, fraction));
  return { x: viewer.x + Math.cos(angle) * range, z: viewer.z + Math.sin(angle) * range, angle: ((angle % TWO_PI) + TWO_PI) % TWO_PI };
}
