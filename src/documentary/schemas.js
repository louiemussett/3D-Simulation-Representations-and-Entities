export const DOCUMENTARY_SCHEMA_VERSION = 1;

export const RECORD_TYPES = Object.freeze([
  "documentary_event", "event_range", "causal_evidence", "story_thread", "promise", "prediction",
  "camera_decision", "narration_request", "narration_result", "narration_asset", "editorial_window",
  "session_checkpoint", "session_manifest", "manual_marker", "operator_amendment", "production_event",
  "author_evidence_batch", "author_belief_revision", "author_situation_transition", "author_model_graph", "author_forecast_opened", "author_forecast_resolved", "author_plan_proposed", "author_decision_executed", "author_shadow_comparison", "author_presentation_outcome", "author_learning_attribution", "author_profile_delta", "author_profile_commit"
]);

export const CAUSAL_LEVELS = Object.freeze(["DIRECT", "DETERMINISTIC", "STRONG_ASSOCIATION", "EDITORIAL_HYPOTHESIS", "UNKNOWN"]);
export const EVENT_STATES = Object.freeze(["CANDIDATE", "CONFIRMED", "REVISED", "RESOLVED", "RETRACTED"]);
export const THREAD_STATES = Object.freeze(["CANDIDATE", "DEVELOPING", "ACTIVE", "DORMANT", "RETURN_READY", "RESOLVED", "CONSEQUENCE", "ARCHIVED", "INVALIDATED"]);
export const THREAD_PHASES = Object.freeze(["DISCOVERY", "DECISION", "COMPLICATION", "REVERSAL", "ESCALATION", "RESOLUTION", "CONSEQUENCE", "REFLECTION"]);
export const EDITORIAL_CLASSES = Object.freeze(["STAGNANT_REMOVE", "STAGNANT_COMPRESS", "QUIET_KEEP", "ACTIVE", "HIGHLIGHT", "MAJOR_HIGHLIGHT"]);
export const INTERRUPTION_LEVELS = Object.freeze(["BACKGROUND_UPDATE", "PREVIEW", "CUTAWAY", "FULL_HANDOFF", "EMERGENCY_OVERRIDE"]);
export const SHOT_PHASES = Object.freeze(["ACQUIRE", "ESTABLISH", "TRACK", "REVEAL_CONTEXT", "HOLD_OUTCOME", "REACTION", "CONSEQUENCE", "RELEASE"]);
export const NARRATION_FUNCTIONS = Object.freeze(["INTRODUCTION", "OBSERVATION", "EXPLANATION", "PREDICTION", "ESCALATION", "TRANSITION", "REENTRY", "RESOLUTION", "CONSEQUENCE", "REFLECTION", "CORRECTION", "SUMMARY"]);

const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
const finite = value => Number.isFinite(Number(value));
const nonEmpty = value => typeof value === "string" && value.trim().length > 0;
const array = value => Array.isArray(value);
const enumValue = values => value => values.includes(value);

const ENVELOPE_FIELDS = {
  schemaVersion: value => value === DOCUMENTARY_SCHEMA_VERSION,
  sessionId: nonEmpty,
  recordId: nonEmpty,
  recordType: enumValue(RECORD_TYPES),
  recordingTimeMs: finite,
  simulationTime: object,
  createdAtUtc: value => nonEmpty(value) && !Number.isNaN(Date.parse(value)),
  source: nonEmpty,
  payload: object,
  evidence: array
};

