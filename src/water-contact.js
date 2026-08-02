const pointyHexVertices = (cell, radius) => Array.from({ length: 6 }, (_, index) => {
  const angle = Math.PI / 180 * (60 * index - 30);
  return { x: cell.x + Math.cos(angle) * radius, z: cell.z + Math.sin(angle) * radius };
});

const closestPointOnSegment = (point, start, end) => {
  const dx = end.x - start.x, dz = end.z - start.z;
  const lengthSquared = dx * dx + dz * dz;
  const t = lengthSquared ? Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.z - start.z) * dz) / lengthSquared)) : 0;
  return { x: start.x + dx * t, z: start.z + dz * t };
};

export function closestWaterEdgePoint(animal, cell, hexRadius) {
  const vertices = pointyHexVertices(cell, hexRadius);
  let closest = vertices[0], distance = Infinity;
  for (let index = 0; index < vertices.length; index += 1) {
    const candidate = closestPointOnSegment(animal, vertices[index], vertices[(index + 1) % vertices.length]);
    const candidateDistance = Math.hypot(animal.x - candidate.x, animal.z - candidate.z);
    if (candidateDistance < distance) { closest = candidate; distance = candidateDistance; }
  }
  return { ...closest, distance };
}

export function waterContactPoint(animal, cell, hexRadius, animalRadius) {
  const edge = closestWaterEdgePoint(animal, cell, hexRadius);
  const dx = animal.x - edge.x, dz = animal.z - edge.z, length = Math.hypot(dx, dz);
  const fallbackX = animal.x - cell.x, fallbackZ = animal.z - cell.z, fallbackLength = Math.hypot(fallbackX, fallbackZ) || 1;
  const nx = length > .0001 ? dx / length : fallbackX / fallbackLength;
  const nz = length > .0001 ? dz / length : fallbackZ / fallbackLength;
  const clearance = Math.max(.08, animalRadius) + .025;
  return { x: edge.x + nx * clearance, z: edge.z + nz * clearance, edgeX: edge.x, edgeZ: edge.z, sourceId: cell.id };
}

export function drinkingContactState(animal, contact, { distanceTolerance = .13, facingTolerance = .3, speedTolerance = .015 } = {}) {
  const distance = Math.hypot(animal.x - contact.x, animal.z - contact.z);
  const desired = Math.atan2(contact.edgeZ - animal.z, contact.edgeX - animal.x);
  const facingError = Math.abs(Math.atan2(Math.sin(desired - (animal.orientation || 0)), Math.cos(desired - (animal.orientation || 0))));
  const speed = Math.hypot(animal.velocityX || 0, animal.velocityZ || 0);
  return { touching: distance <= distanceTolerance, facing: facingError <= facingTolerance, stationary: speed <= speedTolerance, distance, facingError, desiredOrientation: desired, ready: distance <= distanceTolerance && facingError <= facingTolerance && speed <= speedTolerance };
}
