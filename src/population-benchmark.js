import { SPECIES, SPECIES_IDS, enabledSpeciesCounts, isHerbivore, speciesCategoryTotals } from "./species-registry.js";

export const BENCHMARK_POPULATIONS = Object.freeze([25, 50, 100, 250, 500]);

function apportionedCounts(ids, sourceCounts, requested) {
  const total = Math.max(0, Math.floor(Number(requested) || 0));
  if (!ids.length || total === 0) return Object.fromEntries(ids.map((id) => [id, 0]));
  const weights = ids.map((id) => Math.max(1, Number(sourceCounts[id]) || Number(SPECIES[id]?.defaultPopulation) || 1));
  const weightTotal = weights.reduce((sum, value) => sum + value, 0) || 1;
  const shares = ids.map((id, index) => {
    const exact = total * weights[index] / weightTotal;
    return { id, value: Math.floor(exact), remainder: exact - Math.floor(exact), index };
  });
  let remaining = total - shares.reduce((sum, share) => sum + share.value, 0);
  for (const share of [...shares].sort((left, right) => right.remainder - left.remainder || left.index - right.index)) {
    if (remaining <= 0) break;
    share.value += 1;
    remaining -= 1;
  }
  return Object.fromEntries(shares.map((share) => [share.id, share.value]));
}

export function populationBenchmarkSpeciesCounts(baseCounts = {}, population, hunterShare = .1) {
  const total = Math.max(2, Math.floor(Number(population) || 2));
  const source = enabledSpeciesCounts(baseCounts);
  const active = (herbivore) => SPECIES_IDS.filter((id) => isHerbivore(id) === herbivore && source[id] > 0);
  const fallback = (herbivore) => SPECIES_IDS.filter((id) => isHerbivore(id) === herbivore).slice(0, 1);
  const herbivoreIds = active(true).length ? active(true) : fallback(true);
  const carnivoreIds = active(false).length ? active(false) : fallback(false);
  const carnivores = Math.max(1, Math.min(total - 1, Math.round(total * hunterShare)));
  const herbivores = total - carnivores;
  return enabledSpeciesCounts({
    ...apportionedCounts(herbivoreIds, source, herbivores),
    ...apportionedCounts(carnivoreIds, source, carnivores)
  });
}

export function populationBenchmarkSetup(baseSetup, population, hunterShare = .1) {
  const total = Math.max(2, Math.floor(Number(population) || 2));
  const speciesCounts = populationBenchmarkSpeciesCounts(baseSetup?.speciesCounts, total, hunterShare);
  return { ...baseSetup, speciesCounts, ...speciesCategoryTotals(speciesCounts) };
}

export function validatePopulationBenchmarkStage(requestedPopulation, actualPopulation, setup = {}) {
  const requested = Math.max(0, Math.floor(Number(requestedPopulation) || 0));
  const actual = Math.max(0, Math.floor(Number(actualPopulation) || 0));
  const rosterPopulation = Object.values(setup.speciesCounts || {}).reduce((sum, value) => sum + Math.max(0, Math.floor(Number(value) || 0)), 0);
  const valid = requested === actual && requested === rosterPopulation;
  return Object.freeze({
    valid,
    requestedPopulation: requested,
    actualPopulation: actual,
    rosterPopulation,
    delta: actual - requested,
    message: valid
      ? `Population verified: requested ${requested}, created ${actual}.`
      : `Population benchmark stage failed: requested ${requested}, authoritative roster ${rosterPopulation}, created ${actual}. No measurements were accepted.`
  });
}

export function populationSweepReport(reports, metadata = {}) {
  const stages = reports.map((report) => {
    const validation = report.metadata.populationValidation || validatePopulationBenchmarkStage(report.metadata.requestedPopulation ?? report.metadata.population, report.metadata.population, report.metadata.worldSetup);
    return { requestedPopulation: validation.requestedPopulation, population: report.metadata.population, actualPopulation: validation.actualPopulation, rosterPopulation: validation.rosterPopulation, valid: validation.valid, validationMessage: validation.message, herbivores: report.metadata.worldSetup.herbivores, carnivores: report.metadata.worldSetup.carnivores, speciesCounts: { ...report.metadata.worldSetup.speciesCounts }, observationMinutes: report.metadata.observationMinutes, fps: report.fps, ticksPerSecond: report.ticksPerSecond, timings: report.timings, finalResources: report.finalResources, resourceRanges: report.resourceRanges, diagnosticHighlights: report.diagnosticHighlights, generationalAudit: report.generationalAudit || null, windows: report.windows, observedDurationMs: report.observedDurationMs };
  });
  const validations = metadata.stageValidations?.length ? [...metadata.stageValidations] : stages.map((stage) => ({ valid: stage.valid, requestedPopulation: stage.requestedPopulation, actualPopulation: stage.actualPopulation, rosterPopulation: stage.rosterPopulation, message: stage.validationMessage }));
  return { benchmarkSchema: 4, benchmarkKind: "population-sweep", metadata, requestedPopulations: metadata.requestedPopulations || stages.map((stage) => stage.requestedPopulation), populations: stages.map((stage) => stage.actualPopulation), valid: !metadata.failure && validations.every((entry) => entry.valid), failure: metadata.failure || null, stageValidations: validations, stages };
}
