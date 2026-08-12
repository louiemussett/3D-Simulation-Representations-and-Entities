export const DEFAULT_PROFILER_SAMPLE_LIMIT = 600;
const DEFAULT_SAMPLE_LIMIT = DEFAULT_PROFILER_SAMPLE_LIMIT;
const normalizedSampleLimit = (value, fallback = DEFAULT_SAMPLE_LIMIT) => Number.isFinite(Number(value)) ? Math.max(1, Math.floor(Number(value))) : fallback;

export const PROFILE_CATEGORIES = Object.freeze([
  "frame.total", "frame presentation update", "Three.js render", "controls/camera", "weather/hydrology",
  "vegetation simulation", "animal perception", "tick.perception", "tick.total", "decision/action", "causal trace capture",
  "corpse processing", "tick.corpses", "terrain rebuild", "vegetation rebuild", "animal presentation rebuild/update",
  "corpse rendering", "fog", "display.fog", "display.terrain", "display.vegetation", "overlays", "minimap", "UI.minimap.static", "UI.reality", "DOM/UI"
]);

export class FixedRingBuffer {
  constructor(limit = DEFAULT_SAMPLE_LIMIT) {
    this.limit = normalizedSampleLimit(limit);
    this.values = new Array(this.limit);
    this.next = 0;
    this.length = 0;
  }

  push(value) {
    this.values[this.next] = value;
    this.next = (this.next + 1) % this.limit;
    this.length = Math.min(this.length + 1, this.limit);
    return this.length;
  }

  get size() { return this.length; }
  get capacity() { return this.limit; }
  latest() { return this.length ? this.values[(this.next - 1 + this.limit) % this.limit] : undefined; }

  resize(limit) {
    limit = normalizedSampleLimit(limit, this.limit);
    if (limit === this.limit) return this.limit;
    const retained = this.toArray().slice(-limit);
    this.limit = limit; this.values = new Array(limit); this.next = 0; this.length = 0;
    for (const value of retained) this.push(value);
    return this.limit;
  }

  toArray() {
    if (this.length < this.limit) return this.values.slice(0, this.length);
    return [...this.values.slice(this.next), ...this.values.slice(0, this.next)];
  }

  clear() { this.values = new Array(this.limit); this.next = 0; this.length = 0; }
}

function percentile(sorted, fraction) {
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)];
}

export function sampleSummary(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const total = sorted.reduce((sum, value) => sum + value, 0);
  return {
    samples: sorted.length,
    averageMs: sorted.length ? total / sorted.length : 0,
    p95Ms: percentile(sorted, .95),
    p99Ms: percentile(sorted, .99),
    maximumMs: sorted.at(-1) || 0
  };
}

export class DevelopmentProfiler {
  constructor({ enabled = false, sampleLimit = DEFAULT_SAMPLE_LIMIT, clock = () => performance.now(), categories = PROFILE_CATEGORIES, dynamicCategories = false } = {}) {
    this.enabled = enabled;
    this.clock = clock;
    this.sampleLimit = normalizedSampleLimit(sampleLimit);
    this.dynamicCategories = Boolean(dynamicCategories);
    this.buffers = new Map([...new Set(categories.map(String).filter(Boolean))].map((name) => [name, new FixedRingBuffer(this.sampleLimit)]));
  }

  setEnabled(enabled) { this.enabled = Boolean(enabled); return this.enabled; }
  register(category) {
    const name = String(category || "");
    if (!name) return null;
    if (!this.buffers.has(name)) this.buffers.set(name, new FixedRingBuffer(this.sampleLimit));
    return this.buffers.get(name);
  }
  resizeSampleLimit(sampleLimit) {
    this.sampleLimit = normalizedSampleLimit(sampleLimit, this.sampleLimit);
    for (const buffer of this.buffers.values()) buffer.resize(this.sampleLimit);
    return this.sampleLimit;
  }
  clear() { for (const buffer of this.buffers.values()) buffer.clear(); }
  record(category, durationMs) {
    if (!this.enabled || !Number.isFinite(Number(durationMs))) return false;
    const buffer = this.buffers.get(category) || (this.dynamicCategories ? this.register(category) : null);
    if (!buffer) return false;
    buffer.push(Number(durationMs)); return true;
  }
  measure(category, work) {
    if (!this.enabled) return work();
    const started = this.clock();
    try { return work(); } finally { this.record(category, this.clock() - started); }
  }
  report(resources = {}) {
    return {
      enabled: this.enabled,
      sampleLimit: this.buffers.values().next().value?.limit || 0,
      timings: Object.fromEntries([...this.buffers].map(([name, buffer]) => [name, sampleSummary(buffer.toArray())])),
      resources
    };
  }
  drain(resources = {}) { const report = this.report(resources); this.clear(); return report; }
}

