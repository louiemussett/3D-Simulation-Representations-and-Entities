import { deepFreeze, stableHash } from "../runtime/immutable.js";

export class PropositionStore {
  constructor({ maximum = 10000 } = {}) { this.maximum = maximum; this.items = new Map(); this.byBelief = new Map(); this.activeBySemanticKey = new Map(); this.activeClaimIds = new Set(); this.bySubject = new Map(); this.claimOrder = new Map(); this.sequence = 0; this.revision = 0; this.snapshotCache = null; }
  revise(beliefDelta) {
    const added = [];
    for (const belief of beliefDelta?.changed || []) {
      const claimId = `claim-${stableHash({ semanticKey: belief.semanticKey, valueHash: belief.valueHash }).slice(-8)}-${belief.revision}`;
      const claim = deepFreeze({
        claimId, propositionId: claimId, beliefId: belief.beliefId, semanticKey: belief.semanticKey, predicate: belief.predicate, subjectIds: [...belief.subjectIds], normalizedArguments: belief.value,
        epistemicClass: belief.epistemicClass, confidence: belief.confidence, evidenceIds: [...belief.evidenceIds], validFromTick: belief.validFromTick, validUntilTick: belief.validUntilTick,
        semanticFingerprint: stableHash({ predicate: belief.predicate, subjects: [...belief.subjectIds].sort(), arguments: belief.value }), materialRevision: belief.revision
      });
      const previousId = this.activeBySemanticKey.get(belief.semanticKey), previous = this.items.get(previousId); if (previous) { this.activeClaimIds.delete(previousId); for (const id of previous.subjectIds) deleteIndex(this.bySubject, String(id), previousId); }
      this.items.set(claimId, claim); this.claimOrder.set(claimId, ++this.sequence); this.byBelief.set(belief.beliefId, claimId); this.activeBySemanticKey.set(belief.semanticKey, claimId); this.activeClaimIds.add(claimId); for (const id of claim.subjectIds) addIndex(this.bySubject, String(id), claimId); added.push(claim);
    }
    while (this.items.size > this.maximum) { const claimId = this.items.keys().next().value, removed = this.items.get(claimId); this.items.delete(claimId); this.claimOrder.delete(claimId); if (removed) { if (this.byBelief.get(removed.beliefId) === claimId) this.byBelief.delete(removed.beliefId); if (this.activeBySemanticKey.get(removed.semanticKey) === claimId) { this.activeBySemanticKey.delete(removed.semanticKey); this.activeClaimIds.delete(claimId); for (const id of removed.subjectIds) deleteIndex(this.bySubject, String(id), claimId); } } }
    if (added.length) { this.revision += 1; this.snapshotCache = null; }
    return deepFreeze({ revision: this.revision, added });
  }
  get(claimId) { return this.items.get(claimId) || null; }
  forBeliefs(beliefIds = []) { return beliefIds.map(id => this.items.get(this.byBelief.get(id))).filter(Boolean); }
  forSubjects(subjectIds = []) { const required = new Set(subjectIds.map(String)); if (!required.size) return [...this.activeClaimIds].map(id => this.items.get(id)).filter(Boolean); const ids = new Set(); for (const id of required) for (const claimId of this.bySubject.get(id) || []) ids.add(claimId); return [...ids].sort((left, right) => (this.claimOrder.get(left) || 0) - (this.claimOrder.get(right) || 0)).map(id => this.items.get(id)).filter(Boolean); }
  valid(claimId, tick = Infinity) { const claim = this.get(claimId); return Boolean(claim && this.activeBySemanticKey.get(claim.semanticKey) === claimId && claim.validFromTick <= tick && (claim.validUntilTick == null || tick <= claim.validUntilTick)); }
  snapshot() { if (this.snapshotCache?.revision === this.revision) return this.snapshotCache.value; const records = Object.freeze([...this.items.values()]), value = Object.freeze({ revision: this.revision, records, get: id => this.get(id), forSubjects: ids => this.forSubjects(ids), valid: (id, tick) => this.valid(id, tick) }); this.snapshotCache = { revision: this.revision, value }; return value; }
}

function addIndex(index, key, value) { let values = index.get(key); if (!values) { values = new Set(); index.set(key, values); } values.add(value); }
function deleteIndex(index, key, value) { const values = index.get(key); if (!values) return; values.delete(value); if (!values.size) index.delete(key); }

export class InquiryLedger {
  constructor() { this.questions = new Map(); this.hypotheses = new Map(); this.sequence = 0; }
  openQuestion(input) { const question = deepFreeze({ questionId: input.questionId || `question-${++this.sequence}`, state: "OPEN", subjectIds: [...(input.subjectIds || [])], situationId: input.situationId || null, supportClaimIds: [...(input.supportClaimIds || [])], resolutionPredicate: input.resolutionPredicate || null, openedAtTick: input.tick || 0, expiresAtTick: input.expiresAtTick ?? null, wordingIntent: input.wordingIntent || null }); this.questions.set(question.questionId, question); return question; }
  advanceQuestion(id, { evidenceDeveloping = false, answerable = false, answerClaimIds = [], tick = 0 } = {}) { const prior = this.questions.get(id); if (!prior || ["ANSWERED", "EXPIRED_UNRESOLVED"].includes(prior.state)) return prior || null; const state = answerClaimIds.length ? "ANSWERED" : answerable ? "ANSWERABLE" : evidenceDeveloping ? "EVIDENCE_DEVELOPING" : prior.expiresAtTick != null && tick >= prior.expiresAtTick ? "EXPIRED_UNRESOLVED" : prior.state; const next = deepFreeze({ ...prior, state, answerClaimIds: [...answerClaimIds], updatedAtTick: tick }); this.questions.set(id, next); return next; }
  openHypothesis(input) { const hypothesis = deepFreeze({ hypothesisId: input.hypothesisId || `hypothesis-${++this.sequence}`, state: "OPEN", subjectIds: [...(input.subjectIds || [])], situationId: input.situationId || null, supportingClaimIds: [...(input.supportingClaimIds || [])], disconfirmingClaimIds: [...(input.disconfirmingClaimIds || [])], resolutionPredicate: input.resolutionPredicate, openedAtTick: input.tick || 0 }); if (!hypothesis.resolutionPredicate) throw new TypeError("hypothesis requires a resolution predicate"); this.hypotheses.set(hypothesis.hypothesisId, hypothesis); return hypothesis; }
  resolveHypothesis(id, { outcome, evidenceIds = [], tick = 0 } = {}) { const prior = this.hypotheses.get(id); if (!prior) return null; const next = deepFreeze({ ...prior, state: "RESOLVED", outcome, resolutionEvidenceIds: [...evidenceIds], resolvedAtTick: tick }); this.hypotheses.set(id, next); return next; }
  snapshot() { return deepFreeze({ questions: [...this.questions.values()], hypotheses: [...this.hypotheses.values()] }); }
}
