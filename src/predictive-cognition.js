import { createPredictionContract, createPredictionLifecycle } from "./prediction-contract.js";

export const ANIMAL_COGNITION_MODES = Object.freeze(["LEGACY", "PREDICTIVE_SHADOW", "PREDICTIVE_ACTIVE"]);
export const ANIMAL_COGNITION_PROFILES = Object.freeze(["LEGACY", "FIXED", "ADAPTIVE", "ABLATION"]);
const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, Number(value) || 0));
const LEDGER_LIMIT = 96;
const STRUCTURAL_PROPOSAL_LIMIT = 24;
const runtimeByCognition = new WeakMap();

function appendBoundedRing(records, value, limit) {
  let evicted = null;
  if (records.length >= limit) {
    evicted = records[0];
    records.copyWithin(0, 1);
    records[records.length - 1] = value;
  } else records.push(value);
  return evicted;
}

function currentCognitionState(state) {
  return Boolean(state && state.schemaVersion === 1 && ANIMAL_COGNITION_MODES.includes(state.mode) && ANIMAL_COGNITION_PROFILES.includes(state.profile) && typeof state.automatic === "boolean" && state.innatePriors && state.learned && state.confidence && state.activations && Array.isArray(state.ledger) && state.ledger.length <= LEDGER_LIMIT && Array.isArray(state.outcomes) && state.outcomes.length <= LEDGER_LIMIT && Array.isArray(state.structuralProposals) && state.structuralProposals.length <= STRUCTURAL_PROPOSAL_LIMIT && state.metrics);
}

function addActivePrediction(runtime, prediction) {
  let byModel = runtime.activeByModel.get(prediction.modelId);
  if (!byModel) { byModel = new Set(); runtime.activeByModel.set(prediction.modelId, byModel); }
  byModel.add(prediction.predictionId);
  if (prediction.modelId === "motion.v1" && prediction.referent != null) {
    let byReferent = runtime.activeMotionByReferent.get(prediction.referent);
    if (!byReferent) { byReferent = new Set(); runtime.activeMotionByReferent.set(prediction.referent, byReferent); }
    byReferent.add(prediction.predictionId);
  }
}

function removeActivePrediction(runtime, prediction) {
  const byModel = runtime.activeByModel.get(prediction.modelId);
  byModel?.delete(prediction.predictionId);
  if (byModel && !byModel.size) runtime.activeByModel.delete(prediction.modelId);
  if (prediction.modelId === "motion.v1" && prediction.referent != null) {
    const byReferent = runtime.activeMotionByReferent.get(prediction.referent);
    byReferent?.delete(prediction.predictionId);
    if (byReferent && !byReferent.size) runtime.activeMotionByReferent.delete(prediction.referent);
  }
}

function buildCognitionRuntime(state) {
  const runtime = { predictionById: new Map(), resolvedIds: new Set((state.outcomes || []).map(item => item.predictionId)), dueQueue: [], dueCursor: 0, activeByModel: new Map(), activeMotionByReferent: new Map(), lastTick: -Infinity, ledgerRef: state.ledger, ledgerLast: state.ledger.at(-1), outcomesRef: state.outcomes, outcomesLast: state.outcomes.at(-1) };
  for (const record of state.ledger) for (const prediction of record.predictions || []) {
    runtime.predictionById.set(prediction.predictionId, prediction);
    if (!runtime.resolvedIds.has(prediction.predictionId)) runtime.dueQueue.push(prediction);
  }
  runtime.dueQueue.sort((left, right) => Number(left.horizon?.earliestTick || 0) - Number(right.horizon?.earliestTick || 0) || String(left.predictionId).localeCompare(String(right.predictionId)));
  runtimeByCognition.set(state, runtime);
  return runtime;
}

function cognitionRuntime(state) {
  const runtime = runtimeByCognition.get(state);
  if (!runtime || runtime.ledgerRef !== state.ledger || runtime.ledgerLast !== state.ledger.at(-1) || runtime.outcomesRef !== state.outcomes || runtime.outcomesLast !== state.outcomes.at(-1)) return buildCognitionRuntime(state);
  return runtime;
}

function syncRuntimeMarkers(state, runtime) {
  runtime.ledgerRef = state.ledger; runtime.ledgerLast = state.ledger.at(-1); runtime.outcomesRef = state.outcomes; runtime.outcomesLast = state.outcomes.at(-1);
}

