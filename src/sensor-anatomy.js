import { sensorDefinitionsFor } from "./sensory-perspective.js";
import { biologicalPhenotype } from "./biological-phenotypes.js";
import { SPECIES, SPECIES_VISUAL_DESIGNS } from "./species-registry.js";
import { sensorAnatomyProfile } from "./anatomy/sensor-anatomy-registry.js";

const freeze = value => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) { for (const child of Object.values(value)) freeze(child); Object.freeze(value); }
  return value;
};

export const FOUNDER_SENSOR_ANCHORS = freeze({
  grazer: { visibleGeometryRequired: false, leftEye: [-.105, .055, .145], rightEye: [.105, .055, .145], leftEar: [-.22, .12, .04], rightEar: [.22, .12, .04] },
  hunter: { visibleGeometryRequired: false, leftEye: [-.08, .07, .08], rightEye: [.08, .07, .08], leftEar: [-.22, .12, .04], rightEar: [.22, .12, .04] }
});

export function sensorDefinitions(animal) {
  const definitions = sensorDefinitionsFor(animal, biologicalPhenotype(animal));
  const founder = FOUNDER_SENSOR_ANCHORS[animal.speciesId];
  const anatomy = sensorAnatomyProfile(animal.speciesId), anatomyById = new Map((anatomy?.sensors || []).map(sensor => [sensor.id, sensor]));
  return Object.freeze(definitions.map(sensor => {
    const anatomical = anatomyById.get(sensor.id);
    const stateKey = sensor.id === "left-ear" ? "leftEarYaw" : sensor.id === "right-ear" ? "rightEarYaw" : sensor.id === "left-eye" ? "leftEyeYaw" : sensor.id === "right-eye" ? "rightEyeYaw" : null;
    return Object.freeze({ ...sensor, ...(anatomical || {}), type: sensor.type,
      ...(founder ? { localPosition: founder[sensor.id.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] || sensor.localPosition, visibleGeometryRequired: false } : {}),
      ...(stateKey ? { currentYawRadians: Number(animal.orientingState?.[stateKey] || 0) } : {})
    });
  }));
}

export function sensorWorldAnchor(animal, sensor, { eyeHeight = .48, surfaceHeight = () => 0 } = {}) {
  const [lateral = 0, vertical = 0, forward = 0] = sensor.localPosition || [0, 0, 0];
  const heading = (animal.orientation || 0) + (animal.headYaw || 0);
  const forwardX = Math.cos(heading), forwardZ = Math.sin(heading), rightX = Math.cos(heading + Math.PI / 2), rightZ = Math.sin(heading + Math.PI / 2);
  return Object.freeze({
    x: animal.x + forwardX * forward + rightX * lateral,
    y: surfaceHeight(animal.x, animal.z) + eyeHeight + vertical,
    z: animal.z + forwardZ * forward + rightZ * lateral,
    heading: heading + Number(sensor.yawDegrees || 0) * Math.PI / 180 + Number(sensor.currentYawRadians || 0),
    sensorId: sensor.id
  });
}

export function sensorAnatomicalEyeHeight(animal = {}) {
  const mass = Math.max(.1, Number(animal.bodyMass || SPECIES[animal.speciesId]?.adultMass || 20)), design = SPECIES_VISUAL_DESIGNS[animal.speciesId], stage = animal.lifeStage === "dependent" ? .58 : animal.lifeStage === "juvenile" ? .76 : animal.lifeStage === "subadult" ? .9 : 1;
  const posture = ["graze", "drink", "feed"].includes(animal.actionState?.key) ? .68 : ["rest", "sleep"].includes(animal.actionState?.key) ? .55 : 1;
  const bodyScale = Math.max(.22, Math.cbrt(mass / 20)), designedHeadHeight = design ? (Number(design.headOffset?.[1] || .4) + Number(design.headScale?.[1] || .4) * .3) * bodyScale : .31 + Math.cbrt(mass) * .095;
  return Math.max(.18, Math.min(2.9, designedHeadHeight * stage * posture));
}

// Simulation headings increase from +X toward +Z. Three.js local Y rotation
// turns a +Z-facing animal in the opposite direction, so presentation must
// negate authoritative yaw rather than copy it directly.
export const visualHeadYawRadians = animal => { const yaw = Number(animal?.headYaw || 0); return yaw ? -yaw : 0; };
export const visualSensorYawRadians = sensor => { const yaw = Number(sensor?.yawDegrees || 0); return yaw ? -yaw * Math.PI / 180 : 0; };
