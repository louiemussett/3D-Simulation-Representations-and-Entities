const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

export function inferredLibido(animal = {}) {
  if (!["adult", "old"].includes(animal.lifeStage)) return 0;
  return clamp((Number(animal.mateSkill) || 1) * .7 - (Number(animal.aggression) || .5) * .12, .25, 1);
}

export function createMaleMatingEpisode(animal = {}, randomValue = .5) {
  const baseline = inferredLibido(animal), condition = clamp(((animal.energy || 0) / 120 + (animal.health || 0) / 100 + (1 - (animal.fatigue || 0) / 100) + (1 - (animal.fear || 0) / 100)) / 4, 0, 1);
  const libido = clamp(baseline * .55 + condition * .25 + clamp(randomValue, 0, .999999) * .4 - .2, .08, 1);
  const duration = clamp(Math.round(2 + libido * 7 + clamp(randomValue, 0, .999999) * 3), 2, 12);
  const cooldown = Math.round(105 - libido * 75);
  return { libido, duration, cooldown };
}

export function rememberFemaleMateOutcome(female, maleId, outcome = {}) {
  if (female?.sex !== "F" || !maleId) return null;
  female.femaleMateGraph ||= {};
  const prior = female.femaleMateGraph[maleId] || { maleId, alignment: .5, averageDuration: 7, firsthand: 0, shared: 0, sources: [] };
  const satisfaction = clamp(Number(outcome.satisfaction) || 0, 0, 1), duration = clamp(Number(outcome.duration) || 7, 2, 12);
  prior.alignment = prior.firsthand ? prior.alignment * .65 + satisfaction * .35 : satisfaction;
  prior.averageDuration = prior.firsthand ? prior.averageDuration * .65 + duration * .35 : duration;
  prior.firsthand += 1; prior.updatedTick = Number(outcome.tick) || 0;
  female.femaleMateGraph[maleId] = prior;
  capFemaleMateGraph(female);
  return prior;
}

export function shareFemaleMateObservation(receiver, sender, tick = 0) {
  if (receiver?.sex !== "F" || sender?.sex !== "F" || receiver.id === sender.id) return null;
  const report = Object.values(sender.femaleMateGraph || {}).sort((a, b) => (b.updatedTick || 0) - (a.updatedTick || 0))[0];
  if (!report) return null;
  receiver.femaleMateGraph ||= {};
  const prior = receiver.femaleMateGraph[report.maleId] || { maleId: report.maleId, alignment: .5, averageDuration: 7, firsthand: 0, shared: 0, sources: [] };
  const weight = prior.firsthand ? .08 : .22;
  prior.alignment = prior.alignment * (1 - weight) + report.alignment * weight;
  prior.averageDuration = prior.averageDuration * (1 - weight) + report.averageDuration * weight;
  prior.shared += 1; prior.updatedTick = tick; prior.sources = [...new Set([...(prior.sources || []), sender.id])].slice(-4);
  receiver.femaleMateGraph[report.maleId] = prior;
  capFemaleMateGraph(receiver);
  return prior;
}

export function rateFemaleCandidate(male, female, context = {}) {
  if (male?.sex !== "M" || female?.sex !== "F" || !female.alive) return 0;
  const matureAge = Math.max(1, Number(context.matureAge) || 1), adultMass = Math.max(1, Number(context.adultMass) || 1);
  // Candidate ratings may use only observable estimates. Authoritative age, mass,
  // pregnancy and offspring records are private simulation state.
  const age = Number.isFinite(Number(context.apparentAge)) ? Number(context.apparentAge) : matureAge * 1.7;
  const mass = Number.isFinite(Number(context.apparentMass)) ? Number(context.apparentMass) : adultMass;
  const ageFit = clamp(1 - Math.abs(age - matureAge * 1.8) / (matureAge * 1.5), 0, 1);
  const massFit = clamp(1 - Math.abs(mass - adultMass) / (adultMass * .55), 0, 1);
  const offspringBurden = Number.isFinite(Number(context.observedDependants)) ? clamp(Number(context.observedDependants) / 4, 0, 1) : .25;
  const pregnancyFit = context.reproductiveCue === "pregnant" ? 0 : context.reproductiveCue === "available" ? 1 : .5;
  return clamp(ageFit * .35 + massFit * .3 + (1 - offspringBurden) * .15 + pregnancyFit * .2, 0, 1);
}

