import { acousticProfile } from "./acoustic-profiles.js";
import { SPECIES_VISUAL_DESIGNS } from "./species-registry.js";

export const SENSORY_PERSPECTIVE_MODES = Object.freeze({
  HUMAN_OBSERVER: "human-observer",
  SPECIES_LENS: "species-lens",
  ENTITY_EXPERIENCE: "entity-experience",
  PHYSICAL_SCIENTIFIC: "physical-scientific"
});

export function createSensoryPerspective({ mode = SENSORY_PERSPECTIVE_MODES.HUMAN_OBSERVER, speciesId = null, entityId = null, position = null, channels = null } = {}) {
  if (!Object.values(SENSORY_PERSPECTIVE_MODES).includes(mode)) throw new Error(`Unknown sensory perspective: ${mode}`);
  return Object.freeze({
    mode,
    positionSource: mode === SENSORY_PERSPECTIVE_MODES.ENTITY_EXPERIENCE ? "selected-entity" : position ? "scientific-point" : "camera",
    biologySource: mode === SENSORY_PERSPECTIVE_MODES.HUMAN_OBSERVER ? "human" : mode === SENSORY_PERSPECTIVE_MODES.SPECIES_LENS ? "species-profile" : mode === SENSORY_PERSPECTIVE_MODES.ENTITY_EXPERIENCE ? "selected-individual" : "physical-field",
    speciesId, entityId, position: position ? Object.freeze({ x: position.x, y: position.y || 0, z: position.z }) : null,
    channels: Object.freeze({ visual: true, acoustic: true, ultraviolet: false, thermal: false, ...(channels || {}) }),
    translations: Object.freeze({ ultrasound: true, infrasound: true, ultraviolet: true, thermal: true }),
    presentationOnly: true
  });
}

export function sensorDefinitionsFor(animal, phenotype = {}) {
  const senses = phenotype.senses || phenotype, morphology = phenotype.morphology || {};
  const totalField = Number(senses.visualField || 0), overlap = Number(senses.binocularOverlap || 0), eyeField = Math.min(220, Math.max(0, (totalField + overlap) / 2));
  const design = SPECIES_VISUAL_DESIGNS[animal?.speciesId], headScale = design?.headScale || [.4, .4, .42];
  const lateralPlacement = /lateral/.test(morphology.eyePosition || "") ? .61 : morphology.eyePosition === "forward" ? .38 : .5;
  const eyeOffset = Math.max(.055, Number(headScale[0] || .4) * lateralPlacement), eyeVertical = Number(headScale[1] || .4) * .2, eyeForward = Number(headScale[2] || .42) * (/lateral/.test(morphology.eyePosition || "") ? .54 : .72);
  const profile = acousticProfile(animal);
  const visualSensors = Number(morphology.eyes ?? 2) >= 2 ? [
    { id: "left-eye", type: "eye", anatomicalParent: "head", localPosition: [-eyeOffset, eyeVertical, eyeForward], yawDegrees: -(totalField - overlap) / 4, fieldDegrees: eyeField, movementLimits: { yawRadians: [-.5, .5], pitchRadians: [-.28, .28] }, spectral: { ultraviolet: Number(senses.ultraviolet || 0), infrared: 0 }, evidenceGrade: design ? "geometry-derived" : "inferred-exact-species", anatomyBasis: design ? "species-head-recipe" : "founder-invisible-anchor" },
    { id: "right-eye", type: "eye", anatomicalParent: "head", localPosition: [eyeOffset, eyeVertical, eyeForward], yawDegrees: (totalField - overlap) / 4, fieldDegrees: eyeField, movementLimits: { yawRadians: [-.5, .5], pitchRadians: [-.28, .28] }, spectral: { ultraviolet: Number(senses.ultraviolet || 0), infrared: 0 }, evidenceGrade: design ? "geometry-derived" : "inferred-exact-species", anatomyBasis: design ? "species-head-recipe" : "founder-invisible-anchor" }
  ] : [];
  const thermalSensors = Number(senses.infrared || 0) > 0 ? [{ id: "thermal-organ", type: "thermal", anatomicalParent: "head", localPosition: [0, 0, .2], yawDegrees: 0, fieldDegrees: 80, sensitivity: Number(senses.infrared), evidenceGrade: "inferred-exact-species" }] : [];
  const auditorySensors = (profile?.sensors || []).map(sensor => ({ ...sensor, anatomicalParent: "head", sensitivityProfile: profile.audiogram, visibleGeometryRequired: false }));
  const vibrationSensors = Number(senses.vibration || 0) > .25 ? [{ id: "substrate-receptor", type: "vibration", anatomicalParent: "body", localPosition: [0, -.25, 0], directionality: .1, sensitivity: Number(senses.vibration), evidenceGrade: "composite-model" }] : [];
  return Object.freeze([...visualSensors, ...thermalSensors, ...auditorySensors, ...vibrationSensors].map(sensor => Object.freeze(sensor)));
}

export function sensoryTranslationLabel(perspective, frequencyHz = null) {
  if (perspective.mode === SENSORY_PERSPECTIVE_MODES.PHYSICAL_SCIENTIFIC) return "Physical field before biological filtering";
  if (frequencyHz != null && frequencyHz > 20000) return "Ultrasonic signal translated to audible range";
  if (frequencyHz != null && frequencyHz < 20) return "Infrasonic signal translated to audible range";
  if (perspective.channels.ultraviolet) return "UV rendered in false colour";
  if (perspective.channels.thermal) return "Thermal channel rendered in false colour";
  return perspective.mode.replaceAll("-", " ");
}
