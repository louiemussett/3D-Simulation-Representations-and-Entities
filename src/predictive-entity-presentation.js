import { predictiveModelName } from "./predictive-language.js";
import { animalPredictionSymbol } from "./prediction-symbols.js";

const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, Number(value) || 0));
const percent = value => `${Math.round(clamp(value) * 100)}%`;
const words = value => String(value ?? "unknown").replace(/\.v\d+$/i, "").replaceAll("_", " ").replaceAll("-", " ").replace(/\s+/g, " ").trim();
const title = value => words(value).replace(/\b\w/g, letter => letter.toUpperCase());

export const PREDICTION_EMPTY_STATES = Object.freeze([
  Object.freeze({ id: "not-yet-run", shortLabel: "FORECAST NOT READY", metricText: "WAITING", footerLabel: "OUTCOME UNRESOLVED", detail: "The animal has not completed a predictive cycle yet." }),
  Object.freeze({ id: "below-admission", shortLabel: "NO QUALIFIED FORECAST", metricText: "UNCERTAIN", footerLabel: "BELOW ADMISSION THRESHOLD", detail: "No prediction passed the animal's admission threshold." }),
  Object.freeze({ id: "below-display", shortLabel: "NO QUALIFIED FORECAST", metricText: "LOW SIGNAL", footerLabel: "BELOW DISPLAY THRESHOLD", detail: "The animal has estimates, but none currently qualifies as a meaningful world forecast." }),
  Object.freeze({ id: "no-new-insight", shortLabel: "FORECAST UNCHANGED", metricText: "NO NEW SIGNAL", footerLabel: "CURRENT ESTIMATE RETAINED", detail: "A qualified forecast remains in the animal's ledger, but it has not changed enough to count as a new world insight." })
]);

const PREDICTION_EMPTY_STATE_BY_ID = new Map(PREDICTION_EMPTY_STATES.map(state => [state.id, state]));

const defineInsightVariant = (id, modelId, shortLabel, tone, metricLabel, metricText, metricLevel, metricBand, eligibility) => Object.freeze({ id, modelId, shortLabel, tone, metricLabel, metricText, metricLevel, metricBand, eligibility });

export const PREDICTION_INSIGHT_VARIANTS = Object.freeze([
  defineInsightVariant("threat-probable", "threat-state.v1", "PREDATOR MAY BE NEAR", "danger", "EST. CHANCE", "70%", .7, "chance-70", "Threat probability is above 65% and model confidence is at least 35%."),
  defineInsightVariant("threat-possible", "threat-state.v1", "POSSIBLE DANGER", "caution", "EST. CHANCE", "40%", .4, "chance-40", "Threat probability is at least 30% and model confidence is at least 35%, without crossing the probable threshold."),
  defineInsightVariant("water-available", "resource-water.v1", "WATER MAY REMAIN", "water", "MODEL CONF.", "MEDIUM", .6, "confidence-medium", "Resource pressure is active and the admitted water forecast says the locally evidenced or remembered source is likely to remain available."),
  defineInsightVariant("water-uncertain", "resource-water.v1", "WATER UNCERTAIN", "caution", "MODEL CONF.", "MEDIUM", .6, "confidence-medium", "Resource pressure is active and the admitted water forecast cannot support continued availability."),
  defineInsightVariant("body-recovery", "body-state.v1", "RECOVERY MAY BE NEEDED", "caution", "MODEL CONF.", "MEDIUM", .6, "confidence-medium", "The admitted body forecast says recovery is required; an ordinary sustainable-travel forecast does not create a world cloud."),
  defineInsightVariant("motion-continuing", "motion.v1", "MOVEMENT MAY CONTINUE", "motion", "MODEL CONF.", "HIGH", .85, "confidence-high", "The admitted observation-based motion forecast contains non-trivial projected movement."),
  defineInsightVariant("action-compared", "action-forward.v1", "ACTION OUTCOME COMPARED", "action", "MODEL CONF.", "HIGH", .85, "confidence-high", "The admitted forward comparison is meaningful for a transient world cue only when it changed the selected priority."),
  defineInsightVariant("bounded-renderer-fallback", null, "NEW FORECAST", "neutral", "DETAILS", "SEE PANEL", .5, "fallback", "Rendering fallback only: used when the bounded shared forecast-texture cache cannot allocate another distinct appearance.")
]);

