import { SENSOR_ANATOMY_PROFILES } from "./sensor-anatomy-registry.js";
import { CARTOON_VISUAL_ANATOMY } from "./visual-anatomy-registry.js";

const NON_MAMMALS = new Set(["carrion-runner", "cold-country-scavenger", "common-ostrich", "waterline-ambusher", "sunscale-ambusher", "shieldback-colony"]);

export function validateAnatomyProfiles(sensorProfiles = SENSOR_ANATOMY_PROFILES, visualProfiles = CARTOON_VISUAL_ANATOMY) {
  const errors = [];
  for (const [speciesId, visual] of Object.entries(visualProfiles)) {
    const sensor = sensorProfiles[speciesId];
    if (!sensor) { errors.push(`${speciesId}: missing sensor profile`); continue; }
    if (visual.eye?.shape !== "round") errors.push(`${speciesId}: cartoon eyeball must remain round`);
    if (!(visual.eye?.iris?.radius > 0 && visual.eye.iris.radius < .6)) errors.push(`${speciesId}: invalid iris radius`);
    if (!(visual.eye?.pupil?.width > 0 && visual.eye.pupil.height > 0)) errors.push(`${speciesId}: invalid pupil dimensions`);
    const ears = sensor.sensors.filter(item => item.type === "audition");
    if (ears.length !== 2) errors.push(`${speciesId}: requires paired auditory definitions`);
    if (NON_MAMMALS.has(speciesId) && ears.some(item => item.receptorType === "external-pinna" || item.visibleGeometryRequired)) errors.push(`${speciesId}: non-mammal cannot receive external pinnae`);
    for (const item of sensor.sensors) if (!item.evidenceGrade) errors.push(`${speciesId}:${item.id}: missing evidence grade`);
  }
  return errors;
}

export const ANATOMY_PROFILE_ERRORS = Object.freeze(validateAnatomyProfiles());
if (ANATOMY_PROFILE_ERRORS.length) throw new Error(`Invalid sensory anatomy profiles: ${ANATOMY_PROFILE_ERRORS.join("; ")}`);

