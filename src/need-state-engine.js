import { needStateSnapshot } from "./behaviour-ontology.js";
import { createNeedState } from "./commitment-contracts.js";

export function assessNeedStates(animal = {}, context = {}, tick = 0) {
  const ontologyStates = needStateSnapshot(animal, context), states = {};
  for (const [needId, state] of Object.entries(ontologyStates)) states[needId] = createNeedState({ needId, amount: state.amount, urgency: state.urgency, pressure: state.pressure, trend: state.trend, predictedFailureHours: state.timeToFailure, confidence: state.confidence, tick, evidenceIds: context[`${needId}EvidenceIds`] || [] });
  const fatigue = Math.max(0, Math.min(1, Number(animal.fatigue || 0) / 100)), injury = Math.max(0, Math.min(1, (animal.injuries || []).reduce((sum, item) => sum + Number(item.severity || 0), 0) / 100));
  states.recovery = createNeedState({ needId: "recovery", amount: 1 - Math.max(fatigue, injury), urgency: Math.max(fatigue, injury), pressure: Math.max(fatigue, injury) * .9, trend: Number(context.recoveryTrend || 0), confidence: .95, tick });
  return Object.freeze(states);
}

export function storeNeedStates(animal, context = {}, tick = 0) {
  return animal.needStates = assessNeedStates(animal, context, tick);
}
