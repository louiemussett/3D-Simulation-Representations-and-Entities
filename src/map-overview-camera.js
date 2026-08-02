const finite = value => Number.isFinite(Number(value));

export function mapOverviewFrame(points = [], { fovDegrees = 46, padding = 1.12 } = {}) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const point of points) {
    if (!finite(point?.x) || !finite(point?.z)) continue;
    const y = finite(point?.elevation) ? Number(point.elevation) : finite(point?.y) ? Number(point.y) : 0;
    minX = Math.min(minX, Number(point.x)); maxX = Math.max(maxX, Number(point.x));
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    minZ = Math.min(minZ, Number(point.z)); maxZ = Math.max(maxZ, Number(point.z));
  }
  if (!Number.isFinite(minX)) return { target: { x: 0, y: 0, z: 0 }, position: { x: 175, y: 230, z: 190 }, distance: 350 };
  const target = { x: (minX + maxX) / 2, y: (minY + maxY) / 2, z: (minZ + maxZ) / 2 };
  const halfWidth = Math.max(1, (maxX - minX) / 2), halfDepth = Math.max(1, (maxZ - minZ) / 2), halfHeight = Math.max(0, (maxY - minY) / 2);
  const radius = Math.hypot(halfWidth, halfDepth, halfHeight);
  const halfFov = Math.max(10, Math.min(80, Number(fovDegrees) || 46)) * Math.PI / 360;
  const distance = Math.max(40, radius * Math.max(1, Number(padding) || 1) / Math.sin(halfFov));
  // A steep, slightly offset view reads as a map while retaining enough
  // perspective to distinguish hills, woodland and entity markers.
  const direction = { x: .28, y: .92, z: .28 }, length = Math.hypot(direction.x, direction.y, direction.z);
  return {
    target,
    position: { x: target.x + direction.x / length * distance, y: target.y + direction.y / length * distance, z: target.z + direction.z / length * distance },
    distance
  };
}
