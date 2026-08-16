export const DEFAULT_RECOVERY_BUFFER = 4.5;
export const DEFAULT_SAFE_INSET = 1.1;
export const DEFAULT_EDGE_MARGIN = 3.4;
export const DEFAULT_EDGE_DWELL_TICKS = 5;

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

export function assessWorldBoundary(position = {}, half = 0, options = {}) {
  const buffer = Math.max(.5, Number(options.buffer) || DEFAULT_RECOVERY_BUFFER), inset = Math.max(.2, Number(options.inset) || DEFAULT_SAFE_INSET);
  const edgeMargin = Math.max(inset, Number(options.edgeMargin) || DEFAULT_EDGE_MARGIN);
  const edgeDwellTicks = Math.max(0, Number(options.edgeDwellTicks) || 0);
  const edgeDwellThreshold = Math.max(1, Number(options.edgeDwellThreshold) || DEFAULT_EDGE_DWELL_TICKS);
  const x = Number(position.x) || 0, z = Number(position.z) || 0, wasRecovering = Boolean(options.wasRecovering);
  const crossedPlayableEdge = Math.abs(x) > half || Math.abs(z) > half;
  const nearPlayableEdge = Math.abs(x) > half - edgeMargin || Math.abs(z) > half - edgeMargin;
  const lingeringAtEdge = nearPlayableEdge && edgeDwellTicks >= edgeDwellThreshold;
  const safelyInside = Math.abs(x) <= half - edgeMargin && Math.abs(z) <= half - edgeMargin;
  const recovering = crossedPlayableEdge || lingeringAtEdge || (wasRecovering && !safelyInside);
  const outer = half + buffer, clamped = { x: clamp(x, -outer, outer), z: clamp(z, -outer, outer) };
  // Return beyond the release threshold rather than exactly onto it. This
  // hysteresis prevents the next ordinary movement from immediately starting
  // the same edge-recovery episode again.
  const recoveryInset = Math.min(Math.max(inset, .2), Math.max(.2, half - edgeMargin));
  const targetLimit = Math.max(0, half - edgeMargin - recoveryInset);
  const target = recovering ? { x: clamp(clamped.x, -targetLimit, targetLimit), z: clamp(clamped.z, -targetLimit, targetLimit) } : null;
  return Object.freeze({ buffer, inset, edgeMargin, edgeDwellTicks, edgeDwellThreshold, outer, crossedPlayableEdge, nearPlayableEdge, lingeringAtEdge, safelyInside, recovering, clamped: Object.freeze(clamped), target: target ? Object.freeze(target) : null });
}

export function worldBoundaryClearance(position = {}, half = 0) {
  return half - Math.max(Math.abs(Number(position.x) || 0), Math.abs(Number(position.z) || 0));
}

export function recoveryDistance(position = {}, half = 0) {
  return Math.hypot(Math.max(0, Math.abs(Number(position.x) || 0) - half), Math.max(0, Math.abs(Number(position.z) || 0) - half));
}