function enqueuePrediction(runtime, prediction) {
  runtime.predictionById.set(prediction.predictionId, prediction);
  if (runtime.resolvedIds.has(prediction.predictionId)) return;
  const due = Number(prediction.horizon?.earliestTick || 0), queue = runtime.dueQueue;
  if (runtime.dueCursor >= queue.length || due >= Number(queue.at(-1)?.horizon?.earliestTick || -Infinity)) queue.push(prediction);
  else {
    let low = runtime.dueCursor, high = queue.length;
    while (low < high) { const middle = (low + high) >>> 1; if (Number(queue[middle].horizon?.earliestTick || 0) <= due) low = middle + 1; else high = middle; }
    queue.splice(low, 0, prediction);
  }
}

function activateDuePredictions(runtime, tick) {
  runtime.lastTick = Math.max(runtime.lastTick, tick);
  while (runtime.dueCursor < runtime.dueQueue.length) {
    const prediction = runtime.dueQueue[runtime.dueCursor];
    if (Number(prediction.horizon?.earliestTick || 0) > tick) break;
    runtime.dueCursor += 1;
    if (!runtime.resolvedIds.has(prediction.predictionId) && runtime.predictionById.has(prediction.predictionId)) addActivePrediction(runtime, prediction);
  }
  if (runtime.dueCursor > 128 && runtime.dueCursor * 2 > runtime.dueQueue.length) { runtime.dueQueue.splice(0, runtime.dueCursor); runtime.dueCursor = 0; }
}

function appendLedgerRecord(state, runtime, record) {
  const evicted = appendBoundedRing(state.ledger, record, LEDGER_LIMIT);
  for (const prediction of evicted?.predictions || []) { removeActivePrediction(runtime, prediction); runtime.predictionById.delete(prediction.predictionId); runtime.resolvedIds.delete(prediction.predictionId); }
  for (const prediction of record.predictions || []) enqueuePrediction(runtime, prediction);
  syncRuntimeMarkers(state, runtime);
}

export function migratePredictiveCognition(animal, { mode = "PREDICTIVE_SHADOW", profile = "FIXED" } = {}) {
  const prior = animal.predictiveCognition || {};
  if (currentCognitionState(prior)) { cognitionRuntime(prior); return prior; }
  animal.predictiveCognition = { schemaVersion: 1, mode: ANIMAL_COGNITION_MODES.includes(prior.mode) ? prior.mode : mode, profile: ANIMAL_COGNITION_PROFILES.includes(prior.profile) ? prior.profile : profile, automatic: prior.automatic !== false, innatePriors: { threatBaseRate: .12, waterPersistence: .72, motionPersistence: .7, ...(prior.innatePriors || {}) }, learned: { threatEvidenceWeight: 1, waterPersistence: .72, motionScale: 1, actionCostScale: 1, ...(prior.learned || {}) }, confidence: { body: .7, resource: .6, motion: .6, threat: .6, action: .6, selector: .7, ...(prior.confidence || {}) }, activations: { ...(prior.activations || {}) }, ledger: [...(prior.ledger || [])].slice(-LEDGER_LIMIT), outcomes: [...(prior.outcomes || [])].slice(-LEDGER_LIMIT), structuralProposals: [...(prior.structuralProposals || [])].slice(-STRUCTURAL_PROPOSAL_LIMIT), metrics: { cycles: 0, admitted: 0, abstained: 0, cost: 0, corrections: 0, ...(prior.metrics || {}) }, current: prior.current || null };
  cognitionRuntime(animal.predictiveCognition);
  return animal.predictiveCognition;
}

export function captureAnimalEvidence(animal, tick) {
  const contacts = (animal.sensoryBuffer || []).map((item, index) => Object.freeze({ evidenceId: item.evidenceId || `sense:${animal.id}:${tick}:${index}`, channel: item.channel || "unknown", originalChannel: item.originalChannel || item.channel || "unknown", provenance: item.provenance || (item.communicatedBy || item.signalKind ? "communication" : "perception"), type: item.type || item.kind || "unknown", targetId: item.targetId || null, communicatedBy: item.communicatedBy || null, signalKind: item.signalKind || null, x: Number.isFinite(item.x) ? item.x : null, z: Number.isFinite(item.z) ? item.z : null, distance: Number.isFinite(item.distance) ? item.distance : null, confidence: clamp(item.confidence ?? .5), age: 0 }));
  const memories = [...(animal.memories || []), ...(animal.mediumTermMemory || [])].map((item, index) => Object.freeze({ evidenceId: item.evidenceId || `memory:${animal.id}:${tick}:${index}`, channel: "memory", originalChannel: item.originalChannel || item.channel || "unknown", provenance: "memory", type: item.type || item.kind || "unknown", targetId: item.targetId || null, communicatedBy: item.communicatedBy || null, signalKind: item.signalKind || null, x: Number.isFinite(item.x) ? item.x : null, z: Number.isFinite(item.z) ? item.z : null, distance: null, confidence: clamp((item.confidence ?? .4) * Math.exp(-Math.max(0, Number(item.age) || 0) / 48)), age: Math.max(0, Number(item.age) || 0) }));
  return Object.freeze({ ownerId: animal.id, tick, physiology: Object.freeze({ hydration: Number(animal.hydration || 0), fatigue: Number(animal.fatigue || 0), energy: Number(animal.energy || 0), fear: Number(animal.fear || 0), endurance: Number(animal.endurance ?? 100 - (animal.fatigue || 0)), sprintCapacity: Number(animal.sprintEnergy || animal.sprintCapacity || 0), emergencyReserve: Number(animal.emergencyReserve || 0) }), contacts: Object.freeze(contacts), memories: Object.freeze(memories) });
}