function observationEstimate(observation = {}, tick = 0, provenance = "firsthand") {
  const apparentAge = Number(observation.apparentAge), apparentMass = Number(observation.apparentMass);
  return {
    apparentAge: Number.isFinite(apparentAge) ? apparentAge : null,
    apparentMass: Number.isFinite(apparentMass) ? apparentMass : null,
    lifeStage: observation.lifeStage || null,
    reproductiveCue: observation.reproductiveCue || "unknown",
    observedDependants: Number.isFinite(Number(observation.observedDependants)) ? Math.max(0, Number(observation.observedDependants)) : null,
    confidence: clamp(Number(observation.confidence) || (provenance === "firsthand" ? .65 : .38), .05, 1),
    provenance,
    observedTick: Number(observation.observedTick ?? tick) || 0,
    sourceId: observation.sourceId || null
  };
}

export function rememberMaleFemaleRating(male, female, rating, tick = 0, observation = {}) {
  if (male?.sex !== "M" || female?.sex !== "F") return null;
  male.maleFemaleRatings ||= {};
  const prior = male.maleFemaleRatings[female.id] || { femaleId: female.id, firsthand: 0, shared: 0, sources: [] };
  prior.rating = prior.firsthand ? prior.rating * .6 + clamp(rating, 0, 1) * .4 : clamp(rating, 0, 1);
  prior.observation = observationEstimate(observation, tick, "firsthand");
  prior.lastSeen = { x: female.x, z: female.z, tick };
  prior.firsthand += 1; prior.updatedTick = tick; male.maleFemaleRatings[female.id] = prior;
  capMaleFemaleRatings(male); return prior;
}

export function shareHighRatedFemale(receiver, sender, tick = 0, threshold = .7) {
  if (receiver?.sex !== "M" || sender?.sex !== "M" || receiver.id === sender.id) return null;
  const report = Object.values(sender.maleFemaleRatings || {}).filter((entry) => entry.rating >= threshold && entry.lastSeen && entry.observation?.reproductiveCue !== "pregnant").sort((a, b) => b.rating - a.rating || (b.updatedTick || 0) - (a.updatedTick || 0))[0];
  if (!report) return null;
  receiver.maleFemaleRatings ||= {};
  const prior = receiver.maleFemaleRatings[report.femaleId] || { femaleId: report.femaleId, rating: .5, firsthand: 0, shared: 0, sources: [] };
  if (!prior.firsthand) prior.rating = prior.shared ? prior.rating * .75 + report.rating * .25 : report.rating * .85;
  if (!prior.firsthand) prior.observation = observationEstimate({ ...(report.observation || {}), confidence: (report.observation?.confidence || .5) * .72, sourceId: sender.id }, tick, "reported");
  prior.lastSeen = { ...report.lastSeen, reportedAt: tick }; prior.shared += 1; prior.updatedTick = tick;
  prior.sources = [...new Set([...(prior.sources || []), sender.id])].slice(-3);
  receiver.maleFemaleRatings[report.femaleId] = prior; capMaleFemaleRatings(receiver); return prior;
}

function capMaleFemaleRatings(male, limit = 8) {
  const entries = Object.values(male.maleFemaleRatings || {}).sort((a, b) => (b.updatedTick || 0) - (a.updatedTick || 0)).slice(0, limit);
  male.maleFemaleRatings = Object.fromEntries(entries.map((entry) => [entry.femaleId, entry]));
}

