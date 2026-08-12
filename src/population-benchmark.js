export const BENCHMARK_POPULATIONS = Object.freeze([25, 50, 100, 250, 500]);

export function populationBenchmarkSetup(baseSetup, population, hunterShare = .1) {
  const total = Math.max(1, Math.floor(Number(population) || 1));
  const carnivores = Math.max(1, Math.min(total - 1, Math.round(total * hunterShare)));
  return { ...baseSetup, herbivores: total - carnivores, carnivores };
}

export function populationSweepReport(reports, metadata = {}) {
  const stages = reports.map((report) => ({ population: report.metadata.population, herbivores: report.metadata.worldSetup.herbivores, carnivores: report.metadata.worldSetup.carnivores, observationMinutes: report.metadata.observationMinutes, fps: report.fps, ticksPerSecond: report.ticksPerSecond, timings: report.timings, finalResources: report.finalResources, resourceRanges: report.resourceRanges, diagnosticHighlights: report.diagnosticHighlights, generationalAudit: report.generationalAudit || null, windows: report.windows, observedDurationMs: report.observedDurationMs }));
  return { benchmarkSchema: 3, benchmarkKind: "population-sweep", metadata, populations: stages.map((stage) => stage.population), stages };
}
