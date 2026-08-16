import { performance } from "node:perf_hooks";
import { runDeterministicBenchmarkSuite } from "../src/deterministic-benchmark.js";
import { adjustCandidatesWithPredictions, runPredictiveCognition } from "../src/predictive-cognition.js";
import { runStableAnimalPhases } from "../src/simulation-phases.js";
import { resolveEntityConstellations, selectEntityConstellationBudget, suppressOverlappingEntityConstellations } from "../src/entity-constellation-layout.js";
import { laboratoryReferenceCacheMetrics, laboratoryReferenceHtml, resetLaboratoryReferenceCaches, searchLaboratoryReference } from "../src/laboratory-reference.js";
import { visualLanguagePopulationSnapshot } from "../src/visual-language-laboratory.js";
import { ByteBudgetLRUCache, presentationResourceMetrics } from "../src/texture-resource-cache.js";
import { DocumentaryClock } from "../src/documentary/core.js";
import { DocumentarySystem } from "../src/documentary/system.js";

const requestedIterations = Math.max(1, Number(process.argv.find((value) => value.startsWith("--iterations="))?.split("=")[1]) || 20);
const BENCHMARK_SCENARIO_NAMES = Object.freeze([
  "full-tick:LEGACY", "full-tick:PREDICTIVE_SHADOW", "full-tick:PREDICTIVE_ACTIVE",
  "camera-admission-layout", "laboratory-reference-first-open", "cinema-tick", "bounded-heap-cache-growth"
]);

const animalFixture = (index) => ({
  id: `animal-${index}`, decisionOrder: index, alive: true, hydration: 38 + index % 9, fatigue: 72 + index % 15, energy: 46 + index % 12, fear: 35,
  sensoryBuffer: [{ evidenceId: `seen:${index}`, channel: "sight", type: "predator", targetId: `predator-${index % 3}`, x: 5 + index % 4, z: 7, confidence: .9 }],
  memories: [{ channel: "memory", type: "water", x: 12, z: 2, age: 4, confidence: .8 }], mediumTermMemory: []
});

const fullTickFixture = (mode) => ({
  name: `full-tick:${mode}`,
  maximumP95Ms: 750,
  setup: () => ({ animals: Array.from({ length: 24 }, (_, index) => animalFixture(index)), cycles: [], phaseCounts: Object.create(null) }),
  run: (context) => {
    const candidates = [{ drive: "seek water", score: 40 }, { drive: "move to safety", score: 35 }, { drive: "rest", score: 12 }];
    const counted = (name, update = null) => (animal) => { context.phaseCounts[name] = (context.phaseCounts[name] || 0) + 1; update?.(animal); };
    for (let step = 0; step < 8; step += 1) runStableAnimalPhases({
      animals: context.animals,
      preSense: counted("preSense", animal => { animal.sensoryBuffer[0].confidence = .9 - step * .01; }),
      prepareOutwardSignals: counted("prepareOutwardSignals"),
      buildSnapshot: counted("buildSnapshot", animal => { animal.evidenceSnapshotTick = 120 + step; }),
      sense: counted("sense", animal => { animal.fear = Math.min(100, animal.fear + .1); }),
      interpretSignals: counted("interpretSignals"),
      act: counted("act", (animal) => {
        const cycle = runPredictiveCognition(animal, { tick: 120 + step, mode, profile: mode === "LEGACY" ? "LEGACY" : "FIXED", automatic: false });
        const adjusted = adjustCandidatesWithPredictions(candidates, cycle), authoritative = mode === "PREDICTIVE_ACTIVE" ? adjusted[0] : candidates[0];
        animal.lastDrive = authoritative.drive;
        context.cycles.push({ mode: cycle.mode, predictions: cycle.predictions.length, admitted: cycle.admitted?.length || 0, top: authoritative.drive });
      }),
      postAction: counted("postAction", animal => { animal.energy -= .01; }),
      afterActions: () => { context.phaseCounts.afterActions = (context.phaseCounts.afterActions || 0) + 1; }
    });
    return { cycles: context.cycles, phaseCounts: context.phaseCounts, final: context.animals.map(({ id, energy, fear, lastDrive }) => ({ id, energy, fear, lastDrive })) };
  },
  semanticResult: (result) => result
});