function capFemaleMateGraph(female, limit = 12) {
  const entries = Object.values(female.femaleMateGraph || {}).sort((a, b) => (b.updatedTick || 0) - (a.updatedTick || 0)).slice(0, limit);
  female.femaleMateGraph = Object.fromEntries(entries.map((entry) => [entry.maleId, entry]));
}

export function inferredSocialTemperament(animal = {}) {
  const aggression = clamp(Number(animal.aggression) || .5, 0, 1), mass = Math.max(.5, Number(animal.sizeTrait) || 1), skill = clamp(Number(animal.mateSkill) || 1, .4, 1.6);
  return { dominance: clamp(aggression * .62 + (mass - .75) * .34, 0, 1), submission: clamp((1 - aggression) * .72 + (1.05 - mass) * .24, 0, 1), courtshipBreadth: clamp((skill - .4) / 1.2 * .58 + aggression * .18, 0, 1) };
}

export function migrateSocialState(animal, species = {}) {
  animal.libido = ["adult", "old"].includes(animal.lifeStage) ? (Number.isFinite(animal.libido) && animal.libido > 0 ? clamp(animal.libido, 0, 1) : inferredLibido(animal)) : 0;
  const temperament = inferredSocialTemperament(animal);
  animal.dominanceTrait = Number.isFinite(animal.dominanceTrait) ? clamp(animal.dominanceTrait, 0, 1) : temperament.dominance;
  animal.submissionTrait = Number.isFinite(animal.submissionTrait) ? clamp(animal.submissionTrait, 0, 1) : temperament.submission;
  animal.courtshipBreadth = Number.isFinite(animal.courtshipBreadth) ? clamp(animal.courtshipBreadth, 0, 1) : temperament.courtshipBreadth;
  animal.socialMemory ||= {};
  if (animal.sex === "M") {
    for (const rating of Object.values(animal.maleFemaleRatings || {})) {
      // Old saves contained copied authoritative age and mass. They are deliberately
      // not promoted to observations during migration because their provenance is invalid.
      rating.observation ||= observationEstimate({ confidence: .2, observedTick: rating.updatedTick }, rating.updatedTick, "legacy-unverified");
      delete rating.age; delete rating.weight; delete rating.offspring; delete rating.pregnant;
    }
  }
  if (animal.sex === "F" && ["adult", "old"].includes(animal.lifeStage)) {
    const old = animal.matePreferences || {};
    animal.matePreferences = {
      preferredMass: old.preferredMass ?? species.adultMass ?? 1, massTolerance: old.massTolerance ?? (species.adultMass || 1) * .3,
      preferredAge: old.preferredAge ?? (species.matureAge || 1) * 1.7, ageTolerance: old.ageTolerance ?? (species.matureAge || 1) * .7,
      preferredAggression: old.preferredAggression ?? .5, aggressionTolerance: old.aggressionTolerance ?? .35,
      preferredLibido: old.preferredLibido ?? .55, libidoTolerance: old.libidoTolerance ?? .4,
      preferredMatingDuration: old.preferredMatingDuration ?? 7, matingDurationTolerance: old.matingDurationTolerance ?? 3,
      injuryTolerance: old.injuryTolerance ?? ((old.minHealth ?? 70) >= 80 ? "none" : "minor-injury"),
      valuesForaging: old.valuesForaging ?? .55, valuesCare: old.valuesCare ?? .55, valuesCalmMovement: old.valuesCalmMovement ?? .5, valuesAttentiveness: old.valuesAttentiveness ?? .55
    };
  } else if (animal.sex === "F") animal.matePreferences = null;
  return animal;
}

const MALE_NETWORK_CHANNELS = Object.freeze(["affiliation", "competition", "reproductive", "care"]);

