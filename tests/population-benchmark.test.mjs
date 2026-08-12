import test from "node:test";
import assert from "node:assert/strict";
import { BENCHMARK_POPULATIONS, populationBenchmarkSetup, populationSweepReport } from "../src/population-benchmark.js";

test("population sweep uses the five requested independent sizes", () => { assert.deepEqual(BENCHMARK_POPULATIONS, [25, 50, 100, 250, 500]); });
test("benchmark population composition is exact and keeps predators represented", () => { for (const total of BENCHMARK_POPULATIONS) { const setup = populationBenchmarkSetup({ size: 90 }, total); assert.equal(setup.herbivores + setup.carnivores, total); assert.ok(setup.herbivores > setup.carnivores); assert.ok(setup.carnivores >= 1); } });
test("combined report keeps stage measurements separate", () => { const report = populationSweepReport([{ metadata: { population: 25, worldSetup: { herbivores: 22, carnivores: 3 } }, fps: {}, ticksPerSecond: {}, timings: {}, finalResources: {}, resourceRanges: {}, diagnosticHighlights: [], windows: 2, observedDurationMs: 1000 }], { seed: 7 }); assert.equal(report.benchmarkKind, "population-sweep"); assert.deepEqual(report.populations, [25]); assert.equal(report.stages[0].population, 25); });