const prediction = (animal, tick, modelId, framework, target, output, confidence, evidence, extra = {}) => createPredictionContract({ predictionId: `${animal.id}:${tick}:${modelId}`, owner: { kind: "ANIMAL", id: animal.id }, modelId, framework, target, referent: extra.referent, horizon: { earliestTick: tick + 1, latestTick: tick + (extra.horizon || 30) }, evidenceRefs: evidence.map(item => item.evidenceId), outputShape: extra.outputShape || "STRUCTURED", output, confidence, cost: extra.cost || 1, evaluation: { observableByOwner: true, condition: extra.evaluation || "subsequent local observation" }, authority: extra.authority || "ADVISORY", safetyRegistered: Boolean(extra.safetyRegistered), createdAtTick: tick });

const isDirectOutcomeEvidence = item => item?.channel !== "memory" && !item?.communicatedBy && !item?.signalKind && !/alarm|warning|communicat|reported|social[-_ ]?signal|public[-_ ]?signal/i.test(`${item?.channel || ""} ${item?.originalChannel || ""} ${item?.provenance || ""} ${item?.type || ""}`);
const THREAT_EVIDENCE = /predator|threat|alarm|attack/;
const WATER_EVIDENCE = /water|shore|drink/;
const TARGET_EVIDENCE = /animal|predator|prey|conspecific|mate|group|attacker|threat/i;
const DEAD_TARGET_EVIDENCE = /carcass|corpse|dead/i;

export function classifyAnimalEvidence(evidence) {
  const classified = { all: [], threat: [], water: [], targets: [], directThreat: [], directWater: [], directTargetsById: new Map() };
  const classify = item => {
    classified.all.push(item);
    const type = item.type || "", direct = isDirectOutcomeEvidence(item), threat = THREAT_EVIDENCE.test(type), water = WATER_EVIDENCE.test(type), target = Boolean(item.targetId && Number.isFinite(item.x) && Number.isFinite(item.z) && TARGET_EVIDENCE.test(type) && !DEAD_TARGET_EVIDENCE.test(type));
    if (threat) { classified.threat.push(item); if (direct) classified.directThreat.push(item); }
    if (water) { classified.water.push(item); if (direct) classified.directWater.push(item); }
    if (target) {
      classified.targets.push(item);
      if (direct) {
        let records = classified.directTargetsById.get(item.targetId);
        if (!records) { records = []; classified.directTargetsById.set(item.targetId, records); }
        records.push(item);
      }
    }
  };
  for (const item of evidence.contacts || []) classify(item);
  for (const item of evidence.memories || []) classify(item);
  return classified;
}

function evidenceNotUsedToCreatePrediction(items, prior) {
  const sourceRefs = new Set(prior?.evidenceRefs || []);
  return items.filter(item => !sourceRefs.has(item.evidenceId));
}

function strongestEvidence(items) {
  let strongest = null;
  for (const item of items) if (!strongest || item.confidence > strongest.confidence) strongest = item;
  return strongest;
}

function resolvePendingPrediction(animal, state, runtime, prediction, observed, tick) {
  if (observed !== null) resolveAnimalPrediction(animal, { predictionId: prediction.predictionId, observed, observedByAnimal: true, observedTick: tick }, state, runtime);
}