const defineEffectState = (id, visibleLabel, meaning, activeEffect = false, priorityChanged = false) => Object.freeze({ id, visibleLabel, meaning, effectBand: id, activeEffect, priorityChanged });

export const PREDICTION_INSIGHT_EFFECT_STATES = Object.freeze([
  defineEffectState("forecast-only", "FORECAST ONLY", "The meaningful admitted forecast was displayed but did not enter candidate scoring."),
  defineEffectState("bypassed", "FORECAST ONLY", "A protected decision branch bypassed predictive coordination. The world cloud has no unique bypass footer; Forecasts retains the reason."),
  defineEffectState("qualified-no-effect", "QUALIFIED · NO CANDIDATE CHANGED", "Decision support qualified, but no compatible candidate received a non-zero score change or feasibility block."),
  defineEffectState("applied", "USED IN SCORING", "At least one compatible candidate score or feasibility result changed, while the counterfactual winner remained the same.", true),
  defineEffectState("changed-priority", "AFFECTED CHOICE", "Predictive scoring changed which priority ranked first under the same commitment state.", true, true),
  defineEffectState("details", "OPEN FORECASTS PANEL", "Bounded renderer fallback: the exact new appearance was not allocated, so the detailed panel carries the readable result.")
]);

const INSIGHT_VARIANT_BY_ID = new Map(PREDICTION_INSIGHT_VARIANTS.map(variant => [variant.id, variant]));
const INSIGHT_EFFECT_BY_ID = new Map(PREDICTION_INSIGHT_EFFECT_STATES.map(state => [state.id, state]));

export function predictionInsightEffectLabel(cue = {}) {
  if (cue.placeholder) return cue.footerLabel || "BELOW ADMISSION THRESHOLD";
  const id = cue.priorityChanged ? "changed-priority" : cue.activeEffect ? "applied" : cue.effectBand === "qualified-no-effect" ? "qualified-no-effect" : cue.effectBand === "details" ? "details" : cue.effectBand === "bypassed" ? "bypassed" : "forecast-only";
  return INSIGHT_EFFECT_BY_ID.get(id)?.visibleLabel || "FORECAST ONLY";
}

function horizonMinutes(prediction = {}) {
  const created = Number(prediction.createdAtTick), latest = Number(prediction.horizon?.latestTick);
  return Number.isFinite(created) && Number.isFinite(latest) ? Math.max(0, latest - created) : null;
}

function directionLabel(velocity = {}) {
  const x = Number(velocity.x || 0), z = Number(velocity.z || 0), speed = Math.hypot(x, z);
  if (speed < .015) return "near its last observed course";
  const labels = ["east", "south-east", "south", "south-west", "west", "north-west", "north", "north-east"];
  const index = Math.round((Math.atan2(z, x) + Math.PI * 2) / (Math.PI / 4)) % 8;
  return labels[index];
}

function actionUtility(output = {}) {
  const options = [
    { key: "water", label: "Seeking water", value: Number(output.waterUtility ?? -Infinity) },
    { key: "safety", label: "Moving to safety", value: Number(output.escapeUtility ?? -Infinity) },
    { key: "recovery", label: "Recovering", value: Number(output.recoveryUtility ?? -Infinity) }
  ].filter(item => Number.isFinite(item.value));
  return options.sort((left, right) => right.value - left.value || left.key.localeCompare(right.key))[0] || { key: "none", label: "No candidate action", value: 0 };
}

