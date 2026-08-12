const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

export const ENTITY_PANEL_DISTANCE_SCALE = Object.freeze({
  referenceDistance: 48,
  minimumScale: .42,
  maximumScale: 1.25
});

/**
 * Converts camera-to-animal distance into a gentle perspective scale. The
 * square root is deliberate: distant cards remain legible while close cards
 * grow without dominating the viewport.
 */
export function entityPanelScaleForDistance(distance, options = {}) {
  const referenceDistance = Math.max(.01, Number(options.referenceDistance) || ENTITY_PANEL_DISTANCE_SCALE.referenceDistance);
  const minimumScale = Math.max(.1, Number(options.minimumScale) || ENTITY_PANEL_DISTANCE_SCALE.minimumScale);
  const maximumScale = Math.max(minimumScale, Number(options.maximumScale) || ENTITY_PANEL_DISTANCE_SCALE.maximumScale);
  const safeDistance = Math.max(.01, Number(distance) || referenceDistance);
  return clamp(Math.sqrt(referenceDistance / safeDistance), minimumScale, maximumScale);
}

/**
 * Holds one animal's panel scale until the user performs another wheel zoom.
 * Camera orbit, pitch, pan, terrain clearance and animal movement can change
 * the live distance without silently resizing an already visible panel.
 */
export function resolveEntityPanelScaleSnapshot({
  distance,
  wheelRevision = 0,
  previous = null,
  options = {}
} = {}) {
  const revision = Math.max(0, Math.floor(Number(wheelRevision) || 0));
  if (previous && Number(previous.wheelRevision) === revision && Number.isFinite(Number(previous.scale))) {
    return Object.freeze({
      scale: Number(previous.scale),
      distance: Number(previous.distance),
      wheelRevision: revision,
      held: true
    });
  }
  const safeDistance = Math.max(.01, Number(distance) || ENTITY_PANEL_DISTANCE_SCALE.referenceDistance);
  return Object.freeze({
    scale: entityPanelScaleForDistance(safeDistance, options),
    distance: safeDistance,
    wheelRevision: revision,
    held: false
  });
}
