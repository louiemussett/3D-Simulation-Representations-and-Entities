import { sensorAnatomyProfile } from "./sensor-anatomy-registry.js";
import { visualAnatomyProfile } from "./visual-anatomy-registry.js";

export function anatomyLaboratoryRecord(animal = {}, renderedParts = null) {
  const sensor = sensorAnatomyProfile(animal.speciesId), visual = visualAnatomyProfile(animal.speciesId);
  if (!sensor || !visual) return null;
  const gaze = renderedParts?.eyes?.map(eye => ({
    side: eye.userData?.eyeSide,
    gazeOffset: eye.material?.uniforms?.gazeOffset?.value ? { x: eye.material.uniforms.gazeOffset.value.x, y: eye.material.uniforms.gazeOffset.value.y } : null,
    irisScale: eye.material?.uniforms?.irisScale?.value ?? null,
    pupilScale: eye.material?.uniforms?.pupilScale?.value ?? null
  })) || [];
  const earPoses = renderedParts?.earPivots?.map(pivot => ({ side: pivot.userData?.earSide, visualType: pivot.userData?.visualEarType || visual.ear.visualType, yaw: pivot.rotation?.y ?? 0, pitch: pivot.rotation?.x ?? 0 })) || [];
  return Object.freeze({
    schema: 1, animalId: animal.id || null, speciesId: animal.speciesId,
    scientificSensors: sensor.sensors,
    cartoonPresentation: visual,
    currentPresentation: { gaze, ears: earPoses },
    separationNotice: "Cartoon geometry presents sensor state; authoritative perception uses the scientific anchors.",
    warnings: Object.freeze([
      ...(gaze.some(item => item.gazeOffset && Math.hypot(item.gazeOffset.x, item.gazeOffset.y) > visual.eye.gaze.maximumVisualOffset * 1.15) ? ["Visible gaze exceeds the configured cartoon eye boundary."] : []),
      ...(sensor.sensors.filter(item => item.type === "audition").some(item => item.receptorType !== "external-pinna" && item.visibleGeometryRequired) ? ["Non-pinna auditory receptor incorrectly requests an external ear."] : [])
    ])
  });
}

