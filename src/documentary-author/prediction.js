import { normalizeProbabilityOutcomes } from "./schemas.js";

export class PredictorRegistry {
  constructor() { this.predictors = new Map(); this.registerDefaults(); }
  register(type, predictor) { this.predictors.set(type, predictor); return this; }
  registerDefaults() {
    this.register("RESOURCE_JOURNEY", situation => [{ id: "CONTINUE", probability: .55 }, { id: "REST_OR_DETOUR", probability: .3 }, { id: "ABANDON", probability: .15 }]);
    this.register("RECOVERY", situation => [{ id: "RECOVER_CAPABILITY", probability: .7 }, { id: "INTERRUPTED", probability: .3 }]);
    this.register("HUNT", situation => [{ id: "PURSUIT_OR_CONTACT", probability: .42 }, { id: "PREY_DETECTS", probability: .3 }, { id: "HUNT_ABANDONED", probability: .28 }]);
    this.register("COURTSHIP", situation => [{ id: "ACCEPTED", probability: .35 }, { id: "REJECTED", probability: .4 }, { id: "INTERRUPTED", probability: .25 }]);
    this.register("ENVIRONMENTAL_PROCESS", situation => [{ id: "PROCESS_CONTINUES", probability: .68 }, { id: "PROCESS_STABILISES", probability: .32 }]);
  }
  predict(situation, context = {}) { const predictor = this.predictors.get(situation.type); if (!predictor) return null; const outcomes = normalizeProbabilityOutcomes(predictor(situation, context)); return outcomes.length ? outcomes : null; }
}

export class PredictionLedger {
  constructor({ maximum = 1000, idFactory } = {}) { this.maximum = maximum; this.idFactory = idFactory; this.items = new Map(); this.calibration = new Map(); }
  issue({ situation, outcomes, tick, horizon = { minTicks: 1, maxTicks: 12 }, assumptions = [], evidenceIds = [] }) { const item = { predictionId: this.idFactory.next("prediction"), predictor: `${situation.type.toLowerCase()}-v1`, situationId: situation.situationId, outcomes: normalizeProbabilityOutcomes(outcomes), horizon: { ...horizon }, assumptions: [...assumptions], evidenceIds: [...evidenceIds], issuedAtTick: tick, status: "ACTIVE", resolvedOutcome: null }; this.items.set(item.predictionId, item); while (this.items.size > this.maximum) this.items.delete(this.items.keys().next().value); return item; }
  resolve(id, outcome, tick) { const item = this.items.get(id); if (!item || item.status !== "ACTIVE") return null; item.status = "RESOLVED"; item.resolvedOutcome = outcome; item.resolvedAtTick = tick; const predicted = item.outcomes.find(candidate => candidate.id === outcome)?.probability || 0, scores = this.calibration.get(item.predictor) || []; scores.push((predicted - 1) ** 2); this.calibration.set(item.predictor, scores.slice(-500)); return item; }
  expire(tick) { for (const item of this.items.values()) if (item.status === "ACTIVE" && tick > item.issuedAtTick + item.horizon.maxTicks) item.status = "EXPIRED"; }
  brier(predictor) { const values = this.calibration.get(predictor) || []; return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null; }
}

