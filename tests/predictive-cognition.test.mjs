import test from "node:test";
import assert from "node:assert/strict";
import { adjustCandidatesWithPredictions, classifyAnimalEvidence, createPredictiveDecisionImpact, evaluatePredictionObservation, migratePredictiveCognition, proposeStructuralCorrection, resolveAnimalPrediction, runPredictiveCognition } from "../src/predictive-cognition.js";

const animal = (id = "A") => ({ id, hydration: 40, fatigue: 90, energy: 50, fear: 45, sensoryBuffer: [{ evidenceId: "seen:P", channel: "sight", type: "predator", targetId: "P", x: 5, z: 7, confidence: .9 }], memories: [{ channel: "memory", type: "water", x: 12, z: 2, age: 4, confidence: .8 }], mediumTermMemory: [] });

test("animal predictions use only local evidence snapshots", () => {
  const a = animal(), cycle = runPredictiveCognition(a, { tick: 10, mode: "PREDICTIVE_SHADOW", profile: "FIXED" });
  const motion = cycle.predictions.find(item => item.modelId === "motion.v1"); assert.deepEqual(motion.output.position, { x: 5, z: 7 }); assert.equal(motion.referent, "P"); assert.ok(motion.evidenceRefs.includes("seen:P"));
  assert.equal(cycle.evidenceSnapshot.ownerId, a.id); assert.equal(cycle.evidenceSnapshot.tick, 10); assert.ok(Object.isFrozen(cycle.evidenceSnapshot)); assert.ok(Object.isFrozen(cycle.evidenceSnapshot.records)); assert.ok(cycle.evidenceSnapshot.records.every(Object.isFrozen));
});

test("forward-action forecasts retain explicit contributing modules and bounded evidence", () => {
  const cycle = runPredictiveCognition(animal(), { tick: 5, mode: "PREDICTIVE_ACTIVE" }), forward = cycle.predictions.find(item => item.modelId === "action-forward.v1");
  assert.ok(forward); assert.deepEqual(cycle.contributorsByPrediction[forward.predictionId], ["body-state.v1", "resource-water.v1", "threat-state.v1"]); assert.ok(cycle.evidenceSnapshot.records.length <= 16);
});

test("ablated models cannot leak into forward influence, attribution, lifecycle influence, or vetoes", () => {
  const threatAblated = runPredictiveCognition(animal(), { tick: 5, modelBudget: 6, disabledModels: ["threat-state.v1"] }), forward = threatAblated.predictions.find(item => item.modelId === "action-forward.v1"), threatLifecycle = threatAblated.lifecycles.find(item => item.modelId === "threat-state.v1");
  assert.equal(forward.output.escapeUtility, 0); assert.doesNotMatch(threatAblated.contributorsByPrediction[forward.predictionId].join(" "), /threat-state/); assert.equal(threatLifecycle.activation.activated, false); assert.equal(threatLifecycle.admission.admitted, false); assert.equal(threatLifecycle.coordination.influence, 0);
  const bodyAblated = runPredictiveCognition(animal("B"), { tick: 5, modelBudget: 6, disabledModels: ["body-state.v1"] }), bodyForward = bodyAblated.predictions.find(item => item.modelId === "action-forward.v1");
  assert.deepEqual(bodyAblated.vetoes, []); assert.doesNotMatch(bodyAblated.contributorsByPrediction[bodyForward.predictionId].join(" "), /body-state/);
});

test("budget-excluded upstream models cannot influence the forward action forecast", () => {
  const a = animal("BUDGET");
  a.sensoryBuffer = [{ evidenceId: "weak:P", channel: "sight", type: "predator", targetId: "P", x: 5, z: 7, confidence: .4 }];
  a.memories = [{ evidenceId: "water:recent", channel: "memory", type: "water", x: 12, z: 2, age: 0, confidence: .99 }];
  a.predictiveCognition = { confidence: { body: .95, resource: .95, motion: .2, threat: .3, action: .99 } };
  const cycle = runPredictiveCognition(a, { tick: 5, modelBudget: 3 }), forward = cycle.predictions.find(item => item.modelId === "action-forward.v1"), threatLifecycle = cycle.lifecycles.find(item => item.modelId === "threat-state.v1");
  assert.ok(forward); assert.equal(threatLifecycle.activation.activated, false); assert.equal(threatLifecycle.admission.admitted, false); assert.equal(forward.output.escapeUtility, 0); assert.doesNotMatch(cycle.contributorsByPrediction[forward.predictionId].join(" "), /threat-state/); assert.equal(cycle.adjustments.safety, 0);
});

