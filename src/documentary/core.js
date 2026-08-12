import { DOCUMENTARY_SCHEMA_VERSION, validateDocumentaryRecord } from "./schemas.js";

const nowUtc = () => new Date().toISOString();
const safePart = value => String(value ?? "record").replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 72) || "record";

export class DocumentaryClock {
  constructor(now = () => performance.now()) { this.now = now; this.running = false; this.localStartMs = 0; this.offsetMs = 0; this.lastElapsedMs = 0; }
  start(serverElapsedMs = 0) { this.localStartMs = this.now() - Math.max(0, Number(serverElapsedMs) || 0); this.offsetMs = 0; this.lastElapsedMs = Math.max(0, Number(serverElapsedMs) || 0); this.running = true; return this.lastElapsedMs; }
  stop() { const value = this.elapsedMs(); this.running = false; return value; }
  elapsedMs() { if (!this.running) return this.lastElapsedMs; const estimate = Math.max(this.lastElapsedMs, this.now() - this.localStartMs + this.offsetMs); this.lastElapsedMs = estimate; return estimate; }
  applySync(serverElapsedMs, receivedAtMs = this.now(), smoothing = .1) { if (!this.running || !Number.isFinite(serverElapsedMs)) return this.offsetMs; const localEstimate = receivedAtMs - this.localStartMs + this.offsetMs, difference = serverElapsedMs - localEstimate; this.offsetMs += difference * Math.max(.01, Math.min(1, smoothing)); return this.offsetMs; }
}

export class DocumentaryEventBus {
  constructor() { this.listeners = new Map(); }
  on(type, listener) { const list = this.listeners.get(type) || new Set(); list.add(listener); this.listeners.set(type, list); return () => list.delete(listener); }
  emit(type, value) { for (const listener of this.listeners.get(type) || []) listener(value); for (const listener of this.listeners.get("*") || []) listener({ type, value }); }
  clear() { this.listeners.clear(); }
}

export class DocumentaryIdFactory {
  constructor(prefix = "doc") { this.prefix = safePart(prefix); this.counters = new Map(); }
  next(kind = "record") { const key = safePart(kind), value = (this.counters.get(key) || 0) + 1; this.counters.set(key, value); return `${this.prefix}-${key}-${String(value).padStart(6, "0")}`; }
}

export function createDocumentaryRecord({ sessionId, recordId, recordType, recordingTimeMs, simulationTime = {}, source = "documentary-system-v1", payload = {}, evidence = [] }) {
  const record = { schemaVersion: DOCUMENTARY_SCHEMA_VERSION, sessionId, recordId, recordType, recordingTimeMs: Math.max(0, Number(recordingTimeMs) || 0), simulationTime: { ...simulationTime }, createdAtUtc: nowUtc(), source, payload: { ...payload }, evidence: [...new Set(evidence.filter(Boolean))] };
  const validation = validateDocumentaryRecord(record); if (!validation.valid) throw new TypeError(`Invalid documentary record: ${validation.errors.join(", ")}`); return Object.freeze(record);
}

export class BoundedTimeline {
  constructor({ maximum = 4000, onRecord = null } = {}) { this.maximum = maximum; this.records = []; this.ids = new Set(); this.onRecord = onRecord; this.dropped = 0; }
  append(record) { const validation = validateDocumentaryRecord(record); if (!validation.valid) throw new TypeError(validation.errors.join(", ")); if (this.ids.has(record.recordId)) return false; this.records.push(record); this.ids.add(record.recordId); while (this.records.length > this.maximum) { const removed = this.records.shift(); this.ids.delete(removed.recordId); this.dropped += 1; } this.onRecord?.(record); return true; }
  recent(limit = 100) { return this.records.slice(-Math.max(0, limit)); }
  clear() { this.records.length = 0; this.ids.clear(); this.dropped = 0; }
}

export class RangeTracker {
  constructor({ idFactory, record } = {}) { this.idFactory = idFactory; this.record = record; this.active = new Map(); }
  start(key, rangeType, data = {}) { if (this.active.has(key)) return this.active.get(key); const item = { rangeId: this.idFactory.next("range"), key, rangeType, startMs: this.record.time(), endMs: null, status: "ACTIVE", ...data }; this.active.set(key, item); this.record.write("event_range", { ...item }); return item; }
  update(key, data = {}) { const item = this.active.get(key); if (!item) return null; Object.assign(item, data); this.record.write("event_range", { ...item, status: "UPDATED" }); return item; }
  end(key, data = {}) { const item = this.active.get(key); if (!item) return null; Object.assign(item, data, { endMs: this.record.time(), status: "RESOLVED" }); this.active.delete(key); this.record.write("event_range", { ...item }); return item; }
  closeAll(reason = "session-ended") { return [...this.active.keys()].map(key => this.end(key, { reason })); }
}

export function simulationTimeSnapshot(sim = {}) { return { tick: Number(sim.tick) || 0, day: Number(sim.day) || 0, minuteOfDay: Number(sim.minuteOfDay ?? sim.timeMinute) || 0, season: sim.season || null, weather: sim.weather?.kind || sim.weather || null }; }

export class DocumentaryRecorder {
  constructor({ sessionId, clock, simulationTime = () => ({}), timeline, idFactory = new DocumentaryIdFactory(sessionId) }) { this.sessionId = sessionId; this.clock = clock; this.simulationTime = simulationTime; this.timeline = timeline; this.idFactory = idFactory; }
  time() { return this.clock.elapsedMs(); }
  write(recordType, payload, { evidence = [], source = "documentary-system-v1", recordId = this.idFactory.next(recordType) } = {}) { const record = createDocumentaryRecord({ sessionId: this.sessionId, recordId, recordType, recordingTimeMs: this.time(), simulationTime: this.simulationTime(), source, payload, evidence }); this.timeline.append(record); return record; }
}
