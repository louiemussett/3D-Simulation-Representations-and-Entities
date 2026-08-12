export const PREDICTION_SCHEMA_VERSION = 1;
export const PREDICTION_FRAMEWORKS = Object.freeze(["PERSISTENCE", "TREND_EXTRAPOLATION", "DYNAMICAL", "HIDDEN_STATE_BAYESIAN", "HAZARD", "FORWARD_ACTION", "DEPENDENCY_EVENT_STATE", "CONTEXTUAL_PREFERENCE", "ANOMALY_SAFETY", "METAPREDICTION"]);
export const PREDICTION_AUTHORITIES = Object.freeze(["ADVISORY", "CONSTRAINING", "SCORING", "SELECTING", "VETO"]);
export const PREDICTION_ABSTENTIONS = Object.freeze(["UNKNOWN", "NOT_APPLICABLE", "INSUFFICIENT_EVIDENCE", "ABSTAINED"]);

const clamp01 = value => Math.max(0, Math.min(1, Number(value) || 0));
const deepFreeze = value => { if (value && typeof value === "object" && !Object.isFrozen(value)) { Object.freeze(value); for (const child of Object.values(value)) deepFreeze(child); } return value; };

export function createPredictionContract(input = {}) {
  if (!input.predictionId || !input.owner?.id || !input.owner?.kind) throw new TypeError("prediction identity and owner are required");
  if (!PREDICTION_FRAMEWORKS.includes(input.framework)) throw new TypeError(`unsupported prediction framework ${input.framework}`);
  const authority = input.authority || "ADVISORY";
  if (!PREDICTION_AUTHORITIES.includes(authority)) throw new TypeError(`unsupported prediction authority ${authority}`);
  if (authority === "VETO" && !input.safetyRegistered) throw new TypeError("veto authority requires a registered safety or physical-feasibility process");
  const earliestTick = Number(input.horizon?.earliestTick), latestTick = Number(input.horizon?.latestTick);
  if (!Number.isFinite(earliestTick) || !Number.isFinite(latestTick) || latestTick < earliestTick) throw new TypeError("prediction horizon is invalid");
  const abstention = input.abstention || null;
  if (abstention && !PREDICTION_ABSTENTIONS.includes(abstention)) throw new TypeError(`unsupported abstention ${abstention}`);
  return deepFreeze({ schemaVersion: PREDICTION_SCHEMA_VERSION, predictionId: String(input.predictionId), owner: { kind: String(input.owner.kind), id: String(input.owner.id) }, modelId: String(input.modelId || "unknown"), framework: input.framework, target: String(input.target || "UNKNOWN"), referent: input.referent == null ? null : String(input.referent), horizon: { earliestTick, latestTick }, applicability: { ...(input.applicability || {}) }, evidenceRefs: [...new Set((input.evidenceRefs || []).filter(Boolean).map(String))], outputShape: input.outputShape || "CATEGORICAL", output: input.output ?? null, confidence: clamp01(input.confidence), cost: Math.max(0, Number(input.cost) || 0), evaluation: { ...(input.evaluation || {}) }, abstention, authority, safetyRegistered: Boolean(input.safetyRegistered), createdAtTick: Number(input.createdAtTick ?? earliestTick) });
}

export function createPredictionLifecycle({ predictionId, modelId, activated, activationReason, admitted = false, influence = 0, authority = "ADVISORY", decisionId = null, errors = [] } = {}) {
  return deepFreeze({ schemaVersion: PREDICTION_SCHEMA_VERSION, predictionId, modelId, activation: { activated: Boolean(activated), reason: activationReason || null }, admission: { admitted: Boolean(admitted) }, coordination: { influence: clamp01(influence) }, decisionAuthority: { authority, decisionId }, errors: [...errors] });
}
