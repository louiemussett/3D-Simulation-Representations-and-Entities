import { QUESTION_STATES } from "./schemas.js";

const clamp01 = value => Math.max(0, Math.min(1, Number(value) || 0));

export class AudienceModel {
  constructor({ maximum = 5000, retentionLambda = .000002 } = {}) { this.maximum = maximum; this.retentionLambda = retentionLambda; this.items = new Map(); this.structures = []; }
  semanticKey(proposition) { return `${proposition.predicate}:${[...(proposition.subjectIds || [])].sort().join("|")}`; }
  communicate(proposition, { atMs = 0, channel = "NARRATION", wordingFamily = null, structure = null, visualReinforcement = 0 } = {}) { const key = this.semanticKey(proposition), item = this.items.get(key) || { semanticKey: key, propositionId: proposition.propositionId, exposureCount: 0, firstCommunicatedAtMs: atMs, channels: [], estimatedComprehension: 0, estimatedRetention: 0 }; item.propositionId = proposition.propositionId; item.exposureCount += 1; item.lastCommunicatedAtMs = atMs; item.channels = [...new Set([...item.channels, channel])]; item.estimatedComprehension = clamp01(item.estimatedComprehension + .32 + visualReinforcement * .2); item.estimatedRetention = clamp01(item.estimatedRetention + .42 + visualReinforcement * .25); item.lastWordingFamily = wordingFamily; item.arguments = proposition.arguments; this.items.set(key, item); if (structure) this.structures = [...this.structures, structure].slice(-80); while (this.items.size > this.maximum) this.items.delete(this.items.keys().next().value); return item; }
  retention(propositionOrKey, atMs) { const key = typeof propositionOrKey === "string" ? propositionOrKey : this.semanticKey(propositionOrKey), item = this.items.get(key); if (!item) return 0; return item.estimatedRetention * Math.exp(-this.retentionLambda * Math.max(0, atMs - item.lastCommunicatedAtMs)); }
  novelty(proposition, atMs) { const key = this.semanticKey(proposition), item = this.items.get(key); if (!item) return 1; const changed = JSON.stringify(item.arguments) !== JSON.stringify(proposition.arguments); return changed ? .8 : clamp01(1 - this.retention(key, atMs)); }
}

export class QuestionLedger {
  constructor({ maximum = 500, idFactory } = {}) { this.maximum = maximum; this.idFactory = idFactory; this.items = new Map(); }
  open(input) { const item = { questionId: this.idFactory.next("question"), state: "OPEN", textIntent: input.textIntent, situationId: input.situationId, openedByClaims: [...(input.openedByClaims || [])], admissibleAnswers: [...(input.admissibleAnswers || [])], requiredEvidenceTypes: [...(input.requiredEvidenceTypes || [])], openedAtTick: input.tick, expiresAtTick: input.expiresAtTick, spoken: Boolean(input.spoken), resolution: null }; this.items.set(item.questionId, item); while (this.items.size > this.maximum) this.items.delete(this.items.keys().next().value); return item; }
  transition(id, state, resolution = null) { const item = this.items.get(id); if (!item || !QUESTION_STATES.includes(state)) return null; item.state = state; item.resolution = resolution; return item; }
  expire(tick) { for (const item of this.items.values()) if (["OPEN", "PARTIALLY_ANSWERED"].includes(item.state) && Number.isFinite(item.expiresAtTick) && tick > item.expiresAtTick) item.state = "EXPIRED"; }
  openItems() { return [...this.items.values()].filter(item => item.state === "OPEN"); }
}

export class AuthorSelfModel {
  constructor({ maximumHistory = 300 } = {}) { this.maximumHistory = maximumHistory; this.currentFocus = null; this.currentInterpretation = null; this.activePredictions = new Map(); this.editorialCommitments = new Map(); this.pendingActions = []; this.recentActions = []; this.coverageGaps = new Map(); this.performance = { currentShotId: null, currentSpeechId: null, narrationDensity60s: 0, audienceLoad: 0, recentConcepts: [], recentStructures: [], cameraMotionLoad: 0 }; this.selectionHistory = []; this.errorHistory = []; }
  selected(decision) { this.recentActions = [...this.recentActions, decision].slice(-this.maximumHistory); this.selectionHistory = [...this.selectionHistory, decision].slice(-this.maximumHistory); this.currentFocus = decision.situationId ? { situationId: decision.situationId, sinceTick: decision.tick, reason: decision.reason } : this.currentFocus; }
  error(error) { this.errorHistory = [...this.errorHistory, error].slice(-this.maximumHistory); }
}
