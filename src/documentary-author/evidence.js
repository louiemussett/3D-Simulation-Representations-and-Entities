import { validateEvidence } from "./schemas.js";

const clamp01 = value => Math.max(0, Math.min(1, Number(value) || 0));
const freeze = value => Object.freeze(value);

export class AuthorIdFactory {
  constructor(prefix = "author") { this.prefix = prefix; this.counts = new Map(); }
  next(kind) { const count = (this.counts.get(kind) || 0) + 1; this.counts.set(kind, count); return `${this.prefix}-${kind}-${String(count).padStart(6, "0")}`; }
}

export class DocumentaryEvidenceBus {
  constructor({ maximum = 6000, idFactory = new AuthorIdFactory() } = {}) { this.maximum = maximum; this.idFactory = idFactory; this.records = []; this.listeners = new Set(); this.dropped = 0; }
  publish(input = {}) {
    const record = freeze({ evidenceId: input.evidenceId || this.idFactory.next("evidence"), schemaVersion: 1, tick: Number(input.tick) || 0, simulationTimeMinutes: Number(input.simulationTimeMinutes) || 0, observedAtRecordingMs: Math.max(0, Number(input.observedAtRecordingMs) || 0), type: String(input.type || "unknown"), subjects: freeze([...(input.subjects || [])]), location: input.location ? freeze({ ...input.location }) : null, provenance: freeze({ producer: input.provenance?.producer || "simulation-adapter", sourceClass: input.provenance?.sourceClass || "AUTHORITATIVE_STATE", sourceRecordIds: freeze([...(input.provenance?.sourceRecordIds || [])]), observerLimit: input.provenance?.observerLimit || "OMNISCIENT_SIMULATION" }), magnitude: clamp01(input.magnitude), confidence: clamp01(input.confidence ?? 1), payload: freeze({ ...(input.payload || {}) }) });
    const validation = validateEvidence(record); if (!validation.valid) throw new TypeError(validation.errors.join(", "));
    this.records.push(record); while (this.records.length > this.maximum) { this.records.shift(); this.dropped += 1; }
    for (const listener of this.listeners) listener(record); return record;
  }
  onEvidence(listener) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  recent(limit = 100) { return this.records.slice(-Math.max(0, limit)); }
}

export class ThresholdDetector {
  constructor({ enter, exit, initialBand = "normal" }) { if (!(exit < enter)) throw new TypeError("exit must be below enter"); this.enter = enter; this.exit = exit; this.band = initialBand; }
  observe(value) { const numeric = Number(value); const previous = this.band; if (this.band !== "high" && numeric >= this.enter) this.band = "high"; else if (this.band === "high" && numeric <= this.exit) this.band = "normal"; return previous === this.band ? null : { fromBand: previous, toBand: this.band, value: numeric }; }
}

export class EvidenceAdapterRegistry {
  constructor() { this.adapters = new Map(); }
  register(domain, adapter) { if (!domain || typeof adapter !== "function") throw new TypeError("adapter requires a domain and function"); this.adapters.set(domain, adapter); return this; }
  collect(snapshot, context = {}) { const records = []; for (const [domain, adapter] of this.adapters) for (const item of adapter(snapshot, context) || []) records.push({ ...item, domain }); return records; }
}

export function defaultEvidenceFromScene(scene = {}, context = {}) {
  const subjectIds = [...(scene.ids || context.subjects?.map(item => item.id) || [])].filter(Boolean);
  const evidence = [{ type: `scene.${scene.kind || "observation"}`, subjects: subjectIds, magnitude: Math.min(1, (Number(scene.score) || 1) / 100), confidence: 1, payload: { title: scene.title || "", detail: scene.detail || "", context: context.context || scene.context || null, actionKey: context.actionKey || null, eventKind: context.eventKind || null } }];
  for (const subject of context.subjects || []) {
    if (subject.actionKey) evidence.push({ type: "behaviour.current", subjects: [subject.id], magnitude: .5, confidence: 1, payload: { actionKey: subject.actionKey, priority: subject.priority, commitmentStatus: subject.commitmentStatus } });
    if (Number.isFinite(subject.energy) || Number.isFinite(subject.hydration)) evidence.push({ type: "physiology.current_band", subjects: [subject.id], magnitude: .45, confidence: 1, payload: { energy: subject.energy, hydration: subject.hydration, health: subject.health, fear: subject.fear } });
  }
  if (context.landscape) evidence.push({ type: "environment.current", subjects: [], magnitude: .4, confidence: 1, payload: { ...context.landscape } });
  const rotatingSlice = (records, count, offset) => { const usable = Array.isArray(records) ? records.filter(record => record && typeof record === "object" && typeof record.path === "string" && record.path.length) : []; if (!usable.length) return []; const start = Math.abs(Number(offset) || 0) % usable.length; return Array.from({ length: Math.min(count, usable.length) }, (_, index) => usable[(start + index) % usable.length]); };
  const appendArchiveRecord = (type, subjects, record) => { if (!record || typeof record.path !== "string" || !record.path) return; evidence.push({ type, subjects, magnitude: .2, confidence: 1, payload: { path: record.path, value: record.value, valueType: record.type } }); };
  for (const subject of (context.subjects || []).filter(Boolean)) for (const record of rotatingSlice(subject.archiveEvidence, 32, context.variant)) appendArchiveRecord("archive.entity_field", [subject.id].filter(Boolean), record);
  for (const record of rotatingSlice(context.worldEvidence, 32, Number(context.variant) + 17)) appendArchiveRecord("archive.world_field", [], record);
  return evidence;
}
