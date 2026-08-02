const LOWERED_POSTURES = new Set(["stalk", "rest", "birth", "suckle", "nursing-mother"]);

export function gradualHeading(current = 0, desired = 0, maxTurn = Math.PI / 24, deadZone = Math.PI / 120) {
  const delta = Math.atan2(Math.sin(desired - current), Math.cos(desired - current));
  if (Math.abs(delta) <= deadZone) return current;
  const step = Math.max(-Math.abs(maxTurn), Math.min(Math.abs(maxTurn), delta));
  return Math.atan2(Math.sin(current + step), Math.cos(current + step));
}

export function requiresTurnInPlace(current = 0, desired = 0, tolerance = Math.PI / 18) {
  return Math.abs(Math.atan2(Math.sin(desired - current), Math.cos(desired - current))) > tolerance;
}

export function movingTurnTolerance(fastLocomotion = false) {
  return fastLocomotion ? Math.PI * 2 / 15 : Math.PI / 18;
}

export function animalGroundOffset(scale = 1, posture = "idle") {
  const safeScale = Math.max(.2, Number(scale) || 1);
  if (posture === "collapse") return safeScale * .06;
  return safeScale * (LOWERED_POSTURES.has(posture) ? .2 : .12);
}

export function locomotionAnimation(posture = "idle", nowMs = 0) {
  if (!['travel', 'flee', 'chase'].includes(posture)) return Object.freeze({ active: false, bob: 0, frequency: 0 });
  const urgent = posture === "flee" || posture === "chase";
  const frequency = urgent ? .01 : .0032;
  const amplitude = urgent ? .055 : .04;
  return Object.freeze({ active: true, bob: Math.abs(Math.sin(nowMs * frequency)) * amplitude, frequency });
}

export function matingPosture(speciesId = "grazer", scale = 1) {
  const safeScale = Math.max(.2, Number(scale) || 1);
  const hunter = speciesId === "hunter";
  return Object.freeze({
    bodyPitch: hunter ? Math.PI / 5.2 : Math.PI / 5.8,
    bodyLift: safeScale * (hunter ? .18 : .16),
    headLift: safeScale * (hunter ? .34 : .28),
    headForward: safeScale * (hunter ? .04 : .025),
    headPitch: hunter ? -.1 : -.07
  });
}
