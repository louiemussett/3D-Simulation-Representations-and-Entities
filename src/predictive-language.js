const titleWords = value => String(value ?? "unknown")
  .replace(/\.v\d+$/i, "")
  .replaceAll("_", " ")
  .replaceAll("-", " ")
  .replaceAll(".", " ")
  .replace(/\s+/g, " ")
  .trim()
  .replace(/\b\w/g, letter => letter.toUpperCase());

export const PREDICTIVE_MODEL_NAMES = Object.freeze({
  "body-state.v1": "Body reserve forecast",
  "resource-water.v1": "Water availability forecast",
  "motion.v1": "Observed movement forecast",
  "threat-state.v1": "Threat likelihood estimate",
  "action-forward.v1": "Action consequence comparison"
});

export const PREDICTIVE_MODEL_PURPOSES = Object.freeze({
  "body-state.v1": "Estimates hydration, sustainable travel and whether recovery is required.",
  "resource-water.v1": "Estimates whether locally sensed or remembered water is still available.",
  "motion.v1": "Projects a recently observed subject for a short time without reading its live hidden position.",
  "threat-state.v1": "Combines current and remembered warning evidence into a bounded danger estimate.",
  "action-forward.v1": "Compares the expected consequences of water-seeking, escape, recovery and other candidate actions."
});

export const PREDICTION_FRAMEWORK_GUIDE = Object.freeze({
  PERSISTENCE: "Assumes a recently observed condition continues briefly unless new evidence contradicts it.",
  TREND_EXTRAPOLATION: "Extends an observed direction or rate over a short, uncertainty-limited horizon.",
  DYNAMICAL: "Projects how a changing physical state, such as hydration or endurance, evolves through time.",
  HIDDEN_STATE_BAYESIAN: "Estimates an unobserved state from several uncertain clues without treating it as confirmed fact.",
  HAZARD: "Estimates the chance that a consequential event will occur within a stated period.",
  FORWARD_ACTION: "Compares likely consequences of candidate actions before one is committed.",
  DEPENDENCY_EVENT_STATE: "Tracks whether prerequisites and event phases are likely to remain available or advance.",
  CONTEXTUAL_PREFERENCE: "Estimates which valid presentation or action best fits the current context and bounded preferences.",
  ANOMALY_SAFETY: "Looks specifically for invalid, unsafe or physically impossible outcomes.",
  METAPREDICTION: "Estimates how reliable another model or selector is likely to be in this context."
});

export const PREDICTION_AUTHORITY_GUIDE = Object.freeze({
  ADVISORY: "Supplies information but cannot change or block an action by itself.",
  CONSTRAINING: "Narrows the physically or biologically credible range of an option.",
  SCORING: "Adds a bounded positive or negative contribution to comparable candidate actions.",
  SELECTING: "May choose among already valid options when explicitly registered to do so.",
  VETO: "May block an unsafe or physically impossible option; only registered safety processes receive this authority."
});

export const PREDICTION_ABSTENTION_GUIDE = Object.freeze({
  UNKNOWN: "The process cannot determine an outcome from what is currently known.",
  NOT_APPLICABLE: "The process is valid in general but does not apply to this situation.",
  INSUFFICIENT_EVIDENCE: "Relevant evidence exists, but it is too weak, stale or incomplete to support a forecast.",
  ABSTAINED: "The process deliberately withheld its forecast because admission, cost or confidence requirements were not met."
});

export const PREDICTION_MODE_GUIDE = Object.freeze({
  LEGACY: "No prediction qualified to influence this decision, so the established behaviour remains authoritative.",
  PREDICTIVE_SHADOW: "Predictions were recorded for inspection and later evaluation, but they did not change the decision.",
  PREDICTIVE_ACTIVE: "An admitted forward-action comparison qualified for bounded decision support in a pressured situation; the per-decision impact record says whether a compatible candidate was actually changed or a protected branch took precedence."
});

export const PREDICTIVE_FIELD_GUIDE = Object.freeze({
  threatBaseRate: "Inherited expectation of danger before current evidence is considered.",
  waterPersistence: "Expected persistence of a previously observed water source.",
  motionPersistence: "Expected short-term continuation of an observed movement trend.",
  threatEvidenceWeight: "Current individual weight given to threat clues.",
  motionScale: "Current individual scale applied to short movement projections.",
  actionCostScale: "Current individual estimate of how expensive planned action will be.",
  body: "Trust in body-state forecasts.",
  resource: "Trust in resource-availability forecasts.",
  motion: "Trust in short movement forecasts.",
  threat: "Trust in hidden-threat estimates.",
  action: "Trust in action-consequence comparisons.",
  selector: "Trust in the process that decides which predictions deserve computation."
});

export const PREDICTIVE_GATE_GUIDE = Object.freeze({
  survivalNeed: "Food need has crossed the emergency threshold.",
  currentCompatiblePrey: "A current sight or body-proximity observation identifies compatible prey.",
  health: "Health remains above the protected emergency-hunt floor.",
  hydration: "Hydration remains above the protected hunting reserve.",
  travel: "A safe travelling pace or immediate physical contact remains possible.",
  burst: "Usable muscle burst reserve is available, unless prey is already at contact.",
  metabolicJourney: "Accessible metabolic substrate can fund the forecast interception.",
  interception: "The observation-derived interception remains within a viable local range."
});

export function predictiveWords(value) { return titleWords(value); }
export function predictiveModelName(modelId) { return PREDICTIVE_MODEL_NAMES[modelId] || titleWords(modelId); }
export function predictiveModelPurpose(modelId) { return PREDICTIVE_MODEL_PURPOSES[modelId] || "Produces one bounded forecast for the current decision context."; }
export function predictiveModeExplanation(mode) { return PREDICTION_MODE_GUIDE[mode] || "The automatic scheduler has not produced a current predictive state."; }
