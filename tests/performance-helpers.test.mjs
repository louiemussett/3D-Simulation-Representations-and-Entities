import test from "node:test";
import assert from "node:assert/strict";
import {
  DOCUMENTATION_PREVIEW_QUALITY_CAP,
  documentationPreviewQuality,
  normalizeGraphicsSettings
} from "../src/graphics-settings.js";
import {
  ByteBudgetLRUCache,
  disposeTextureResource,
  estimateTextureBytes
} from "../src/texture-resource-cache.js";
import {
  cacheDiagnosticsMetrics,
  DevelopmentProfiler,
  DiagnosticsMetrics,
  FixedRingBuffer
} from "../src/diagnostics.js";
import {
  entityConstellationLayoutMetrics,
  resetEntityConstellationLayoutMetrics,
  resolveEntityConstellations,
  selectEntityConstellationBudget,
  setEntityConstellationLayoutMetricsEnabled
} from "../src/entity-constellation-layout.js";
import {
  laboratoryReferenceHtml,
  laboratoryReferenceSearchIndex,
  laboratoryReferenceSection,
  searchLaboratoryReference
} from "../src/laboratory-reference.js";

test("documentation previews cap quality independently of world icon textures", () => {
  assert.equal(DOCUMENTATION_PREVIEW_QUALITY_CAP, 2);
  assert.equal(documentationPreviewQuality(1), 1);
  assert.equal(documentationPreviewQuality(8), 2);
  const ultra = normalizeGraphicsSettings({ preset: "ultra" });
  assert.equal(ultra.iconTextureQuality, 8);
  assert.equal(ultra.documentationPreviewQuality, 2);
});

test("texture byte estimates cover DOM images, explicit bytes and mipmaps", () => {
  assert.equal(estimateTextureBytes({ image: { width: 10, height: 10 }, generateMipmaps: false }), 400);
  assert.equal(estimateTextureBytes({ image: { width: 10, height: 10 } }), 534);
  assert.equal(estimateTextureBytes({ userData: { estimatedBytes: 1234 }, image: { width: 1, height: 1 } }), 1234);
});

test("byte-budgeted LRU touches on read and disposes every removed resource", () => {
  const disposed = [];
  const cache = new ByteBudgetLRUCache({ maxBytes: 12, sizeOf: (value) => value.bytes, dispose: (value, key, reason) => disposed.push([value.id, key, reason]) });
  assert.equal(cache.set("a", { id: "A", bytes: 6 }), true);
  assert.equal(cache.set("b", { id: "B", bytes: 4 }), true);
  assert.equal(cache.get("a").id, "A");
  assert.equal(cache.set("c", { id: "C", bytes: 4 }), true);
  assert.equal(cache.has("a"), true);
  assert.equal(cache.has("b"), false);
  assert.deepEqual(disposed, [["B", "b", "evict"]]);
  assert.equal(cache.get("missing"), undefined);
  assert.equal(cache.set("huge", { id: "H", bytes: 20 }), false);
  assert.deepEqual(disposed.at(-1), ["H", "huge", "oversize"]);
  assert.deepEqual(cache.metrics(), { entries: 2, bytes: 10, budgetBytes: 12, utilization: 10 / 12, hits: 1, misses: 1, hitRate: .5, evictions: 1, disposals: 2 });
  cache.clear();
  assert.equal(cache.size, 0);
  assert.equal(disposed.length, 4);
});

test("leased LRU entries survive pressure and trim immediately after release", () => {
  const disposed = [];
  const cache = new ByteBudgetLRUCache({ maxBytes: 10, sizeOf: (value) => value.bytes, dispose: (value, key, reason) => disposed.push([value.id, key, reason]) });
  cache.set("a", { id: "A", bytes: 6 });
  cache.set("b", { id: "B", bytes: 4 });
  const lease = cache.acquire("a");
  assert.equal(lease.value.id, "A");
  assert.equal(lease.released, false);
  cache.resize(4);
  assert.equal(cache.has("a"), true);
  assert.equal(cache.has("b"), false);
  assert.deepEqual(disposed, [["B", "b", "evict"]]);
  assert.deepEqual(cache.leaseMetrics(), { activeLeases: 1, leasedEntries: 1, pendingDisposals: 0, pendingBytes: 0 });
  assert.equal(lease.release(), true);
  assert.equal(lease.released, true);
  assert.equal(cache.has("a"), false);
  assert.deepEqual(disposed, [["B", "b", "evict"], ["A", "a", "evict"]]);
  assert.equal(lease.release(), false);
  assert.deepEqual(cache.leaseMetrics(), { activeLeases: 0, leasedEntries: 0, pendingDisposals: 0, pendingBytes: 0 });
});