function kinRelation(male, other, population) {
  if (!other) return null;
  if ((male.offspringIds || []).includes(other.id) || other.parentIds?.includes(male.id)) return "offspring";
  if ((male.parentIds || []).includes(other.id) || male.motherId === other.id || male.fatherId === other.id) return "parent";
  if ((male.caregiverIds || []).includes(other.id)) return "caregiver";
  const maleParents = new Set(male.parentIds || [male.motherId, male.fatherId].filter(Boolean));
  if ((other.parentIds || [other.motherId, other.fatherId].filter(Boolean)).some((id) => maleParents.has(id))) return "sibling";
  const depth = Number(male.ancestorDepths?.[other.id] || other.ancestorDepths?.[male.id]);
  if (depth > 0) return "relative";
  return null;
}

function freshnessFor(record, tick) {
  const last = Number(record?.lastInteractionTick ?? record?.updatedTick ?? record?.lastSeen?.tick ?? 0);
  return clamp(Math.exp(-Math.max(0, tick - last) / 260), .12, 1);
}

function evidenceFor(male, id, record, observedIds) {
  if (observedIds.has(id)) return { kind: "observed", marker: "◉", provenance: "firsthand", confidence: 1 };
  if ((record?.shared || 0) > 0 && !(record?.firsthand || 0)) return { kind: "reported", marker: "◖", provenance: `reported${record.sources?.length ? ` by ${record.sources.join(", ")}` : ""}`, confidence: record.observation?.confidence || .4 };
  if (record) return { kind: "remembered", marker: "◌", provenance: record.firsthand ? "remembered firsthand" : "retained memory", confidence: record.observation?.confidence || .65 };
  return { kind: "inferred", marker: "·", provenance: "current group or kin record", confidence: .55 };
}

/**
 * Builds a read-only male social-strategy lens. It never mutates memory or selects
 * behaviour; physiology and hormones only alter the current prominence calculation.
 */
