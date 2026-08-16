const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, Number(value) || 0));

export function environmentalMotionClutter({ wind = 0, rain = 0, grass = 0, shrubs = 0, canopy = 0, targetContrast = 1 } = {}) {
  const vegetationMotion = clamp(wind) * clamp(grass * .45 + shrubs * .7 + canopy * .82);
  const precipitationMotion = clamp(rain) * (.28 + clamp(wind) * .22);
  const raw = clamp(vegetationMotion + precipitationMotion);
  return Object.freeze({ intensity: raw, vegetationMotion, precipitationMotion, targetContrast: clamp(targetContrast), evidenceGrade: "composite-model" });
}

export function motionAgainstClutter(motionSignal = 0, clutter = {}) {
  const intensity = clamp(clutter.intensity), contrast = clamp(clutter.targetContrast ?? 1);
  const separation = clamp((Number(motionSignal) || 0) * (.55 + contrast * .45) - intensity * .62);
  const confidenceMultiplier = clamp(.42 + separation * .78 + (1 - intensity) * .18, .28, 1);
  return Object.freeze({ separation, confidenceMultiplier, clutterIntensity: intensity, uncertainBecause: intensity > .55 && separation < .25 ? "target motion resembles moving vegetation or precipitation" : null });
}
