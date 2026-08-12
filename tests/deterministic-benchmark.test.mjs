import test from "node:test";
import assert from "node:assert/strict";
import { deterministicChecksum, runDeterministicBenchmarkFixture, runDeterministicBenchmarkSuite } from "../src/deterministic-benchmark.js";

test("deterministic checksums ignore object and map insertion order", () => {
  const left = { z: 3, nested: { b: 2, a: 1 }, index: new Map([["two", 2], ["one", 1]]) };
  const right = { index: new Map([["one", 1], ["two", 2]]), nested: { a: 1, b: 2 }, z: 3 };
  assert.equal(deterministicChecksum(left), deterministicChecksum(right));
});

test("benchmark fixtures report deterministic semantics, timing budgets and bounded growth", async () => {
  let clockValue = 0;
  const report = await runDeterministicBenchmarkFixture({
    name: "bounded-fixture",
    maximumP95Ms: 10,
    setup: () => ({ entries: 0 }),
    run: (context) => { context.entries += 4; return { selected: "same", entries: context.entries }; },
    resources: (context) => ({ entries: context.entries }),
    maximumGrowth: { entries: 4 }
  }, { iterations: 3, warmup: 1, clock: () => ++clockValue });
  assert.equal(report.deterministic, true);
  assert.equal(report.timings.samples, 3);
  assert.deepEqual(report.timingBudget, { maximumP95Ms: 10, withinBudget: true });
  assert.equal(report.resourceGrowth.entries.maximum, 4);
});

test("benchmark suite preserves the governed fixture order", async () => {
  const reports = await runDeterministicBenchmarkSuite([
    { name: "first", run: () => 1 },
    { name: "second", run: () => 2 }
  ], { iterations: 1, warmup: 0, clock: () => 0 });
  assert.deepEqual(reports.map((report) => report.name), ["first", "second"]);
});

test("benchmark rejects semantic nondeterminism", async () => {
  let value = 0;
  await assert.rejects(
    runDeterministicBenchmarkFixture({ name: "unstable", run: () => ++value }, { iterations: 2, warmup: 0, clock: () => 0 }),
    /non-deterministic checksums/
  );
});

test("benchmark rejects resource growth above a fixture budget", async () => {
  await assert.rejects(
    runDeterministicBenchmarkFixture({
      name: "resource-leak",
      setup: () => ({ count: 0 }),
      run: (context) => { context.count = 5; return "stable"; },
      resources: (context) => ({ count: context.count }),
      maximumGrowth: { count: 4 }
    }, { iterations: 1, warmup: 0, clock: () => 0 }),
    /count grew by 5, above 4/
  );
});

test("benchmark rejects p95 latency above a fixture budget", async () => {
  const times = [0, 6];
  await assert.rejects(
    runDeterministicBenchmarkFixture({ name: "slow-fixture", maximumP95Ms: 5, run: () => "stable" }, { iterations: 1, warmup: 0, clock: () => times.shift() }),
    /p95 6\.000ms exceeded 5ms/
  );
});