const metricName = (value) => {
  const name = String(value || "").trim();
  if (!name) throw new TypeError("Diagnostic metric names must be non-empty");
  return name;
};

/** Small reusable counter/gauge/history registry for diagnostics-only data. */
export class DiagnosticsMetrics {
  constructor({ historyLimit = DEFAULT_SAMPLE_LIMIT } = {}) {
    this.historyLimit = normalizedSampleLimit(historyLimit);
    this.counters = new Map();
    this.gauges = new Map();
    this.histories = new Map();
  }
  increment(name, amount = 1) {
    name = metricName(name); amount = Number(amount);
    if (!Number.isFinite(amount)) throw new TypeError(`Diagnostic counter ${name} requires a finite amount`);
    const value = (this.counters.get(name) || 0) + amount; this.counters.set(name, value); return value;
  }
  gauge(name, value) {
    name = metricName(name); value = Number(value);
    if (!Number.isFinite(value)) throw new TypeError(`Diagnostic gauge ${name} requires a finite value`);
    this.gauges.set(name, value); return value;
  }
  sample(name, value) {
    name = metricName(name); value = Number(value);
    if (!Number.isFinite(value)) throw new TypeError(`Diagnostic sample ${name} requires a finite value`);
    if (!this.histories.has(name)) this.histories.set(name, new FixedRingBuffer(this.historyLimit));
    this.histories.get(name).push(value); return value;
  }
  snapshot() {
    const histories = Object.fromEntries([...this.histories].map(([name, buffer]) => [name, Object.freeze(sampleSummary(buffer.toArray()))]));
    return Object.freeze({
      counters: Object.freeze(Object.fromEntries(this.counters)),
      gauges: Object.freeze(Object.fromEntries(this.gauges)),
      histories: Object.freeze(histories)
    });
  }
  clear() { this.counters.clear(); this.gauges.clear(); for (const history of this.histories.values()) history.clear(); this.histories.clear(); }
}

/** Normalises cache-like diagnostics without exposing the mutable cache. */
export function cacheDiagnosticsMetrics(cache) {
  const source = typeof cache?.metrics === "function" ? cache.metrics() : cache || {};
  const finite = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
  const hits = Math.max(0, finite(source.hits)), misses = Math.max(0, finite(source.misses));
  const bytes = Math.max(0, finite(source.bytes ?? source.totalBytes)), budgetBytes = Math.max(0, finite(source.budgetBytes ?? source.maxBytes));
  return Object.freeze({
    entries: Math.max(0, finite(source.entries ?? source.size)),
    bytes,
    budgetBytes,
    utilization: budgetBytes ? bytes / budgetBytes : 0,
    hits,
    misses,
    hitRate: hits + misses ? hits / (hits + misses) : 0,
    evictions: Math.max(0, finite(source.evictions)),
    disposals: Math.max(0, finite(source.disposals))
  });
}

const PRESENTATION_KEYS = new Set([
  "visualMove", "currentAction", "savedAt", "occupied", "entityIndex", "hexWorld"
]);

function authoritativeValue(value, seen) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : String(value);
  if (typeof value === "bigint") return value.toString();
  if (typeof value !== "object") return undefined;
  if (seen.has(value)) return undefined;
  seen.add(value);
  if (Array.isArray(value)) {
    const result = value.map((item) => authoritativeValue(item, seen)).filter((item) => item !== undefined);
    seen.delete(value); return result;
  }
  if (value instanceof Map) {
    const result = [...value.entries()].sort(([a], [b]) => String(a).localeCompare(String(b))).map(([key, item]) => [key, authoritativeValue(item, seen)]);
    seen.delete(value); return result;
  }
  const result = {};
  for (const key of Object.keys(value).sort()) {
    if (PRESENTATION_KEYS.has(key)) continue;
    const source = key === "actionState" && value[key] ? { ...value[key], label: undefined } : value[key];
    const item = authoritativeValue(source, seen);
    if (item !== undefined) result[key] = item;
  }
  seen.delete(value); return result;
}

export function authoritativeSnapshot(world) {
  return authoritativeValue(world, new WeakSet());
}

export function stableStringify(value) { return JSON.stringify(authoritativeSnapshot(value)); }

export function authoritativeHash(world) {
  const text = stableStringify(world);
  let left = 0xdeadbeef, right = 0x41c6ce57;
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    left = Math.imul(left ^ code, 2654435761);
    right = Math.imul(right ^ code, 1597334677);
  }
  left = Math.imul(left ^ (left >>> 16), 2246822507) ^ Math.imul(right ^ (right >>> 13), 3266489909);
  right = Math.imul(right ^ (right >>> 16), 2246822507) ^ Math.imul(left ^ (left >>> 13), 3266489909);
  return `${(right >>> 0).toString(16).padStart(8, "0")}${(left >>> 0).toString(16).padStart(8, "0")}`;
}
