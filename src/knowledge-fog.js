export const FOG_STATE = Object.freeze({ UNKNOWN: "unknown", EXPLORED: "explored", CLEAR: "clear" });

export function fogKnowledgeState({ currentlyVisible = false, communicatedReveal = false, explored = false } = {}) {
  if (currentlyVisible || communicatedReveal) return FOG_STATE.CLEAR;
  return explored ? FOG_STATE.EXPLORED : FOG_STATE.UNKNOWN;
}

export function withinLocalFogReveal(cell, observer, radius = 5.5) {
  if (!cell || !observer || !Number.isFinite(radius) || radius < 0) return false;
  const dx = Number(cell.x) - Number(observer.x), dz = Number(cell.z) - Number(observer.z);
  const cellElevation = Number(cell.elevation), observerElevation = Number(observer.elevation);
  const relief = Number.isFinite(cellElevation) && Number.isFinite(observerElevation) ? Math.abs(cellElevation - observerElevation) : 0;
  const reliefAdjustedRadius = radius / (1 + relief * .18);
  return Number.isFinite(dx) && Number.isFinite(dz) && dx * dx + dz * dz <= reliefAdjustedRadius * reliefAdjustedRadius;
}
