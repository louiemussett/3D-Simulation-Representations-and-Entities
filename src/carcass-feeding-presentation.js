const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
export const wrapPresentationAngle = (angle) => Math.atan2(Math.sin(angle), Math.cos(angle));

export function carcassFeedingLook(actor, carcass, maxHeadYaw = Math.PI / 3) {
  if (!actor || !carcass) return { headYaw: 0, bodyYaw: 0 };
  const dx = carcass.x - actor.x, dz = carcass.z - actor.z;
  if (Math.hypot(dx, dz) < 1e-8) return { headYaw: 0, bodyYaw: 0 };
  const bearing = Math.atan2(dz, dx);
  // Animal roots use PI/2 - orientation, so local positive Y rotation is the
  // inverse of the simulation's positive world-bearing rotation.
  const localYaw = wrapPresentationAngle((actor.orientation || 0) - bearing);
  const headYaw = clamp(localYaw, -maxHeadYaw, maxHeadYaw);
  return { headYaw, bodyYaw: wrapPresentationAngle(localYaw - headYaw) };
}

export function smoothFeedingLook(current = { headYaw: 0, bodyYaw: 0 }, target, elapsedMs, responseMs = 115) {
  const blend = 1 - Math.exp(-Math.max(0, elapsedMs) / Math.max(1, responseMs));
  const approach = (from, to) => wrapPresentationAngle(from + wrapPresentationAngle(to - from) * blend);
  return { headYaw: approach(current.headYaw || 0, target.headYaw || 0), bodyYaw: approach(current.bodyYaw || 0, target.bodyYaw || 0) };
}