test("motion prediction refuses non-animal positioned referents", () => {
  const a = { id: "C", hydration: 90, fatigue: 5, energy: 80, fear: 0, sensoryBuffer: [{ evidenceId: "corpse:1", channel: "sight", type: "carcass", targetId: "corpse-1", x: 4, z: 3, confidence: .9 }], memories: [], mediumTermMemory: [] }, cycle = runPredictiveCognition(a, { tick: 2, modelBudget: 6 });
  assert.equal(cycle.predictions.some(item => item.modelId === "motion.v1"), false);
});

test("shadow mode records but cannot alter candidate ranking", () => {
  const a = animal(), cycle = runPredictiveCognition(a, { tick: 1, mode: "PREDICTIVE_SHADOW" }), candidates = [{ drive: "hunt prey", score: 20 }, { drive: "rest", score: 10 }];
  assert.deepEqual(adjustCandidatesWithPredictions(candidates, cycle), candidates); assert.ok(a.predictiveCognition.ledger.length);
});

test("active cognition applies bounded influence and feasibility vetoes", () => {
  const cycle = runPredictiveCognition(animal(), { tick: 1, mode: "PREDICTIVE_ACTIVE" }), adjusted = adjustCandidatesWithPredictions([{ drive: "hunt prey", score: 50 }, { drive: "rest and recover", score: 20 }], cycle);
  assert.equal(adjusted[0].predictiveVeto, true); assert.ok(adjusted[0].score < adjusted[1].score);
});

test("decision attribution distinguishes applied scoring, shadow comparison, and protected bypass", () => {
  const activeCycle = runPredictiveCognition(animal(), { tick: 1, mode: "PREDICTIVE_ACTIVE" });
  const base = [{ drive: "hunt prey", score: 50 }, { drive: "rest and recover", score: 20 }], adjusted = adjustCandidatesWithPredictions(base, activeCycle), active = createPredictiveDecisionImpact({ cognition: activeCycle, baseCandidates: base, adjustedCandidates: adjusted, counterfactualRanked: base, selectedRanked: adjusted.slice().sort((left, right) => right.score - left.score), chosen: adjusted.slice().sort((left, right) => right.score - left.score)[0], resultingAction: "rest", resultingMethod: "rest" });
  assert.equal(active.consulted, true); assert.equal(active.scoringApplied, true); assert.equal(active.vetoApplied, true); assert.equal(active.priorityChanged, true); assert.equal(active.baselineWinner.drive, "hunt prey"); assert.equal(active.selectedWinner.drive, "rest and recover"); assert.equal(active.needsChanged, false); assert.equal(active.ordinaryMemoryChanged, false); assert.equal(active.methodDirectlyChanged, false); assert.equal(active.methodChanged, null);

  const shadowCycle = runPredictiveCognition(animal("S"), { tick: 1, mode: "PREDICTIVE_SHADOW" }), shadowAdjusted = adjustCandidatesWithPredictions(base, shadowCycle), shadow = createPredictiveDecisionImpact({ cognition: shadowCycle, baseCandidates: base, adjustedCandidates: shadowAdjusted, counterfactualRanked: base, selectedRanked: base, chosen: base[0] });
  assert.equal(shadow.consulted, true); assert.equal(shadow.scoringApplied, false); assert.equal(shadow.calculatedOnly, true); assert.equal(shadow.priorityChanged, false);

  const bypass = createPredictiveDecisionImpact({ cognition: activeCycle, decisionPath: "PROTECTED_BRANCH", chosen: { drive: "emergency food acquisition", score: 2500 }, bypassReason: "Protected emergency food branch." });
  assert.equal(bypass.consulted, false); assert.equal(bypass.bypassed, true); assert.equal(bypass.scoringApplied, false); assert.match(bypass.bypassReason, /Protected emergency food/);

  const qualifiedNoEffect = createPredictiveDecisionImpact({ cognition: { mode: "PREDICTIVE_ACTIVE", predictions: [{}], tick: 1 }, baseCandidates: [{ drive: "social", score: 10 }], adjustedCandidates: [{ drive: "social", score: 10 }], counterfactualRanked: [{ drive: "social", score: 10 }], selectedRanked: [{ drive: "social", score: 10 }], chosen: { drive: "social", score: 10 } });
  assert.equal(qualifiedNoEffect.coordinationQualified, true); assert.equal(qualifiedNoEffect.scoringApplied, false); assert.equal(qualifiedNoEffect.scoreMutationApplied, false);
  const protectedWithoutForecast = createPredictiveDecisionImpact({ cognition: { mode: "LEGACY", predictions: [], tick: 1 }, decisionPath: "PROTECTED_BRANCH", chosen: { drive: "dependency", score: 100 } });
  assert.equal(protectedWithoutForecast.protectedBranch, true); assert.equal(protectedWithoutForecast.bypassed, false); assert.equal(protectedWithoutForecast.bypassReason, null);
});

