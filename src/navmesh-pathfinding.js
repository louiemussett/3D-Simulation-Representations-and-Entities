import { StableMinHeap } from "./stable-min-heap.js";
import { analyticHexPortal } from "./navmesh.js";

const dist = (a, b) => Math.hypot(b.x - a.x, b.z - a.z);
export function findNavPath(mesh, start, goal, options = {}) {
  const startId = mesh.polygonAt(start.x, start.z), goalId = mesh.polygonAt(goal.x, goal.z);
  if (startId == null || goalId == null) return null;
  const polygonAllowed = options.polygonAllowed || (() => true), goalPolygon = mesh.polygons.get(goalId);
  if (!polygonAllowed(goalPolygon)) return null;
  if (startId === goalId) return { polygonIds: [startId], portals: [], points: [goal], cost: dist(start, goal) };
  const came = new Map(), g = new Map([[startId, 0]]), firstF = dist(mesh.polygons.get(startId).center, mesh.polygons.get(goalId).center);
  const open = new StableMinHeap((a, b) => a.f - b.f || a.id - b.id);
  open.push({ id: startId, g: 0, f: firstF });
  while (open.size) {
    const entry = open.pop(), current = entry.id;
    if (entry.g !== g.get(current)) continue;
    if (current === goalId) break;
    for (const edge of mesh.polygons.get(current).neighbours) {
      const nextPolygon = mesh.polygons.get(edge.id);
      if (!polygonAllowed(nextPolygon)) continue;
      const score = g.get(current) + (options.edgeCost?.(edge, mesh.polygons.get(current), nextPolygon) ?? edge.cost);
      if (score >= (g.get(edge.id) ?? Infinity)) continue;
      came.set(edge.id, current); g.set(edge.id, score);
      open.push({ id: edge.id, g: score, f: score + dist(mesh.polygons.get(edge.id).center, mesh.polygons.get(goalId).center) });
    }
  }
  if (!came.has(goalId)) return null;
  const ids = [goalId], portals = []; let cursor = goalId;
  while (cursor !== startId) { const from = came.get(cursor), portal = analyticHexPortal(mesh, from, cursor); if (!portal) return null; portals.unshift(portal); cursor = from; ids.unshift(cursor); }
  return { polygonIds: ids, portals, points: stringPull(start, goal, portals), cost: g.get(goalId) };
}
const area2 = (a, b, c) => (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
export function stringPull(start, goal, rawPortals) {
  if (!rawPortals.length) return [goal];
  const portals = rawPortals.map(([a, b]) => area2(start, a, b) >= 0 ? [a, b] : [b, a]); portals.push([goal, goal]);
  const points = []; let apex = start, left = portals[0][0], right = portals[0][1], apexIndex = 0, leftIndex = 0, rightIndex = 0;
  for (let i = 1; i < portals.length; i++) { const [newLeft, newRight] = portals[i];
    if (area2(apex, right, newRight) <= 0) { if (apex === right || area2(apex, left, newRight) > 0) { right = newRight; rightIndex = i; } else { points.push(left); apex = left; apexIndex = leftIndex; left = right = apex; leftIndex = rightIndex = apexIndex; i = apexIndex; continue; } }
    if (area2(apex, left, newLeft) >= 0) { if (apex === left || area2(apex, right, newLeft) < 0) { left = newLeft; leftIndex = i; } else { points.push(right); apex = right; apexIndex = rightIndex; left = right = apex; leftIndex = rightIndex = apexIndex; i = apexIndex; } }
  }
  points.push(goal); return points;
}