function evaluatePendingPredictions(animal, state, runtime, tick, evidence, classified) {
  activateDuePredictions(runtime, tick);
  for (const predictionId of [...(runtime.activeByModel.get("body-state.v1") || [])]) {
    const prior = runtime.predictionById.get(predictionId);
    if (prior) resolvePendingPrediction(animal, state, runtime, prior, { recoveryRequired: evidence.physiology.endurance < 18 }, tick);
  }
  if (classified.directWater.length) for (const predictionId of [...(runtime.activeByModel.get("resource-water.v1") || [])]) {
    const prior = runtime.predictionById.get(predictionId); if (!prior) continue;
    const evaluative = evidenceNotUsedToCreatePrediction(classified.directWater, prior), available = evaluative.some(item => item.confidence >= .5 && !/dry|empty|unavailable|depleted/i.test(item.type)), unavailable = evaluative.some(item => item.confidence >= .5 && /dry|empty|unavailable|depleted/i.test(item.type));
    resolvePendingPrediction(animal, state, runtime, prior, available !== unavailable ? { available, evidenceRefs: evaluative.map(item => item.evidenceId) } : null, tick);
  }
  if (classified.directThreat.length) for (const predictionId of [...(runtime.activeByModel.get("threat-state.v1") || [])]) {
    const prior = runtime.predictionById.get(predictionId); if (!prior) continue;
    const evaluative = evidenceNotUsedToCreatePrediction(classified.directThreat, prior), present = evaluative.some(item => item.confidence >= .5 && !/cleared|absent|safe|no-predator/i.test(item.type)), absent = evaluative.some(item => item.confidence >= .5 && /cleared|absent|safe|no-predator/i.test(item.type));
    resolvePendingPrediction(animal, state, runtime, prior, present !== absent ? { present, evidenceRefs: evaluative.map(item => item.evidenceId) } : null, tick);
  }
  for (const [referent, contacts] of classified.directTargetsById) {
    const pending = runtime.activeMotionByReferent.get(referent); if (!pending?.size) continue;
    for (const predictionId of [...pending]) {
      const prior = runtime.predictionById.get(predictionId); if (!prior) continue;
      const contact = strongestEvidence(evidenceNotUsedToCreatePrediction(contacts, prior));
      resolvePendingPrediction(animal, state, runtime, prior, contact ? { targetId: contact.targetId, x: contact.x, z: contact.z, evidenceRef: contact.evidenceId } : null, tick);
    }
  }
}