export function maleSocialStrategyNetwork(male, population = [], context = {}) {
  if (male?.sex !== "M") return { channels: MALE_NETWORK_CHANNELS, nodes: [], edges: [], focus: null, strategy: { kind: "none" } };
  const tick = Number(context.tick) || 0, byId = new Map(population.map((animal) => [animal.id, animal]));
  const observedIds = new Set(context.observedIds || []), organisation = String(context.organisation || context.socialOrganisation || "").toLowerCase();
  const records = male.socialMemory || {}, ratings = male.maleFemaleRatings || {}, ids = new Set([...Object.keys(records), ...Object.keys(ratings), ...(male.parentIds || []), ...(male.offspringIds || []), ...(male.caregiverIds || [])]);
  if (male.groupId) for (const other of population) if (other.id !== male.id && other.groupId === male.groupId) ids.add(other.id);
  const strategy = maleMatingStrategy(male, Object.values(records), { availableFemales: Number(context.availableFemales) || 0 });
  const condition = clamp(((male.energy || 0) / 120 + (male.health || 0) / 100 + (1 - (male.fatigue || 0) / 100) + (1 - (male.fear || 0) / 100)) / 4, 0, 1);
  const reproductiveGain = clamp((male.libido || 0) * .58 + (Number(context.breedingContext) || 0) * .28 + (strategy.kind === "partner-bonded" ? .18 : 0), 0, 1.25);
  const competitiveGain = clamp((male.dominanceTrait || 0) * .42 + (male.aggression || 0) * .28 + (organisation.includes("territorial") ? .22 : 0), 0, 1.25);
  const careGain = clamp((male.careAffinity || .5) * .72 + (/pair|pack|coalition|communal/.test(organisation) ? .18 : 0), 0, 1.2);
  const nodes = [];
  for (const id of ids) {
    if (!id || id === male.id) continue;
    const other = byId.get(id), social = records[id], rating = ratings[id], kin = kinRelation(male, other, population), freshness = freshnessFor(social || rating, tick), evidence = evidenceFor(male, id, social || rating, observedIds);
    const channelValues = {};
    const groupAlly = Boolean(other && male.groupId && other.groupId === male.groupId);
    const affinity = clamp(Number(social?.affinity) || 0, -1, 1);
    const bonded = relationshipKind(social) === "mate-bond" || strategy.preferredPartnerId === id && (social?.matings || 0) > 0;
    const affiliation = clamp(Math.max(0, affinity) * .62 + Math.min(.32, (social?.foragingHours || 0) / 12) + (groupAlly ? .22 : 0) + (bonded ? .2 : 0), 0, 1);
    if (affiliation > .08) channelValues.affiliation = affiliation;
    const competition = clamp(Math.max(0, -affinity) * .32 + (social?.grievance || 0) * .45 + Math.min(.38, ((social?.victories || 0) + (social?.defeats || 0)) * .12) + (other?.sex === "M" && ["adult", "old"].includes(other.lifeStage) ? .12 : 0), 0, 1);
    if (competition > .08) channelValues.competition = competition;
    const reproductive = other?.sex === "F" ? clamp((rating?.rating ?? .35) * .58 + Math.min(.26, (social?.courtshipAttempts || 0) * .08 + (social?.matings || 0) * .13) + (bonded ? .24 : 0), 0, 1) : 0;
    if (reproductive > .08) channelValues.reproductive = reproductive;
    const care = kin ? clamp((kin === "offspring" ? .8 : kin === "caregiver" || kin === "parent" ? .68 : .52) + (groupAlly ? .1 : 0), 0, 1) : 0;
    if (care > .08) channelValues.care = care;
    if (!["adult", "old"].includes(male.lifeStage)) delete channelValues.reproductive;
    const channels = Object.entries(channelValues).map(([channel, intensity]) => ({ channel, intensity }));
    if (!channels.length) continue;
    const weighted = channels.map(({ channel, intensity }) => intensity * ({ affiliation: .74 + careGain * .18, competition: .5 + competitiveGain * .5, reproductive: .35 + reproductiveGain * .65, care: .56 + careGain * .44 })[channel]);
    const salience = clamp(Math.max(...weighted) * freshness * (.35 + condition * .65), .04, 1);
    const primaryChannel = channels[weighted.indexOf(Math.max(...weighted))].channel;
    const reasons = channels.map(({ channel, intensity }) => `${channel} ${Math.round(intensity * 100)}%`).join("; ");
    nodes.push({ id, alive: other?.alive !== false, sex: other?.sex || "?", lifeStage: other?.lifeStage || rating?.observation?.lifeStage || "unknown", kin, bonded, channels, primaryChannel, salience, freshness, evidence, why: `${reasons}; ${Math.round(freshness * 100)}% fresh; ${evidence.provenance}; physical affordability ${Math.round(condition * 100)}%` });
  }
  nodes.sort((left, right) => right.salience - left.salience || left.id.localeCompare(right.id));
  const retained = nodes.slice(0, Number(context.limit) || 16);
  const edges = retained.flatMap((node) => node.channels.map(({ channel, intensity }) => ({ targetId: node.id, channel, intensity, confidence: node.evidence.confidence * node.freshness, reported: node.evidence.kind === "reported" })));
  const focusNode = retained[0] || null;
  const focus = focusNode ? { targetId: focusNode.id, channel: focusNode.primaryChannel, statement: `${focusNode.id} is currently most salient for ${focusNode.primaryChannel}: ${focusNode.why}.` } : { targetId: null, channel: null, statement: "No retained relationship currently has enough evidence to dominate this male's social attention." };
  return { channels: MALE_NETWORK_CHANNELS, nodes: retained, edges, focus, strategy, factors: { condition, reproductiveGain, competitiveGain, careGain, organisation } };
}

