import { canonicalJson, clamp01, deepFreeze, stableHash } from "../runtime/immutable.js";

const SOURCE_KINDS = new Set(["ENTITY_STATE", "REMAINS_STATE", "VERIFIED_EVENT", "ENVIRONMENT_STATE", "MEMORY_RECORD", "RELATIONSHIP_STATE", "PERCEPTION_STATE", "ARCHIVE_RECORD"]);
const EPISTEMIC_CLASSES = new Set(["AUTHORITATIVE", "OBSERVED", "INFERRED", "REPORTED_MEMORY"]);

function validateEvidenceInput(input) {
  if (!input || typeof input !== "object") throw new TypeError("evidence must be an object");
  if (!SOURCE_KINDS.has(input.sourceKind)) throw new TypeError(`invalid evidence sourceKind ${input.sourceKind}`);
  if (!EPISTEMIC_CLASSES.has(input.epistemicClass || "AUTHORITATIVE")) throw new TypeError(`invalid evidence epistemicClass ${input.epistemicClass}`);
  if (!input.predicate || typeof input.predicate !== "string") throw new TypeError("evidence predicate is required");
  if (!(input.subjectIds || []).every(id => typeof id === "string" && id.length)) throw new TypeError("evidence subjectIds must be non-empty strings");
  if (!Number.isFinite(Number(input.observedAtTick))) throw new TypeError("evidence observedAtTick must be finite");
}

const semanticKey = input => `${input.predicate}|${[...(input.subjectIds || [])].sort().join("+")}`;

