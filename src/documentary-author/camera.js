const clamp01 = value => Math.max(0, Math.min(1, Number(value) || 0));

export function evaluateShotQuality(input = {}) { const positive = .2 * clamp01(input.visibility) + .14 * clamp01(input.composition) + .12 * clamp01(input.relevantSubjects) + .14 * clamp01(input.behaviourLegibility) + .14 * clamp01(input.preparedness) + .12 * clamp01(input.narrativeUsefulness), negative = .08 * clamp01(input.occlusion) + .04 * clamp01(input.movement) + .06 * clamp01(input.disorientation); return { overall: clamp01(positive - negative), positive, negative, predictedOcclusion: clamp01(input.predictedOcclusion) }; }

export class AdaptiveShotDirector {
  constructor() { this.intention = null; this.lastDecision = null; }
  setIntention(intention) { this.intention = intention; return intention; }
  update(feedback = {}) { if (!this.intention) return { action: "HOLD", reason: "no-intention" }; const quality = evaluateShotQuality(feedback); let action = "HOLD", reason = "quality-acceptable"; if (feedback.invalidPose) { action = "SAFE_CAMERA"; reason = "invalid-pose"; } else if (quality.predictedOcclusion > .7) { action = "LATERAL_REPOSITION"; reason = "predicted-occlusion"; } else if (quality.overall < .38) { action = "REPAIR_COMPOSITION"; reason = "quality-below-bound"; } else if ((feedback.subjectSeparation || 0) > .72) { action = "WIDEN"; reason = "subject-separation"; } else if (feedback.phaseChanged) { action = "ADAPT_PHASE"; reason = "situation-phase-changed"; } this.lastDecision = { action, reason, quality, intentionId: this.intention.intentId }; return this.lastDecision; }
}