test("deleting or replacing a leased entry defers one disposal until its last release", () => {
  const disposed = [];
  const cache = new ByteBudgetLRUCache({ maxBytes: 20, sizeOf: (value) => value.bytes, dispose: (value, key, reason) => disposed.push([value.id, key, reason]) });
  const original = { id: "original", bytes: 4 };
  cache.set("icon", original);
  const first = cache.acquire("icon"), second = cache.acquire("icon");
  assert.equal(cache.set("icon", { id: "replacement", bytes: 5 }), true);
  assert.deepEqual(disposed, []);
  assert.deepEqual(cache.leaseMetrics(), { activeLeases: 2, leasedEntries: 1, pendingDisposals: 1, pendingBytes: 4 });
  assert.equal(cache.release(first), true);
  assert.deepEqual(disposed, []);
  assert.equal(cache.release(second), true);
  assert.deepEqual(disposed, [["original", "icon", "replace"]]);
  assert.equal(cache.delete("icon"), true);
  assert.deepEqual(disposed, [["original", "icon", "replace"], ["replacement", "icon", "delete"]]);
});

test("texture lifecycle disposal de-duplicates shared texture references", () => {
  let textureDisposals = 0, materialDisposals = 0, closes = 0;
  const texture = { image: { close: () => { closes += 1; } }, dispose: () => { textureDisposals += 1; } };
  const material = { map: texture, alphaMap: texture, dispose: () => { materialDisposals += 1; } };
  assert.equal(disposeTextureResource(material), 3);
  assert.deepEqual([textureDisposals, materialDisposals, closes], [1, 1, 1]);
});

test("ring buffers, custom profilers and diagnostic metric registries remain bounded", () => {
  const ring = new FixedRingBuffer(2);
  ring.push(1); ring.push(2); ring.push(3);
  assert.deepEqual([ring.size, ring.capacity, ring.latest(), ring.toArray()], [2, 2, 3, [2, 3]]);
  const profiler = new DevelopmentProfiler({ enabled: true, categories: ["layout"], dynamicCategories: true, sampleLimit: 2, clock: (() => { let now = 0; return () => ++now; })() });
  profiler.measure("layout", () => 1);
  assert.equal(profiler.record("cache", 4), true);
  assert.equal(profiler.report().timings.cache.samples, 1);
  const metrics = new DiagnosticsMetrics({ historyLimit: 2 });
  metrics.increment("evictions", 2); metrics.gauge("bytes", 12); metrics.sample("layout.ms", 1); metrics.sample("layout.ms", 2); metrics.sample("layout.ms", 9);
  const snapshot = metrics.snapshot();
  assert.deepEqual(snapshot.counters, { evictions: 2 });
  assert.deepEqual(snapshot.gauges, { bytes: 12 });
  assert.deepEqual(snapshot.histories["layout.ms"], { samples: 2, averageMs: 5.5, p95Ms: 9, p99Ms: 9, maximumMs: 9 });
  assert.deepEqual(cacheDiagnosticsMetrics({ size: 2, totalBytes: 8, maxBytes: 16, hits: 3, misses: 1 }), { entries: 2, bytes: 8, budgetBytes: 16, utilization: .5, hits: 3, misses: 1, hitRate: .75, evictions: 0, disposals: 0 });
});

test("constellation layout reuses frozen profiles and indexed ID lookups without changing output", () => {
  const profile = Object.freeze({ detailLevel: "panel", panelWidthPx: 314, panelHeightPx: 82, slots: Object.freeze({ panel: Object.freeze({ x: 0, y: 0 }) }) });
  const items = [
    { entityId: "a", screenX: 100, screenY: 100, selected: true, interactionIds: ["b"], layoutProfile: profile },
    { entityId: "b", screenX: 120, screenY: 110, interactionIds: ["a"], layoutProfile: profile }
  ];
  resetEntityConstellationLayoutMetrics(); setEntityConstellationLayoutMetricsEnabled(true);
  const first = resolveEntityConstellations(items), second = resolveEntityConstellations(items);
  selectEntityConstellationBudget(items, { viewportBounds: { left: 0, top: 0, right: 400, bottom: 300 } });
  const metrics = entityConstellationLayoutMetrics();
  setEntityConstellationLayoutMetricsEnabled(false);
  assert.deepEqual(second, first);
  assert.equal(metrics.profileCacheMisses, 1);
  assert.ok(metrics.profileCacheHits >= 3);
  assert.equal(metrics.budgetIdLookups, 2);
  assert.ok(metrics.relationIdLookups > 0);
});

test("reference search index is lazy, full-text aware and supports static subsets", () => {
  assert.equal(laboratoryReferenceSearchIndex(), laboratoryReferenceSearchIndex());
  assert.equal(searchLaboratoryReference("hydration")[0].id, "hydration");
  assert.ok(searchLaboratoryReference("replenish muscle pool").some((result) => result.id === "interpretation-examples"));
  assert.equal(laboratoryReferenceSection("performance-fuels")?.id, "performance-fuels");
  assert.equal(laboratoryReferenceSection("missing"), null);
  const subset = laboratoryReferenceHtml({ sectionIds: ["hydration"] });
  assert.match(subset, /reference-hydration/);
  assert.doesNotMatch(subset, /reference-performance-fuels/);
  assert.equal(laboratoryReferenceHtml(), laboratoryReferenceHtml());
});