export class EvidenceLedger {
  constructor({ maximumHistory = 50000, canonicalizer = canonicalJson } = {}) {
    this.maximumHistory = maximumHistory;
    this.canonicalizer = canonicalizer;
    this.historyQueue = [];
    this.historyHead = 0;
    this.historyCache = null;
    this.retainedHistoryIds = new Set();
    Object.defineProperty(this, "history", { enumerable: true, get: () => { if (!this.historyCache) this.historyCache = this.historyQueue.slice(this.historyHead); return this.historyCache; } });
    this.active = new Map();
    this.byId = new Map();
    this.byPredicate = new Map();
    this.bySourceKind = new Map();
    this.bySubject = new Map();
    this.revision = 0;
    this.sequence = 0;
    this.snapshotCache = null;
    this.canonicalSnapshotCache = null;
  }
  begin(simulationTick) { return new EvidenceTransaction(this, simulationTick); }
  get(evidenceId) { return this.byId.get(evidenceId) || null; }
  current(predicate, subjectIds = []) { return this.active.get(`${predicate}|${[...subjectIds].sort().join("+")}`) || null; }
  match({ predicate = null, subjectIds = null, sourceKind = null } = {}) {
    const required = subjectIds ? new Set(subjectIds) : null;
    const candidates = [];
    if (predicate) candidates.push(this.byPredicate.get(predicate));
    if (sourceKind) candidates.push(this.bySourceKind.get(sourceKind));
    if (required) for (const id of required) candidates.push(this.bySubject.get(String(id)));
    const available = candidates.filter(Boolean), keys = candidates.some(value => !value) ? [] : available.length ? [...available.reduce((smallest, value) => value.size < smallest.size ? value : smallest)] : [...this.active.keys()];
    return keys.map(key => this.active.get(key)).filter(record => record && (!predicate || record.predicate === predicate) && (!sourceKind || record.sourceKind === sourceKind) && (!required || [...required].every(id => record.subjectIds.includes(String(id)))));
  }
  snapshot() {
    if (this.snapshotCache?.revision === this.revision) return this.snapshotCache.value;
    const records = Object.freeze([...this.active.values()]);
    const value = Object.freeze({ revision: this.revision, records, get: id => this.get(id), current: (predicate, subjectIds = []) => this.current(predicate, subjectIds), match: query => this.match(query) });
    this.snapshotCache = { revision: this.revision, value }; return value;
  }
  /**
   * Builds the deterministic audit representation only when an audit/export
   * consumer explicitly asks for it. Passing a committed delta preserves the
   * former batch-canonicalisation use case without charging every commit for it.
   */
  canonicalSnapshot(source = null) {
    if (source == null && this.canonicalSnapshotCache?.revision === this.revision) return this.canonicalSnapshotCache.value;
    const snapshot = source || this.snapshot(), records = snapshot.records || Object.freeze([]);
    const view = { revision: Number(snapshot.revision ?? this.revision), records, canonical: this.canonicalizer(records) };
    if (Object.hasOwn(snapshot, "tick")) view.tick = snapshot.tick;
    const value = Object.freeze(view);
    if (source == null) this.canonicalSnapshotCache = { revision: this.revision, value };
    return value;
  }
  _commit(tick, inputs) {
    const staged = [];
    for (const input of inputs) {
      validateEvidenceInput(input);
      const key = semanticKey(input), previous = this.active.get(key), objectHash = stableHash(input.object ?? null);
      if (previous?.objectHash === objectHash && previous.confidence === clamp01(input.confidence ?? 1) && previous.epistemicClass === (input.epistemicClass || "AUTHORITATIVE")) continue;
      const evidenceId = `evidence-${String(++this.sequence).padStart(10, "0")}-${objectHash.slice(-8)}`;
      const record = deepFreeze({
        evidenceId, schemaVersion: 1, sourceKind: input.sourceKind, predicate: input.predicate,
        subjectIds: [...new Set(input.subjectIds || [])].sort(), object: input.object ?? null,
        epistemicClass: input.epistemicClass || "AUTHORITATIVE", confidence: clamp01(input.confidence ?? 1),
        validFromTick: Number(input.validFromTick ?? tick), validUntilTick: input.validUntilTick == null ? null : Number(input.validUntilTick), observedAtTick: Number(input.observedAtTick ?? tick),
        causalEventIds: [...new Set(input.causalEventIds || [])].sort(), fingerprint: stableHash({ key, object: input.object ?? null, source: input.sourcePath || null }),
        objectHash, sourcePath: input.sourcePath || null, semanticKey: key, supersedesEvidenceId: previous?.evidenceId || null
      });
      staged.push({ key, record });
    }
    if (!staged.length) return Object.freeze({ revision: this.revision, tick, records: Object.freeze([]) });
    for (const { key, record } of staged) {
      const previous = this.active.get(key); if (previous) { if (previous.sourceKind !== record.sourceKind) { deleteIndex(this.bySourceKind, previous.sourceKind, key); addIndex(this.bySourceKind, record.sourceKind, key); } if (!this.retainedHistoryIds.has(previous.evidenceId)) this.byId.delete(previous.evidenceId); }
      else this.#index(record);
      this.active.set(key, record); this.byId.set(record.evidenceId, record); this.historyQueue.push(record); this.retainedHistoryIds.add(record.evidenceId); this.historyCache = null;
    }
    this.revision += 1;
    this.snapshotCache = null;
    this.canonicalSnapshotCache = null;
    const liveHistory = this.historyQueue.length - this.historyHead, overflow = liveHistory - this.maximumHistory;
    if (overflow > 0) {
      const evictionEnd = this.historyHead + overflow, removedRecords = this.historyQueue.slice(this.historyHead, evictionEnd); this.historyHead = evictionEnd;
      for (const removed of removedRecords) { this.retainedHistoryIds.delete(removed.evidenceId); if (this.active.get(removed.semanticKey)?.evidenceId !== removed.evidenceId) this.byId.delete(removed.evidenceId); }
      this.historyCache = null;
    }
    if (this.historyHead > 1024 && this.historyHead * 2 > this.historyQueue.length) { this.historyQueue = this.historyQueue.slice(this.historyHead); this.historyHead = 0; }
    return Object.freeze({ revision: this.revision, tick, records: Object.freeze(staged.map(item => item.record)) });
  }
  #index(record) {
    addIndex(this.byPredicate, record.predicate, record.semanticKey); addIndex(this.bySourceKind, record.sourceKind, record.semanticKey);
    for (const id of record.subjectIds) addIndex(this.bySubject, String(id), record.semanticKey);
  }
}

function addIndex(index, key, value) { let values = index.get(key); if (!values) { values = new Set(); index.set(key, values); } values.add(value); }
function deleteIndex(index, key, value) { const values = index.get(key); if (!values) return; values.delete(value); if (!values.size) index.delete(key); }

class EvidenceTransaction {
  constructor(ledger, tick) { this.ledger = ledger; this.tick = Number(tick || 0); this.inputs = []; this.closed = false; }
  add(record) { if (this.closed) throw new TypeError("evidence transaction is closed"); this.inputs.push(record); return this; }
  addAll(records = []) { for (const record of records) this.add(record); return this; }
  commit() { if (this.closed) throw new TypeError("evidence transaction is closed"); for (const input of this.inputs) validateEvidenceInput(input); this.closed = true; return this.ledger._commit(this.tick, this.inputs); }
  abort() { this.closed = true; this.inputs.length = 0; }
}

export { SOURCE_KINDS as EVIDENCE_SOURCE_KINDS, EPISTEMIC_CLASSES, semanticKey as evidenceSemanticKey, validateEvidenceInput };
