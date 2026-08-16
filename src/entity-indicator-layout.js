const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

export function entityIndicatorLayout(visualScale = 1, presentationScale = 1) {
  const scale = clamp(Number(visualScale) || 1, .08, 2.4);
  const ui = clamp(Number(presentationScale) || 1, .75, 2);
  const side = .25 + (ui - 1) * .42;
  return Object.freeze({
    face: Object.freeze({ x: .12, y: Math.max(.88, 1.18 * scale), size: .54 * ui }),
    pregnancy: Object.freeze({ x: .58 + side, y: Math.max(1.18, 1.83 * scale), size: .34 * ui }),
    signal: Object.freeze({ x: .82 + side, y: Math.max(.98, 1.28 * scale), size: .54 * ui }),
    injury: Object.freeze({ x: .78 + side, y: Math.max(1.35, 2.12 * scale), size: .4 * ui }),
    rejection: Object.freeze({ x: 0, y: Math.max(1.2, 1.91 * scale), size: .38 * ui }),
    acceptance: Object.freeze({ x: 0, y: Math.max(1.24, 1.98 * scale), size: .52 * ui }),
    courtship: Object.freeze({ baseY: Math.max(1.15, 1.82 * scale), stepY: .3 * ui, spreadX: .34 * ui, size: .42 * ui })
  });
}
