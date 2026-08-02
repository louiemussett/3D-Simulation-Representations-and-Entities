function triangleHeight(a, b, c, x, z) {
  const denominator = (b.z - c.z) * (a.x - c.x) + (c.x - b.x) * (a.z - c.z);
  if (Math.abs(denominator) < 1e-9) return null;
  const wa = ((b.z - c.z) * (x - c.x) + (c.x - b.x) * (z - c.z)) / denominator;
  const wb = ((c.z - a.z) * (x - c.x) + (a.x - c.x) * (z - c.z)) / denominator;
  const wc = 1 - wa - wb;
  if (wa < -1e-5 || wb < -1e-5 || wc < -1e-5) return null;
  return wa * a.y + wb * b.y + wc * c.y;
}

export function fanSurfaceHeight(surface, x, z) {
  if (!surface?.corners?.length) return surface?.centre?.y ?? 0;
  const centre = surface.centre;
  for (let index = 0; index < surface.corners.length; index += 1) {
    const height = triangleHeight(centre, surface.corners[index], surface.corners[(index + 1) % surface.corners.length], x, z);
    if (height !== null) return height;
  }
  return centre.y;
}

export function stableGroundSupport(x, z, heading, surfaceHeight, options = {}) {
  const footprint = Math.max(0.05, options.footprint || 0.42);
  const maxTilt = Math.max(0, options.maxTilt ?? Math.PI / 7);
  const forwardX = Math.cos(heading || 0), forwardZ = Math.sin(heading || 0);
  const sideX = -forwardZ, sideZ = forwardX;
  const front = surfaceHeight(x + forwardX * footprint, z + forwardZ * footprint);
  const back = surfaceHeight(x - forwardX * footprint, z - forwardZ * footprint);
  const left = surfaceHeight(x + sideX * footprint, z + sideZ * footprint);
  const right = surfaceHeight(x - sideX * footprint, z - sideZ * footprint);
  const centre = surfaceHeight(x, z);
  const rawPitch = Math.atan2(back - front, footprint * 2);
  const rawRoll = Math.atan2(right - left, footprint * 2);
  const clamp = (value) => Math.max(-maxTilt, Math.min(maxTilt, value));
  const pitch = clamp(rawPitch), roll = clamp(rawRoll);
  const requestedSupport = Math.max(centre, front - Math.sin(-pitch) * footprint, back + Math.sin(-pitch) * footprint, left - Math.sin(-roll) * footprint, right + Math.sin(-roll) * footprint);
  // Cardinal samples establish pitch and roll, but a triangulated hill can
  // peak diagonally between them. Sample the complete circumference plus an
  // inner ring and reserve enough height for the bounded group tilt. Without
  // this, the terrain can cover the torso and leave only the top of its back.
  let radialSupport = centre;
  const tiltAllowance = Math.sin(maxTilt);
  for (const radius of [footprint * .55, footprint]) {
    for (let index = 0; index < 16; index += 1) {
      const angle = (heading || 0) + index / 16 * Math.PI * 2;
      const sample = surfaceHeight(x + Math.cos(angle) * radius, z + Math.sin(angle) * radius);
      radialSupport = Math.max(radialSupport, sample - radius * tiltAllowance);
    }
  }
  const completeSupport = Math.max(requestedSupport, radialSupport);
  // Do not let a single cliff-side sample hoist the animal far above its
  // centre point. Traversability owns whether the animal may enter that cell.
  const supportHeight = Math.min(completeSupport, centre + (options.maxLift ?? footprint * Math.tan(maxTilt) + 0.08));
  return { height: supportHeight, pitch, roll, rawPitch, rawRoll };
}
