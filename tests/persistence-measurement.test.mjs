import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { closeAllCachedIndexedDB, indexedDBConnectionMetrics, openCachedIndexedDB } from "../src/persistence.js";
import { canonicalJsonStringify, deferredJsonStringify, handleJsonSerializationRequest, JSON_SERIALIZATION_REQUEST, WorkerJsonSerializer } from "../src/deferred-serialization.js";
import { DEFAULT_PROFILER_SAMPLE_LIMIT, DevelopmentProfiler, FixedRingBuffer } from "../src/diagnostics.js";
import { ByteBudgetLRUCache, canvasPixelMetrics, presentationResourceMetrics } from "../src/texture-resource-cache.js";
import { runDeterministicBenchmarkFixture } from "../src/deterministic-benchmark.js";
import { laboratoryReferenceCacheMetrics, laboratoryReferenceHtml, resetLaboratoryReferenceCaches, searchLaboratoryReference } from "../src/laboratory-reference.js";

const fakeIndexedDB = () => {
  const databases = [], factory = {
    opens: 0,
    open(name, version) {
      this.opens += 1;
      const request = { result: null, transaction: { mode: "versionchange" }, error: null };
      queueMicrotask(() => {
        const db = { name, version: version ?? 1, closeCount: 0, close() { this.closeCount += 1; }, onversionchange: null };
        databases.push(db); request.result = db;
        request.onupgradeneeded?.({ oldVersion: 0, newVersion: db.version }); request.onsuccess?.();
      });
      return request;
    }
  };
  return { factory, databases };
};

test("IndexedDB opens are shared, measured and evicted on version change", async () => {
  const { factory, databases } = fakeIndexedDB(); let upgrades = 0;
  const firstPromise = openCachedIndexedDB("worlds", { version: 2, indexedDBFactory: factory, upgrade: () => { upgrades += 1; } });
  const secondPromise = openCachedIndexedDB("worlds", { version: 2, indexedDBFactory: factory });
  assert.equal(firstPromise, secondPromise);
  const [first, second] = await Promise.all([firstPromise, secondPromise]);
  assert.equal(first, second); assert.equal(factory.opens, 1); assert.equal(upgrades, 1);
  assert.deepEqual(indexedDBConnectionMetrics(factory), { openRequests: 1, cacheHits: 1, failures: 0, closes: 0, cachedConnections: 1 });
  first.onversionchange({ oldVersion: 2, newVersion: 3 });
  assert.equal(first.closeCount, 1); assert.equal(indexedDBConnectionMetrics(factory).cachedConnections, 0);
  await openCachedIndexedDB("worlds", { version: 2, indexedDBFactory: factory });
  assert.equal(factory.opens, 2); assert.equal(await closeAllCachedIndexedDB(factory), 1);
  assert.equal(databases.at(-1).closeCount, 1);
});

test("failed IndexedDB opens are not retained", async () => {
  const factory = { opens: 0, open() { this.opens += 1; const request = {}; queueMicrotask(() => { request.error = new Error("blocked"); request.onerror?.(); }); return request; } };
  await assert.rejects(openCachedIndexedDB("broken", { indexedDBFactory: factory }), /blocked/);
  await assert.rejects(openCachedIndexedDB("broken", { indexedDBFactory: factory }), /blocked/);
  assert.equal(factory.opens, 2); assert.equal(indexedDBConnectionMetrics(factory).cachedConnections, 0);
});

test("deferred and worker JSON paths preserve canonical JSON.stringify output", async () => {
  const value = { z: 1, date: new Date("2020-01-02T03:04:05Z"), nested: [1, undefined, { a: true }], omitted: undefined };
  const expected = JSON.stringify(value, null, 2); let deferred = false;
  assert.equal(canonicalJsonStringify(value, { space: 2 }), expected);
  assert.equal(await deferredJsonStringify(value, { space: 2, defer: (work) => { deferred = true; return work(); } }), expected);
  assert.equal(deferred, true);
  const handled = handleJsonSerializationRequest({ type: JSON_SERIALIZATION_REQUEST, requestId: "1", value, space: 2 });
  assert.equal(handled.json, expected); assert.equal(handled.ok, true);

  const listeners = new Set();
  const worker = {
    addEventListener(type, listener) { if (type === "message") listeners.add(listener); },
    removeEventListener(type, listener) { if (type === "message") listeners.delete(listener); },
    postMessage(message) { const response = handleJsonSerializationRequest(message); queueMicrotask(() => { for (const listener of listeners) listener({ data: response }); }); }
  };
  const serializer = new WorkerJsonSerializer(worker);
  assert.equal(await serializer.stringify(value, { space: 2 }), expected);
  serializer.dispose(); assert.equal(listeners.size, 0);
});

