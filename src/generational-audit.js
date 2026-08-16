import { commitmentPopulationAudit } from "./commitment-system.js";

const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const mean = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
const standardDeviation = (values) => { if (!values.length) return null; const average = mean(values); return Math.sqrt(values.reduce((sum, value) => sum + (value - average) ** 2, 0) / values.length); };
const increment = (record, key, amount = 1) => { record[key || "unknown"] = (record[key || "unknown"] || 0) + amount; };
const grouped = (items, key) => items.reduce((result, item) => { increment(result, item?.[key] || "unprofiled"); return result; }, {});
const livingParents = (animal, animalsById) => (animal.parentIds || [animal.motherId, animal.fatherId]).filter(Boolean).filter((id) => animalsById.get(id)?.alive);
const traitBand = (value, boundaries, labels) => value < boundaries[0] ? labels[0] : value > boundaries[1] ? labels[2] : labels[1];

function traitDistribution(animals) {
  const profiled = animals.filter((animal) => animal.traitArchitecture), overall = profiled.map((animal) => finite(animal.traitArchitecture.overallScore)), divergence = profiled.map((animal) => finite(animal.traitArchitecture.divergenceScore));
  return {
    sampleSize: profiled.length,
    overall: { mean: mean(overall), standardDeviation: standardDeviation(overall), bands: grouped(profiled.map((animal) => animal.traitArchitecture), "overallBand") },
    divergence: { mean: mean(divergence), standardDeviation: standardDeviation(divergence), profiles: grouped(profiled.map((animal) => animal.traitArchitecture), "profile") },
    prenatalQuality: { mean: mean(profiled.map((animal) => finite(animal.traitArchitecture.prenatalQuality))), minimum: profiled.length ? Math.min(...profiled.map((animal) => finite(animal.traitArchitecture.prenatalQuality))) : null },
  };
}

function outcomeByTrait(animals, predicate) {
  const profiled = animals.filter((animal) => animal.traitArchitecture), result = { overallBand: {}, divergenceProfile: {} };
  for (const animal of profiled) {
    const success = finite(predicate(animal));
    for (const [bucket, key] of [[result.overallBand, animal.traitArchitecture.overallBand], [result.divergenceProfile, animal.traitArchitecture.profile]]) {
      bucket[key] ||= { animals: 0, outcomes: 0 }; bucket[key].animals += 1; bucket[key].outcomes += success;
    }
  }
  return result;
}

function resourcePlanning(animals) {
  const dimensions = { memoryPersistence: {}, waterSkill: {}, foodSkill: {} };
  for (const animal of animals) {
    const totals = animal.needPlanAudit?.totals || {};
    const values = {
      memoryPersistence: traitBand(finite(animal.memoryPersistence, 1), [.8, 1.2], ["low", "typical", "high"]),
      waterSkill: traitBand(finite(animal.waterSkill, 1), [.8, 1.2], ["low", "typical", "high"]),
      foodSkill: traitBand(finite(animal.foodSkill, 1), [.8, 1.2], ["low", "typical", "high"]),
    };
    for (const [dimension, band] of Object.entries(values)) {
      const record = dimensions[dimension][band] ||= { animals: 0, started: 0, satisfied: 0, failed: 0, interrupted: 0, failedTargets: 0, completionRate: null };
      record.animals += 1;
      for (const key of ["started", "satisfied", "failed", "interrupted", "failedTargets"]) record[key] += finite(totals[key]);
    }
  }
  for (const bands of Object.values(dimensions)) for (const record of Object.values(bands)) { const completed = record.satisfied + record.failed + record.interrupted; record.completionRate = completed ? record.satisfied / completed : null; }
  return dimensions;
}

function lifecycleEvents(animals) {
  const events = { conceptions: 0, failedConceptions: 0, miscarriages: 0, earlyEmbryonicLosses: 0, birthsRecordedInTimelines: 0, voluntaryDepartures: 0, leadershipEvents: 0 };
  for (const animal of animals) for (const line of animal.timeline || []) {
    if (line.includes("pregnancy established")) events.conceptions += 1;
    else if (line.includes("conception did not establish")) events.failedConceptions += 1;
    else if (line.includes("early embryonic loss")) events.earlyEmbryonicLosses += 1;
    else if (line.includes("miscarriage")) events.miscarriages += 1;
    if (line.startsWith("born day")) events.birthsRecordedInTimelines += 1;
    if (line.includes("left ") && line.includes(" on day")) events.voluntaryDepartures += 1;
    if (line.includes("became leader") || line.includes("leadership")) events.leadershipEvents += 1;
  }
  return events;
}