export function runPredictiveCognition(animal, { tick = 0, mode, profile, modelBudget = null, disabledModels = [], automatic = mode == null } = {}) {
  const state = migratePredictiveCognition(animal, { mode, profile }); if (mode && !automatic) state.mode = mode; if (profile) state.profile = profile; state.automatic = automatic;
  if (!automatic && (state.mode === "LEGACY" || state.profile === "LEGACY")) return { mode: "LEGACY", scheduler: { automatic: false, reason: "legacy mode explicitly requested", budget: 0 }, predictions: [], lifecycles: [], adjustments: {}, vetoes: [] };
  const disabled = new Set(disabledModels), evidence = captureAnimalEvidence(animal, tick), classified = classifyAnimalEvidence(evidence), { all, threat: threatEvidence, water: waterEvidence, targets: targetEvidence } = classified, runtime = cognitionRuntime(state);
  const danger = threatEvidence.length > 0 || evidence.physiology.fear > 35, resourcePressure = evidence.physiology.hydration < 75 || waterEvidence.length > 0, restingSafely = !danger && evidence.physiology.fear < 10 && /rest|sleep|idle/.test(animal.actionState?.key || ""), automaticBudget = danger ? 6 : resourcePressure ? 4 : restingSafely ? 1 : 3, budget = modelBudget == null ? automaticBudget : Math.max(1, Number(modelBudget));
  evaluatePendingPredictions(animal, state, runtime, tick, evidence, classified);
  const candidates = [], contributorsByPrediction = {};
  candidates.push(prediction(animal, tick, "body-state.v1", "DYNAMICAL", "BODY_STATE", { hydrationAtHorizon: clamp(evidence.physiology.hydration - 4, 0, 100), sustainableTravelTicks: Math.max(0, Math.round((evidence.physiology.endurance - 18) / Math.max(.5, state.learned.actionCostScale))), recoveryRequired: evidence.physiology.endurance < 18 }, state.confidence.body, [], { authority: "CONSTRAINING", safetyRegistered: true, horizon: 12 }));
  if (waterEvidence.length || evidence.physiology.hydration < 85) { const best = strongestEvidence(waterEvidence); candidates.push(prediction(animal, tick, "resource-water.v1", "DEPENDENCY_EVENT_STATE", "WATER_AVAILABILITY", { likelyAvailable: Boolean(best) && best.confidence * state.learned.waterPersistence > .35, location: best && Number.isFinite(best.x) ? { x: best.x, z: best.z } : null, memoryAge: best?.age ?? null }, best ? best.confidence * state.learned.waterPersistence : .2, best ? [best] : [], { referent: best?.targetId || "water", horizon: 60 })); }
  if (budget >= 3 && targetEvidence.length) { const observed = strongestEvidence(targetEvidence), prior = state.activations.lastTargetObservation?.[observed.targetId], elapsed = Math.max(1, tick - Number(prior?.tick || tick - 1)), vx = prior ? (observed.x - prior.x) / elapsed : 0, vz = prior ? (observed.z - prior.z) / elapsed : 0; candidates.push(prediction(animal, tick, "motion.v1", "TREND_EXTRAPOLATION", "TARGET_POSITION", { position: { x: observed.x + vx * 4 * state.learned.motionScale, z: observed.z + vz * 4 * state.learned.motionScale }, radius: 1.5 + 4 * (1 - observed.confidence), velocity: { x: vx, z: vz } }, observed.confidence * state.confidence.motion, [observed], { referent: observed.targetId, horizon: 4 })); state.activations.lastTargetObservation = { ...(state.activations.lastTargetObservation || {}), [observed.targetId]: { x: observed.x, z: observed.z, tick } }; }
  if (budget >= 3 && (threatEvidence.length || evidence.physiology.fear > 20)) { const weighted = threatEvidence.reduce((sum, item) => sum + item.confidence * ({ sight: 1, proximity: 1, smell: .65, sound: .55, memory: .35 }[item.channel] || .4), 0), probability = clamp(1 - Math.exp(-weighted * state.learned.threatEvidenceWeight) + evidence.physiology.fear / 300); candidates.push(prediction(animal, tick, "threat-state.v1", "HIDDEN_STATE_BAYESIAN", "PREDATOR_PRESENCE", { probability, status: probability > .65 ? "PROBABLE_THREAT" : probability > .3 ? "CONFLICTING_OR_AMBIGUOUS" : "UNKNOWN" }, Math.max(.35, ...threatEvidence.map(item => item.confidence)), threatEvidence, { horizon: 8 })); }
  const body = candidates.find(item => item.modelId === "body-state.v1"), threat = candidates.find(item => item.modelId === "threat-state.v1"), resource = candidates.find(item => item.modelId === "resource-water.v1");
  let forwardCandidate = null;
  if (budget >= 2 && (danger || resourcePressure)) {
    forwardCandidate = prediction(animal, tick, "action-forward.v1", "FORWARD_ACTION", "ACTION_CONSEQUENCES", { waterUtility: -10, escapeUtility: 0, recoveryUtility: 0 }, state.confidence.action, [], { authority: "SCORING", horizon: 12 });
    candidates.push(forwardCandidate);
  }
  const eligible = candidates.filter(item => !disabled.has(item.modelId)), selected = eligible.sort((a, b) => (b.confidence / Math.max(1, b.cost)) - (a.confidence / Math.max(1, a.cost))).slice(0, budget);
  if (forwardCandidate && selected.includes(forwardCandidate)) {
    const selectedUpstream = new Set(selected.filter(item => item !== forwardCandidate && item.confidence >= .3).map(item => item.modelId));
    const bodyInput = selectedUpstream.has("body-state.v1") ? body : null, threatInput = selectedUpstream.has("threat-state.v1") ? threat : null, resourceInput = selectedUpstream.has("resource-water.v1") ? resource : null;
    const coordinatedForward = prediction(animal, tick, "action-forward.v1", "FORWARD_ACTION", "ACTION_CONSEQUENCES", { waterUtility: resourceInput ? (100 - evidence.physiology.hydration) * resourceInput.confidence - (bodyInput?.output.recoveryRequired ? 30 : 0) : -10, escapeUtility: threatInput ? threatInput.output.probability * 100 - (bodyInput?.output.recoveryRequired ? 24 : 0) : 0, recoveryUtility: bodyInput?.output.recoveryRequired ? 45 : 0 }, state.confidence.action, [...(resourceInput ? waterEvidence : []), ...(threatInput ? threatEvidence : [])], { authority: "SCORING", horizon: 12 });
    candidates[candidates.indexOf(forwardCandidate)] = coordinatedForward;
    selected[selected.indexOf(forwardCandidate)] = coordinatedForward;
    forwardCandidate = coordinatedForward;
    contributorsByPrediction[coordinatedForward.predictionId] = [bodyInput, resourceInput, threatInput].filter(Boolean).map(item => item.modelId);
  }
  const lifecycles = candidates.map(item => { const admitted = selected.includes(item) && item.confidence >= .3; return createPredictionLifecycle({ predictionId: item.predictionId, modelId: item.modelId, activated: !disabled.has(item.modelId) && selected.includes(item), activationReason: disabled.has(item.modelId) ? "experiment ablation" : selected.includes(item) ? danger ? "danger raised predictive depth" : resourcePressure ? "resource pressure justified predictive cost" : restingSafely ? "safe rest limited cognition to the cheapest relevant process" : "expected decision value justified predictive cost" : "automatic cost/relevance scheduler left this process dormant", admitted, influence: admitted ? item.confidence : 0, authority: item.authority }); });
  const admitted = selected.filter(item => item.confidence >= .3), forward = admitted.find(item => item.modelId === "action-forward.v1"), adjustments = {}; if (forward) { adjustments.water = clamp(forward.output.waterUtility / 4, -20, 25); adjustments.hunt = clamp((forward.output.escapeUtility ? -forward.output.escapeUtility : 5) / 8, -18, 10); adjustments.safety = clamp(forward.output.escapeUtility / 4, 0, 28); adjustments.rest = clamp(forward.output.recoveryUtility / 3, 0, 20); }
  const admittedBody = admitted.find(item => item.modelId === "body-state.v1"), vetoes = admittedBody?.output.recoveryRequired ? [{ modelId: admittedBody.modelId, kind: "PHYSICAL_FEASIBILITY", actionFamilies: ["hunt"], reason: "predicted locomotion reserve is insufficient" }] : [];
  const decisive = admitted.find(item => item.modelId === "action-forward.v1" && item.confidence >= .55), activeDecisionValue = Boolean(decisive && (danger || resourcePressure)), effectiveMode = !admitted.length ? "LEGACY" : activeDecisionValue ? "PREDICTIVE_ACTIVE" : "PREDICTIVE_SHADOW"; state.mode = automatic ? effectiveMode : state.mode;
  const activatedIds = new Set(lifecycles.filter(item => item.activation?.activated).map(item => item.modelId)), scheduler = { automatic, effectiveMode: state.mode, budget, usedCost: admitted.reduce((sum, item) => sum + item.cost, 0), danger, resourcePressure, restingSafely, activatedProcesses: [...activatedIds], dormantProcesses: ["body-state.v1", "resource-water.v1", "motion.v1", "threat-state.v1", "action-forward.v1"].filter(id => !activatedIds.has(id)), reason: !admitted.length ? "no prediction met admission requirements; existing behavior is the safe fallback" : activeDecisionValue ? "an applicable forward-action prediction cleared the active confidence threshold and could change this pressured decision" : "predictions are informative but not qualified to influence action" };
  const referencedEvidence = new Set(admitted.flatMap(item => item.evidenceRefs || []));
  const evidenceSnapshot = Object.freeze({ ownerId: evidence.ownerId, tick: evidence.tick, physiology: evidence.physiology, records: Object.freeze(all.filter(item => referencedEvidence.has(item.evidenceId)).slice(0, 16)) });
  const frozenContributors = Object.freeze(Object.fromEntries(Object.entries(contributorsByPrediction).map(([predictionId, modelIds]) => [predictionId, Object.freeze([...modelIds])])));
  const record = { tick, predictions: admitted, lifecycles, adjustments, vetoes, mode: state.mode, scheduler, evidenceCount: all.length, evidenceSnapshot, contributorsByPrediction: frozenContributors, decisionImpact: null }; appendLedgerRecord(state, runtime, record); state.metrics.cycles += 1; state.metrics.admitted += admitted.length; state.metrics.abstained += candidates.length - admitted.length; state.metrics.cost += scheduler.usedCost; state.current = record;
  return record;
}

