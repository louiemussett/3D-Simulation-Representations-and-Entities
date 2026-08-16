const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const angleDifference = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const approachAngle = (current, target, maximum) => current + clamp(angleDifference(target, current), -maximum, maximum);

export function setAuthoritativeBodyHeading(animal, heading) {
  const normalized = Math.atan2(Math.sin(Number(heading) || 0), Math.cos(Number(heading) || 0));
  animal.orientation = normalized;
  if (animal.locomotion) {
    animal.locomotion.heading = normalized;
    if (Math.hypot(animal.locomotion.vx || 0, animal.locomotion.vz || 0) < .01) animal.locomotion.angularVelocity = 0;
  }
  return normalized;
}

export const ORIENTING_SCHEMA = 2;

export function migrateOrientingState(animal) {
  const state = animal.orientingState || {};
  animal.orientingState = { schemaVersion: ORIENTING_SCHEMA, targetId: state.targetId || null, channel: state.channel || null, bearing: Number.isFinite(state.bearing) ? state.bearing : null, confidence: Number(state.confidence || 0), acquiredTick: Number(state.acquiredTick || 0), sustainedTicks: Number(state.sustainedTicks || 0), leftEarYaw: Number(state.leftEarYaw || 0), rightEarYaw: Number(state.rightEarYaw || 0), leftEyeYaw: Number(state.leftEyeYaw || 0), rightEyeYaw: Number(state.rightEyeYaw || 0), convergence: Number(state.convergence || 0), gazeStabilization: Number(state.gazeStabilization || 0), reason: state.reason || "no salient cue" };
  return animal.orientingState;
}

export function updateOrienting(animal, observations = [], tick = 0) {
  const state = migrateOrientingState(animal);
  const candidates = observations.filter(item => Number.isFinite(item.bearing) && Number(item.confidence || 0) >= .16).sort((a, b) => (b.confidence || 0) - (a.confidence || 0) || String(a.targetId || "").localeCompare(String(b.targetId || "")));
  const cue = candidates[0];
  if (!cue) {
    state.confidence *= .72; state.leftEarYaw = approachAngle(state.leftEarYaw, 0, .18); state.rightEarYaw = approachAngle(state.rightEarYaw, 0, .18); state.leftEyeYaw = approachAngle(state.leftEyeYaw, 0, .12); state.rightEyeYaw = approachAngle(state.rightEyeYaw, 0, .12); state.convergence *= .7;
    if (state.confidence < .08) { state.targetId = null; state.channel = null; state.bearing = null; state.sustainedTicks = 0; state.reason = "no salient cue"; }
    return state;
  }
  const cueIdentity = cue.targetId || cue.acoustic?.eventId || `${cue.channel}:${cue.type || "cue"}`;
  const same = state.targetId === cueIdentity && state.channel === cue.channel;
  const cueHeading = cue.channel === "hearing" ? Math.PI / 2 - cue.bearing : cue.bearing;
  state.targetId = cueIdentity; state.channel = cue.channel; state.bearing = cueHeading; state.confidence = cue.confidence; state.acquiredTick = same ? state.acquiredTick : tick; state.sustainedTicks = same ? state.sustainedTicks + 1 : 1;
  const relative = angleDifference(cueHeading, animal.orientation || 0), earTarget = clamp(relative, -1.4, 1.4);
  // Both pinnae attend the cue, but retain a small side-specific divergence.
  // This makes their independent control observable and avoids a rigid,
  // mirrored-plate appearance without inventing a second sound source.
  const earDivergence = cue.channel === "hearing" ? .14 : .08;
  state.leftEarYaw = approachAngle(state.leftEarYaw, clamp(earTarget + earDivergence, -1.4, 1.4), .34);
  state.rightEarYaw = approachAngle(state.rightEarYaw, clamp(earTarget - earDivergence, -1.4, 1.4), .34);
  const distance = Number(cue.distance || (Number.isFinite(cue.x) && Number.isFinite(cue.z) ? Math.hypot(cue.x - animal.x, cue.z - animal.z) : 20));
  const convergence = cue.channel === "sight" ? clamp(.2 / Math.max(1, distance), 0, .12) : 0;
  const eyeTarget = clamp(relative - (animal.headYaw || 0), -.5, .5);
  state.leftEyeYaw = approachAngle(state.leftEyeYaw, eyeTarget + convergence, .2); state.rightEyeYaw = approachAngle(state.rightEyeYaw, eyeTarget - convergence, .2); state.convergence = convergence;
  const movement = Math.hypot(animal.locomotion?.vx || 0, animal.locomotion?.vz || 0); state.gazeStabilization = clamp(movement * .8, 0, 1);
  animal.headYaw = approachAngle(animal.headYaw || 0, clamp(relative, -1.05, 1.05), .24);
  const stationary = Math.hypot(animal.locomotion?.vx || 0, animal.locomotion?.vz || 0) < .01;
  if (stationary && state.sustainedTicks >= 2 && Math.abs(relative) > .82 && ["listen", "orient", "search"].includes(animal.actionState?.key)) {
    setAuthoritativeBodyHeading(animal, approachAngle(animal.orientation || 0, cueHeading, .16)); state.reason = `body orienting toward sustained ${cue.channel} cue`;
  } else state.reason = `${cue.channel} cue retained by ears and head`;
  return state;
}
