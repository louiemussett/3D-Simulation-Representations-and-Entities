const distance = (a, b) => Math.hypot(b.x - a.x, b.z - a.z);
export function defaultTraversable(cell, options = {}) {
  return Boolean(cell) && (cell.waterDepth || 0) <= (options.maxWaterDepth ?? .32) && !cell.rocky && cell.plantType !== "tree" && (cell.slope || 0) <= (options.maxSlope ?? .62);
}
function sharedPortal(world, a, b) {
  const ac = world.corners(a), bc = world.corners(b), tolerance = world.radius * .08;
  const shared = ac.filter((p) => bc.some((q) => distance(p, q) <= tolerance));
  if (shared.length >= 2) return [shared[0], shared[1]];
  const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2, dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz) || 1, half = world.radius * .45;
  return [{ x: mx - dz / len * half, z: mz + dx / len * half }, { x: mx + dz / len * half, z: mz - dx / len * half }];
}
export function buildNavMesh(world, options = {}) {
  const polygons = new Map(), cellToPolygon = new Map();
  for (const cell of world.cells) if ((options.traversable || defaultTraversable)(cell, options)) {
    const polygon = { id: cell.id, cellId: cell.id, center: { x: cell.x, z: cell.z }, vertices: world.corners(cell), neighbours: [], terrainCost: 1 + (cell.slope || 0) * 1.8 + (cell.wetland ? .5 : 0), clearance: world.radius * .82 };
    polygons.set(polygon.id, polygon); cellToPolygon.set(cell.id, polygon.id);
  }
  for (const polygon of polygons.values()) {
    const cell = world.cells[polygon.cellId];
    for (const neighbour of cell.neighbours) if (polygons.has(neighbour.id)) polygon.neighbours.push({ id: neighbour.id, portal: sharedPortal(world, cell, neighbour), cost: distance(cell, neighbour) * (polygon.terrainCost + polygons.get(neighbour.id).terrainCost) / 2 });
    polygon.neighbours.sort((a, b) => a.id - b.id);
  }
  return { polygons, cellToPolygon, polygonAt: (x, z) => cellToPolygon.get(world.lookup(x, z)?.id) ?? null, worldRadius: world.radius };
}