export function adaptFemaleMatePreferences(animal, observedCues = [], environment = {}) {
  if (animal.sex !== "F" || !["adult", "old"].includes(animal.lifeStage) || !animal.matePreferences) return animal.matePreferences || null;
  const preference = animal.matePreferences, males = observedCues.filter((cue) => cue.sex === "M" && ["adult", "old"].includes(cue.lifeStage));
  const scarcity = clamp(Number(environment.resourceScarcity) || 0, 0, 1), danger = clamp(Number(environment.danger) || 0, 0, 1);
  const mean = (key, fallback) => males.length ? males.reduce((sum, cue) => sum + (Number(cue[key]) || 0), 0) / males.length : fallback;
  const shift = .0025;
  preference.preferredMass += (mean("apparentMass", preference.preferredMass) - preference.preferredMass) * shift;
  preference.preferredAggression += (clamp(.5 - danger * .22, .15, .65) - preference.preferredAggression) * shift;
  preference.valuesForaging = clamp(preference.valuesForaging + (scarcity - .35) * shift, .2, 1);
  preference.valuesCare = clamp(preference.valuesCare + (danger - .3) * shift, .2, 1);
  preference.valuesCalmMovement = clamp(preference.valuesCalmMovement + (danger - .45) * shift, .2, 1);
  preference.valuesAttentiveness = clamp(preference.valuesAttentiveness + (danger - .25) * shift, .2, 1);
  return preference;
}

export function rememberSocialEvent(animal, partnerId, event, tick, details = {}) {
  animal.socialMemory ||= {};
  const prior = animal.socialMemory[partnerId] || { partnerId, affinity: 0, courtshipAttempts: 0, matings: 0, foragingHours: 0, lastSeen: null, events: [] };
  if (event === "courtship") prior.courtshipAttempts += 1;
  if (event === "mating") prior.matings += 1;
  if (event === "mating" && Number.isFinite(details.matingDuration)) prior.lastMatingDuration = details.matingDuration;
  if (event === "foraging") prior.foragingHours += Number(details.hours) || 1;
  if (event === "victory") prior.victories = (prior.victories || 0) + 1;
  if (["dominated", "defeat"].includes(event)) prior.defeats = (prior.defeats || 0) + 1;
  if (event === "attacked") prior.grievance = clamp((prior.grievance || 0) + .25, 0, 1);
  if (["protected", "foraging"].includes(event)) prior.grievance = clamp((prior.grievance || 0) - .08, 0, 1);
  const gain = event === "mating" ? .24 : event === "accepted" ? .14 : event === "foraging" ? .035 : event === "protected" ? .12 : event === "attacked" ? -.3 : event === "dominated" ? -.12 : event === "rejected" ? -.08 : .025;
  prior.affinity = clamp(prior.affinity + gain, -1, 1);
  if (details.observedCues) prior.observedCues = { ...details.observedCues };
  if (Number.isFinite(details.x) && Number.isFinite(details.z)) prior.lastSeen = { x: details.x, z: details.z, tick };
  prior.events.push({ event, tick }); prior.events = prior.events.slice(-8); prior.lastInteractionTick = tick;
  animal.socialMemory[partnerId] = prior;
  const entries = Object.values(animal.socialMemory).sort((a, b) => (b.lastInteractionTick || 0) - (a.lastInteractionTick || 0)).slice(0, animal.sex === "F" ? 36 : 16);
  animal.socialMemory = Object.fromEntries(entries.map((entry) => [entry.partnerId, entry]));
  return prior;
}

