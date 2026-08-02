export const AUTHOR_MODES = Object.freeze(["LEGACY", "V2_SHADOW", "V2_ACTIVE"]);
export const EPISTEMIC_CLASSES = Object.freeze(["DIRECT_OBSERVATION", "AUTHORITATIVE_STATE", "DETERMINISTIC_DERIVATION", "STRONG_ASSOCIATION", "EDITORIAL_HYPOTHESIS", "BOUNDED_PREDICTION", "REPORTED_BY_ENTITY_SIGNAL", "UNKNOWN"]);
export const SITUATION_STATES = Object.freeze(["CANDIDATE", "DEVELOPING", "ACTIVE", "DORMANT", "RETURN_READY", "RESOLVED", "INVALIDATED", "ARCHIVED"]);
export const QUESTION_STATES = Object.freeze(["PROPOSED", "OPEN", "PARTIALLY_ANSWERED", "RESOLVED", "EXPIRED", "INVALIDATED"]);
export const EDITORIAL_ACTIONS = Object.freeze(["FOLLOW_THREAD", "SWITCH_THREAD", "WIDEN_CONTEXT", "SHOW_REACTION", "SHOW_CAUSE", "SHOW_CONSEQUENCE", "INTRODUCE_SUBJECT", "EXPLAIN_MECHANISM", "ASK_QUESTION", "RESOLVE_QUESTION", "CORRECT_CLAIM", "DEFER_OPPORTUNITY", "RETURN_TO_THREAD", "REMAIN_SILENT"]);
export const ERROR_CLASSES = Object.freeze(["EVIDENCE_ERROR", "INTERPRETATION_ERROR", "PREDICTION_ERROR", "CANDIDATE_FORMATION_ERROR", "SELECTION_ERROR", "COMMITMENT_ERROR", "SWITCHING_ERROR", "COMPOSITION_ERROR", "EXECUTION_ERROR", "NARRATION_REALISATION_ERROR", "AUDIENCE_MODEL_ERROR", "STATE_SPACE_ERROR", "METASELECTION_ERROR"]);
export const DEFAULT_AUTHOR_FLAGS = Object.freeze({ evidenceBusV2: true, propositionStoreV2: true, audienceMemoryV2: true, situationThreadsV2: true, semanticRealiserV2: true, predictorsV2: true, predictiveSelectionV2: true, adaptiveCameraV2: true, boundedCorrectionV2: false });

const finite = value => Number.isFinite(Number(value));
const id = value => typeof value === "string" && value.length > 0;
const bounded = value => finite(value) && Number(value) >= 0 && Number(value) <= 1;

export function validateEvidence(value) {
  const errors = [];
  if (!value || typeof value !== "object") return { valid: false, errors: ["evidence must be an object"] };
  if (!id(value.evidenceId)) errors.push("invalid evidenceId");
  if (!finite(value.tick)) errors.push("invalid tick");
  if (!id(value.type)) errors.push("invalid type");
  if (!Array.isArray(value.subjects)) errors.push("invalid subjects");
  if (!bounded(value.confidence)) errors.push("invalid confidence");
  if (!bounded(value.magnitude)) errors.push("invalid magnitude");
  if (!value.provenance || !id(value.provenance.sourceClass)) errors.push("invalid provenance");
  return { valid: errors.length === 0, errors };
}

export function validateProposition(value) {
  const errors = [];
  if (!value || typeof value !== "object") return { valid: false, errors: ["proposition must be an object"] };
  if (!id(value.propositionId)) errors.push("invalid propositionId");
  if (!id(value.predicate)) errors.push("invalid predicate");
  if (!EPISTEMIC_CLASSES.includes(value.epistemicClass)) errors.push("invalid epistemicClass");
  if (!bounded(value.confidence)) errors.push("invalid confidence");
  if (!Array.isArray(value.support) || !value.support.length) errors.push("missing support");
  return { valid: errors.length === 0, errors };
}

export function normalizeProbabilityOutcomes(outcomes = []) {
  const safe = outcomes.filter(item => id(item?.id) && finite(item.probability)).map(item => ({ ...item, probability: Math.max(0, Number(item.probability)) }));
  const total = safe.reduce((sum, item) => sum + item.probability, 0);
  if (!safe.length || total <= 0) return [];
  return safe.map(item => Object.freeze({ ...item, probability: item.probability / total }));
}