const cameraFixture = {
  name: "camera-admission-layout",
  maximumP95Ms: 300,
  setup: () => ({
    viewport: { left: 0, top: 0, right: 1280, bottom: 720 },
    items: Array.from({ length: 28 }, (_, index) => ({ entityId: `entity-${String(index).padStart(2, "0")}`, screenX: 160 + index % 7 * 150, screenY: 100 + Math.floor(index / 7) * 145, projectedBodyPx: 36, selected: index === 10, hovered: index === 11, interactionIds: index % 2 ? [`entity-${String(index - 1).padStart(2, "0")}`] : [] }))
  }),
  run: ({ viewport, items }) => {
    let previousVisibleIds = new Set(), admittedTotal = 0, suppressedTotal = 0, final = null;
    for (let frame = 0; frame < 48; frame += 1) {
      const angle = frame * Math.PI / 24;
      const projected = items.map((item, index) => ({
        ...item,
        screenX: item.screenX + Math.cos(angle + index * .27) * 72,
        screenY: item.screenY + Math.sin(angle + index * .19) * 48,
        selected: frame % 16 < 8 && index === 10,
        hovered: frame % 12 < 4 && index === 11,
        panelScale: .72 + (frame % 9) * .025,
        visibleChannels: index === 10 ? ["identity", "expression", "signal", "thought", "prediction"] : ["identity", "expression", frame % 3 ? "signal" : "action"]
      }));
      const budget = selectEntityConstellationBudget(projected, { viewportBounds: viewport, maximumPanels: 6, previousVisibleIds });
      const admitted = new Set(budget.visibleEntityIds);
      const layouts = resolveEntityConstellations(projected.filter((item) => admitted.has(item.entityId)), { viewportBounds: viewport, panelWidthPx: 314, panelHeightPx: 82 });
      const visibility = suppressOverlappingEntityConstellations(layouts, { viewportBounds: viewport, previousVisibleIds });
      previousVisibleIds = new Set(visibility.visibleEntityIds); admittedTotal += budget.admittedCount; suppressedTotal += visibility.suppressedCount;
      final = { budget: budget.visibleEntityIds, visible: visibility.visibleEntityIds, suppressed: visibility.suppressedEntityIds };
    }
    return { frames: 48, admittedTotal, suppressedTotal, final };
  }
};

const referenceFixture = {
  name: "laboratory-reference-first-open",
  maximumP95Ms: 500,
  setup: () => { resetLaboratoryReferenceCaches(); return { animals: Array.from({ length: 64 }, (_, index) => ({ ...animalFixture(index), speciesId: index % 5 ? "grazer" : "hunter", lifeStage: index % 4 ? "adult" : "juvenile", health: 100 })) }; },
  run: ({ animals }) => {
    const population = visualLanguagePopulationSnapshot(animals, 120);
    const html = laboratoryReferenceHtml(), search = searchLaboratoryReference("predictive water").map((entry) => entry.id);
    // The second read is part of the gate: opening Reference again must use the
    // immutable cache rather than rebuilding its largest string.
    const cachedHtml = laboratoryReferenceHtml();
    return { htmlLength: html.length, cacheIdentity: html === cachedHtml, search, population: { living: population.population, expressionTypes: population.activeExpressionTypes, emitters: population.activePublicEmitters } };
  },
  resources: () => laboratoryReferenceCacheMetrics(),
  maximumGrowth: { htmlBuilds: 1, searchIndexBuilds: 1 }
};