export function predictiveActionFamily(drive) {
  return /water|drink|hydrat/i.test(drive) ? "water" : /hunt|prey|chase|stalk/i.test(drive) ? "hunt" : /fear|flee|escape|safety|protect/i.test(drive) ? "safety" : /rest|sleep|recover/i.test(drive) ? "rest" : null;
}

export function adjustCandidatesWithPredictions(candidates, cognition) {
  if (!cognition || cognition.mode !== "PREDICTIVE_ACTIVE") return candidates;
  return candidates.map(candidate => { const key = predictiveActionFamily(candidate.drive), veto = cognition.vetoes?.some(item => item.actionFamilies.includes(key)); return { ...candidate, score: Math.max(0, candidate.score + Number(cognition.adjustments?.[key] || 0) - (veto ? 1000 : 0)), predictiveAdjustment: Number(cognition.adjustments?.[key] || 0), predictiveVeto: veto || false }; });
}

const candidateRecord = candidate => candidate ? Object.freeze({ drive: String(candidate.drive || "uncommitted"), score: Number(candidate.score || 0), family: predictiveActionFamily(candidate.drive), predictiveAdjustment: Number(candidate.predictiveAdjustment || 0), predictiveVeto: Boolean(candidate.predictiveVeto) }) : null;

export function createPredictiveDecisionImpact({ cognition = null, decisionPath = "ORDINARY_CANDIDATE_SELECTION", baseCandidates = [], adjustedCandidates = [], counterfactualRanked = [], selectedRanked = [], chosen = null, resultingAction = null, resultingMethod = null, bypassReason = null } = {}) {
  const mode = cognition?.mode || "LEGACY", admittedCount = cognition?.predictions?.length || 0, boundaryReached = decisionPath === "ORDINARY_CANDIDATE_SELECTION" && baseCandidates.length > 0;
  const coordinationQualified = Boolean(boundaryReached && mode === "PREDICTIVE_ACTIVE");
  const baseByDrive = new Map(baseCandidates.map(candidate => [candidate.drive, candidate]));
  const candidateAdjustments = adjustedCandidates.map(candidate => {
    const baseline = baseByDrive.get(candidate.drive), beforeScore = Number(baseline?.score || 0), afterScore = Number(candidate.score || 0);
    return Object.freeze({ drive: String(candidate.drive || "uncommitted"), family: predictiveActionFamily(candidate.drive), beforeScore, afterScore, scoreDelta: afterScore - beforeScore, modelAdjustment: Number(candidate.predictiveAdjustment || 0), vetoApplied: Boolean(candidate.predictiveVeto) });
  }).filter(item => Math.abs(item.scoreDelta) > .0001 || item.vetoApplied);
  const scoreMutationApplied = Boolean(coordinationQualified && candidateAdjustments.some(item => Math.abs(item.scoreDelta) > .0001)), vetoApplied = Boolean(coordinationQualified && candidateAdjustments.some(item => item.vetoApplied)), scoringApplied = scoreMutationApplied || vetoApplied, calculatedOnly = Boolean(admittedCount && !scoringApplied), protectedBranch = !boundaryReached, bypassed = protectedBranch && admittedCount > 0;
  const baselineWinner = counterfactualRanked[0] || baseCandidates.slice().sort((left, right) => Number(right.score || 0) - Number(left.score || 0))[0] || null;
  const selectedWinner = chosen || selectedRanked[0] || null;
  const priorityChanged = Boolean(scoringApplied && baselineWinner && selectedWinner && baselineWinner.drive !== selectedWinner.drive);
  const selectedAdjusted = adjustedCandidates.find(candidate => candidate.drive === selectedWinner?.drive), selectedBaseline = baseByDrive.get(selectedWinner?.drive);
  return Object.freeze({
    schemaVersion: 1,
    tick: Number(cognition?.tick ?? 0),
    mode,
    decisionPath,
    candidateBoundaryReached: boundaryReached,
    consulted: Boolean(boundaryReached && admittedCount),
    coordinationQualified,
    scoreMutationApplied,
    scoringApplied,
    calculatedOnly,
    protectedBranch,
    bypassed,
    bypassReason: bypassed ? bypassReason || "An existing protected decision branch committed before ordinary predictive candidate coordination." : null,
    admittedCount,
    baselineWinner: candidateRecord(baselineWinner),
    selectedWinner: candidateRecord(selectedWinner),
    priorityChanged,
    selectionChanged: priorityChanged,
    selectedCandidateDelta: scoringApplied && selectedAdjusted && selectedBaseline ? Number(selectedAdjusted.score || 0) - Number(selectedBaseline.score || 0) : 0,
    candidateAdjustments: Object.freeze(candidateAdjustments),
    vetoApplied,
    resultingAction: resultingAction ? String(resultingAction) : null,
    resultingMethod: resultingMethod ? String(resultingMethod) : null,
    methodDirectlyChanged: false,
    methodChanged: null,
    needsChanged: false,
    ordinaryMemoryChanged: false,
    predictorWorkingStateUpdated: Boolean(cognition?.predictions?.some(item => item.modelId === "motion.v1")),
    confidenceLearningAtSelection: false
  });
}

