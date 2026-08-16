import test from "node:test";
import assert from "node:assert/strict";
import { BENCHMARK_POPULATIONS, populationBenchmarkSetup, populationBenchmarkSpeciesCounts, populationSweepReport, validatePopulationBenchmarkStage } from "../src/population-benchmark.js";

test("population sweep uses the five requested independent sizes", () => { assert.deepEqual(BENCHMARK_POPULATIONS, [25, 50, 100, 250, 500]); });
test("benchmark population composition is exact and replaces the authoritative species roster", () => {
  const base = { "valley-grazer-updated": 14, "meadow-nibbler": 4, "ridge-hunter-updated": 4 };
  for (const total of BENCHMARK_POPULATIONS) {
    const setup = populationBenchmarkSetup({ size: 90, speciesCounts: base }, total);
    assert.equal(setup.herbivores + setup.carnivores, total);
    assert.equal(Object.values(setup.speciesCounts).reduce((sum, value) => sum + value, 0), total);
    assert.ok(setup.herbivores > setup.carnivores);
    assert.ok(setup.carnivores >= 1);
    assert.equal(setup.speciesCounts.grazer, 0);
    assert.ok(setup.speciesCounts["valley-grazer-updated"] > 0);
    assert.ok(setup.speciesCounts["ridge-hunter-updated"] > 0);
  }
});
test("authoritative roster allocation is deterministic and preserves active species proportions", () => {
  const first = populationBenchmarkSpeciesCounts({ "valley-grazer-updated": 12, "meadow-nibbler": 6, "ridge-hunter-updated": 4 }, 100);
  const second = populationBenchmarkSpeciesCounts({ "valley-grazer-updated": 12, "meadow-nibbler": 6, "ridge-hunter-updated": 4 }, 100);
  assert.deepEqual(first, second);
  assert.equal(first["valley-grazer-updated"], 60);
  assert.equal(first["meadow-nibbler"], 30);
  assert.equal(first["ridge-hunter-updated"], 10);
});
test("stage validation fails explicitly when requested, roster, and live populations differ", () => {
  const setup = populationBenchmarkSetup({ speciesCounts: { "valley-grazer-updated": 18, "ridge-hunter-updated": 4 } }, 50);
  assert.equal(validatePopulationBenchmarkStage(50, 50, setup).valid, true);
  const failed = validatePopulationBenchmarkStage(50, 22, setup);
  assert.equal(failed.valid, false);
  assert.match(failed.message, /requested 50.*created 22/);
});
test("combined report keeps verified requested and actual stage measurements separate", () => {
  const worldSetup = populationBenchmarkSetup({ speciesCounts: { "valley-grazer-updated": 18, "ridge-hunter-updated": 4 } }, 25);
  const validation = validatePopulationBenchmarkStage(25, 25, worldSetup);
  const report = populationSweepReport([{ metadata: { requestedPopulation: 25, population: 25, populationValidation: validation, worldSetup }, fps: {}, ticksPerSecond: {}, timings: {}, finalResources: {}, resourceRanges: {}, diagnosticHighlights: [], windows: 2, observedDurationMs: 1000 }], { seed: 7, requestedPopulations: [25] });
  assert.equal(report.benchmarkSchema, 4);
  assert.equal(report.benchmarkKind, "population-sweep");
  assert.deepEqual(report.requestedPopulations, [25]);
  assert.deepEqual(report.populations, [25]);
  assert.equal(report.valid, true);
  assert.equal(report.stages[0].requestedPopulation, 25);
  assert.equal(report.stages[0].actualPopulation, 25);
});