test("extended profiler rings retain newest samples when resized", () => {
  assert.equal(DEFAULT_PROFILER_SAMPLE_LIMIT, 600);
  const ring = new FixedRingBuffer(3); [1, 2, 3].forEach((value) => ring.push(value));
  assert.equal(ring.resize(2), 2); assert.deepEqual(ring.toArray(), [2, 3]);
  assert.equal(ring.resize(4), 4); ring.push(4); assert.deepEqual(ring.toArray(), [2, 3, 4]);
  const profiler = new DevelopmentProfiler({ enabled: true, categories: ["tick"], sampleLimit: 3 });
  [1, 2, 3].forEach((value) => profiler.record("tick", value)); profiler.resizeSampleLimit(2);
  assert.equal(profiler.report().timings.tick.samples, 2);
});

test("presentation resource diagnostics report texture bytes and backing canvas pixels", () => {
  const cache = new ByteBudgetLRUCache({ maxBytes: 4096, sizeOf: (value) => value.bytes, dispose: () => {} });
  cache.set("a", { bytes: 1024 }); cache.set("b", { bytes: 2048 });
  const canvas = { width: 400, height: 200, clientWidth: 200, clientHeight: 100 };
  assert.deepEqual(canvasPixelMetrics(canvas), { width: 400, height: 200, cssWidth: 200, cssHeight: 100, pixels: 80000, estimatedBytes: 320000, pixelRatioX: 2, pixelRatioY: 2 });
  assert.deepEqual(presentationResourceMetrics({ textureCaches: [cache, cache], canvases: [canvas, canvas] }), { textureCaches: 1, textureEntries: 2, textureBytes: 3072, textureBudgetBytes: 4096, canvases: 1, canvasPixels: 80000, canvasEstimatedBytes: 320000, estimatedPresentationBytes: 323072 });
});

test("deterministic benchmark fixtures validate checksums and bounded growth", async () => {
  let time = 0;
  const report = await runDeterministicBenchmarkFixture({
    name: "fixture", setup: () => ({ entries: 0 }),
    run: (context) => { context.entries = 2; return { answer: 42 }; },
    resources: (context) => ({ entries: context.entries }), maximumGrowth: { entries: 2 }
  }, { iterations: 3, warmup: 1, clock: () => ++time });
  assert.equal(report.deterministic, true); assert.equal(report.iterations, 3); assert.equal(report.timings.samples, 3); assert.equal(report.resourceGrowth.entries.maximum, 2);
  let sequence = 0;
  await assert.rejects(runDeterministicBenchmarkFixture({ name: "unstable", run: () => ({ value: sequence++ }) }, { iterations: 2, warmup: 0, clock: () => ++time }), /non-deterministic/);
  let teardowns = 0;
  await assert.rejects(runDeterministicBenchmarkFixture({ name: "failed", run: () => { throw new Error("fixture failed"); }, teardown: () => { teardowns += 1; } }, { iterations: 1, warmup: 0, clock: () => ++time }), /fixture failed/);
  assert.equal(teardowns, 1);
});

test("Reference cold-open cache metrics and benchmark scenarios are explicit", async () => {
  resetLaboratoryReferenceCaches();
  const html = laboratoryReferenceHtml(); searchLaboratoryReference("water"); laboratoryReferenceHtml();
  const metrics = laboratoryReferenceCacheMetrics();
  assert.ok(html.length > 1000); assert.deepEqual([metrics.htmlBuilds, metrics.htmlHits, metrics.searchIndexBuilds], [1, 1, 1]);
  const script = await readFile(new URL("../scripts/performance-regression-benchmark.mjs", import.meta.url), "utf8");
  for (const name of ["full-tick:LEGACY", "PREDICTIVE_SHADOW", "PREDICTIVE_ACTIVE", "camera-admission-layout", "laboratory-reference-first-open", "cinema-tick", "bounded-heap-cache-growth"]) assert.match(script, new RegExp(name));
});