export function evaluatePredictionObservation(prediction = {}, observed) {
  const output = prediction.output || {}, modelId = prediction.modelId || "unknown";
  if (modelId === "resource-water.v1") {
    const available = typeof observed === "boolean" ? observed : observed?.available;
    if (typeof available !== "boolean") return Object.freeze({ evaluable: false, reason: "water availability was not locally established" });
    const expected = Boolean(output.likelyAvailable), success = expected === available;
    return Object.freeze({ evaluable: true, kind: "BOOLEAN_AVAILABILITY", observed: available, expected, success, error: success ? 0 : 1, label: success ? "Observed availability was consistent with the forecast" : "Observed availability contradicted the forecast" });
  }
  if (modelId === "threat-state.v1") {
    const present = typeof observed === "boolean" ? observed : observed?.present;
    if (typeof present !== "boolean") return Object.freeze({ evaluable: false, reason: "danger presence was not locally established" });
    const probability = clamp(output.probability), error = (probability - Number(present)) ** 2, success = error <= .25;
    return Object.freeze({ evaluable: true, kind: "BRIER_EVENT", observed: present, expectedProbability: probability, success, error, label: success ? "The observed event was consistent with the forecast's probability side" : "The observed event fell on the opposite side of the forecast probability" });
  }
  if (modelId === "motion.v1") {
    const x = Number(observed?.x), z = Number(observed?.z), predictedX = Number(output.position?.x), predictedZ = Number(output.position?.z), radius = Math.max(0, Number(output.radius || 0));
    if (![x, z, predictedX, predictedZ].every(Number.isFinite)) return Object.freeze({ evaluable: false, reason: "a later local target position was not available" });
    const error = Math.hypot(x - predictedX, z - predictedZ), success = error <= radius;
    return Object.freeze({ evaluable: true, kind: "INTERCEPTION_REGION", observed: Object.freeze({ x, z, targetId: observed?.targetId || prediction.referent || null }), expected: Object.freeze({ x: predictedX, z: predictedZ, radius }), success, error, label: success ? "The later observation fell inside the predicted region" : "The later observation fell outside the predicted region" });
  }
  if (modelId === "body-state.v1") {
    const recoveryRequired = typeof observed === "boolean" ? observed : observed?.recoveryRequired;
    if (typeof recoveryRequired !== "boolean") return Object.freeze({ evaluable: false, reason: "the later recovery state was not observed" });
    const expected = Boolean(output.recoveryRequired), success = expected === recoveryRequired;
    return Object.freeze({ evaluable: true, kind: "BODY_STATE", observed: recoveryRequired, expected, success, error: success ? 0 : 1, label: success ? "Observed recovery need was consistent with the forecast" : "Observed recovery need contradicted the forecast" });
  }
  const expected = output.status ?? output.value;
  if (expected === undefined || observed === undefined) return Object.freeze({ evaluable: false, reason: "the forecast has no registered comparable outcome" });
  const success = observed === expected;
  return Object.freeze({ evaluable: true, kind: "EXACT_VALUE", observed, expected, success, error: success ? 0 : 1, label: success ? "Observed value matched the forecast" : "Observed value did not match the forecast" });
}

