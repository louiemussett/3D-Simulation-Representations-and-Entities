import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { CommitmentIntegrityBenchmark, classifyCommitmentTransition, commitmentBenchmarkSnapshot, commitmentNeedId } from "../src/commitment-integrity-benchmark.js";

test("commitment benchmark classifies biological needs independently from drive wording", () => {
  assert.equal(commitmentNeedId("hunger"), "nutrition"); assert.equal(commitmentNeedId("scavenge"), "nutrition"); assert.equal(commitmentNeedId("flee predator"), "safety");
});

test("phase and action changes remain distinct from true need switches", () => {
  const base = { tick: 1, animalId: "a", priority: "water", needId: "hydration", satisfierId: "surface-water", methodId: "drink", targetKey: "lake", phase: "travel", actionKey: "travel", destinationKey: "1,1", commitmentId: "c1", minimumReviewTick: 8, switchCount: 0, suspended: false };
  const events = classifyCommitmentTransition(base, { ...base, tick: 2, phase: "contact", actionKey: "orient" });
  assert.deepEqual(events.map(event => event.kind), ["phase-change", "action-change"]);
});

test("benchmark flags identity resets and destination churn under a stable plan", () => {
  const base = { tick: 1, animalId: "a", priority: "hunger", needId: "nutrition", satisfierId: "graze", methodId: "graze-local", targetKey: "cell-1", phase: "travel", actionKey: "travel", destinationKey: "1,1", commitmentId: "c1", minimumReviewTick: 8, switchCount: 0, suspended: false };
  const events = classifyCommitmentTransition(base, { ...base, tick: 2, priority: "build food reserves", destinationKey: "2,2", commitmentId: "c2", switchCount: 1 });
  const kinds = events.map(event => event.kind); assert.ok(kinds.includes("anomaly:wording-or-action-priority-switch")); assert.ok(kinds.includes("anomaly:commitment-id-reset")); assert.ok(kinds.includes("anomaly:destination-churn-under-stable-target"));
});

test("target changes are execution events and cannot justify commitment resets", () => {
  const base = { tick: 1, animalId: "a", priority: "water", needId: "hydration", satisfierId: "surface-water", methodId: "drink", targetKey: "region-west", commitmentId: "c1", switchCount: 0, suspended: false };
  const events = classifyCommitmentTransition(base, { ...base, tick: 2, targetKey: "shoreline-42", commitmentId: "c2", switchCount: 1, targetChangeReason: "confirmed shoreline" });
  const kinds = events.map(event => event.kind);
  assert.ok(kinds.includes("target-change"));
  assert.ok(kinds.includes("anomaly:commitment-id-reset"));
  assert.ok(kinds.includes("anomaly:switch-counted-without-commitment-change"));
});

test("population benchmark produces bounded classified report", () => {
  const animal = { id: "a", alive: true, drive: "water", priorities: [{ drive: "water", score: 100 }], commitmentState: { priority: "water", commitmentId: "c1", switches: 0 }, needDependencyPlan: { needId: "hydration", satisfierId: "surface-water", methodId: "drink", targetKey: "lake", phase: "travel" }, actionState: { key: "travel" } };
  const benchmark = new CommitmentIntegrityBenchmark().start({ tick: 10, targetTicks: 2, metadata: { seed: 42, initialAuthoritativeHash: "before" } }); benchmark.sample([animal], 10); animal.needDependencyPlan.phase = "contact"; benchmark.sample([animal], 11); benchmark.sample([animal], 12);
  const report = benchmark.report(); assert.equal(report.benchmarkKind, "commitment-integrity"); assert.equal(report.animalsObserved, 1); assert.equal(report.counts["phase-change"], 1); assert.ok(report.recentEvents.length <= 200); assert.equal(commitmentBenchmarkSnapshot(animal, 12).urgency, null);
  assert.equal(report.benchmarkSchema, 3); assert.equal(report.metadata.seed, 42); assert.equal(report.metadata.initialAuthoritativeHash, "before");
  assert.equal(report.coverageByNeed.hydration.observations, 3); assert.equal(report.coverageByNeed.hydration.satisfier, 3); assert.equal(report.finalStates[0].candidateScore, 100);
});