export function observableMateCompatibility(preference, cues = {}, socialRecord = {}) {
  const injuryRanks = { none: 0, "minor-injury": 1, "obvious-injury": 2, "severe-impairment": 3 };
  const tolerated = injuryRanks[preference.injuryTolerance] ?? 1, injuryFit = clamp(1 - Math.max(0, (injuryRanks[cues.injury] ?? 1) - tolerated) * .5, 0, 1);
  const massFit = clamp(1 - Math.abs((cues.apparentMass ?? preference.preferredMass) - preference.preferredMass) / Math.max(1, preference.massTolerance), 0, 1);
  const ageFit = clamp(1 - Math.abs((cues.apparentAge ?? preference.preferredAge) - preference.preferredAge) / Math.max(1, preference.ageTolerance), 0, 1);
  const aggressionFit = clamp(1 - Math.abs((cues.aggressionDisplay ?? preference.preferredAggression) - preference.preferredAggression) / Math.max(.05, preference.aggressionTolerance), 0, 1);
  const observedLibido = clamp((socialRecord.courtshipAttempts || 0) / Math.max(1, ((socialRecord.events || []).length)), 0, 1);
  const libidoFit = clamp(1 - Math.abs(observedLibido - preference.preferredLibido) / Math.max(.1, preference.libidoTolerance), 0, 1);
  const foraging = cues.activity === "foraging" ? 1 : clamp((socialRecord.foragingHours || 0) / 12, 0, 1);
  const care = cues.emittedSignal === "care" || cues.activity === "care" ? 1 : 0;
  const calm = cues.movementPace === "calm" && cues.aggressionDisplay < .65 ? 1 : 0;
  const attentive = ["listening", "scanning", "sniffing"].includes(cues.headMovement) ? 1 : 0;
  const knownDuration = Number.isFinite(cues.proposedMatingDuration) ? cues.proposedMatingDuration : socialRecord.lastMatingDuration;
  const durationFit = Number.isFinite(knownDuration) ? clamp(1 - Math.abs(knownDuration - preference.preferredMatingDuration) / Math.max(1, preference.matingDurationTolerance), 0, 1) : .5;
  const reputationFit = clamp(Number(socialRecord.sharedAlignment ?? .5), 0, 1);
  const score = injuryFit * .18 + massFit * .1 + ageFit * .08 + aggressionFit * .11 + libidoFit * .09 + durationFit * .14 + reputationFit * .12 + foraging * preference.valuesForaging * .1 + care * preference.valuesCare * .07 + calm * preference.valuesCalmMovement * .06 + attentive * preference.valuesAttentiveness * .05;
  return { score: clamp(score, 0, 1), components: { injuryFit, massFit, ageFit, aggressionFit, libidoFit, durationFit, reputationFit, foraging, care, calm, attentive } };
}

export function relationshipKind(record = {}) {
  if ((record.matings || 0) > 0 && record.affinity >= .3) return "mate-bond";
  if ((record.foragingHours || 0) >= 3 && record.affinity >= .12) return "friendship";
  return null;
}

export function maleMatingStrategy(animal = {}, socialRecords = [], context = {}) {
  if (animal.sex !== "M" || !["adult", "old"].includes(animal.lifeStage)) return { kind: "none", preferredPartnerId: null, bondDrive: 0, breadthDrive: 0 };
  const records = socialRecords.filter((record) => record?.partnerId);
  const preferred = [...records].sort((left, right) => ((right.affinity || 0) + Math.min(.45, (right.matings || 0) * .15)) - ((left.affinity || 0) + Math.min(.45, (left.matings || 0) * .15)) || String(left.partnerId).localeCompare(String(right.partnerId)))[0];
  const condition = clamp(((animal.energy || 0) / 120 + (animal.health || 0) / 100 + (1 - (animal.fatigue || 0) / 100) + (1 - (animal.fear || 0) / 100)) / 4, 0, 1);
  const bondDrive = preferred ? clamp(Math.max(0, preferred.affinity || 0) * (.75 + (animal.careAffinity || .5) * .25) + Math.min(.42, (preferred.matings || 0) * .14), 0, 1.5) : 0;
  const rejections = records.reduce((sum, record) => sum + (record.events || []).filter((event) => event.event === "rejected").length, 0);
  const opportunities = clamp((Number(context.availableFemales) || 0) / 3, 0, 1);
  const breadthDrive = clamp((animal.courtshipBreadth || 0) * .44 + (animal.libido || 0) * .3 + (animal.aggression || 0) * .08 + opportunities * .22 + Math.min(.12, rejections * .03) - (1 - condition) * .34 - bondDrive * .48, 0, 1.5);
  const depleted = (animal.energy || 0) < 45 || (animal.health || 0) < 55 || (animal.fatigue || 0) > 75 || (animal.fear || 0) > 60;
  const kind = bondDrive >= .52 && bondDrive >= breadthDrive + .08 ? "partner-bonded" : !depleted && breadthDrive >= .58 && opportunities > .34 ? "broad-courtship" : "selective";
  return { kind, preferredPartnerId: preferred?.partnerId || null, bondDrive, breadthDrive };
}

