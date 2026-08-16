import { ERROR_CLASSES } from "./schemas.js";

export class OutcomeEvaluator {
  constructor({ maximum = 1000 } = {}) { this.maximum = maximum; this.items = []; }
  record({ decision, predicted = {}, actual = {} }) { const item = { decisionId: decision.decisionId, action: decision.action, predicted: { ...predicted }, actual: { ...actual }, success: (actual.unsupportedClaims || 0) === 0 && (actual.criticalEventsMissed || 0) === 0 && (actual.semanticDuplication || 0) < .5 }; this.items.push(item); this.items = this.items.slice(-this.maximum); return item; }
}

export function decomposeError(outcome) { const errors = []; if ((outcome.actual?.unsupportedClaims || 0) > 0) errors.push("NARRATION_REALISATION_ERROR"); if ((outcome.actual?.criticalEventsMissed || 0) > 0) errors.push("SELECTION_ERROR"); if ((outcome.actual?.cameraQualityMean ?? 1) < .35) errors.push("COMPOSITION_ERROR"); if ((outcome.actual?.semanticDuplication || 0) >= .5) errors.push("AUDIENCE_MODEL_ERROR"); return errors.filter(item => ERROR_CLASSES.includes(item)); }

export class BoundedCorrectionEngine {
  constructor({ enabled = false, maximumAdjustment = .03 } = {}) { this.enabled = enabled; this.maximumAdjustment = maximumAdjustment; this.proposals = []; }
  propose(metric, current, direction, evidenceCount) { if (!this.enabled || evidenceCount < 30) return null; const delta = Math.sign(direction) * this.maximumAdjustment, proposal = { metric, previous: current, proposed: current + delta, evidenceCount, status: "PROPOSED" }; this.proposals.push(proposal); return proposal; }
}

export class AuthorTrace {
  constructor({ maximum = 4000 } = {}) { this.maximum = maximum; this.records = []; }
  write(type, payload, tick = 0) { const record = Object.freeze({ type, tick, payload: { ...payload } }); this.records.push(record); this.records = this.records.slice(-this.maximum); return record; }
  replay(handler) { for (const record of this.records) handler(record); }
}

