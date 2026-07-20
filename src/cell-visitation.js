export function visitNearbyCells(origin, range, half, cellAt, visitor) {
  const r = Math.ceil(range);
  for (let z = Math.max(-half, origin.z - r); z < Math.min(half, origin.z + r + 1); z++) {
    for (let x = Math.max(-half, origin.x - r); x < Math.min(half, origin.x + r + 1); x++) {
      if (Math.abs(x - origin.x) + Math.abs(z - origin.z) <= range) visitor(cellAt(x, z));
    }
  }
}