test("Laboratory debugging exposes and samples the commitment investigation benchmark", async () => {
  const [html, app] = await Promise.all([readFile(new URL("../index.html", import.meta.url), "utf8"), readFile(new URL("../src/app.js", import.meta.url), "utf8")]);
  for (const id of ["commitment-benchmark", "commitment-benchmark-scope", "commitment-benchmark-duration", "commitment-benchmark-start", "commitment-benchmark-copy", "commitment-benchmark-live", "commitment-benchmark-report"]) assert.match(html, new RegExp(`id=["']${id}["']`));
  assert.match(app, /sampleCommitmentIntegrityBenchmark\(\)/); assert.match(app, /benchmarkKind:\s*["']commitment-integrity["']|CommitmentIntegrityBenchmark/);
});

test("proximity diagnostics flag flight bands without an escape response", () => {
  const previous = commitmentBenchmarkSnapshot({ id: "a", alive: true, drive: "water", actionState: { key: "travel" }, primaryProximityRelationship: { targetKey: "entity:wolf", band: "withdrawal", estimatedDistance: 4, releaseThreshold: 6 } }, 10);
  const current = commitmentBenchmarkSnapshot({ id: "a", alive: true, drive: "water", actionState: { key: "travel" }, primaryProximityRelationship: { targetKey: "entity:wolf", band: "flight", estimatedDistance: 2, releaseThreshold: 5 } }, 11);
  const events = classifyCommitmentTransition(previous, current);
  assert.ok(events.some(event => event.kind === "relationship-band-change"));
  assert.ok(events.some(event => event.kind === "anomaly:flight-band-action-contradiction"));
});

test("defence bands accept defensive actions and do not masquerade as repeated flight failures", () => {
  const base = { tick: 10, animalId: "a", priority: "water", needId: "hydration", actionKey: "travel", relationshipBand: "vigilance", switchCount: 0, suspended: false };
  const defended = classifyCommitmentTransition(base, { ...base, tick: 11, priority: "defend intruder", needId: "safety", actionKey: "defend", relationshipBand: "defence" });
  assert.equal(defended.some(event => event.kind.includes("flight-failed")), false);
  assert.equal(defended.some(event => event.kind.includes("defence-band-without")), false);
  const unchanged = classifyCommitmentTransition({ ...base, tick: 11, relationshipBand: "defence" }, { ...base, tick: 12, relationshipBand: "defence" });
  assert.equal(unchanged.some(event => event.kind.includes("defence-band-without")), false);
});

test("higher precedence interruptions are distinguished from minimum-hold defects", () => {
  const base = { tick: 2, animalId: "a", priority: "water", needId: "hydration", satisfierId: "surface-water", methodId: "drink", targetKey: "lake", commitmentId: "c1", minimumReviewTick: 12, precedenceClass: "ordinary", switchCount: 0, suspended: false };
  const current = { ...base, tick: 3, priority: "flee", needId: "safety", satisfierId: "create-distance", methodId: "flee-perceived-threat", targetKey: "wolf", commitmentId: "c2", precedenceClass: "immediate-lethal", switchCount: 1, switchReason: "challenger has higher immediate-lethal precedence" };
  const kinds = classifyCommitmentTransition(base, current).map(event => event.kind);
  assert.ok(kinds.includes("permitted-early-interruption"));
  assert.equal(kinds.includes("anomaly:switch-during-minimum-hold"), false);
});

test("runtime candidates type fear as safety and promote executed water searches", async () => {
  const app = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
  assert.match(app, /drive: "fear", needId: "safety", satisfierId: "create-distance", methodId: "flee-perceived-threat"/);
  assert.match(app, /water-search-region:/);
  assert.match(app, /stable water search region retained from the executed search route/);
  assert.match(app, /physical caregiver contact is restored or dependency ends/);
  assert.match(app, /const proximityNeed = relationshipCrisis \? "safety"/);
});
