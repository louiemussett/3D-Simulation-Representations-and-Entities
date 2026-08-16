import test from "node:test";
import assert from "node:assert/strict";

import { ObservationTransactionRuntime } from "../src/documentary-author/runtime/observation-transaction.js";
import { PerformanceBudgetTracker } from "../src/documentary-author/runtime/performance-budget.js";
import { captureDocumentarySnapshot, documentaryEntity } from "../src/documentary-author/evidence/snapshot-adapter.js";
import { EvidenceLedger } from "../src/documentary-author/evidence/evidence-ledger.js";
import { BeliefStore } from "../src/documentary-author/beliefs/belief-store.js";
import { PropositionStore } from "../src/documentary-author/audience/proposition-store.js";
import { SituationManager } from "../src/documentary-author/situations/situation-manager.js";
import { ForecastLedger } from "../src/documentary-author-v3/forecast-ledger.js";
import { CharacterBiographyStore, StoryThreadManager } from "../src/documentary/story.js";
import { ACSSPredictiveAuthor } from "../src/documentary-author-v3/author.js";
import { AuthorLearningProfile } from "../src/documentary-author-v3/learning.js";
import { ReturnObligationQueue } from "../src/documentary-author/stories/return-obligation-queue.js";
import { canonicalJson } from "../src/documentary-author/runtime/immutable.js";

const simulation = (overrides = {}) => ({ seed: 4, tick: 1, documentaryRevision: 1, animals: [], corpses: [], cells: [], events: [], ...overrides });
const evidenceInput = (predicate, subjectIds, object, tick = 1) => ({ sourceKind: "ENTITY_STATE", predicate, subjectIds, object, observedAtTick: tick, validFromTick: tick, epistemicClass: "AUTHORITATIVE" });

test("observation transactions use an authoritative revision fast path", () => {
  let calls = 0;
  const runtime = new ObservationTransactionRuntime({ adapters: [{ id: "counting", observe() { calls += 1; return []; } }] });
  const source = simulation(), first = runtime.observe(source), second = runtime.observe(source);
  assert.strictEqual(second, first);
  assert.equal(calls, 1);
  source.tick = 2; source.documentaryRevision = 2;
  runtime.observe(source);
  assert.equal(calls, 2);
});

test("observation fast paths still rebuild scene routing when ordinary scenes change", () => {
  let calls = 0; const runtime = new ObservationTransactionRuntime({ adapters: [{ id: "counting", observe() { calls += 1; return []; } }] }), source = simulation();
  runtime.observe(source, { scenes: [{ id: "first", kind: "animal", ids: [] }] });
  runtime.observe(source, { scenes: [{ id: "second", kind: "animal", ids: [] }] });
  assert.equal(calls, 2);
});

test("snapshot projections reuse explicit revisions and expose identity indexes", () => {
  const animal = { id: "a", name: "A", revision: 1, health: 80, actionState: { key: "rest" } };
  assert.strictEqual(documentaryEntity(animal, 1), documentaryEntity(animal, 1));
  const first = documentaryEntity(animal, 1); animal.health = 70; animal.revision = 2;
  assert.notStrictEqual(documentaryEntity(animal, 1), first);
  const snapshot = captureDocumentarySnapshot(simulation({ animals: [animal], corpses: [{ id: "remains", sourceId: "dead-a", revision: 1 }] }));
  assert.equal(snapshot.entityByIdentityId.get("a").name, "A");
  assert.equal(snapshot.corpseByIdentityId.get("dead-a").id, "remains");
  assert.ok(snapshot.projectionFingerprints.entities);
});

test("snapshot fingerprints retain changes outside the compact planning fields", () => {
  const animal = { id: "a", name: "A", memories: [{ kind: "water", x: 1 }] }, source = simulation({ animals: [] });
  source.animals = [animal]; const first = captureDocumentarySnapshot(source);
  animal.memories = [{ kind: "water", x: 2 }]; const second = captureDocumentarySnapshot(source);
  assert.notEqual(second.snapshotId, first.snapshotId);
  source.hydrology = { runoff: .5 }; const third = captureDocumentarySnapshot(source);
  assert.notEqual(third.snapshotId, second.snapshotId);
});

test("evidence and belief snapshots are revision cached and indexed", () => {
  const evidence = new EvidenceLedger({ maximumHistory: 2 });
  assert.ok(Object.hasOwn(evidence, "history") && Array.isArray(evidence.history));
  evidence.begin(1).add(evidenceInput("entity.health", ["a"], { value: 80 })).add(evidenceInput("entity.health", ["b"], { value: 90 })).commit();
  assert.strictEqual(evidence.snapshot(), evidence.snapshot());
  assert.equal(evidence.match({ predicate: "entity.health", subjectIds: ["a"] }).length, 1);
  const delta = evidence.begin(2).add(evidenceInput("entity.health", ["a"], { value: 70 }, 2)).commit();
  assert.equal(evidence.history.length, 2);
  const beliefs = new BeliefStore({ maximumHistory: 2 }); beliefs.reviseEvidence(delta);
  assert.ok(Object.hasOwn(beliefs, "history") && Array.isArray(beliefs.history));
  assert.strictEqual(beliefs.snapshot(), beliefs.snapshot());
  assert.equal(beliefs.forSubject("a")[0].value.value, 70);
  assert.equal(beliefs.match({ predicate: "entity.health", epistemicClasses: ["AUTHORITATIVE"] }).length, 1);
});

