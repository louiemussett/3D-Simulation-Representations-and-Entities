import test from "node:test";
import assert from "node:assert/strict";
import { authoritativeHash, authoritativeSnapshot, DevelopmentProfiler, FixedRingBuffer, sampleSummary } from "../src/diagnostics.js";
import { createActionState } from "../src/action-state.js";

test("fixed ring buffer stays bounded and retains the newest samples", () => {
  const buffer = new FixedRingBuffer(3);
  [1, 2, 3, 4, 5].forEach((value) => buffer.push(value));
  assert.deepEqual(buffer.toArray(), [3, 4, 5]);
});

test("summary reports sample count, average, percentiles and maximum", () => {
  const summary = sampleSummary([1, 2, 3, 4, 100]);
  assert.deepEqual(summary, { samples: 5, averageMs: 22, p95Ms: 100, p99Ms: 100, maximumMs: 100 });
});

test("disabled profiler executes work without sampling", () => {
  const profiler = new DevelopmentProfiler({ clock: () => 10 });
  assert.equal(profiler.measure("DOM/UI", () => 42), 42);
  assert.equal(profiler.report().timings["DOM/UI"].samples, 0);
});

test("draining the profiler returns one disjoint window", () => {
  const profiler = new DevelopmentProfiler({ enabled: true, clock: (() => { let time = 0; return () => ++time; })() });
  profiler.measure("frame.total", () => 1); assert.equal(profiler.drain().timings["frame.total"].samples, 1); assert.equal(profiler.report().timings["frame.total"].samples, 0);
});

test("authoritative snapshot excludes presentation and wall-clock state", () => {
  const world = { seed: 1337, tick: 24, rngState: 99, animals: [{ id: "g-1", x: 2, currentAction: "display prose", actionState: createActionState("rest", { label: "sleeping visibly" }), visualMove: { started: 1234 } }], savedAt: "later", occupied: new Map([["2,3", "g-1"]]) };
  assert.deepEqual(authoritativeSnapshot(world), { animals: [{ actionState: { destination: null, direction: null, intendedOutcome: "Resting", key: "rest", moving: false, reason: null, target: null }, id: "g-1", x: 2 }], rngState: 99, seed: 1337, tick: 24 });
});

test("fixed seed/tick authoritative baselines are deterministic", () => {
  const tick24 = { seed: 1337, tick: 24, day: 2, rngState: 394287, births: 0, deaths: 0, animals: [{ id: "grazer-0", alive: true, energy: 91.2, hydration: 96.7, x: -4, z: 8, actionState: createActionState("graze", { label: "grazing short grass", intendedOutcome: "consume vegetation" }) }] };
  const tick240 = { seed: 7331, tick: 240, day: 11, rngState: 882104, births: 3, deaths: 2, animals: [{ id: "hunter-0", alive: true, energy: 63.5, hydration: 71.4, x: 12, z: -9, actionState: createActionState("chase", { label: "sprinting after prey", target: "grazer-4", intendedOutcome: "catch prey" }) }] };
  assert.equal(authoritativeHash(tick24), "a6e69b4424b9b147");
  assert.equal(authoritativeHash(tick240), "42173852ae01bc3e");
});