export function describeAnimalPrediction(prediction = {}) {
  const output = prediction.output || {}, confidence = clamp(prediction.confidence), horizon = horizonMinutes(prediction), symbol = animalPredictionSymbol(prediction.modelId);
  const common = { predictionId: prediction.predictionId || null, modelId: prediction.modelId || "unknown", moduleName: predictiveModelName(prediction.modelId), symbolId: symbol.visualId, symbolLabel: symbol.label, glyph: symbol.fallbackGlyph, confidence, confidenceLabel: percent(confidence), horizonMinutes: horizon, horizonLabel: horizon == null ? "time window not recorded" : `next ${horizon} min`, authority: prediction.authority || "ADVISORY" };
  if (prediction.modelId === "threat-state.v1") {
    const probability = clamp(output.probability), band = probability > .65 ? "probable" : probability > .3 ? "possible" : "uncertain";
    return Object.freeze({ ...common, tone: band === "probable" ? "danger" : "caution", semanticBand: band, headline: band === "probable" ? "Predator may be nearby" : band === "possible" ? "Possible predator nearby" : "Danger remains uncertain", detail: `The animal's threat model estimates a ${percent(probability)} chance from its own available clues.`, valueLabel: `${percent(probability)} estimated chance` });
  }
  if (prediction.modelId === "resource-water.v1") {
    const likely = Boolean(output.likelyAvailable), age = Number(output.memoryAge), freshness = Number.isFinite(age) ? age <= 12 ? "fresh" : age <= 48 ? "ageing" : "stale" : "unlocated";
    return Object.freeze({ ...common, tone: likely ? "water" : "caution", semanticBand: `${likely ? "available" : "uncertain"}-${freshness}`, headline: likely ? "Known water may still be available" : "Known water may no longer be usable", detail: Number.isFinite(age) ? `The supporting observation or memory is about ${Math.round(age)} min old.` : "No sufficiently located water record was available.", valueLabel: likely ? "likely available" : "availability uncertain" });
  }
  if (prediction.modelId === "body-state.v1") {
    const recovery = Boolean(output.recoveryRequired), hydration = Math.round(Number(output.hydrationAtHorizon || 0)), travel = Math.max(0, Math.round(Number(output.sustainableTravelTicks || 0)));
    return Object.freeze({ ...common, tone: recovery ? "caution" : "body", semanticBand: `${recovery ? "recovery" : "travel"}-${Math.floor(hydration / 10)}`, headline: recovery ? "Recovery may be needed before hard travel" : `Body reserves may support about ${travel} min of travel`, detail: `Projected hydration is about ${hydration}% at the end of this forecast window.`, valueLabel: recovery ? "recovery predicted" : `${travel} min sustainable travel` });
  }
  if (prediction.modelId === "motion.v1") {
    const direction = directionLabel(output.velocity), speed = Math.hypot(Number(output.velocity?.x || 0), Number(output.velocity?.z || 0)), movementBand = speed < .015 ? "still" : speed < .2 ? "slow" : "moving";
    return Object.freeze({ ...common, tone: "motion", semanticBand: `${prediction.referent || "subject"}-${direction}-${movementBand}`, headline: `A last-observed animal may continue ${direction}`, detail: `This short projection comes from the observer's last local record, with an uncertainty region of about ${Number(output.radius || 0).toFixed(1)} world units.`, valueLabel: `${direction} · ${movementBand}` });
  }
  if (prediction.modelId === "action-forward.v1") {
    const best = actionUtility(output);
    return Object.freeze({ ...common, tone: "action", semanticBand: best.key, headline: `${best.label} has the strongest forecast utility`, detail: "This comparison scores consequences; it does not command an action or rewrite a need.", valueLabel: `${best.label.toLowerCase()} · utility ${best.value.toFixed(1)}` });
  }
  return Object.freeze({ ...common, tone: "neutral", semanticBand: words(prediction.target), headline: `${title(prediction.target)} remains a bounded estimate`, detail: "The forecast is uncertain and applies only to its recorded time window.", valueLabel: title(prediction.target) });
}