test("ordinary evidence, belief, snapshot and health paths do not build canonical JSON", () => {
  let evidenceCanonicalizations = 0, beliefCanonicalizations = 0;
  const evidence = new EvidenceLedger({ canonicalizer: value => { evidenceCanonicalizations += 1; return canonicalJson(value); } });
  const beliefs = new BeliefStore({ canonicalizer: value => { beliefCanonicalizations += 1; return canonicalJson(value); } });
  const delta = evidence.begin(1).add(evidenceInput("entity.health", ["a"], { value: 80 })).commit();
  const beliefDelta = beliefs.reviseEvidence(delta);
  const runtime = new ObservationTransactionRuntime({ evidence, beliefs, adapters: [] });

  assert.equal(Object.hasOwn(delta, "canonical"), false);
  assert.equal(Object.hasOwn(beliefDelta.snapshot, "canonical"), false);
  assert.strictEqual(evidence.snapshot(), evidence.snapshot());
  assert.strictEqual(beliefs.snapshot(), beliefs.snapshot());
  assert.strictEqual(runtime.health(), runtime.health());
  assert.deepEqual({ evidenceCanonicalizations, beliefCanonicalizations }, { evidenceCanonicalizations: 0, beliefCanonicalizations: 0 });
});

test("explicit canonical snapshots are deterministic, revision cached and support evidence deltas", () => {
  let evidenceCanonicalizations = 0, beliefCanonicalizations = 0;
  const evidence = new EvidenceLedger({ canonicalizer: value => { evidenceCanonicalizations += 1; return canonicalJson(value); } });
  const beliefs = new BeliefStore({ canonicalizer: value => { beliefCanonicalizations += 1; return canonicalJson(value); } });
  const delta = evidence.begin(1).add(evidenceInput("entity.health", ["a"], { unit: "percent", value: 80 })).commit();
  beliefs.reviseEvidence(delta);

  const evidenceAudit = evidence.canonicalSnapshot(), beliefAudit = beliefs.canonicalSnapshot();
  assert.equal(evidenceAudit.canonical, canonicalJson(evidenceAudit.records));
  assert.equal(beliefAudit.canonical, canonicalJson(beliefAudit.records));
  assert.strictEqual(evidence.canonicalSnapshot(), evidenceAudit);
  assert.strictEqual(beliefs.canonicalSnapshot(), beliefAudit);
  assert.deepEqual({ evidenceCanonicalizations, beliefCanonicalizations }, { evidenceCanonicalizations: 1, beliefCanonicalizations: 1 });

  const deltaAudit = evidence.canonicalSnapshot(delta);
  assert.equal(deltaAudit.tick, 1);
  assert.equal(deltaAudit.canonical, canonicalJson(delta.records));
  assert.equal(evidenceCanonicalizations, 2);
  assert.equal(evidence.canonicalSnapshot(delta).canonical, deltaAudit.canonical);
});

test("belief snapshots remain stable and changedSince follows retained history", () => {
  const evidence = new EvidenceLedger({ maximumHistory: 2 }), beliefs = new BeliefStore({ maximumHistory: 2 });
  const firstDelta = evidence.begin(1).add(evidenceInput("entity.health", ["a"], { value: 80 })).commit(); beliefs.reviseEvidence(firstDelta);
  const firstSnapshot = beliefs.snapshot();
  const secondDelta = evidence.begin(2).add(evidenceInput("entity.health", ["a"], { value: 70 }, 2)).commit(); beliefs.reviseEvidence(secondDelta);
  const thirdDelta = evidence.begin(3).add(evidenceInput("entity.health", ["a"], { value: 60 }, 3)).commit(); beliefs.reviseEvidence(thirdDelta);
  assert.equal(firstSnapshot.get("entity.health", ["a"]).value.value, 80);
  assert.deepEqual(beliefs.changedSince(0).map(item => item.value.value), [70, 60]);
});

test("performance metric caches survive unrelated metric samples", () => {
  const tracker = new PerformanceBudgetTracker(); tracker.record("observationTransaction", 2);
  const observationMetric = tracker.metric("observationTransaction"); tracker.record("cameraPlanning", 1);
  assert.strictEqual(tracker.metric("observationTransaction"), observationMetric);
  assert.strictEqual(tracker.snapshot(), tracker.snapshot());
});

test("proposition snapshots and subject lookups reuse revision indexes", () => {
  const evidence = new EvidenceLedger(), beliefs = new BeliefStore(), propositions = new PropositionStore();
  const evidenceDelta = evidence.begin(1).add(evidenceInput("entity.health", ["a"], { value: 80 })).add(evidenceInput("entity.health", ["b"], { value: 90 })).commit();
  propositions.revise(beliefs.reviseEvidence(evidenceDelta));
  assert.strictEqual(propositions.snapshot(), propositions.snapshot());
  assert.equal(propositions.forSubjects(["a"]).length, 1);
  assert.equal(propositions.forSubjects(["missing"]).length, 0);
});

