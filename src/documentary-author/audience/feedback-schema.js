const THUMBS = new Set(["UP", "DOWN", null]);
const DIRECTIONS = new Set(["MORE_LIKE_THIS", "LESS_LIKE_THIS", null]);
const FAULT_CATEGORIES = new Set(["CAMERA", "SUBJECT", "NARRATION", "CAPTIONS", "IDENTITY", "EVENT_COVERAGE", "PERFORMANCE", "RECORDING", "OTHER"]);
const FAULT_SEVERITIES = new Set(["MINOR", "MAJOR", "UNUSABLE"]);

export const AUDIENCE_FEEDBACK_TAGS = Object.freeze([
  "GOOD_SUBJECT", "GOOD_CAMERA_ANGLE", "GOOD_DISTANCE", "GOOD_PACING", "GOOD_EXPLANATION",
  "USEFUL_LABORATORY_DETAIL", "FOLLOW_ENTITY", "MORE_TOPIC", "GOOD_QUIET_MOMENT", "GOOD_STORY_CONTINUATION",
  "NOT_INTERESTED_SUBJECT", "LESS_TOPIC", "TOO_MUCH_NARRATION", "NOT_ENOUGH_EXPLANATION", "SHOT_TOO_LONG",
  "SHOT_TOO_SHORT", "TOO_MANY_CUTS", "PREFER_DIFFERENT_ENTITY", "MORE_WORLD_CONTEXT", "MORE_CHARACTER_FOCUS",
  "CAMERA_TOO_DISTANT", "CAMERA_TOO_CLOSE", "CAMERA_TOO_ACTIVE", "CAMERA_TOO_STATIC"
]);

export const AUDIENCE_FAULT_CODES = Object.freeze([
  "CAMERA_BLANK_VIEW", "SUBJECT_OUT_OF_FRAME", "CAMERA_TOO_DISTANT", "CAMERA_TOO_CLOSE", "CAMERA_BAD_ANGLE", "CAMERA_INSIDE_TERRAIN",
  "CAMERA_SHAKING", "CAMERA_LOOP", "EXCESSIVE_ZOOM", "EXCESSIVE_CUTTING", "CAMERA_FAILED_TO_FOLLOW",
  "WRONG_ENTITY_HIGHLIGHTED", "WRONG_NARRATION_SUBJECT", "IMPORTANT_EVENT_IGNORED", "IRRELEVANT_SUBJECT_RETURN",
  "STORY_NOT_COMPLETED", "UNRELATED_TERRAIN_ROOT", "NARRATION_REPEATED", "NARRATION_SCENE_MISMATCH",
  "FACTUAL_ERROR", "UNSUPPORTED_OUTCOME", "NARRATION_TOO_VAGUE", "VOICE_CAPTION_MISMATCH", "VOICE_OVERLAP",
  "CAPTIONS_MISSING", "VOICE_MISSING", "SEVERE_LAG", "CONTROL_FAILED", "RECORDING_FAILURE", "OTHER"
]);

const tagSet = new Set(AUDIENCE_FEEDBACK_TAGS), faultSet = new Set(AUDIENCE_FAULT_CODES);
const text = (value, maximum = 256) => typeof value === "string" ? value.slice(0, maximum) : "";
const ids = values => [...new Set((Array.isArray(values) ? values : []).filter(value => typeof value === "string" && value).slice(0, 64))];

export function validateSceneFeedback(input = {}) {
  const errors = [], rating = input.rating == null ? null : Number(input.rating), thumb = input.thumb ?? null, direction = input.direction ?? null, tags = ids(input.tags);
  if (!input.presentationId) errors.push("presentationId is required");
  if (!THUMBS.has(thumb)) errors.push("invalid thumb");
  if (rating != null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) errors.push("rating must be an integer from 1 through 5");
  if (!DIRECTIONS.has(direction)) errors.push("invalid direction");
  for (const tag of tags) if (!tagSet.has(tag) && !tag.startsWith("MORE_TOPIC:") && !tag.startsWith("LESS_TOPIC:")) errors.push(`unknown feedback tag ${tag}`);
  if (thumb == null && rating == null && direction == null && !tags.length && !input.focusAnswer && !input.writtenFeedbackId) errors.push("feedback episode is empty");
  return Object.freeze({ valid: !errors.length, errors: Object.freeze(errors), value: Object.freeze({ feedbackId: text(input.feedbackId), audienceProfileId: text(input.audienceProfileId), sessionId: text(input.sessionId), presentationId: text(input.presentationId), contractId: text(input.contractId), decisionId: text(input.decisionId), threadId: text(input.threadId), situationId: text(input.situationId), submittedAtRecordingMs: Math.max(0, Number(input.submittedAtRecordingMs || 0)), submittedAtSimulationTick: Math.max(0, Number(input.submittedAtSimulationTick || 0)), thumb, rating, direction, tags: Object.freeze(tags), focusAnswer: text(input.focusAnswer), writtenFeedbackId: text(input.writtenFeedbackId), status: input.status === "RETRACTED" ? "RETRACTED" : input.status === "CONFIRMED" ? "CONFIRMED" : "RECORDED" }) });
}

