const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

export function visibleEyeGazeOffset(animal = {}, target = null, { side = 0, convergence = 0 } = {}) {
  if (!target || !Number.isFinite(target.x) || !Number.isFinite(target.z)) return { x: 0, y: 0 };
  const bearing = Math.atan2(target.z - (animal.z || 0), target.x - (animal.x || 0));
  const facing = (animal.orientation || 0) + (animal.headYaw || 0);
  const delta = Math.atan2(Math.sin(bearing - facing), Math.cos(bearing - facing));
  // The shader surface is deliberately allowed only a small excursion. The
  // eyeball's anatomical hemisphere constraint remains the hard outer stop.
  return {
    x: clamp(Math.sin(delta) * .16 - Math.sign(side) * clamp(convergence, 0, .12) * .38, -.14, .14),
    y: clamp(-(animal.headPitch || 0) * .1, -.07, .07)
  };
}

export function visiblePupilScale({ illumination = 1, arousal = 0 } = {}) {
  const darknessDilation = (1 - clamp(illumination, 0, 1)) * .76;
  const arousalDilation = clamp(arousal, 0, 1) * .34;
  return clamp(.66 + darknessDilation + arousalDilation, .6, 1.76);
}

// This is a deliberate cartoon readability exaggeration, not a claim that
// iris tissue expands physiologically. It enlarges the complete coloured eye
// pattern slightly while pupil dilation remains the biologically meaningful
// response inside it.
export function visibleIrisScale({ illumination = 1, arousal = 0 } = {}) {
  const darknessEmphasis = (1 - clamp(illumination, 0, 1)) * .38;
  const arousalEmphasis = clamp(arousal, 0, 1) * .24;
  return clamp(.76 + darknessEmphasis + arousalEmphasis, .72, 1.38);
}