function evidenceSubject(record = {}) {
  const value = String(record.type || record.kind || "clue").toLowerCase();
  if (/predator|threat|alarm|attack/.test(value)) return "danger clue";
  if (/water|shore|drink/.test(value)) return "water clue";
  if (/prey|animal|conspecific/.test(value)) return "animal observation";
  if (/carcass/.test(value)) return "possible carcass";
  return `${words(value)} clue`;
}

export function describePredictionEvidence(record = {}) {
  const channel = String(record.channel || "internal").toLowerCase(), communicated = Boolean(record.communicatedBy || record.signalKind || String(record.provenance || "").toLowerCase() === "communication"), source = channel === "memory" ? "Remembered" : communicated ? "Communicated" : "Current", age = Math.max(0, Number(record.age || 0));
  const subject = evidenceSubject(record), prefix = channel === "memory" ? `${source} ${subject}` : communicated ? `${source}${record.signalKind ? ` ${words(record.signalKind)}` : " signal"}: ${subject}` : `${source} ${words(channel)}: ${subject}`;
  return `${prefix} · ${percent(record.confidence ?? .5)} confidence${age > 0 ? ` · about ${Math.round(age)} min old` : ""}`;
}

export function predictionEvidenceLabels(prediction = {}, evidenceSnapshot = null, limit = 3) {
  const refs = new Set(prediction.evidenceRefs || []), records = (evidenceSnapshot?.records || []).filter(record => refs.has(record.evidenceId));
  if (!records.length) return Object.freeze([prediction.modelId === "body-state.v1" ? "Current body state; no external clue required." : "No external evidence description was retained for this forecast."]);
  return Object.freeze(records.slice(0, Math.max(1, limit)).map(describePredictionEvidence));
}

export function predictionContributorNames(cycle = {}, prediction = {}) {
  const upstream = cycle.contributorsByPrediction?.[prediction.predictionId] || [];
  return Object.freeze([...new Set([prediction.modelId, ...upstream].filter(Boolean).map(predictiveModelName))]);
}

function salience(prediction = {}) {
  const output = prediction.output || {};
  if (prediction.modelId === "threat-state.v1") return 100 + clamp(output.probability) * 30;
  if (prediction.modelId === "body-state.v1" && output.recoveryRequired) return 92;
  if (prediction.modelId === "resource-water.v1") return output.likelyAvailable ? 74 : 88;
  if (prediction.modelId === "action-forward.v1") return 64;
  if (prediction.modelId === "motion.v1") return 58;
  return 30;
}

export function salientAnimalPrediction(cycle = null) {
  const predictions = cycle?.predictions || [];
  return predictions.slice().sort((left, right) => salience(right) - salience(left) || Number(right.confidence || 0) - Number(left.confidence || 0) || String(left.modelId).localeCompare(String(right.modelId)))[0] || null;
}

function meaningfulInsightPrediction(prediction = {}, cycle = null) {
  const output = prediction.output || {};
  if (prediction.modelId === "threat-state.v1") return clamp(output.probability) >= .3 && clamp(prediction.confidence) >= .35;
  if (prediction.modelId === "body-state.v1") return Boolean(output.recoveryRequired);
  if (prediction.modelId === "resource-water.v1") return Boolean(cycle?.scheduler?.resourcePressure);
  if (prediction.modelId === "motion.v1") return Math.hypot(Number(output.velocity?.x || 0), Number(output.velocity?.z || 0)) >= .015;
  return prediction.modelId === "action-forward.v1" && Boolean(cycle?.decisionImpact?.priorityChanged);
}

function insightMetric(prediction = {}, readable = {}) {
  if (prediction.modelId === "threat-state.v1") {
    const chance = Math.round(clamp(prediction.output?.probability) * 10) * 10;
    return Object.freeze({ metricLabel: "EST. CHANCE", metricText: `${chance}%`, metricLevel: chance / 100, metricBand: `chance-${chance}` });
  }
  const band = readable.confidence < .45 ? { text: "LOW", level: .3 } : readable.confidence < .7 ? { text: "MEDIUM", level: .6 } : { text: "HIGH", level: .85 };
  return Object.freeze({ metricLabel: "MODEL CONF.", metricText: band.text, metricLevel: band.level, metricBand: `confidence-${band.text.toLowerCase()}` });
}

