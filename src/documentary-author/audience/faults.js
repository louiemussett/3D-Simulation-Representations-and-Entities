import { validateFaultReport } from "./feedback-schema.js";

const has = (report, code) => report.faultCodes.includes(code);
const hasAny = (report, codes) => codes.some(code => has(report, code));
const SAFE_CAMERA_FAULTS = ["CAMERA_BLANK_VIEW", "CAMERA_TOO_DISTANT", "CAMERA_TOO_CLOSE", "CAMERA_BAD_ANGLE", "CAMERA_INSIDE_TERRAIN", "CAMERA_SHAKING", "CAMERA_LOOP", "EXCESSIVE_ZOOM", "CAMERA_FAILED_TO_FOLLOW", "CONTROL_FAILED"];
const REPLAN_FAULTS = ["SUBJECT_OUT_OF_FRAME", "WRONG_ENTITY_HIGHLIGHTED", "WRONG_NARRATION_SUBJECT", "IMPORTANT_EVENT_IGNORED", "STORY_NOT_COMPLETED", "UNRELATED_TERRAIN_ROOT", "NARRATION_REPEATED", "NARRATION_SCENE_MISMATCH"];
const MUTE_FAULTS = ["UNSUPPORTED_OUTCOME", "FACTUAL_ERROR", "VOICE_OVERLAP"];
export function corroborateFaultReport(input, metrics = {}) {
  const checked = validateFaultReport(input); if (!checked.valid) return { valid: false, errors: checked.errors, report: null }; const report = checked.value, evidence = [];
  if (has(report, "SUBJECT_OUT_OF_FRAME") && Number(metrics.containmentMean ?? 1) < .35) evidence.push("containment-below-threshold");
  if (has(report, "CAMERA_TOO_DISTANT") && Number(metrics.subjectScreenAreaMean ?? 1) < .08) evidence.push("subject-screen-area-small");
  if (has(report, "CAMERA_TOO_CLOSE") && Number(metrics.subjectScreenAreaMean ?? 0) > .65) evidence.push("subject-screen-area-large");
  if (has(report, "CAMERA_LOOP") && (Number(metrics.accumulatedAngularTravel || 0) > Math.PI * 1.5 || Number(metrics.orbitRepetition || 0) >= 2)) evidence.push("angular-loop-detected");
  if (has(report, "CAMERA_SHAKING") && Number(metrics.maximumJerk || 0) > Math.max(42, Number(metrics.allowedMaximumJerk || 42) * 1.15)) evidence.push("camera-jerk-above-contract");
  if (has(report, "CAMERA_BAD_ANGLE") && Number(metrics.compositionMean ?? 1) < .3) evidence.push("composition-below-threshold");
  if (has(report, "CAMERA_FAILED_TO_FOLLOW") && (Number(metrics.predictedZoneError || 0) > 8 || Number(metrics.containmentMean ?? 1) < .35)) evidence.push("follow-error-detected");
  if (has(report, "CAMERA_INSIDE_TERRAIN") && Number(metrics.invalidPoseDurationMs || 0) > 0) evidence.push("invalid-pose-recorded");
  if (has(report, "CAMERA_BLANK_VIEW") && (Number(metrics.renderEmptySeconds || 0) > 0 || metrics.cameraPoseFinite === false)) evidence.push("blank-render-or-invalid-pose-recorded");
  if (has(report, "EXCESSIVE_CUTTING") && Number(metrics.cutsPerMinute || 0) > 10) evidence.push("cut-frequency-high");
  if (has(report, "NARRATION_REPEATED") && Number(metrics.semanticDuplication || 0) >= .5) evidence.push("semantic-duplication-confirmed");
  if (has(report, "WRONG_NARRATION_SUBJECT") && metrics.subjectMismatch) evidence.push("contract-subject-mismatch");
  const status = evidence.length >= Math.max(1, Math.ceil(report.faultCodes.length * .6)) ? "CONFIRMED_BY_TELEMETRY" : evidence.length ? "PARTIALLY_CONFIRMED" : "INSUFFICIENT_DATA";
  const immediateAction = hasAny(report, SAFE_CAMERA_FAULTS) ? "SAFE_CAMERA" : hasAny(report, REPLAN_FAULTS) ? "REPLAN" : hasAny(report, MUTE_FAULTS) ? "MUTE" : "NONE";
  return Object.freeze({ valid: true, errors: Object.freeze([]), report: Object.freeze({ ...report, corroboration: Object.freeze({ status, evidence: Object.freeze(evidence) }), immediateAction }) });
}

export function faultInhibitsPreference(report) { return Boolean(report?.faultCodes?.some(code => ["CAMERA_BLANK_VIEW", "SUBJECT_OUT_OF_FRAME", "CAMERA_INSIDE_TERRAIN", "CAMERA_LOOP", "WRONG_NARRATION_SUBJECT", "NARRATION_SCENE_MISMATCH", "VOICE_OVERLAP", "SEVERE_LAG"].includes(code))); }