export function captureGenerationalAudit(world, { observationMinutes = null } = {}) {
  const animals = world?.animals || [], living = animals.filter((animal) => animal.alive), corpses = (world?.corpses || []).filter((corpse) => !corpse.seededAtWorldStart), byId = new Map(animals.map((animal) => [animal.id, animal]));
  const naturalBorn = animals.filter((animal) => animal.traitArchitecture), birthCohort = naturalBorn.filter((animal) => ["dependent", "juvenile"].includes(animal.lifeStage)), adults = naturalBorn.filter((animal) => ["adult", "old"].includes(animal.lifeStage));
  const deathsByCause = {}, deathsByAge = {}, deathsBySpecies = {};
  for (const corpse of corpses) { increment(deathsByCause, corpse.cause); increment(deathsByAge, corpse.lifeStage); increment(deathsBySpecies, corpse.speciesId); }
  const leaders = living.filter((animal) => animal.groupId && animal.groupLeaderId === animal.id), groupedMembers = living.filter((animal) => animal.groupId);
  const dependents = living.filter((animal) => animal.lifeStage === "dependent"), orphans = dependents.filter((animal) => !livingParents(animal, byId).length), supportedOrphans = orphans.filter((animal) => (animal.caregiverIds || []).some((id) => byId.get(id)?.alive));
  const caregiverLoads = living.map((animal) => ({ animal, load: dependents.filter((child) => (child.caregiverIds || []).includes(animal.id) || child.motherId === animal.id).length })).filter((entry) => entry.load > 0);
  const bereavements = animals.flatMap((animal) => (animal.bereavementEpisodes || []).map((episode) => ({ ...episode, observerId: animal.id }))), retaliation = bereavements.filter((episode) => episode.retaliationIntention >= .38);
  const injuries = animals.flatMap((animal) => animal.injuries || []), predationDeaths = corpses.filter((corpse) => corpse.killOwnerId || String(corpse.cause || "").startsWith("killed by "));
  const survivingOffspring = (parent) => living.filter((child) => (child.parentIds || []).includes(parent.id) || child.motherId === parent.id || child.fatherId === parent.id).length;
  const parentContributions = living.map((animal) => ({ id: animal.id, offspring: survivingOffspring(animal) })).filter((entry) => entry.offspring > 0).sort((left, right) => right.offspring - left.offspring);
  const totalParentContributions = parentContributions.reduce((sum, entry) => sum + entry.offspring, 0);
  const departures = animals.filter((animal) => animal.groupDisposition?.departureReason || (animal.timeline || []).some((line) => line.includes("left ") && line.includes(" on day")));
  const deathEvidenceComplete = corpses.filter((corpse) => corpse.cause && Number.isFinite(corpse.lived) && Number.isFinite(corpse.finalHydration) && Number.isFinite(corpse.finalEnergy)).length;
  const birthEvidenceComplete = naturalBorn.filter((animal) => animal.traitArchitecture && (animal.parentIds || []).length && Number.isFinite(animal.traitArchitecture.prenatalQuality)).length;
  const leadershipEvidenceComplete = leaders.filter((animal) => animal.groupGoal && Number.isFinite(animal.leadershipSinceDay)).length;
  const retaliationEvidenceComplete = retaliation.filter((episode) => episode.attackerId && episode.attackerConfidence > 0 && episode.lastKnown).length;
  return {
    observationMinutes,
    ecologicalMinute: finite(world?.ecologicalMinute), day: finite(world?.day), births: finite(world?.births), deaths: finite(world?.deaths),
    population: { total: living.length, herbivores: living.filter((animal) => animal.speciesId === "grazer").length, carnivores: living.filter((animal) => animal.speciesId === "hunter").length, byLifeStage: grouped(living, "lifeStage"), extinct: { herbivores: !living.some((animal) => animal.speciesId === "grazer"), carnivores: !living.some((animal) => animal.speciesId === "hunter") } },
    mortality: { total: corpses.length, byCause: deathsByCause, byLifeStage: deathsByAge, bySpecies: deathsBySpecies, averageAgeAtDeathDays: mean(corpses.map((corpse) => finite(corpse.lived))) },
    reproduction: { ...lifecycleEvents(animals), activePregnancies: living.filter((animal) => animal.pregnant).length, naturallyBornSurvivors: naturalBorn.filter((animal) => animal.alive).length, newbornHealth: { mean: mean(birthCohort.map((animal) => finite(animal.health))), sampleSize: birthCohort.length }, prenatalQuality: traitDistribution(naturalBorn).prenatalQuality },
    traits: { allNaturalBorn: traitDistribution(naturalBorn), youngCohort: traitDistribution(birthCohort), adultCohort: traitDistribution(adults), reproductiveSuccess: outcomeByTrait(naturalBorn, survivingOffspring), leadership: outcomeByTrait(naturalBorn, (animal) => Number(animal.groupLeaderId === animal.id)), groupMembership: outcomeByTrait(naturalBorn, (animal) => Number(Boolean(animal.groupId))) },
    resources: resourcePlanning(animals),
    commitment: commitmentPopulationAudit(animals),
    caregiving: { dependents: dependents.length, orphans: orphans.length, supportedOrphans: supportedOrphans.length, orphanSupportRate: orphans.length ? supportedOrphans.length / orphans.length : null, activeCaregivers: caregiverLoads.length, averageDependantsPerCaregiver: mean(caregiverLoads.map((entry) => entry.load)), maximumCaregiverLoad: caregiverLoads.length ? Math.max(...caregiverLoads.map((entry) => entry.load)) : 0 },
    predation: { kills: predationDeaths.length, injuries: injuries.length, injuredAnimals: animals.filter((animal) => (animal.injuries || []).length).length },
    bereavement: { episodes: bereavements.length, active: bereavements.filter((episode) => !episode.completed).length, completed: bereavements.filter((episode) => episode.completed).length, withKnownKiller: bereavements.filter((episode) => episode.attackerId).length, retaliationEligible: retaliation.length, confrontations: bereavements.filter((episode) => episode.outcome === "confronted confirmed killer").length, outcomes: bereavements.reduce((record, episode) => { increment(record, episode.outcome || (episode.completed ? "completed" : "active")); return record; }, {}) },
    driftIndicators: { startingScale: living.length, females: living.filter((animal) => animal.sex === "F").length, males: living.filter((animal) => animal.sex === "M").length, effectiveSurvivingParents: parentContributions.length, largestSurvivingFamily: parentContributions[0] || null, largestParentContributionShare: totalParentContributions ? parentContributions[0].offspring / totalParentContributions : null, leaders: leaders.length, largestCaregiverLoad: caregiverLoads.length ? Math.max(...caregiverLoads.map((entry) => entry.load)) : 0, activePregnancies: living.filter((animal) => animal.pregnant).length },
    causalityCoverage: { deaths: { records: corpses.length, reconstructable: deathEvidenceComplete, rate: corpses.length ? deathEvidenceComplete / corpses.length : null }, births: { records: naturalBorn.length, reconstructable: birthEvidenceComplete, rate: naturalBorn.length ? birthEvidenceComplete / naturalBorn.length : null }, leadership: { records: leaders.length, reconstructable: leadershipEvidenceComplete, rate: leaders.length ? leadershipEvidenceComplete / leaders.length : null }, departures: { records: departures.length, reconstructable: departures.filter((animal) => animal.groupDisposition?.departureReason).length, rate: departures.length ? departures.filter((animal) => animal.groupDisposition?.departureReason).length / departures.length : null }, retaliation: { records: retaliation.length, reconstructable: retaliationEvidenceComplete, rate: retaliation.length ? retaliationEvidenceComplete / retaliation.length : null } },
  };
}

