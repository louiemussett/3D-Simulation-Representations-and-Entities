import { canonicalJson, deepFreeze, stableHash } from "../runtime/immutable.js";

const PRECEDENCE = Object.freeze({ AUTHORITATIVE: 4, OBSERVED: 3, REPORTED_MEMORY: 2, INFERRED: 1 });
const semanticKey = (predicate, subjectIds = []) => `${predicate}|${[...subjectIds].sort().join("+")}`;

export class BeliefStore {
  constructor({ maximumHistory = 50000, canonicalizer = canonicalJson } = {}) {
    this.maximumHistory = maximumHistory;
    this.canonicalizer = canonicalizer;
    this.active = new Map();
    this.historyQueue = [];
    this.historyHead = 0;
    this.historyCache = null;
    this.retainedHistoryIds = new Set();
    Object.defineProperty(this, "history", { enumerable: true, get: () => { if (!this.historyCache) this.historyCache = this.historyQueue.slice(this.historyHead); return this.historyCache; } });
    this.byId = new Map();
    this.byStoreRevision = new Map();
    this.contradictions = new Map();
    this.contradictionsBySemanticKey = new Map();
    this.lastObserved = new Map();
    this.byPredicate = new Map();
    this.bySubject = new Map();
    this.byEpistemicClass = new Map();
    this.changedByRevision = new Map();
    this.revision = 0;
    this.sequence = 0;
    this.snapshotCache = null;
    this.canonicalSnapshotCache = null;
  }
  reviseEvidence(evidenceDelta) {
    const changed = [], refreshed = [], contradictionRecords = [];
    for (const evidence of evidenceDelta?.records || []) {
      const key = semanticKey(evidence.predicate, evidence.subjectIds), previous = this.active.get(key), value = evidence.object, valueHash = stableHash(value);
      this.lastObserved.set(key, evidence.observedAtTick);
      if (previous?.valueHash === valueHash && previous.epistemicClass === evidence.epistemicClass) { refreshed.push(previous); continue; }
      const previousPrecedence = PRECEDENCE[previous?.epistemicClass] || 0, nextPrecedence = PRECEDENCE[evidence.epistemicClass] || 0;
      const conflict = previous && previous.valueHash !== valueHash && previous.validUntilTick == null && previousPrecedence === nextPrecedence && evidence.validFromTick <= (previous.lastObservedTick ?? previous.validFromTick);
      const contradictionIds = [];
      if (conflict) {
        const contradictionId = `contradiction-${String(this.contradictions.size + 1).padStart(8, "0")}`;
        const contradiction = deepFreeze({ contradictionId, semanticKey: key, beliefIds: [previous.beliefId], evidenceIds: [previous.evidenceIds.at(-1), evidence.evidenceId].filter(Boolean), state: "OPEN", reason: "equal-precedence-overlapping-values", openedAtTick: evidence.observedAtTick });
        this.contradictions.set(contradictionId, contradiction); addIndex(this.contradictionsBySemanticKey, key, contradictionId); contradictionRecords.push(contradiction); contradictionIds.push(contradictionId);
      }
      if (previous && nextPrecedence < previousPrecedence && previous.validUntilTick == null) {
        const reported = this.#createBelief(evidence, { key, value, valueHash, supersedesBeliefId: null, contradictionIds, active: false });
        changed.push(reported); continue;
      }
      const belief = this.#createBelief(evidence, { key, value, valueHash, supersedesBeliefId: previous?.beliefId || null, contradictionIds, active: true });
      changed.push(belief);
    }
    if (changed.length) {
      this.revision += 1; for (const belief of changed) this.byStoreRevision.set(belief.beliefId, this.revision);
      this.changedByRevision.set(this.revision, Object.freeze([...changed])); while (this.changedByRevision.size > this.maximumHistory) this.changedByRevision.delete(this.changedByRevision.keys().next().value);
      this.snapshotCache = null;
      this.canonicalSnapshotCache = null;
    }
    const liveHistory = this.historyQueue.length - this.historyHead, overflow = liveHistory - this.maximumHistory;
    if (overflow > 0) {
      const removedByRevision = new Map(), evictionEnd = this.historyHead + overflow, removedRecords = this.historyQueue.slice(this.historyHead, evictionEnd); this.historyHead = evictionEnd;
      for (const removed of removedRecords) {
        const storeRevision = this.byStoreRevision.get(removed.beliefId);
        this.retainedHistoryIds.delete(removed.beliefId);
        if (this.active.get(removed.semanticKey)?.beliefId !== removed.beliefId) { this.byId.delete(removed.beliefId); this.byStoreRevision.delete(removed.beliefId); }
        if (storeRevision != null) addIndex(removedByRevision, storeRevision, removed.beliefId);
      }
      for (const [storeRevision, removedIds] of removedByRevision) {
        const retained = (this.changedByRevision.get(storeRevision) || []).filter(belief => !removedIds.has(belief.beliefId));
        if (retained.length) this.changedByRevision.set(storeRevision, Object.freeze(retained));
        else this.changedByRevision.delete(storeRevision);
      }
      this.historyCache = null;
    }
    if (this.historyHead > 1024 && this.historyHead * 2 > this.historyQueue.length) { this.historyQueue = this.historyQueue.slice(this.historyHead); this.historyHead = 0; }
    return deepFreeze({ revision: this.revision, evidenceRevision: evidenceDelta?.revision || 0, changed, refreshed, contradictions: contradictionRecords, snapshot: this.snapshot() });
  }
  #createBelief(evidence, { key, value, valueHash, supersedesBeliefId, contradictionIds, active }) {
    const belief = deepFreeze({
      beliefId: `belief-${String(++this.sequence).padStart(10, "0")}`,
      semanticKey: key, predicate: evidence.predicate, subjectIds: [...evidence.subjectIds], value, arguments: value,
      valueHash, confidence: evidence.confidence, epistemicClass: evidence.epistemicClass,
      evidenceIds: [evidence.evidenceId], revision: (this.active.get(key)?.revision || 0) + 1,
      validFromTick: evidence.validFromTick, validUntilTick: evidence.validUntilTick,
      lastObservedTick: evidence.observedAtTick, supersedesBeliefId, contradictionIds
    });
    this.historyQueue.push(belief); this.retainedHistoryIds.add(belief.beliefId); this.historyCache = null; this.byId.set(belief.beliefId, belief);
    if (active) { const previous = this.active.get(key); if (previous) { if (previous.epistemicClass !== belief.epistemicClass) { deleteIndex(this.byEpistemicClass, previous.epistemicClass, key); addIndex(this.byEpistemicClass, belief.epistemicClass, key); } if (!this.retainedHistoryIds.has(previous.beliefId)) { this.byId.delete(previous.beliefId); this.byStoreRevision.delete(previous.beliefId); } } else this.#index(belief); this.active.set(key, belief); }
    return belief;
  }
  get(predicate, subjectIds = []) { return this.active.get(semanticKey(predicate, subjectIds)) || null; }
  forSubject(entityId) { return [...(this.bySubject.get(String(entityId)) || [])].map(key => this.active.get(key)).filter(Boolean); }
  match({ predicate = null, subjectIds = null, atTick = null, epistemicClasses = null } = {}) {
    const required = subjectIds ? new Set(subjectIds.map(String)) : null, allowed = epistemicClasses ? new Set(epistemicClasses) : null;
    const candidates = [];
    if (predicate) candidates.push(this.byPredicate.get(predicate));
    if (required) for (const id of required) candidates.push(this.bySubject.get(id));
    if (allowed?.size === 1) candidates.push(this.byEpistemicClass.get([...allowed][0]));
    const available = candidates.filter(Boolean), keys = candidates.some(value => !value) ? [] : available.length ? [...available.reduce((smallest, value) => value.size < smallest.size ? value : smallest)] : [...this.active.keys()];
    return keys.map(key => this.active.get(key)).filter(belief => belief && (!predicate || belief.predicate === predicate) && (!required || [...required].every(id => belief.subjectIds.includes(id))) && (!allowed || allowed.has(belief.epistemicClass)) && (atTick == null || belief.validFromTick <= atTick && (belief.validUntilTick == null || atTick <= belief.validUntilTick)));
  }
  changedSince(revision) { const changed = []; for (const [storeRevision, beliefs] of this.changedByRevision) if (storeRevision > revision) changed.push(...beliefs); return changed; }
  contradictionsFor(keyOrPredicate, subjectIds = []) { const key = keyOrPredicate.includes("|") ? keyOrPredicate : semanticKey(keyOrPredicate, subjectIds); return [...(this.contradictionsBySemanticKey.get(key) || [])].map(id => this.contradictions.get(id)).filter(Boolean); }
  dependenciesFor(situation) { const ids = new Set(situation?.beliefIds || []); return [...ids].map(id => this.byId.get(id)).filter(Boolean); }
  snapshot() {
    if (this.snapshotCache?.revision === this.revision) return this.snapshotCache.value;
    const records = Object.freeze([...this.active.values()]), byId = new Map(records.map(item => [item.beliefId, item]));
    const bySemanticKey = new Map(records.map(item => [item.semanticKey, item])), bySubject = new Map(), byPredicate = new Map(), byEpistemicClass = new Map();
    for (const belief of records) {
      addIndex(byPredicate, belief.predicate, belief.semanticKey); addIndex(byEpistemicClass, belief.epistemicClass, belief.semanticKey);
      for (const id of belief.subjectIds) addIndex(bySubject, String(id), belief.semanticKey);
    }
    const match = ({ predicate = null, subjectIds = null, atTick = null, epistemicClasses = null } = {}) => {
      const required = subjectIds ? new Set(subjectIds.map(String)) : null, allowed = epistemicClasses ? new Set(epistemicClasses) : null, candidates = [];
      if (predicate) candidates.push(byPredicate.get(predicate));
      if (required) for (const id of required) candidates.push(bySubject.get(id));
      if (allowed?.size === 1) candidates.push(byEpistemicClass.get([...allowed][0]));
      const available = candidates.filter(Boolean), keys = candidates.some(value => !value) ? [] : available.length ? [...available.reduce((smallest, value) => value.size < smallest.size ? value : smallest)] : [...bySemanticKey.keys()];
      return keys.map(key => bySemanticKey.get(key)).filter(belief => belief && (!predicate || belief.predicate === predicate) && (!required || [...required].every(id => belief.subjectIds.includes(id))) && (!allowed || allowed.has(belief.epistemicClass)) && (atTick == null || belief.validFromTick <= atTick && (belief.validUntilTick == null || atTick <= belief.validUntilTick)));
    };
    const view = {
      revision: this.revision, records,
      get: (predicate, subjectIds = []) => bySemanticKey.get(semanticKey(predicate, subjectIds)) || null,
      forSubject: entityId => [...(bySubject.get(String(entityId)) || [])].map(key => bySemanticKey.get(key)).filter(Boolean),
      match,
      byId: id => byId.get(id) || null,
      contradictionsFor: (predicate, subjectIds = []) => this.contradictionsFor(predicate, subjectIds)
    };
    const value = Object.freeze(view); this.snapshotCache = { revision: this.revision, value }; return value;
  }
  /** Canonical output is an explicit audit/export operation, not snapshot work. */
  canonicalSnapshot(source = null) {
    if (source == null && this.canonicalSnapshotCache?.revision === this.revision) return this.canonicalSnapshotCache.value;
    const snapshot = source || this.snapshot(), records = snapshot.records || Object.freeze([]);
    const value = Object.freeze({ revision: Number(snapshot.revision ?? this.revision), records, canonical: this.canonicalizer(records) });
    if (source == null) this.canonicalSnapshotCache = { revision: this.revision, value };
    return value;
  }
  #index(belief) { addIndex(this.byPredicate, belief.predicate, belief.semanticKey); addIndex(this.byEpistemicClass, belief.epistemicClass, belief.semanticKey); for (const id of belief.subjectIds) addIndex(this.bySubject, String(id), belief.semanticKey); }
}

function addIndex(index, key, value) { let values = index.get(key); if (!values) { values = new Set(); index.set(key, values); } values.add(value); }
function deleteIndex(index, key, value) { const values = index.get(key); if (!values) return; values.delete(value); if (!values.size) index.delete(key); }

export { semanticKey as beliefSemanticKey, PRECEDENCE as EPISTEMIC_PRECEDENCE };
