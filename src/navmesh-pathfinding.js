const dist = (a, b) => Math.hypot(b.x - a.x, b.z - a.z);
export function findNavPath(mesh, start, goal) {
  const startId = mesh.polygonAt(start.x, start.z), goalId = mesh.polygonAt(goal.x, goal.z);
  if (startId == null || goalId == null) return null;
  if (startId === goalId) return { polygonIds: [startId], portals: [], points: [goal], cost: dist(start, goal) };
  const open = new Set([startId]), came = new Map(), g = new Map([[startId, 0]]), f = new Map([[startId, dist(mesh.polygons.get(startId).center, mesh.polygons.get(goalId).center)]]);
  while (open.size) {
    const current = [...open].sort((a, b) => (f.get(a) - f.get(b)) || a - b)[0];
    if (current === goalId) break; open.delete(current);
    for (const edge of mesh.polygons.get(current).neighbours) {
      const score = g.get(current) + edge.cost;
      if (score >= (g.get(edge.id) ?? Infinity)) continue;
      came.set(edge.id, { from: current, portal: edge.portal }); g.set(edge.id, score);
      f.set(edge.id, score + dist(mesh.polygons.get(edge.id).center, mesh.polygons.get(goalId).center)); open.add(edge.id);
    }
  }
  if (!came.has(goalId)) return null;
  const ids = [goalId], portals = []; let cursor = goalId;
  while (cursor !== startId) { const step = came.get(cursor); portals.unshift(step.portal); cursor = step.from; ids.unshift(cursor); }
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