test("forecasting leaves ordinary physiological needs and memories untouched", () => {
  const a = animal(), before = { hydration: a.hydration, fatigue: a.fatigue, energy: a.energy, fear: a.fear, memories: structuredClone(a.memories), sensoryBuffer: structuredClone(a.sensoryBuffer) };
  runPredictiveCognition(a, { tick: 8, mode: "PREDICTIVE_ACTIVE" });
  assert.equal(a.hydration, before.hydration); assert.equal(a.fatigue, before.fatigue); assert.equal(a.energy, before.energy); assert.equal(a.fear, before.fear); assert.deepEqual(a.memories, before.memories); assert.deepEqual(a.sensoryBuffer, before.sensoryBuffer); assert.ok(a.predictiveCognition.activations.lastTargetObservation);
});

test("learning is individual, bounded, and requires locally observed outcomes", () => {
  const a = animal("A"), b = animal("B"); const cycle = runPredictiveCognition(a, { tick: 1, profile: "ADAPTIVE" }), id = cycle.predictions[0].predictionId, before = a.predictiveCognition.confidence.body;
  assert.equal(resolveAnimalPrediction(a, { predictionId: id, observed: false, observedByAnimal: false }).corrected, false); assert.equal(a.predictiveCognition.confidence.body, before);
  resolveAnimalPrediction(a, { predictionId: id, observed: false }); assert.ok(a.predictiveCognition.confidence.body >= .2); assert.equal(migratePredictiveCognition(b).confidence.body, .7);
});

test("model-specific evaluation compares the claimed value, region, and observation time", () => {
  const unavailable = { modelId: "resource-water.v1", output: { likelyAvailable: false } };
  assert.equal(evaluatePredictionObservation(unavailable, { available: false }).success, true); assert.equal(evaluatePredictionObservation(unavailable, { available: true }).success, false);
  const motion = { modelId: "motion.v1", referent: "P", output: { position: { x: 5, z: 5 }, radius: 2 } };
  assert.equal(evaluatePredictionObservation(motion, { x: 6, z: 5 }).success, true); assert.equal(evaluatePredictionObservation(motion, { x: 9, z: 5 }).success, false);
  const threat = { modelId: "threat-state.v1", output: { probability: .2 } };
  assert.equal(evaluatePredictionObservation(threat, { present: false }).success, true); assert.equal(evaluatePredictionObservation(threat, { present: true }).success, false);
  const a = animal("T"), current = runPredictiveCognition(a, { tick: 3, profile: "ADAPTIVE" }), body = current.predictions.find(item => item.modelId === "body-state.v1"), outcome = resolveAnimalPrediction(a, { predictionId: body.predictionId, observed: { recoveryRequired: true }, observedTick: 17 });
  assert.equal(outcome.success, true); assert.equal(outcome.tick, 17); assert.equal(outcome.errorType, "NONE"); assert.match(outcome.evaluation.label, /consistent/i);
});