const PAYLOAD_RULES = {
  documentary_event: payload => nonEmpty(payload.type) && enumValue(EVENT_STATES)(payload.state) && array(payload.subjectIds),
  event_range: payload => nonEmpty(payload.rangeType) && finite(payload.startMs) && (payload.endMs == null || finite(payload.endMs)),
  causal_evidence: payload => enumValue(CAUSAL_LEVELS)(payload.level) && nonEmpty(payload.claim),
  story_thread: payload => nonEmpty(payload.threadId) && enumValue(THREAD_STATES)(payload.status) && enumValue(THREAD_PHASES)(payload.phase) && array(payload.subjectIds),
  promise: payload => nonEmpty(payload.promiseId) && nonEmpty(payload.status),
  prediction: payload => nonEmpty(payload.predictionId) && nonEmpty(payload.status),
  camera_decision: payload => nonEmpty(payload.decisionId) && nonEmpty(payload.status) && nonEmpty(payload.reason),
  narration_request: payload => nonEmpty(payload.requestId) && enumValue(NARRATION_FUNCTIONS)(payload.function) && array(payload.verifiedFacts),
  narration_result: payload => nonEmpty(payload.requestId) && typeof payload.text === "string" && array(payload.claims),
  narration_asset: payload => nonEmpty(payload.narrationId) && typeof payload.text === "string" && nonEmpty(payload.status),
  editorial_window: payload => enumValue(EDITORIAL_CLASSES)(payload.classification) && finite(payload.startMs),
  session_checkpoint: payload => nonEmpty(payload.checkpointId),
  session_manifest: payload => nonEmpty(payload.title) && nonEmpty(payload.status),
  manual_marker: payload => nonEmpty(payload.markerId) && nonEmpty(payload.kind),
  operator_amendment: payload => nonEmpty(payload.amendmentId) && nonEmpty(payload.targetId),
  production_event: payload => nonEmpty(payload.type)
};

export function validateDocumentaryRecord(record) {
  const errors = [];
  if (!object(record)) return { valid: false, errors: ["record must be an object"] };
  for (const [field, validate] of Object.entries(ENVELOPE_FIELDS)) if (!validate(record[field])) errors.push(`invalid ${field}`);
  const rule = PAYLOAD_RULES[record.recordType];
  if (rule && object(record.payload) && !rule(record.payload)) errors.push(`invalid ${record.recordType} payload`);
  return { valid: errors.length === 0, errors };
}

export function validateProtocolMessage(message) {
  const errors = [];
  if (!object(message)) return { valid: false, errors: ["message must be an object"] };
  if (!nonEmpty(message.type)) errors.push("invalid type");
  if (message.schemaVersion !== DOCUMENTARY_SCHEMA_VERSION) errors.push("unsupported schemaVersion");
  if (message.type !== "HELLO" && !nonEmpty(message.requestId)) errors.push("invalid requestId");
  if (["EVENT_BATCH", "CHECKPOINT"].includes(message.type) && !nonEmpty(message.sessionId)) errors.push("invalid sessionId");
  if (message.type === "EVENT_BATCH" && (!array(message.records) || message.records.some(record => !validateDocumentaryRecord(record).valid))) errors.push("invalid records");
  return { valid: errors.length === 0, errors };
}

export const DOCUMENTARY_RECORD_JSON_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: Object.keys(ENVELOPE_FIELDS),
  properties: {
    schemaVersion: { const: DOCUMENTARY_SCHEMA_VERSION }, sessionId: { type: "string", minLength: 1 }, recordId: { type: "string", minLength: 1 },
    recordType: { enum: RECORD_TYPES }, recordingTimeMs: { type: "number", minimum: 0 }, simulationTime: { type: "object" },
    createdAtUtc: { type: "string" }, source: { type: "string", minLength: 1 }, payload: { type: "object" }, evidence: { type: "array", items: { type: "string" } }
  }
});

export const NARRATION_RESULT_JSON_SCHEMA = Object.freeze({
  type: "object", additionalProperties: false, required: ["text", "claims", "mentionedSubjectIds", "usedInterpretationIds", "usedPredictionIds", "wordCount"],
  properties: {
    text: { type: "string" }, claims: { type: "array", items: { type: "object", additionalProperties: false, required: ["surfaceText", "supportType", "supportIds"], properties: { surfaceText: { type: "string" }, supportType: { enum: ["VERIFIED_FACT", "PERMITTED_INTERPRETATION", "PERMITTED_PREDICTION"] }, supportIds: { type: "array", items: { type: "string" } } } } },
    mentionedSubjectIds: { type: "array", items: { type: "string" } }, usedInterpretationIds: { type: "array", items: { type: "string" } }, usedPredictionIds: { type: "array", items: { type: "string" } }, wordCount: { type: "integer", minimum: 0 }
  }
});