export function socialEncounterKind(actor = {}, target = {}, context = {}) {
  if (!target.alive || actor.speciesId !== target.speciesId || actor.id === target.id) return null;
  actor.socialPressures ||= {};
  const prior = actor.socialPressures[target.id] || { dominance: 0, submission: 0, play: 0, aggression: 0, protection: 0, stage: "notice" };
  const memory = actor.socialMemory?.[target.id] || {}, injury = (actor.injuries || []).length * .12, exhaustion = (actor.fatigue || 0) / 100, fear = (actor.fear || 0) / 100;
  const apparentStrength = clamp((target.bodyMass || target.sizeTrait || 1) / Math.max(.5, actor.bodyMass || actor.sizeTrait || 1), .4, 2);
  const muscleConfidence = clamp((actor.muscleMass || 0) / Math.max(.5, actor.leanMass || actor.bodyMass || 1) - .5, -.2, .25);
  const confidence = clamp((actor.dominanceTrait || 0) + muscleConfidence + (memory.victories || 0) * .08 - (memory.defeats || 0) * .1, 0, 1.4);
  const youngActor = ["dependent", "juvenile", "subadult"].includes(actor.lifeStage), youngTarget = ["dependent", "juvenile", "subadult"].includes(target.lifeStage);
  prior.play = clamp(prior.play * .9 + (youngActor && youngTarget ? ((actor.energy || 0) / 120 + (actor.aggression || 0) + Math.max(0, memory.affinity || 0) - fear - exhaustion - injury) * .12 : 0), 0, 2);
  prior.dominance = clamp(prior.dominance * .92 + ((actor.aggression || 0) + confidence + (context.mateCompetition || 0) + (context.territoryImportance || 0) + (context.groupDispute || 0) * .55 - fear - injury - exhaustion - apparentStrength * .35 - Math.max(0, memory.affinity || 0)) * .08, 0, 2);
  prior.submission = clamp(prior.submission * .9 + ((actor.submissionTrait || 0) + apparentStrength * .35 + fear + injury + exhaustion - confidence) * .09, 0, 2);
  prior.aggression = clamp(prior.aggression * .93 + ((actor.aggression || 0) + Math.max(0, -(memory.affinity || 0)) + (memory.grievance || 0) + (context.groupDispute || 0) * .7 - fear - injury - exhaustion) * .055, 0, 2);
  actor.socialPressures[target.id] = prior;
  if (youngActor && youngTarget && prior.play >= .72) return { kind: "spar", pressure: prior.play, stage: "engage" };
  if (actor.sex === "M" && target.sex === "M" && ["adult", "old"].includes(actor.lifeStage) && ["adult", "old"].includes(target.lifeStage)) {
    if (prior.submission >= .76 && prior.submission > prior.dominance) return { kind: "submit", pressure: prior.submission, stage: "yield" };
    if (prior.dominance >= .55 && prior.stage === "notice") { prior.stage = "assess"; return { kind: "assess-rival", pressure: prior.dominance, stage: "assess" }; }
    if (prior.dominance >= .72 && prior.stage === "assess") { prior.stage = "display"; return { kind: "dominance", pressure: prior.dominance, stage: "display" }; }
    if (prior.dominance >= .9 && prior.aggression < .72 && prior.submission < .7) return { kind: "spar", pressure: prior.dominance, stage: "controlled-contest" };
    if (prior.dominance >= 1.05 && prior.aggression >= .72 && prior.submission < .7) return { kind: "social-attack", pressure: prior.dominance + prior.aggression, stage: "escalate" };
  }
  if (prior.aggression >= 1.12 && ["adult", "old"].includes(actor.lifeStage) && ["adult", "old"].includes(target.lifeStage)) return { kind: "social-attack", pressure: prior.aggression, stage: "escalate" };
  return null;
}
