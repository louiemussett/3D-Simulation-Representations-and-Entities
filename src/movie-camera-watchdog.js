const finiteComponent = value => Number.isFinite(Number(value));

export const CAMERA_RECOVERY_FAULT_CODES = Object.freeze([
  "CAMERA_BLANK_VIEW",
  "SUBJECT_OUT_OF_FRAME",
  "CAMERA_TOO_DISTANT",
  "CAMERA_TOO_CLOSE",
  "CAMERA_BAD_ANGLE",
  "CAMERA_INSIDE_TERRAIN",
  "CAMERA_SHAKING",
  "CAMERA_LOOP",
  "EXCESSIVE_ZOOM",
  "CAMERA_FAILED_TO_FOLLOW",
  "CONTROL_FAILED"
]);

const cameraRecoveryFaults = new Set(CAMERA_RECOVERY_FAULT_CODES);

export function finiteMovieCameraPose(pose = {}) {
  const position = pose.position || {}, target = pose.target || {};
  if (![position.x, position.y, position.z, target.x, target.y, target.z, pose.fov].every(finiteComponent)) return false;
  const distance = Math.hypot(position.x - target.x, position.y - target.y, position.z - target.z);
  return Number.isFinite(distance) && distance >= .05 && Number(pose.fov) >= 8 && Number(pose.fov) <= 120;
}

export function cameraFaultRequiresRecovery(code, severity = "MAJOR") {
  return cameraRecoveryFaults.has(String(code || "")) || severity === "UNUSABLE" && /^CAMERA_|SUBJECT_OUT_OF_FRAME|CONTROL_FAILED/.test(String(code || ""));
}

export function movieCameraWatchdogDecision({ pose, metrics = null, invalidSeconds = 0, renderEmptySeconds = 0, contextLost = false } = {}) {
  if (contextLost) return Object.freeze({ action: "WAIT_FOR_CONTEXT", reason: "webgl-context-lost" });
  if (!finiteMovieCameraPose(pose)) return Object.freeze({ action: "RECOVER", reason: "non-finite-camera-pose" });
  if (Number(renderEmptySeconds) >= 1.25) return Object.freeze({ action: "RECOVER", reason: "empty-render-output" });
  if (metrics?.valid === false && Number(invalidSeconds) >= 1.15) return Object.freeze({ action: "RECOVER", reason: metrics.reason || "invalid-camera-pose" });
  return Object.freeze({ action: "HOLD", reason: "camera-healthy" });
}
