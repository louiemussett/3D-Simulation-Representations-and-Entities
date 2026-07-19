const DEFAULT_SAMPLE_LIMIT = 240;

export const PROFILE_CATEGORIES = Object.freeze([
  "frame presentation update", "Three.js render", "controls/camera", "weather/hydrology",
  "vegetation simulation", "animal perception", "decision/action", "causal trace capture",
  "corpse processing", "terrain rebuild", "vegetation rebuild", "animal presentation rebuild/update",
  "corpse rendering", "fog", "overlays", "minimap", "DOM/UI"
]);

export class FixedRingBuffer {
  constructor(limit = DEFAULT_SAMPLE_LIMIT) {
    this.limit = Math.max(1, Math.floor(limit));
    this.values = new Array(this.limit);
    this.next = 0;
    this.length = 0;
  }

  push(value) {
    this.values[this.next] = value;
    this.next = (this.next + 1) % this.limit;
    this.length = Math.min(this.length + 1, this.limit);
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
  constructor({ enabled = false, sampleLimit = DEFAULT_SAMPLE_LIMIT, clock = () => performance.now() } = {}) {
    this.enabled = enabled;
    this.clock = clock;
    this.buffers = new Map(PROFILE_CATEGORIES.map((name) => [name, new FixedRingBuffer(sampleLimit)]));
  }

  setEnabled(enabled) { this.enabled = Boolean(enabled); return this.enabled; }
  clear() { for (const buffer of this.buffers.values()) buffer.clear(); }
  record(category, durationMs) { if (this.enabled) this.buffers.get(category)?.push(durationMs); }
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
}

const PRESENTATION_KEYS = new Set([
  "visualMove", "savedAt", "occupied", "entityIndex", "hexWorld"
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
    const item = authoritativeValue(value[key], seen);
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
  let hash = 0xcbf29ce484222325n;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= BigInt(text.charCodeAt(index));
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return hash.toString(16).padStart(16, "0");
}
