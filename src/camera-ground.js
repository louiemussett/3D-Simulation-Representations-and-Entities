const distance3 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

export function observerCameraClearance(orbitDistance) {
  const distance = Number.isFinite(Number(orbitDistance)) ? Number(orbitDistance) : 12;
  return Math.max(.32, Math.min(2.4, distance * .22));
}

export function constrainCameraToTerrain(camera, target, heightAt, { cameraClearance = 2.4, targetClearance = .12, preserveOrbit = true } = {}) {
  const targetGround = heightAt(target.x, target.z);
  const previousTargetY = Number(target.y) || 0;
  target.y = targetGround + targetClearance;
  // OrbitControls pans x/z before this terrain correction. Move the camera by
  // the same vertical delta so crossing a mountain does not collapse the
  // camera-target vector and make rotation or tilt appear locked.
  if (preserveOrbit) camera.y += target.y - previousTargetY;
  const cameraGround = heightAt(camera.x, camera.z);
  camera.y = Math.max(camera.y, cameraGround + cameraClearance);
  return { targetGround, cameraGround, clearance: camera.y - cameraGround };
}

export function cameraPresentationMetrics(camera, target, groundHeight, { strategicDistance = 260, strategicClearance = 85 } = {}) {
  const orbitDistance = distance3(camera, target);
  const groundClearance = Math.max(0, camera.y - groundHeight);
  const presentationDistance = Math.min(orbitDistance, Math.max(8, groundClearance * 2.4));
  return { orbitDistance, groundClearance, presentationDistance, strategic: orbitDistance > strategicDistance && groundClearance > strategicClearance };
}

export function usesAggregateAnimalMarkers(cameraDistance, markerDistance = 110) {
  return Number.isFinite(cameraDistance) && cameraDistance > markerDistance;
}

export function populationPresentationForDistance(cameraDistance, { groupDistance = 110, regionDistance = 260 } = {}) {
  if (!Number.isFinite(cameraDistance) || cameraDistance <= groupDistance) return "entity";
  if (cameraDistance <= regionDistance) return "group";
  return "region";
}

// Cinema may choose a shot and therefore move the camera, but it may not
// override the population-detail thresholds after that camera is placed.
// Keeping the legacy scale argument makes the boundary explicit to callers:
// authored scale is descriptive; measured distance is authoritative.
export function cinemaPopulationPresentation(scale, cameraDistance, thresholds) {
  void scale;
  return populationPresentationForDistance(cameraDistance, thresholds);
}

export function followTargetPreservingOrbit(camera, target, desired, factor = .08) {
  const amount = Math.max(0, Math.min(1, Number(factor) || 0));
  const dx = (desired.x - target.x) * amount, dy = (desired.y - target.y) * amount, dz = (desired.z - target.z) * amount;
  camera.x += dx; camera.y += dy; camera.z += dz;
  target.x += dx; target.y += dy; target.z += dz;
  return { dx, dy, dz };
}