export function validateImplicitSignal(input = {}) {
  const types = new Set(["NEXT_SHOT", "PAUSE", "KEEP", "HIGHLIGHT", "FAVOURITE", "OPEN_DETAILS"]), errors = [];
  if (!input.presentationId) errors.push("presentationId is required");
  if (!types.has(input.type)) errors.push("invalid implicit signal type");
  return Object.freeze({ valid: !errors.length, errors: Object.freeze(errors), value: Object.freeze({ signalId: text(input.signalId), presentationId: text(input.presentationId), type: input.type, occurredAtRecordingMs: Math.max(0, Number(input.occurredAtRecordingMs || 0)), exposureFraction: Math.max(0, Math.min(1, Number(input.exposureFraction || 0))), narrationComplete: Boolean(input.narrationComplete), criticalEventActive: Boolean(input.criticalEventActive), userInitiated: input.userInitiated !== false, selectedReason: text(input.selectedReason), knownFault: Boolean(input.knownFault) }) });
}

export function validateFaultReport(input = {}) {
  const errors = [], faultCodes = ids(input.faultCodes);
  if (!input.presentationId) errors.push("presentationId is required");
  if (!FAULT_CATEGORIES.has(input.category)) errors.push("invalid fault category");
  if (!FAULT_SEVERITIES.has(input.severity)) errors.push("invalid fault severity");
  if (!faultCodes.length) errors.push("at least one fault code is required");
  for (const code of faultCodes) if (!faultSet.has(code)) errors.push(`unknown fault code ${code}`);
  return Object.freeze({ valid: !errors.length, errors: Object.freeze(errors), value: Object.freeze({ reportId: text(input.reportId), presentationId: text(input.presentationId), contractId: text(input.contractId), category: input.category, faultCodes: Object.freeze(faultCodes), severity: input.severity, descriptionId: text(input.descriptionId), submittedAtRecordingMs: Math.max(0, Number(input.submittedAtRecordingMs || 0)), capture: input.capture && typeof input.capture === "object" ? structuredClone(input.capture) : {}, status: "OPEN" }) });
}

export function normalizeExplicitFeedback(feedback) {
  const thumbValue = feedback.thumb === "UP" ? .65 : feedback.thumb === "DOWN" ? -.65 : null;
  const ratingValue = feedback.rating == null ? null : (feedback.rating - 3) / 2;
  const directionValue = feedback.direction === "MORE_LIKE_THIS" ? .8 : feedback.direction === "LESS_LIKE_THIS" ? -.8 : null;
  const base = thumbValue != null && ratingValue != null ? .35 * thumbValue + .65 * ratingValue : ratingValue ?? thumbValue ?? directionValue ?? 0;
  const confidence = feedback.status === "CONFIRMED" ? 1 : .9;
  return Object.freeze({ value: Math.max(-1, Math.min(1, base)), confidence, tags: feedback.tags || [], explicit: true });
}

export function normalizeImplicitSignal(signal) {
  if (signal.knownFault) return Object.freeze({ value: 0, weight: 0, reason: "known-fault-inhibits-preference" });
  if (signal.type === "NEXT_SHOT") {
    if (signal.exposureFraction < .25) return Object.freeze({ value: 0, weight: 0, reason: "insufficient-exposure" });
    const weight = signal.selectedReason ? .5 : signal.exposureFraction < .55 ? .1 : .2;
    return Object.freeze({ value: -.35, weight, reason: signal.selectedReason || "qualified-skip" });
  }
  if (signal.type === "KEEP") return Object.freeze({ value: .45, weight: .35, reason: "keep-marker" });
  if (signal.type === "HIGHLIGHT") return Object.freeze({ value: .65, weight: .35, reason: "highlight-marker" });
  if (signal.type === "FAVOURITE") return Object.freeze({ value: .85, weight: .5, reason: "favourite-entity" });
  if (signal.type === "OPEN_DETAILS") return Object.freeze({ value: .2, weight: .1, reason: "information-interest" });
  return Object.freeze({ value: 0, weight: 0, reason: "ambiguous-signal" });
}
