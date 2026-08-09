const LOWERED_POSTURES = new Set(["stalk", "rest", "birth", "suckle", "nursing-mother"]);
const GROUND_REST_POSTURES = new Set(["rest", "suckle", "nursing-mother"]);

export function isGroundRestPosture(posture = "idle") {
  return GROUND_REST_POSTURES.has(posture);
}

export function postureTransitionDuration(animal = {}) {
  const stageSeconds = {
    dependent: .65,
    juvenile: .55,
    subadult: .8,
    adult: 1.05,
    old: 2.15
  }[animal.lifeStage] ?? 1.05;
  const health = Number.isFinite(Number(animal.health)) ? Number(animal.health) : 100;
  const healthBurden = Math.max(0, Math.min(1, (100 - health) / 100));
  const fatigueBurden = Math.max(0, Math.min(1, (Number(animal.fatigue) || 0) / 100));
  const injuryBurden = Math.min(1, (animal.injuries?.length || 0) / 3);
  const maternalBurden = animal.actionState?.key === "allow-nursing" ? .25 : 0;
  return Math.max(.5, Math.min(4, stageSeconds + healthBurden * .9 + fatigueBurden * .75 + injuryBurden * .7 + maternalBurden));
}

export function smoothPostureProgress(from = 0, target = 0, elapsedMs = 0, durationMs = 1000) {
  const t = Math.max(0, Math.min(1, elapsedMs / Math.max(1, durationMs)));
  const eased = t * t * (3 - 2 * t);
  return from + (target - from) * eased;
}

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
  // A grounded rest must put the underside of the ellipsoid into contact with
  // the terrain. A tiny negative root clearance lets the soft abstract body
  // settle into slopes instead of visibly hovering above them.
  if (GROUND_REST_POSTURES.has(posture)) return safeScale * -.02;
  return safeScale * (LOWERED_POSTURES.has(posture) ? .08 : .12);
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