test("a later local observation evaluates earlier predictions", () => {
  const a = animal(); runPredictiveCognition(a, { tick: 1, profile: "ADAPTIVE" }); runPredictiveCognition(a, { tick: 2, profile: "ADAPTIVE" }); assert.ok(a.predictiveCognition.outcomes.length > 0); assert.ok(a.predictiveCognition.outcomes.every(item => item.predictionId.startsWith(`${a.id}:`)));
});

test("a current dry-source observation outranks an older water memory during evaluation", () => {
  const a = animal("D"), first = runPredictiveCognition(a, { tick: 1, profile: "ADAPTIVE" }), resource = first.predictions.find(item => item.modelId === "resource-water.v1"); assert.equal(resource.output.likelyAvailable, true);
  a.sensoryBuffer = [{ evidenceId: "dry:water", channel: "sight", type: "dry-water", targetId: "water", x: 12, z: 2, confidence: .95 }]; runPredictiveCognition(a, { tick: 2, profile: "ADAPTIVE" });
  const outcome = a.predictiveCognition.outcomes.find(item => item.predictionId === resource.predictionId); assert.equal(outcome.observed, false); assert.equal(outcome.success, false); assert.equal(outcome.tick, 2);
});

test("memory and communicated alarms can inform forecasts but cannot validate their outcomes", () => {
  const rememberedWater = { id: "MEM", hydration: 40, fatigue: 20, energy: 60, fear: 0, sensoryBuffer: [], memories: [{ evidenceId: "remembered-water", type: "water", x: 3, z: 4, age: 2, confidence: .9 }], mediumTermMemory: [] };
  const firstWater = runPredictiveCognition(rememberedWater, { tick: 1, profile: "ADAPTIVE", modelBudget: 6 }), water = firstWater.predictions.find(item => item.modelId === "resource-water.v1");
  runPredictiveCognition(rememberedWater, { tick: 2, profile: "ADAPTIVE", modelBudget: 6 });
  assert.ok(water); assert.equal(rememberedWater.predictiveCognition.outcomes.some(item => item.predictionId === water.predictionId), false);

  const alarmed = { id: "ALARM", hydration: 90, fatigue: 20, energy: 60, fear: 45, sensoryBuffer: [{ evidenceId: "alarm:1", channel: "hearing", type: "predator", signalKind: "alarm", communicatedBy: "SENDER-1", confidence: .9 }], memories: [], mediumTermMemory: [] };
  const firstThreat = runPredictiveCognition(alarmed, { tick: 1, profile: "ADAPTIVE", modelBudget: 6 }), threat = firstThreat.predictions.find(item => item.modelId === "threat-state.v1");
  alarmed.sensoryBuffer = [{ evidenceId: "alarm:2", channel: "hearing", type: "predator", signalKind: "alarm", communicatedBy: "SENDER-2", confidence: .95 }]; runPredictiveCognition(alarmed, { tick: 2, profile: "ADAPTIVE", modelBudget: 6 });
  assert.ok(threat); assert.equal(firstThreat.evidenceSnapshot.records.find(item => item.evidenceId === "alarm:1")?.communicatedBy, "SENDER-1"); assert.equal(alarmed.predictiveCognition.outcomes.some(item => item.predictionId === threat.predictionId), false);

  alarmed.sensoryBuffer = [{ evidenceId: "seen:predator:3", channel: "sight", type: "predator", targetId: "P", x: 2, z: 1, confidence: .95 }]; runPredictiveCognition(alarmed, { tick: 3, profile: "ADAPTIVE", modelBudget: 6 });
  assert.equal(alarmed.predictiveCognition.outcomes.some(item => item.predictionId === threat.predictionId), true);
});

