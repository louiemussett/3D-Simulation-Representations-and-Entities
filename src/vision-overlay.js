import { visionFov, visionHeading } from "./vision-model.js";

// Returns a continuous triangulated sector whose vertices are sampled from the
// same ground surface used by the animal renderer. The caller owns the GPU
// geometry created from this short-lived diagnostic data.
export function buildGroundVisionSector(viewer, range, surfaceHeight, options = {}) {
  const angularSegments = Math.max(4, options.angularSegments || 24);
  const radialSegments = Math.max(1, options.radialSegments || Math.ceil(range / 2));
  const lift = options.lift ?? 0.055;
  const fov = options.fov ?? visionFov(viewer.speciesId, viewer.sensoryFocusTicks ?? viewer.focusTicks ?? viewer.stationaryTicks ?? 0), heading = options.heading ?? visionHeading(viewer);
  const positions = [];
  const point = (radiusIndex, angleIndex) => {
    const radius = range * radiusIndex / radialSegments;
    const angle = heading - fov / 2 + fov * angleIndex / angularSegments;
    const x = viewer.x + Math.cos(angle) * radius, z = viewer.z + Math.sin(angle) * radius;
    return { position: [x, surfaceHeight(x, z) + lift, z], visible: radiusIndex === 0 || options.isVisible?.(x, z) !== false };
  };
  for (let radiusIndex = 0; radiusIndex < radialSegments; radiusIndex += 1) {
    for (let angleIndex = 0; angleIndex < angularSegments; angleIndex += 1) {
      const a = point(radiusIndex, angleIndex), b = point(radiusIndex + 1, angleIndex), c = point(radiusIndex + 1, angleIndex + 1), d = point(radiusIndex, angleIndex + 1);
      if (a.visible && b.visible && c.visible) positions.push(...a.position, ...b.position, ...c.position);
      if (radiusIndex > 0 && a.visible && c.visible && d.visible) positions.push(...a.position, ...c.position, ...d.position);
    }
  }
  return { positions: new Float32Array(positions), fov, angularSegments, radialSegments };
}