test("situations cache revision snapshots and resolve scene/subject indexes", () => {
  const animal = { id: "a", revision: 1, actionState: { key: "rest" }, needDependencyPlan: { methodId: "rest", phase: "recover" } };
  const snapshot = captureDocumentarySnapshot(simulation({ animals: [animal] })), manager = new SituationManager(), beliefs = { match: () => [], forSubject: () => [], get: () => null };
  const delta = manager.observe({ snapshot, beliefs, scenes: [{ id: "scene-a", kind: "animal", ids: ["a"] }] });
  assert.ok(delta.byScene.get("scene-a"));
  assert.equal(delta.snapshot.forSubject("a").length, 1);
  assert.strictEqual(manager.snapshot(), manager.snapshot());
});

test("forecast ledger maintains counters and direct open-production indexes", () => {
  const ledger = new ForecastLedger(), ensemble = { ensembleId: "e", forecasts: [{ ensembleId: "e", modelId: "production.hold-value.v1", family: "PRODUCTION", outcomes: [{ id: "HOLD", probability: .8 }], latestTick: 4 }] };
  const [forecast] = ledger.open(ensemble, {}, 1);
  assert.strictEqual(ledger.health(), ledger.health());
  assert.equal(ledger.health().open, 1);
  assert.equal(ledger.openProductionByKey.size, 1);
  ledger.resolve(forecast.forecastId, { status: "CENSORED", censorReason: "test" }, 2);
  assert.deepEqual({ open: ledger.health().open, censored: ledger.health().censored }, { open: 0, censored: 1 });
  assert.equal(ledger.openProductionByKey.size, 0);
});

test("production forecast buckets discard interior tombstones without scans", () => {
  const ledger = new ForecastLedger(), source = index => ({ ensembleId: "e", modelId: "production.hold-value.v1", family: "PRODUCTION", outcomes: [{ id: "HOLD", probability: .8 }], latestTick: 4 + index });
  const forecasts = ledger.open({ ensembleId: "e", forecasts: [source(0), source(1), source(2)] }, {}, 1);
  ledger.resolve(forecasts[0].forecastId, { status: "CENSORED" }, 2); ledger.resolve(forecasts[2].forecastId, { status: "CENSORED" }, 2);
  assert.equal(ledger.openProductionByKey.size, 1);
  ledger.resolve(forecasts[1].forecastId, { status: "CENSORED" }, 2);
  assert.equal(ledger.openProductionByKey.size, 0);
});

test("story indexes reuse rankings and provide bounded top-k results", () => {
  let sequence = 0, now = 10;
  const idFactory = { next: kind => `${kind}-${++sequence}` }, recorder = { time: () => now, write: () => null }, manager = new StoryThreadManager({ idFactory, recorder });
  const event = importance => ({ recordId: `event-${importance}`, recordingTimeMs: now++, evidence: [], payload: { type: `event_${importance}`, subjectIds: ["a"], importance } });
  manager.createFromEvent(event(.2)); manager.createFromEvent(event(.9));
  assert.equal(manager.forSubject("a").length, 2);
  assert.strictEqual(manager.rankedOnce(20), manager.rankedOnce(20));
  assert.equal(manager.topRanked(1, 20).length, 1);
  const biographies = new CharacterBiographyStore({ maximumSubjects: 1 }); biographies.observe({ id: "a" }, event(.1)); biographies.observe({ id: "b" }, event(.1));
  assert.equal(biographies.subjects.size, 1);
  for (let index = 0; index < 3000; index += 1) biographies.observe({ id: "b" }, event(.1));
  assert.ok(biographies.evictionQueue.length <= 1024);
});

test("return obligations evaluate only active thread entries", () => {
  const queue = new ReturnObligationQueue();
  const old = queue.create({ threadId: "old", situationId: "s", createdAtTick: 0 }); queue.invalidate(old.obligationId, 1, "test");
  const active = queue.create({ threadId: "active", situationId: "s", createdAtTick: 2 });
  assert.equal(queue.topEligible(2).obligationId, active.obligationId);
  assert.equal(queue.activeByThread.size, 1);
});

test("author health and diagnostics are cached until a documentary revision", () => {
  const profile = new AuthorLearningProfile(), author = new ACSSPredictiveAuthor({ profileStore: { load: () => profile, save: () => true, flush: async () => true } });
  // Use the fully constructed author, but avoid persistence side effects in this cache contract.
  assert.strictEqual(author.health(), author.health());
  assert.strictEqual(author.diagnostic(), author.diagnostic());
  const before = author.health(); author.writeTrace("test_revision", {}, 0);
  assert.notStrictEqual(author.health(), before);
  author.maximumTrace = 3; for (let index = 0; index < 2100; index += 1) author.writeTrace("bounded_trace", { index }, index);
  assert.ok(Object.hasOwn(author, "trace") && Array.isArray(author.trace));
  assert.equal(author.trace.length, 3);
  assert.ok(author.traceQueue.length < 1030);
});