export function predictiveInsightCue(cycle = null) {
  const prediction = (cycle?.predictions || []).filter(item => meaningfulInsightPrediction(item, cycle)).sort((left, right) => salience(right) - salience(left) || Number(right.confidence || 0) - Number(left.confidence || 0) || String(left.modelId).localeCompare(String(right.modelId)))[0] || null;
  if (!prediction) return null;
  const readable = describeAnimalPrediction(prediction), output = prediction.output || {}, impact = cycle?.decisionImpact, metric = insightMetric(prediction, readable);
  const effectBand = impact?.bypassed ? "bypassed" : impact?.priorityChanged ? "changed-priority" : impact?.scoringApplied ? "applied" : impact?.coordinationQualified ? "qualified-no-effect" : "forecast-only";
  const displayConfidence = Math.round(readable.confidence * 20) * 5;
  const variantId = prediction.modelId === "threat-state.v1" ? readable.semanticBand === "probable" ? "threat-probable" : "threat-possible" : prediction.modelId === "resource-water.v1" ? output.likelyAvailable ? "water-available" : "water-uncertain" : prediction.modelId === "body-state.v1" ? "body-recovery" : prediction.modelId === "motion.v1" ? "motion-continuing" : "action-compared";
  const shortLabel = INSIGHT_VARIANT_BY_ID.get(variantId)?.shortLabel || "NEW FORECAST";
  return Object.freeze({ predictionId: prediction.predictionId, modelId: prediction.modelId, variantId, moduleName: readable.moduleName, symbolId: readable.symbolId, symbolLabel: readable.symbolLabel, label: readable.headline, shortLabel, detail: readable.detail, confidence: readable.confidence, displayConfidence, confidenceLabel: `${displayConfidence}%`, ...metric, tone: readable.tone, effectBand, activeEffect: Boolean(impact?.scoringApplied), priorityChanged: Boolean(impact?.priorityChanged), fingerprint: `${prediction.modelId}|${prediction.referent || "self"}|${readable.semanticBand}|${effectBand}` });
}

export function emptyPredictionInsightCue(cycle = null, requestedState = null) {
  const inferredState = !cycle ? "not-yet-run" : (cycle.predictions || []).length ? "below-display" : "below-admission";
  const id = PREDICTION_EMPTY_STATE_BY_ID.has(requestedState) ? requestedState : inferredState;
  const state = PREDICTION_EMPTY_STATE_BY_ID.get(id);
  return Object.freeze({
    predictionId: null,
    modelId: "presentation-empty",
    moduleName: "Prediction admission monitor",
    symbolId: "no-qualified-forecast",
    symbolLabel: "No qualified forecast",
    label: state.shortLabel.toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase()),
    shortLabel: state.shortLabel,
    detail: state.detail,
    confidence: 0,
    displayConfidence: 0,
    confidenceLabel: "not admitted",
    metricLabel: "STATUS",
    metricText: state.metricText,
    metricLevel: 0,
    metricBand: `empty-${id}`,
    tone: "neutral",
    effectBand: "empty",
    activeEffect: false,
    priorityChanged: false,
    placeholder: true,
    emptyState: id,
    footerLabel: state.footerLabel,
    fingerprint: `forecast-empty:${id}`
  });
}

function impactTone(impact = {}) {
  return impact.bypassed ? "bypassed" : impact.priorityChanged ? "changed" : impact.scoringApplied ? "applied" : impact.coordinationQualified ? "qualified" : impact.calculatedOnly ? "shadow" : "fallback";
}

