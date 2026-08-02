const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const response = (rate, dt) => 1 - Math.exp(-Math.max(0, rate) * Math.max(0, dt));
export const wrapCameraAngle = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
export const smoothAngle = (current, target, rate, dt) => wrapCameraAngle(current + wrapCameraAngle(target - current) * response(rate, dt));
const approach = (current, target, rate, dt) => current + (target - current) * response(rate, dt);

export const CAMERA_CONTEXTS = Object.freeze({
  navigation: Object.freeze({ distance: 10.25, pitch: .52, fov: 46, focusHeight: .78, lookAhead: 1.15, recenterDelay: .8, recenterRate: 3.4, positionRate: 9, focusRate: 12, collisionInRate: 30, collisionOutRate: 2.15 }),
  action: Object.freeze({ distance: 8.75, pitch: .42, fov: 42, focusHeight: .82, lookAhead: .5, recenterDelay: 1.2, recenterRate: 4, positionRate: 13, focusRate: 15, collisionInRate: 34, collisionOutRate: 2.3 }),
  sensory: Object.freeze({ distance: .08, pitch: 0, fov: 58, focusHeight: 1, lookAhead: 0, recenterDelay: Infinity, recenterRate: 0, positionRate: 18, focusRate: 18, collisionInRate: 40, collisionOutRate: 5 }),
  indirect: Object.freeze({ distance: 8.5, pitch: .38, fov: 44, focusHeight: .75, lookAhead: .35, recenterDelay: Infinity, recenterRate: 0, positionRate: 7, focusRate: 8, collisionInRate: 30, collisionOutRate: 2.5 })
});

export function createGameplayCameraState(subject, options = {}) {
  const yaw = Number.isFinite(options.yaw) ? options.yaw : subject.orientation || 0, context = options.context || "navigation", policy = CAMERA_CONTEXTS[context];
  const initialLookAhead = policy.lookAhead * .5, focus = { x: subject.x + Math.sin(yaw) * initialLookAhead, y: options.focusY || 0, z: subject.z + Math.cos(yaw) * initialLookAhead }, horizontal = Math.cos(policy.pitch) * policy.distance;
  return { context, previousContext: context, yaw, pitch: policy.pitch, requestedDistance: policy.distance, collisionDistance: policy.distance, focus, position: { x: focus.x - Math.sin(yaw) * horizontal, y: focus.y + policy.distance * Math.sin(policy.pitch), z: focus.z - Math.cos(yaw) * horizontal }, lastManualAt: -Infinity, fov: policy.fov };
}

export function updateGameplayCamera(state, frame) {
  const dt = Math.min(.1, Math.max(0, frame.dt || 0)), now = Number(frame.now) || 0, context = frame.context || state.context || "navigation", policy = CAMERA_CONTEXTS[context] || CAMERA_CONTEXTS.navigation;
  state.context = context;
  if (frame.lookX || frame.lookY) {
    state.yaw = wrapCameraAngle(state.yaw - frame.lookX * (frame.lookSensitivity || .0025));
    state.pitch = clamp(state.pitch + frame.lookY * (frame.lookSensitivity || .0025), .32, 1.02);
    state.lastManualAt = now;
  }
  if (frame.zoom) state.requestedDistance = clamp(state.requestedDistance + frame.zoom * .012, frame.minDistance ?? 5.5, frame.maxDistance ?? 24);
  if (context !== state.previousContext) {
    state.requestedDistance = policy.distance;
    state.pitch = policy.pitch;
    state.previousContext = context;
  }
  const height = Math.max(.25, Number(frame.subjectHeight) || 1), speed = Math.max(0, Number(frame.speed) || 0), lookAhead = policy.lookAhead * Math.min(1.8, .5 + speed);
  if (speed > .08 && now - state.lastManualAt > policy.recenterDelay && Number.isFinite(frame.preferredYaw) && policy.recenterRate > 0) state.yaw = smoothAngle(state.yaw, frame.preferredYaw, policy.recenterRate, dt);
  const idealFocus = { x: frame.subject.x + Math.sin(frame.preferredYaw || 0) * lookAhead, y: frame.groundY + height * policy.focusHeight, z: frame.subject.z + Math.cos(frame.preferredYaw || 0) * lookAhead };
  const focusBlend = response(policy.focusRate, dt);
  state.focus.x += (idealFocus.x - state.focus.x) * focusBlend; state.focus.y += (idealFocus.y - state.focus.y) * focusBlend; state.focus.z += (idealFocus.z - state.focus.z) * focusBlend;
  const requested = context === "sensory" ? policy.distance : state.requestedDistance;
  const safeDistance = clamp(frame.resolveDistance ? frame.resolveDistance(state.focus, state.yaw, state.pitch, requested) : requested, .08, requested);
  state.collisionDistance = approach(state.collisionDistance, safeDistance, safeDistance < state.collisionDistance ? policy.collisionInRate : policy.collisionOutRate, dt);
  const horizontal = Math.cos(state.pitch) * state.collisionDistance, idealPosition = { x: state.focus.x - Math.sin(state.yaw) * horizontal, y: state.focus.y + Math.sin(state.pitch) * state.collisionDistance, z: state.focus.z - Math.cos(state.yaw) * horizontal };
  const positionBlend = response(policy.positionRate, dt);
  state.position.x += (idealPosition.x - state.position.x) * positionBlend; state.position.y += (idealPosition.y - state.position.y) * positionBlend; state.position.z += (idealPosition.z - state.position.z) * positionBlend;
  state.fov = approach(state.fov, policy.fov + Math.min(5, speed * 1.4), 4, dt);
  return state;
}
