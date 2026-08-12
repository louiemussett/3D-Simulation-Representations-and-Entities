import { sampleSummary } from "./diagnostics.js";

const finite = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;

export class PerformanceBenchmark {
  constructor(maxSamples = 360) { this.maxSamples = Math.max(1, Math.floor(maxSamples)); this.reset(); }
  reset() { this.running = false; this.startedAt = 0; this.durationMs = 0; this.metadata = {}; this.samples = []; }
  start(now, durationMs, metadata = {}) { this.reset(); this.running = true; this.startedAt = now; this.durationMs = Math.max(1000, Number(durationMs) || 300000); this.metadata = { ...metadata }; return this; }
  sample(now, fps, ticksPerSecond, profile) {
    if (!this.running) return false;
    this.samples.push({ elapsedMs: now - this.startedAt, fps: finite(fps), ticksPerSecond: finite(ticksPerSecond), timings: profile?.timings || {}, resources: profile?.resources || {} });
    if (this.samples.length > this.maxSamples) this.samples.shift();
    if (now - this.startedAt >= this.durationMs) { this.running = false; return true; }
    return false;
  }
  stop() { this.running = false; return this.report(); }
  report() {
    const timingKeys = new Set(this.samples.flatMap((sample) => Object.keys(sample.timings)));
    const timings = {};
    for (const key of timingKeys) {
      const windows = this.samples.map((sample) => sample.timings[key]).filter((value) => value?.samples);
      timings[key] = {
        windowCount: windows.length,
        sampleCount: windows.reduce((sum, value) => sum + value.samples, 0),
        averageMs: windows.length ? windows.reduce((sum, value) => sum + value.averageMs * value.samples, 0) / windows.reduce((sum, value) => sum + value.samples, 0) : 0,
        p95WindowMaximumMs: Math.max(0, ...windows.map((value) => value.p95Ms)),
        p99WindowMaximumMs: Math.max(0, ...windows.map((value) => value.p99Ms)),
        maximumMs: Math.max(0, ...windows.map((value) => value.maximumMs))
      };
    }
    const report = {
      benchmarkSchema: 2, metadata: this.metadata, requestedDurationMs: this.durationMs,
      observedDurationMs: this.samples.at(-1)?.elapsedMs || 0, windows: this.samples.length,
      fps: sampleSummary(this.samples.map((sample) => sample.fps)), ticksPerSecond: sampleSummary(this.samples.map((sample) => sample.ticksPerSecond)),
      timings, finalResources: this.samples.at(-1)?.resources || {},
      resourceRanges: this.resourceRanges()
    };
    report.fps.minimum = this.samples.length ? Math.min(...this.samples.map((sample) => sample.fps)) : 0;
    report.diagnosticHighlights = diagnosticHighlights(report);
    return report;
  }
  resourceRanges() {
    const numericKeys = new Set(this.samples.flatMap((sample) => Object.entries(sample.resources).filter(([, value]) => Number.isFinite(value)).map(([key]) => key)));
    return Object.fromEntries([...numericKeys].map((key) => { const values = this.samples.map((sample) => sample.resources[key]).filter(Number.isFinite); return [key, { minimum: Math.min(...values), maximum: Math.max(...values), final: values.at(-1) }]; }));
  }
}

export function diagnosticHighlights(report) {
  const timings = report.timings || {}, resources = report.finalResources || {}, ranges = report.resourceRanges || {}, highlights = [];
  const ranked = Object.entries(timings).filter(([, value]) => value.windowCount).sort((left, right) => right[1].averageMs - left[1].averageMs).slice(0, 6);
  if (ranked.length) highlights.push(`Highest average measured categories: ${ranked.map(([key, value]) => `${key} ${value.averageMs.toFixed(2)}ms`).join(", ")}.`);
  const frame = timings["frame.total"]?.averageMs || 0, render = timings["Three.js render"]?.averageMs || 0, presentation = timings["frame presentation update"]?.averageMs || 0;
  if (frame && render / frame >= .45) highlights.push(`Three.js render is ${(render / frame * 100).toFixed(0)}% of measured frame time; investigate draw calls, triangles and landscape layers first.`);
  if (frame && presentation / frame >= .35) highlights.push(`Presentation update is ${(presentation / frame * 100).toFixed(0)}% of measured frame time; inspect entity/overlay counts and tier budgets.`);
  if ((timings["tick.total"]?.p99WindowMaximumMs || 0) > 20) highlights.push(`Simulation tick p99 reached ${timings["tick.total"].p99WindowMaximumMs.toFixed(2)}ms; compare perception, decisions, corpses and vegetation before changing rendering.`);
  if ((resources["renderer.info.render.calls"] || 0) > 2000) highlights.push(`Draw calls are high at ${resources["renderer.info.render.calls"]}; use the terrain/chunk and overlay counts to locate the source before considering animal instancing.`);
  if ((ranges.simulationTickBacklog?.maximum || 0) > 1) highlights.push(`Simulation backlog reached ${ranges.simulationTickBacklog.maximum.toFixed(2)} ticks, indicating throughput could not consistently match the requested rate.`);
  for (const key of ["renderer.info.memory.geometries", "renderer.info.memory.textures"]) { const range = ranges[key]; if (range && range.maximum - range.minimum > 12) highlights.push(`${key} grew from ${range.minimum} to ${range.maximum}; repeat reset/load checks for a possible resource leak.`); }
  if (!highlights.length) highlights.push("No single dominant bottleneck crossed the built-in warning thresholds; compare the timing table across identical scenarios.");
  return highlights;
}