export function describePredictiveDecisionImpact(cycle = null) {
  const impact = cycle?.decisionImpact;
  if (!cycle) return Object.freeze({ tone: "empty", headline: "No predictive cycle yet", detail: "The animal has not completed a predictive decision cycle.", adjustments: Object.freeze([]), priority: "No decision recorded", needs: "No predictive mutation recorded", method: "No method recorded", memory: "No predictive mutation recorded", learning: "No correction recorded" });
  if (!impact) return Object.freeze({ tone: "unknown", headline: "Forecast recorded; decision attribution unavailable", detail: "This cycle predates explicit before-and-after decision tracing, so no priority or method change is claimed.", adjustments: Object.freeze([]), priority: "Unknown for this older cycle", needs: "Needs were not directly changed", method: "No direct method edit is recorded", memory: "Ordinary memory was not directly changed", learning: "Confidence can change only after a later owner-observed result" });
  let headline, detail;
  if (impact.bypassed) { headline = "Qualified forecasts were bypassed for this commitment"; detail = impact.bypassReason; }
  else if (impact.protectedBranch) { headline = "Protected commitment used established behaviour"; detail = "No admitted forecast was available to bypass or alter this protected decision branch."; }
  else if (impact.coordinationQualified && !impact.scoringApplied) { headline = "Decision support qualified; no compatible candidate changed"; detail = "The forward comparison cleared its threshold, but no available candidate received a non-zero score change or feasibility block."; }
  else if (!impact.scoringApplied) { headline = "Forecast only; behaviour was unchanged"; detail = impact.calculatedOnly ? "Admitted forecasts were available for inspection, but they did not enter candidate scoring." : "No admitted forecast qualified to influence the ordinary selector."; }
  else if (impact.priorityChanged) { headline = `Prediction changed the selected priority to ${words(impact.selectedWinner?.drive)}`; detail = `Without predictive scoring, ${words(impact.baselineWinner?.drive)} would have ranked first under the same commitment state.`; }
  else { headline = `Prediction supported the existing priority: ${words(impact.selectedWinner?.drive)}`; detail = "Candidate scores or feasibility were adjusted, but the same priority still won the counterfactual comparison."; }
  const adjustments = (impact.candidateAdjustments || []).map(item => Object.freeze({ ...item, label: title(item.family || item.drive), effectLabel: item.vetoApplied ? "physically blocked" : `${item.scoreDelta >= 0 ? "+" : ""}${Number(item.scoreDelta || 0).toFixed(1)} actual score` }));
  const method = impact.resultingMethod || impact.resultingAction || "not recorded";
  const priority = impact.bypassed ? `Protected branch selected ${words(impact.selectedWinner?.drive)} without predictive scoring.` : impact.protectedBranch ? `Protected branch selected ${words(impact.selectedWinner?.drive)}; no admitted forecast was bypassed.` : impact.priorityChanged ? `Changed from ${words(impact.baselineWinner?.drive)} to ${words(impact.selectedWinner?.drive)}.` : `Remained ${words(impact.selectedWinner?.drive)}.`;
  return Object.freeze({ tone: impactTone(impact), headline, detail, adjustments: Object.freeze(adjustments), priority, needs: "Unchanged — forecasts read need and physiology values but do not write them.", method: impact.priorityChanged ? `Current method: ${words(method)}. It followed the changed priority; no method record was edited directly, and the counterfactual method was not executed.` : `Current method: ${words(method)}. The predictive layer did not directly rewrite it.`, memory: impact.predictorWorkingStateUpdated ? "Ordinary memory unchanged. The motion predictor updated only its separate last-observation working cache." : "Ordinary episodic, social and strategic memory unchanged.", learning: "No confidence learning occurs during selection; bounded confidence can update only after this animal later observes an outcome." });
}

export function predictionInsightPresentation({ selected = false, admitted = false, transitionActive = false, urgentImpact = false } = {}) {
  const permitted = Boolean(selected), visible = Boolean(permitted && admitted && transitionActive && !urgentImpact);
  return Object.freeze({ visible, private: true, public: false, transient: visible, suppressed: urgentImpact ? "urgent impact takes precedence" : !permitted ? "private forecast is not available in this view" : !admitted ? "no admitted meaningful forecast" : !transitionActive ? "forecast insight window elapsed" : "" });
}
