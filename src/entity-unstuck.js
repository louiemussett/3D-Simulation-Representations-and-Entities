export function nearestSafeUnstuckDestination(entity, candidates = [], options = {}) {
  if (!entity || !Number.isFinite(entity.x) || !Number.isFinite(entity.z)) return null;
  const minimumMove = Math.max(.25, Number(options.minimumMove) || .75);
  const bodyRadius = Math.max(.05, Number(options.bodyRadius) || .25);
  const occupied = options.occupied || [];
  const supportsBody = options.supportsBody || (() => true);
  const valid = [];
  for (const candidate of candidates) {
    if (!candidate || !Number.isFinite(candidate.x) || !Number.isFinite(candidate.z)) continue;
    const distance = Math.hypot(candidate.x - entity.x, candidate.z - entity.z);
    if (distance < minimumMove || !supportsBody(candidate.x, candidate.z, bodyRadius)) continue;
    const obstructed = occupied.some((other) => other?.alive !== false && other.id !== entity.id && Number.isFinite(other.x) && Number.isFinite(other.z) && Math.hypot(candidate.x - other.x, candidate.z - other.z) < bodyRadius + Math.max(.05, Number(other.bodyRadius) || .25) + .35);
    if (!obstructed) valid.push({ x: candidate.x, z: candidate.z, distance, id: candidate.id ?? null });
  }
  valid.sort((left, right) => left.distance - right.distance || String(left.id).localeCompare(String(right.id)));
  return valid[0] || null;
}
