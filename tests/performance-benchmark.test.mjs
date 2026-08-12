import test from "node:test";
import assert from "node:assert/strict";
import { PerformanceBenchmark } from "../src/performance-benchmark.js";

test("five-minute benchmark storage remains bounded and produces diagnostic ranges", () => {
  const benchmark = new PerformanceBenchmark(3).start(0, 300000, { seed: 7 });
  for (let second = 1; second <= 5; second++) benchmark.sample(second * 1000, 50 + second, 1, { timings: { "frame.total": { samples: 60, averageMs: second, p95Ms: second + 1, p99Ms: second + 2, maximumMs: second + 3 } }, resources: { "renderer.info.render.calls": 100 + second } });
  const report = benchmark.stop();
  assert.equal(report.windows, 3); assert.equal(report.metadata.seed, 7);
  assert.equal(report.timings["frame.total"].maximumMs, 8);
  assert.deepEqual(report.resourceRanges["renderer.info.render.calls"], { minimum: 103, maximum: 105, final: 105 });
  assert.ok(report.diagnosticHighlights.some((line) => line.includes("Highest average")));
});

test("timing aggregation weights disjoint windows by their real sample counts", () => {
  const benchmark = new PerformanceBenchmark().start(0, 2000);
  benchmark.sample(1000, 60, 1, { timings: { render: { samples: 60, averageMs: 2, p95Ms: 3, p99Ms: 4, maximumMs: 5 } } });
  benchmark.sample(2000, 30, 1, { timings: { render: { samples: 30, averageMs: 8, p95Ms: 9, p99Ms: 10, maximumMs: 11 } } });
  const timing = benchmark.report().timings.render;
  assert.equal(timing.sampleCount, 90); assert.equal(timing.averageMs, 4); assert.equal(timing.maximumMs, 11);
});