export function resolveAnimalPrediction(animal, { predictionId, observed, observedByAnimal = true, errorType = "PREDICTION_ERROR", observedTick = null } = {}, preparedState = null, preparedRuntime = null) {
  const state = preparedState || migratePredictiveCognition(animal), runtime = preparedRuntime || cognitionRuntime(state); if (!observedByAnimal) return { corrected: false, reason: "outcome-not-observed-by-owner" }; if (runtime.resolvedIds.has(predictionId)) return { corrected: false, reason: "prediction-already-resolved" }; const prediction = runtime.predictionById.get(predictionId); if (!prediction) return { corrected: false, reason: "prediction-not-found" };
  const evaluation = evaluatePredictionObservation(prediction, observed); if (!evaluation.evaluable) return { corrected: false, reason: evaluation.reason };
  const success = evaluation.success, delta = success ? .025 : -.04, key = prediction.modelId.split("-")[0].split(".")[0], confidenceKey = ({ "body": "body", "resource": "resource", "motion": "motion", "threat": "threat", "action": "action" })[key] || "selector"; if (state.profile === "ADAPTIVE") { state.confidence[confidenceKey] = clamp(state.confidence[confidenceKey] + delta, .2, .95); state.metrics.corrections += 1; }
  const tick = observedTick != null && Number.isFinite(Number(observedTick)) ? Number(observedTick) : Number(state.current?.tick ?? prediction.horizon?.earliestTick ?? 0), outcome = { predictionId, observed: evaluation.observed, success, evaluation, errorType: success ? "NONE" : errorType, corrected: state.profile === "ADAPTIVE", tick }; appendBoundedRing(state.outcomes, outcome, LEDGER_LIMIT); runtime.resolvedIds.add(predictionId); removeActivePrediction(runtime, prediction); syncRuntimeMarkers(state, runtime); return outcome;
}

export function proposeStructuralCorrection(animal, proposal) { const state = migratePredictiveCognition(animal); const record = Object.freeze({ ...proposal, status: "HUMAN_REVIEW_REQUIRED", executable: false }); appendBoundedRing(state.structuralProposals, record, STRUCTURAL_PROPOSAL_LIMIT); return record; }
