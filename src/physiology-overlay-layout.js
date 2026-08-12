const finiteNonNegative = (value) => Math.max(0, Number.isFinite(Number(value)) ? Number(value) : 0);

/**
 * Places the independently switchable performance and reserve diagnostics in
 * one bottom-anchored stack. The small overlap accounts for the transparent
 * canvas inset around each card, making their painted borders meet visually.
 */
export function physiologyOverlayStackLayout({
  stackBottomY = 0,
  performanceVisible = false,
  performanceHeight = 0,
  reservesVisible = false,
  reservesHeight = 0,
  seamOverlap = 0
} = {}) {
  const bottom = Number.isFinite(Number(stackBottomY)) ? Number(stackBottomY) : 0;
  const performance = finiteNonNegative(performanceHeight);
  const reserves = finiteNonNegative(reservesHeight);
  const overlap = performanceVisible && reservesVisible
    ? Math.min(finiteNonNegative(seamOverlap), performance, reserves)
    : 0;

  let cursor = bottom;
  let performanceY = null;
  let reservesY = null;

  if (performanceVisible) {
    performanceY = cursor + performance / 2;
    cursor += performance;
  }
  if (reservesVisible) {
    cursor -= overlap;
    reservesY = cursor + reserves / 2;
    cursor += reserves;
  }

  return Object.freeze({
    performanceY,
    reservesY,
    stackBottomY: bottom,
    stackTopY: cursor,
    seamOverlap: overlap
  });
}