test("cognition migration preserves the current cycle and bounded observed outcomes", () => {
  const a = animal(), current = runPredictiveCognition(a, { tick: 1, profile: "ADAPTIVE" }), predictionId = current.predictions[0].predictionId;
  resolveAnimalPrediction(a, { predictionId, observed: false });
  const migrated = migratePredictiveCognition(a);
  assert.equal(migrated.current.tick, 1);
  assert.equal(migrated.outcomes.at(-1).predictionId, predictionId);
});

test("current cognition migration is idempotent and bounded ledgers retain their arrays", () => {
  const a = animal("RING"), state = migratePredictiveCognition(a), ledger = state.ledger, outcomes = state.outcomes;
  assert.equal(migratePredictiveCognition(a), state);
  for (let tick = 0; tick < 110; tick += 1) runPredictiveCognition(a, { tick, profile: "ADAPTIVE" });
  assert.equal(a.predictiveCognition, state); assert.equal(state.ledger, ledger); assert.equal(state.outcomes, outcomes);
  assert.equal(state.ledger.length, 96); assert.equal(state.ledger[0].tick, 14); assert.equal(state.ledger.at(-1).tick, 109);
  assert.ok(state.outcomes.length <= 96);
});

test("evidence classification builds all predictor families in one reusable projection", () => {
  const evidence = { contacts: [{ evidenceId: "p", channel: "sight", type: "predator", targetId: "P", x: 1, z: 2 }, { evidenceId: "w", channel: "sight", type: "water", x: 3, z: 4 }], memories: [{ evidenceId: "m", channel: "memory", type: "water", x: 8, z: 9 }] };
  const classified = classifyAnimalEvidence(evidence);
  assert.deepEqual(classified.all.map(item => item.evidenceId), ["p", "w", "m"]);
  assert.deepEqual(classified.threat.map(item => item.evidenceId), ["p"]);
  assert.deepEqual(classified.water.map(item => item.evidenceId), ["w", "m"]);
  assert.deepEqual(classified.directWater.map(item => item.evidenceId), ["w"]);
  assert.deepEqual(classified.directTargetsById.get("P").map(item => item.evidenceId), ["p"]);
});

test("pending predictions are indexed and cannot be corrected twice", () => {
  const a = animal("ONCE"), cycle = runPredictiveCognition(a, { tick: 1, profile: "ADAPTIVE" }), body = cycle.predictions.find(item => item.modelId === "body-state.v1");
  runPredictiveCognition(a, { tick: 2, profile: "ADAPTIVE" });
  const count = a.predictiveCognition.outcomes.filter(item => item.predictionId === body.predictionId).length;
  assert.equal(count, 1);
  assert.deepEqual(resolveAnimalPrediction(a, { predictionId: body.predictionId, observed: true }), { corrected: false, reason: "prediction-already-resolved" });
});

test("structural corrections remain non-executing human-review proposals", () => {
  const proposal = proposeStructuralCorrection(animal(), { kind: "MODEL_SPLIT", modelId: "motion.v1" }); assert.equal(proposal.executable, false); assert.equal(proposal.status, "HUMAN_REVIEW_REQUIRED");
});

test("automatic scheduling raises depth under danger and lowers it during safe rest", () => {
  const danger = runPredictiveCognition(animal(), { tick: 1 });
  const resting = runPredictiveCognition({ id: "R", hydration: 96, fatigue: 5, energy: 90, fear: 0, actionState: { key: "rest" }, sensoryBuffer: [], memories: [], mediumTermMemory: [] }, { tick: 1 });
  assert.equal(danger.mode, "PREDICTIVE_ACTIVE"); assert.equal(danger.scheduler.danger, true); assert.equal(danger.scheduler.budget, 6);
  assert.equal(resting.mode, "PREDICTIVE_SHADOW"); assert.equal(resting.scheduler.restingSafely, true); assert.equal(resting.scheduler.budget, 1); assert.ok(resting.predictions.length < danger.predictions.length);
});