const cinemaFixture = {
  name: "cinema-tick",
  maximumP95Ms: 300,
  setup: async () => {
    const sim = { seed: 42, tick: 120, ecologicalMinute: 120, day: 1, animals: Array.from({ length: 12 }, (_, index) => ({ id: `subject-${index}`, speciesId: index % 3 ? "grazer" : "hunter", alive: true })) };
    const system = new DocumentarySystem({ simulation: () => sim, authorMode: "LEGACY", timelineMaximum: 64 });
    let now = 0; system.clock = new DocumentaryClock(() => now);
    await system.start({ recordingMode: "metadata" });
    for (let index = 0; index < 12; index += 1) system.observe(index % 2 ? "feeding" : "threat-response", {
      subjectIds: [`subject-${index}`], importance: .25 + index * .055, novelty: .3 + index * .04,
      visualClarity: .45 + index * .03, productionFeasibility: .8 - index * .02,
      facts: [{ claim: `Subject ${index} has an observable event`, level: "DIRECT" }], metadata: { correlationKey: `candidate-${index}` }
    });
    return { system, advance: () => { now += 1000; } };
  },
  run: ({ system, advance }) => {
    advance(); const first = system.tick();
    advance(); const retained = system.tick();
    const selectedRank = first?.alternatives?.findIndex((candidate) => candidate.threadId === first.threadId) ?? -1;
    return { status: first?.status || null, reason: first?.reason || null, selectedRank, continuity: Boolean(first?.threadId && first.threadId === retained?.threadId), candidates: first?.alternatives?.length || 0, threads: system.health().threads, records: system.timeline.records.length };
  },
  // Session/thread IDs contain an intentionally unique wall-clock prefix.
  // Rank and continuity are the deterministic editorial semantics under test.
  semanticResult: ({ status, reason, selectedRank, continuity, candidates, threads }) => ({ status, reason, selectedRank, continuity, candidates, threads }),
  teardown: ({ system }) => { system.stop("benchmark"); system.client.close(); }
};

const growthFixture = {
  name: "bounded-heap-cache-growth",
  maximumP95Ms: 250,
  setup: () => ({
    cache: new ByteBudgetLRUCache({ maxBytes: 64 * 1024, sizeOf: (value) => value.bytes, dispose: () => {} }),
    canvases: [{ width: 512, height: 256, clientWidth: 256, clientHeight: 128 }, { width: 256, height: 128, clientWidth: 256, clientHeight: 128 }]
  }),
  run: ({ cache, canvases }) => {
    for (let pass = 0; pass < 12; pass += 1) for (let index = 0; index < 200; index += 1) cache.set(`texture-${pass}-${index}`, { id: index, bytes: 1024 });
    return presentationResourceMetrics({ textureCaches: [cache], canvases });
  },
  resources: ({ cache, canvases }) => ({ ...presentationResourceMetrics({ textureCaches: [cache], canvases }), heapUsed: process.memoryUsage().heapUsed }),
  semanticResult: (result) => ({ textureEntries: result.textureEntries, textureBytes: result.textureBytes, canvasPixels: result.canvasPixels }),
  maximumGrowth: { textureEntries: 64, textureBytes: 64 * 1024, heapUsed: 16 * 1024 * 1024 },
  teardown: ({ cache }) => cache.clear()
};

const fixtures = [
  fullTickFixture("LEGACY"), fullTickFixture("PREDICTIVE_SHADOW"), fullTickFixture("PREDICTIVE_ACTIVE"),
  cameraFixture, referenceFixture, cinemaFixture, growthFixture
];
if (fixtures.some((fixture, index) => fixture.name !== BENCHMARK_SCENARIO_NAMES[index])) throw new Error("Benchmark scenario inventory drifted from its governed order");
const report = await runDeterministicBenchmarkSuite(fixtures, { iterations: requestedIterations, warmup: 2, clock: () => performance.now() });
process.stdout.write(`${JSON.stringify({ benchmarkSchema: 1, iterations: requestedIterations, scenarios: report }, null, 2)}\n`);