function numericDelta(start, end) { return finite(end) - finite(start); }

export function compareGenerationalAudit(start, end) {
  const startOverall = start?.traits?.allNaturalBorn?.overall || {}, endOverall = end?.traits?.allNaturalBorn?.overall || {}, startDivergence = start?.traits?.allNaturalBorn?.divergence || {}, endDivergence = end?.traits?.allNaturalBorn?.divergence || {};
  const startingPopulation = finite(start?.population?.total), smallPopulationWarning = startingPopulation > 0 && startingPopulation < 50;
  return {
    start, end,
    changes: { population: numericDelta(start?.population?.total, end?.population?.total), births: numericDelta(start?.births, end?.births), deaths: numericDelta(start?.deaths, end?.deaths), conceptions: numericDelta(start?.reproduction?.conceptions, end?.reproduction?.conceptions), failedConceptions: numericDelta(start?.reproduction?.failedConceptions, end?.reproduction?.failedConceptions), miscarriages: numericDelta(start?.reproduction?.miscarriages, end?.reproduction?.miscarriages), earlyEmbryonicLosses: numericDelta(start?.reproduction?.earlyEmbryonicLosses, end?.reproduction?.earlyEmbryonicLosses), predationKills: numericDelta(start?.predation?.kills, end?.predation?.kills), injuries: numericDelta(start?.predation?.injuries, end?.predation?.injuries), bereavementEpisodes: numericDelta(start?.bereavement?.episodes, end?.bereavement?.episodes), confrontations: numericDelta(start?.bereavement?.confrontations, end?.bereavement?.confrontations) },
    diversityChange: { overallMean: endOverall.mean == null || startOverall.mean == null ? null : endOverall.mean - startOverall.mean, overallStandardDeviation: endOverall.standardDeviation == null || startOverall.standardDeviation == null ? null : endOverall.standardDeviation - startOverall.standardDeviation, divergenceMean: endDivergence.mean == null || startDivergence.mean == null ? null : endDivergence.mean - startDivergence.mean, divergenceStandardDeviation: endDivergence.standardDeviation == null || startDivergence.standardDeviation == null ? null : endDivergence.standardDeviation - startDivergence.standardDeviation },
    interpretationWarnings: [smallPopulationWarning ? `Starting population ${startingPopulation} is vulnerable to genetic and demographic drift; do not interpret one run as stable selection.` : null, (end?.traits?.allNaturalBorn?.sampleSize || 0) < 20 ? "Fewer than 20 naturally born animals were observed; trait-outcome comparisons are exploratory." : null, (end?.driftIndicators?.largestParentContributionShare || 0) > .35 ? `One parent accounts for ${Math.round(end.driftIndicators.largestParentContributionShare * 100)}% of surviving parental contributions; founder or reproductive skew may dominate apparent selection.` : null, "Compare repeated seeds and identical 60, 180 and 360-minute observation-mode runs before attributing outcomes to systemic selection."].filter(Boolean),
  };
}
