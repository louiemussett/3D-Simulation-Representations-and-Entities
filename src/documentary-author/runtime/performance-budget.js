import { deepFreeze } from "./immutable.js";

export const DOCUMENTARY_PERFORMANCE_BUDGETS = deepFreeze({
  observationTransaction: { medianMs: 3.5, p95Ms: 10 },
  planningTransaction: { medianMs: 8, p95Ms: 25 },
  cameraPlanning: { medianMs: .8, p95Ms: 2 },
  cameraFrameStep: { medianMs: .8, p95Ms: 2 },
  profileCheckpoint: { medianMs: 20, p95Ms: 50 }
});

const finite = value => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
const percentile = (sorted, probability) => sorted.length ? sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * probability) - 1))] : 0;

export class PerformanceBudgetTracker {
  constructor({ budgets = DOCUMENTARY_PERFORMANCE_BUDGETS, maximumSamples = 256 } = {}) {
    this.budgets = budgets;
    this.maximumSamples = Math.max(16, Number(maximumSamples) || 256);
    this.samples = new Map();
    this.revision = 0;
    this.metricRevisions = new Map();
    this.metricCache = new Map();
    this.snapshotCache = null;
  }
  record(name, durationMs) {
    const values = this.samples.get(name) || [];
    values.push(finite(durationMs));
    if (values.length > this.maximumSamples) values.splice(0, values.length - this.maximumSamples);
    this.samples.set(name, values);
    this.revision += 1; this.metricRevisions.set(name, (this.metricRevisions.get(name) || 0) + 1); this.metricCache.delete(name); this.snapshotCache = null;
    return durationMs;
  }
  metric(name) {
    const metricRevision = this.metricRevisions.get(name) || 0, cached = this.metricCache.get(name); if (cached?.revision === metricRevision) return cached.value;
    const values = this.samples.get(name) || [], sorted = [...values].sort((left, right) => left - right), budget = this.budgets[name] || null;
    const metric = { count: values.length, latestMs: values.at(-1) || 0, medianMs: percentile(sorted, .5), p95Ms: percentile(sorted, .95), maximumMs: sorted.at(-1) || 0, budget, withinBudget: !budget || !values.length || percentile(sorted, .5) <= budget.medianMs && percentile(sorted, .95) <= budget.p95Ms };
    const value = deepFreeze(metric); this.metricCache.set(name, { revision: metricRevision, value }); return value;
  }
  snapshot() {
    if (this.snapshotCache?.revision === this.revision) return this.snapshotCache.value;
    const names = new Set([...Object.keys(this.budgets), ...this.samples.keys()]), metrics = Object.fromEntries([...names].sort().map(name => [name, this.metric(name)]));
    const value = deepFreeze({ metrics, breaches: Object.entries(metrics).filter(([, metric]) => !metric.withinBudget).map(([name]) => name) }); this.snapshotCache = { revision: this.revision, value }; return value;
  }
  reset() { this.samples.clear(); this.revision += 1; this.metricRevisions.clear(); this.metricCache.clear(); this.snapshotCache = null; }
}

export const monotonicNow = () => globalThis.performance?.now?.() ?? Date.now();
