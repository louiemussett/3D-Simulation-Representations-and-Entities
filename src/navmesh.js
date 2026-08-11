import { cooperativeYield } from "./cooperative-yield.js";

const distance = (a, b) => Math.hypot(b.x - a.x, b.z - a.z);
export function defaultTraversable(cell, options = {}) {
  return Boolean(cell) && (cell.waterDepth || 0) <= (options.maxWaterDepth ?? .32) && (options.allowRocky || !cell.rocky) && cell.plantType !== "tree" && (cell.slope || 0) <= (options.maxSlope ?? .62);
}
// Adjacent pointy hexes share the edge perpendicular to the line between their
// centres.  Deriving it when a completed route is reconstructed avoids keeping
// two point objects on every directed navmesh edge.
export function analyticHexPortal(mesh, fromId, toId) {
  const a = mesh.polygons.get(fromId)?.center, b = mesh.polygons.get(toId)?.center;
  if (!a || !b) return null;
  const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2, dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz) || 1, half = mesh.worldRadius * .5;
  return [{ x: mx - dz / len * half, z: mz + dx / len * half }, { x: mx + dz / len * half, z: mz - dx / len * half }];
}
export function buildNavMesh(world, options = {}) {
  const polygons = new Map(), cellToPolygon = new Map();
  for (const cell of world.cells) if ((options.traversable || defaultTraversable)(cell, options)) {
    const polygon = { id: cell.id, cellId: cell.id, center: { x: cell.x, z: cell.z }, neighbours: [], slope: cell.slope || 0, rocky: Boolean(cell.rocky), wetland: Boolean(cell.wetland), waterDepth: cell.waterDepth || 0, landform: cell.landform || null, terrainCost: 1 + (cell.slope || 0) * 1.8 + (cell.wetland ? .5 : 0), clearance: world.radius * .82 };
    polygons.set(polygon.id, polygon); cellToPolygon.set(cell.id, polygon.id);
  }
  for (const polygon of polygons.values()) {
    const cell = world.cells[polygon.cellId];
    for (const neighbour of cell.neighbours) if (polygons.has(neighbour.id)) polygon.neighbours.push({ id: neighbour.id, cost: distance(cell, neighbour) * (polygon.terrainCost + polygons.get(neighbour.id).terrainCost) / 2 });
    polygon.neighbours.sort((a, b) => a.id - b.id);
  }
  return { polygons, cellToPolygon, polygonAt: (x, z) => cellToPolygon.get(world.lookup(x, z)?.id) ?? null, worldRadius: world.radius };
}

export async function buildNavMeshAsync(world, options = {}, { signal = null, onProgress = null, yieldBudgetMs = 8 } = {}) {
  const polygons = new Map(), cellToPolygon = new Map(), total = Math.max(1, world.cells.length * 2), budget = Math.max(1, Number(yieldBudgetMs) || 8);
  const now = () => globalThis.performance?.now?.() ?? Date.now();
  const check = () => { if (signal?.aborted) throw Object.assign(new Error("Navigation generation was cancelled"), { name: "AbortError" }); };
  let lastYield = now();
  const checkpoint = async (completed) => {
    check(); onProgress?.({ completed, total, percent: completed / total });
    if (now() - lastYield >= budget) { await cooperativeYield(); lastYield = now(); check(); }
  };
  for (let index = 0; index < world.cells.length; index += 1) {
    const cell = world.cells[index];
    if ((options.traversable || defaultTraversable)(cell, options)) {
      const polygon = { id: cell.id, cellId: cell.id, center: { x: cell.x, z: cell.z }, neighbours: [], slope: cell.slope || 0, rocky: Boolean(cell.rocky), wetland: Boolean(cell.wetland), waterDepth: cell.waterDepth || 0, landform: cell.landform || null, terrainCost: 1 + (cell.slope || 0) * 1.8 + (cell.wetland ? .5 : 0), clearance: world.radius * .82 };
      polygons.set(polygon.id, polygon); cellToPolygon.set(cell.id, polygon.id);
    }
    if ((index & 127) === 127) await checkpoint(index + 1);
  }
  await checkpoint(world.cells.length);
  let edgeIndex = 0;
  for (const polygon of polygons.values()) {
    const cell = world.cells[polygon.cellId];
    for (const neighbour of cell.neighbours) if (polygons.has(neighbour.id)) polygon.neighbours.push({ id: neighbour.id, cost: distance(cell, neighbour) * (polygon.terrainCost + polygons.get(neighbour.id).terrainCost) / 2 });
    polygon.neighbours.sort((a, b) => a.id - b.id);
    edgeIndex += 1;
    if ((edgeIndex & 127) === 0) await checkpoint(world.cells.length + edgeIndex);
  }
  onProgress?.({ completed: total, total, percent: 1 }); check();
  return { polygons, cellToPolygon, polygonAt: (x, z) => cellToPolygon.get(world.lookup(x, z)?.id) ?? null, worldRadius: world.radius };
}
