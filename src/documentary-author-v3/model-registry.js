const RELATIONS = Object.freeze(["REQUIRES", "SUPPORTS", "CONDITIONS", "INHIBITS", "CONTRADICTS", "REFINES", "EXPLAINS", "OBSERVES", "SUPERSEDES", "COSTS"]);
const FRAMEWORKS = Object.freeze(["PERSISTENCE", "TREND_EXTRAPOLATION", "DYNAMICAL", "HIDDEN_STATE_BAYESIAN", "HAZARD", "FORWARD_ACTION", "DEPENDENCY_EVENT_STATE", "CONTEXTUAL_PREFERENCE", "ANOMALY_SAFETY", "METAPREDICTION"]);
const AUTHORITIES = Object.freeze(["ADVISORY", "CONSTRAINING", "SCORING", "SELECTING", "VETO"]);
const freeze = value => Object.freeze(value);

export class PredictionModelRegistry {
  constructor() { this.models = new Map(); }
  register(input) {
    if (!input?.modelId || !input.family || !input.predicts || typeof input.predict !== "function") throw new TypeError("invalid prediction model");
    if (this.models.has(input.modelId)) throw new TypeError(`duplicate prediction model ${input.modelId}`);
    const dependencies = (input.dependencies || []).map(edge => { if (!this.models.has(edge.modelId) && edge.relation === "REQUIRES" && !input.allowForwardReference) { /* validated after registry construction */ } if (!RELATIONS.includes(edge.relation)) throw new TypeError(`invalid dependency relation ${edge.relation}`); return freeze({ ...edge }); });
    const model = freeze({ scope: freeze([]), requiredInputs: freeze([]), optionalInputs: freeze([]), requiredEvidence: freeze([]), dependencies: freeze(dependencies), contraindications: freeze([]), outcomeVocabulary: freeze([]), outcomeObserverId: null, minimumEvidence: 1, abstainBelowConfidence: .55, maximumInfluence: .2, correlationGroup: input.family, costUnits: 1, version: 3, horizon: freeze({ minimumTicks: 1, maximumTicks: 30 }), framework: "DEPENDENCY_EVENT_STATE", outputShape: "CATEGORICAL", authority: "ADVISORY", safetyRegistered: false, ...input, dependencies: freeze(dependencies) });
    this.models.set(model.modelId, model); return model;
  }
  get(id) { return this.models.get(id) || null; }
  list(family = null) { return [...this.models.values()].filter(item => !family || item.family === family); }
  integrity() {
    const errors = [];
    for (const model of this.models.values()) {
      for (const edge of model.dependencies) {
        if (!this.models.has(edge.modelId)) errors.push(`${model.modelId} references missing model ${edge.modelId}`);
        if (edge.minimumConfidence != null && (!Number.isFinite(Number(edge.minimumConfidence)) || edge.minimumConfidence < 0 || edge.minimumConfidence > 1)) errors.push(`${model.modelId} has invalid minimum confidence for ${edge.modelId}`);
      }
      if (!model.outcomeObserverId) errors.push(`${model.modelId} has no outcome observer`);
      if (!(Number(model.costUnits) >= 0)) errors.push(`${model.modelId} has invalid cost`);
      if (!FRAMEWORKS.includes(model.framework)) errors.push(`${model.modelId} has invalid prediction framework`);
      if (!AUTHORITIES.includes(model.authority)) errors.push(`${model.modelId} has invalid decision authority`);
      if (model.authority === "VETO" && !model.safetyRegistered) errors.push(`${model.modelId} has unregistered veto authority`);
    }
    const visiting = new Set(), visited = new Set();
    const visit = id => { if (visiting.has(id)) { errors.push(`required dependency cycle at ${id}`); return; } if (visited.has(id)) return; visiting.add(id); const model = this.get(id); for (const edge of model?.dependencies || []) if (["REQUIRES", "REFINES"].includes(edge.relation)) visit(edge.modelId); visiting.delete(id); visited.add(id); };
    for (const id of this.models.keys()) visit(id);
    return freeze({ valid: !errors.length, errors: freeze([...new Set(errors)]), models: this.models.size });
  }
  dependencyClosure(rootId, context, calibration = null) {
    const selected = new Map(), missing = [], contradictions = [], visiting = new Set(), successful = new Set(), order = [], superseded = new Set(); const budget = Math.max(1, Number(context?.modelBudget || 32)); let cost = 0;
    const visit = (id, relation = "ROOT", parentId = null, requiredByRoot = relation === "ROOT") => {
      if (successful.has(id)) return true; if (visiting.has(id)) { missing.push({ modelId: id, relation, parentId, reason: "cycle", requiredByRoot }); return false; }
      const model = this.get(id); if (!model) { missing.push({ modelId: id, relation, parentId, reason: "missing", requiredByRoot }); return false; }
      const applicable = model.applicable ? model.applicable(context) : true, contraindicated = model.contraindications.some(test => typeof test === "function" ? test(context) : context?.flags?.has?.(test)), calibrationRecord = calibration?.record?.(model.modelId, context), calibrationSamples = Number(calibrationRecord?.samples || 0), reliability = Number(calibration?.reliability?.(model.modelId, context) ?? .5), posteriorSize = Number(calibrationRecord?.alpha || 2) + Number(calibrationRecord?.beta || 2), posteriorVariance = reliability * (1 - reliability) / Math.max(1, posteriorSize + 1), reliabilityUpperBound = Math.min(1, reliability + 1.96 * Math.sqrt(posteriorVariance));
      let calibratedRecoveryReady = false, calibratedMaximum = 0;
      if (calibrationSamples >= 12 && calibration?.calibrate) try { const raw = model.predict({ ...context, dependencyOutputs: {} })?.outcomes || [], calibrated = calibration.calibrate(model.modelId, context, raw); calibratedMaximum = Math.max(0, ...calibrated.map(item => Number(item.probability || 0))); calibratedRecoveryReady = calibratedMaximum >= .55; } catch { calibratedRecoveryReady = false; }
      const unreliable = calibrationSamples >= 24 && reliabilityUpperBound < .35 && !calibratedRecoveryReady;
      const reject = reason => { missing.push({ modelId: id, relation, parentId, reason, requiredByRoot, calibrationSamples, reliability, reliabilityUpperBound, calibratedRecoveryReady, calibratedMaximum }); return false; };
      if (superseded.has(id)) return reject("superseded");
      if (!applicable) return reject("inapplicable");
      if (contraindicated) { contradictions.push({ modelId: id, parentId, reason: "contraindicated", required: requiredByRoot }); return false; }
      if (unreliable) return reject("calibration-abstention");
      if (!requiredByRoot && cost + Number(model.costUnits || 0) > budget) return reject("cost-budget");
      visiting.add(id);
      let dependenciesSatisfied = true;
      for (const edge of model.dependencies) {
        if (edge.relation === "SUPERSEDES") { superseded.add(edge.modelId); selected.delete(edge.modelId); continue; }
        if (["REQUIRES", "SUPPORTS", "CONDITIONS", "INHIBITS", "CONTRADICTS", "REFINES", "EXPLAINS", "OBSERVES", "COSTS"].includes(edge.relation)) { const dependencyRequiredByRoot = requiredByRoot && ["REQUIRES", "REFINES"].includes(edge.relation), available = visit(edge.modelId, edge.relation, id, dependencyRequiredByRoot); if (["REQUIRES", "REFINES"].includes(edge.relation) && !available) dependenciesSatisfied = false; }
      }
      visiting.delete(id);
      if (!dependenciesSatisfied) return reject("required-dependency-unavailable");
      selected.set(id, model); cost += Number(model.costUnits || 0); successful.add(id); order.push(id); return true;
    };
    const rootAvailable = visit(rootId, "ROOT", null, true);
    const requiredMissing = missing.filter(item => item.requiredByRoot), applicable = [...selected.values()], dependencyCompleteness = selected.size ? applicable.length / (applicable.length + requiredMissing.length) : 0;
    const ranked = applicable.map(model => { const reliability = calibration?.reliability(model.modelId, context) ?? .5, evidenceConfidence = model.evidenceConfidence ? model.evidenceConfidence(context) : .7, relevance = model.relevance ? model.relevance(context) : .5, cost = Number(model.cost || 0), conflict = contradictions.some(item => item.modelId === model.modelId) ? .2 : 0; return { model, score: Math.max(0, Math.min(1, .28 * reliability + .3 * evidenceConfidence + .28 * relevance + .14 * dependencyCompleteness - .08 * cost - conflict)), reliability, evidenceConfidence, relevance }; }).sort((a, b) => b.score - a.score);
    const hardContradiction = contradictions.some(item => item.required); return freeze({ rootId, valid: rootAvailable && !requiredMissing.length && !hardContradiction && ranked.some(item => item.model.modelId === rootId), models: freeze(ranked), topologicalOrder: freeze(order.filter(id => selected.has(id))), missing: freeze(missing), contradictions: freeze(contradictions), dependencyCompleteness, totalCost: cost, budget });
  }
}

export { RELATIONS as MODEL_DEPENDENCY_RELATIONS, FRAMEWORKS as MODEL_PREDICTION_FRAMEWORKS, AUTHORITIES as MODEL_DECISION_AUTHORITIES };
