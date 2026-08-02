const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, Number(value) || 0));
const average = (...values) => values.reduce((sum, value) => sum + (Number(value) || 0), 0) / Math.max(1, values.length);
export const COMMITMENT_PROTOCOL_SCHEMA = 2;
export const COMMITMENT_STATE_SCHEMA = 2;

const automaticRankingReuse = new WeakMap();

export function createCommitmentRankingReuse() {
  return { animal: null, tick: null, context: null, profile: null, assessments: new Map(), hits: 0, misses: 0 };
}

function prepareRankingReuse(animal, tick, context, supplied) {
  let reuse = supplied;
  if (!reuse && context && typeof context === "object") {
    reuse = automaticRankingReuse.get(context);
    if (!reuse) { reuse = createCommitmentRankingReuse(); automaticRankingReuse.set(context, reuse); }
  }
  reuse ||= createCommitmentRankingReuse();
  if (reuse.animal !== animal || reuse.tick !== tick || reuse.context !== context) {
    reuse.animal = animal; reuse.tick = tick; reuse.context = context; reuse.profile = null; reuse.assessments.clear(); reuse.hits = 0; reuse.misses = 0;
  }
  return reuse;
}

function assessmentCacheKey(candidate = {}) {
  return [candidate.drive, candidate.need, candidate.method, candidate.urgency, candidate.urgent ? 1 : 0, candidate.deathIfUnsatisfied ? 1 : 0, candidate.rewardBias, candidate.risk, candidate.riskBias, candidate.confidence].map(value => value ?? "").join("\u001f");
}

function hashUnit(value) {
  let hash = 2166136261;
  for (const character of String(value || "animal")) { hash ^= character.charCodeAt(0); hash = Math.imul(hash, 16777619); }
  return (hash >>> 0) / 4294967295;
}

function normal(random) {
  const left = Math.max(1e-9, random()), right = Math.max(1e-9, random());
  return Math.sqrt(-2 * Math.log(left)) * Math.cos(2 * Math.PI * right);
}

export function createCommitmentProfile({ random = Math.random, parents = [], inheritedTraits = {} } = {}) {
  const parentValue = (key) => {
    const values = parents.map((parent) => parent?.commitmentProfile?.[key]).filter(Number.isFinite);
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : .5;
  };
  const trait = (key, influence = 0) => clamp(parentValue(key) * .55 + .225 + normal(random) * .13 + influence);
  return {
    decisiveness: trait("decisiveness", (inheritedTraits.aggression || 0) * .025),
    perseverance: trait("perseverance", (inheritedTraits.memoryPersistence || 1) * .035 - .035),
    commitmentStability: trait("commitmentStability"),
    flexibility: trait("flexibility"),
    evidenceThreshold: trait("evidenceThreshold", (inheritedTraits.vigilanceSkill || 1) * .025 - .025),
    socialSusceptibility: trait("socialSusceptibility", (inheritedTraits.careAffinity || 0) * .03),
    confidence: trait("confidence"),
  };
}

export function migrateCommitment(animal, tick = 0) {
  if (animal?.commitmentState?.schemaVersion === COMMITMENT_STATE_SCHEMA
    && animal.commitmentProtocolsSchema === COMMITMENT_PROTOCOL_SCHEMA
    && animal.commitmentProfile
    && animal.learnedProtocols && typeof animal.learnedProtocols === "object"
    && Array.isArray(animal.commitmentHistory)) return animal.commitmentState;
  if (!animal.commitmentProfile) {
    const base = hashUnit(animal.id);
    const value = (offset) => clamp(.22 + ((base * (offset * 7.13 + 1.9)) % 1) * .56);
    animal.commitmentProfile = { decisiveness: value(1), perseverance: value(2), commitmentStability: value(3), flexibility: value(4), evidenceThreshold: value(5), socialSusceptibility: value(6), confidence: value(7) };
  }
  const state = animal.commitmentState || {};
  animal.commitmentState = {
    schemaVersion: COMMITMENT_STATE_SCHEMA,
    priority: state.priority || null, startedTick: Number(state.startedTick ?? tick), lastReviewedTick: Number(state.lastReviewedTick ?? tick),
    lastSwitchTick: Number(state.lastSwitchTick ?? tick), switches: Number(state.switches || 0), reconsiderations: Number(state.reconsiderations || 0),
    confidence: clamp(state.confidence ?? animal.commitmentProfile.confidence), progress: Number(state.progress || 0), previousMetric: state.previousMetric ?? null,
    switchReason: state.switchReason || "not yet selected", status: state.status || "uncommitted", publicIntention: state.publicIntention || null,
    socialForecast: state.socialForecast || null, protocolKey: state.protocolKey || null, riskReward: state.riskReward || null,
  };
  animal.learnedProtocols ||= {};
  for (const key of Object.keys(animal.learnedProtocols)) {
    const record = animal.learnedProtocols[key], migrated = migrateProtocolRecord(record, key);
    if (migrated !== record) animal.learnedProtocols[key] = migrated;
  }
  animal.commitmentProtocolsSchema = COMMITMENT_PROTOCOL_SCHEMA;
  animal.commitmentHistory ||= [];
  return animal.commitmentState;
}

function expressedCommitmentProfileCurrent(animal) {
  const p = animal.commitmentProfile, strain = clamp(((animal.fatigue || 0) + Math.max(0, 45 - (animal.hydration || 100))) / 145);
  const fear = clamp((animal.fear || 0) / 100), support = clamp(Number(animal.socialSupportStrength || 0));
  return {
    ...p,
    decisiveness: clamp(p.decisiveness - strain * .18 - fear * .12 + support * .08),
    perseverance: clamp(p.perseverance - strain * .12 + support * .06),
    flexibility: clamp(p.flexibility + fear * .1 + strain * .08),
    confidence: clamp(animal.commitmentState.confidence - strain * .18 + support * .08),
    socialCourage: clamp(average(p.decisiveness, p.confidence, 1 - p.socialSusceptibility, 1 - fear)),
    rejectionSensitivity: clamp(average(p.socialSusceptibility, p.evidenceThreshold, fear)),
    conformity: clamp(average(p.socialSusceptibility, 1 - p.flexibility)),
    independence: clamp(average(1 - p.socialSusceptibility, p.decisiveness, p.confidence)),
  };
}

export function expressedCommitmentProfile(animal) {
  migrateCommitment(animal);
  return expressedCommitmentProfileCurrent(animal);
}

export function commitmentStyle(animal) {
  const p = expressedCommitmentProfile(animal);
  if (p.commitmentStability > .67 && p.perseverance > .62 && p.flexibility < .44) return "steadfast";
  if (p.flexibility > .68 && p.evidenceThreshold < .52) return "adaptive";
  if (p.rejectionSensitivity > .65) return "socially cautious";
  if (p.socialCourage > .7) return "assertive";
  if (p.decisiveness < .36) return "deliberative";
  return "measured";
}

export function forecastSocialCommitment(animal, candidate, context = {}, preparedProfile = null) {
  const p = preparedProfile || expressedCommitmentProfile(animal), conflicts = Boolean(context.groupGoal && !String(context.groupGoal).includes(candidate.drive));
  const dependence = clamp(context.groupDependence || 0), leaderOpposition = clamp(context.leaderOpposition || (conflicts ? .45 : 0));
  const rejectionRisk = clamp(leaderOpposition * .55 + dependence * .18 + p.rejectionSensitivity * .25);
  const exclusionRisk = clamp(rejectionRisk * dependence * (.7 + (context.previousConflict || 0) * .3));
  const reputationRisk = clamp(rejectionRisk * (context.protocolConfidence || .25) * .65);
  const coordinationCost = clamp((context.followers || 0) / 6 + (conflicts ? .3 : 0));
  const supporters = Number(context.supporters || 0), coalitionRelief = clamp(supporters * .14);
  return { conflicts, rejectionRisk: clamp(rejectionRisk - coalitionRelief), exclusionRisk: clamp(exclusionRisk - coalitionRelief), reputationRisk, coordinationCost, supporters };
}

function needKind(candidate = {}) {
  const value = `${candidate.drive || ""} ${candidate.method || ""}`.toLowerCase();
  if (/water|drink|hydrat/.test(value)) return "water";
  if (/food|hunger|graze|forage|hunt|scavenge|carcass|prey/.test(value)) return "food";
  if (/flee|danger|safety|escape|defend|guard/.test(value)) return "safety";
  if (/rest|recover|endurance/.test(value)) return "recovery";
  if (/pregnan|offspring|caregiver|dependency/.test(value)) return "care";
  if (/mate|court|reproduc/.test(value)) return "reproduction";
  return "other";
}

export function evaluateRiskReward(animal, candidate = {}, context = {}, preparedProfile = null) {
  const kind = candidate.need || needKind(candidate), hydration = clamp((animal.hydration ?? 100) / 100), stomach = clamp((animal.stomach ?? 100) / 100);
  const energy = clamp((animal.energy ?? 100) / 100), health = clamp((animal.health ?? 100) / 100), fatigue = clamp((animal.fatigue ?? 0) / 100);
  const urgency = kind === "water" ? 1 - hydration : kind === "food" ? Math.max(1 - stomach, 1 - energy) : kind === "safety" ? clamp(Math.max((animal.fear || 0) / 100, context.threatRisk || 0)) : kind === "recovery" ? fatigue : kind === "care" ? clamp(context.dependentRisk || Number(animal.pregnant) * .45) : kind === "reproduction" ? clamp(context.reproductivePressure || 0) : clamp(candidate.urgency || 0);
  const deathIfUnsatisfied = Boolean(candidate.deathIfUnsatisfied || (kind === "water" && (hydration <= .18 || context.waterForecastFailure)) || (kind === "food" && (stomach <= .05 || energy <= .07)) || (kind === "safety" && context.immediateLethalThreat));
  const baseReward = { water: 34, food: 30, safety: 38, recovery: 22, care: 28, reproduction: 16, other: 14 }[kind] || 14;
  const reward = deathIfUnsatisfied ? 100 : clamp((baseReward + urgency * 66 + Number(candidate.rewardBias || 0)) / 100) * 100;
  const physicalRisk = clamp(Number(candidate.risk || candidate.riskBias || 0) + Number(context.environmentalRisk || 0) + (kind === "water" ? Number(context.waterPredatorRisk || 0) : 0) + (kind === "food" ? Number(context.foodAcquisitionRisk || 0) : 0));
  const reserveRisk = clamp((kind === "food" || kind === "water") ? Math.max(0, fatigue - .55) + Math.max(0, .35 - hydration) : 0);
  const social = forecastSocialCommitment(animal, candidate, context, preparedProfile), socialRisk = clamp((social.rejectionRisk + social.exclusionRisk + social.reputationRisk) / 2.2);
  const uncertaintyRisk = clamp(1 - Number(candidate.confidence ?? context.methodConfidence ?? 1));
  const risk = clamp(physicalRisk * .7 + reserveRisk * .15 + socialRisk * .1 + uncertaintyRisk * .05) * 100;
  const riskTolerance = deathIfUnsatisfied ? .72 : candidate.urgent ? .58 : .42;
  const utility = reward - risk * (1 - riskTolerance);
  return { kind, urgency: urgency * 100, risk, reward, utility, deathIfUnsatisfied, label: risk >= 70 && reward >= 70 ? "high risk · high reward" : risk >= 70 ? "high risk · low reward" : reward >= 70 ? "lower risk · high reward" : "limited risk · limited reward", social };
}

function rankCandidates(animal, candidates, state, profile, context, reuse) {
  const emergency = candidates.some((candidate) => candidate.urgent);
  return candidates.map((candidate) => {
    const key = assessmentCacheKey(candidate);
    let assessment = reuse.assessments.get(key);
    if (assessment) reuse.hits += 1;
    else { assessment = evaluateRiskReward(animal, candidate, context, profile); reuse.assessments.set(key, assessment); reuse.misses += 1; }
    const same = state.priority === candidate.drive, social = assessment.social;
    const persistence = !emergency && same ? 18 + profile.commitmentStability * 25 + profile.perseverance * 20 + state.confidence * 16 + clamp(state.progress) * 12 : 0;
    const hesitation = !candidate.urgent && !same ? (social.rejectionRisk + social.exclusionRisk + social.reputationRisk + social.coordinationCost * .5) * profile.socialSusceptibility * 22 : 0;
    return { ...candidate, baseScore: candidate.score, score: candidate.score + assessment.utility * .55 + persistence - hesitation, commitmentPersistence: persistence, socialHesitation: hesitation, socialForecast: social, riskReward: assessment };
  }).sort((left, right) => right.score - left.score || String(left.drive).localeCompare(String(right.drive)));
}

export function rankCommitmentCandidates(animal, candidates, tick, context = {}, rankingReuse = null) {
  const state = migrateCommitment(animal, tick), reuse = prepareRankingReuse(animal, tick, context, rankingReuse);
  const profile = reuse.profile ||= expressedCommitmentProfileCurrent(animal);
  return rankCandidates(animal, candidates, state, profile, context, reuse);
}

export function selectWithCommitment(animal, candidates, tick, context = {}, rankingReuse = null) {
  const state = migrateCommitment(animal, tick), reuse = prepareRankingReuse(animal, tick, context, rankingReuse), p = reuse.profile ||= expressedCommitmentProfileCurrent(animal);
  const emergency = candidates.some((candidate) => candidate.urgent), scored = rankCandidates(animal, candidates, state, p, context, reuse);
  const incumbent = scored.find((candidate) => candidate.drive === state.priority), challenger = scored[0];
  if (!emergency && incumbent && challenger !== incumbent) {
    const switchThreshold = 8 + p.commitmentStability * 30 + p.evidenceThreshold * 20 - p.flexibility * 22 + state.confidence * 8;
    if (challenger.score - incumbent.score < switchThreshold && !context.currentPlanBlocked) {
      scored.splice(scored.indexOf(incumbent), 1); scored.unshift(incumbent);
      incumbent.retainedAgainst = challenger.drive; incumbent.switchThreshold = switchThreshold;
    }
  }
  return scored;
}

function protocolKey(priority, method) { return `${priority || "unknown"}:${method || "unspecified"}`; }

export function createProtocolRecord({ key, priority = "unknown", method = "unspecified", methodId = null, satisfierId = null, version = 1, source = "self", teacherId = null, groupId = null, triggerModel = {}, phasePolicy = [], reservePolicy = {}, evidencePolicy = {}, switchPolicy = {}, confidence = .5 } = {}) {
  return {
    schema: COMMITMENT_PROTOCOL_SCHEMA, key: key || protocolKey(priority, method), protocolId: key || protocolKey(priority, method), priority, method, methodId, satisfierId, version,
    source, teacherId, groupId, triggerModel, phasePolicy, reservePolicy, evidencePolicy, switchPolicy,
    attempts: 0, successes: 0, failures: 0, confidence: clamp(confidence), averageDuration: 0, averageGain: 0, averageRisk: 0, averageReward: 0,
    contexts: {}, transmissionHistory: [], revisions: [], status: "active", lastOutcome: "untried",
  };
}

export function migrateProtocolRecord(record = {}, fallbackKey = "unknown:unspecified") {
  if (record?.schema === COMMITMENT_PROTOCOL_SCHEMA && typeof record.key === "string" && typeof record.protocolId === "string" && Array.isArray(record.phasePolicy) && Array.isArray(record.transmissionHistory) && Array.isArray(record.revisions) && record.triggerModel && record.reservePolicy && record.evidencePolicy && record.switchPolicy && record.contexts) return record;
  const [priority = "unknown", ...methodParts] = String(record.key || fallbackKey).split(":"), method = methodParts.join(":") || "unspecified";
  return Object.assign(createProtocolRecord({ key: record.key || fallbackKey, priority: record.priority || priority, method: record.method || method, source: record.source, teacherId: record.teacherId, confidence: record.confidence }), record, { schema: COMMITMENT_PROTOCOL_SCHEMA, protocolId: record.protocolId || record.key || fallbackKey, priority: record.priority || priority, method: record.method || method, version: Math.max(1, Number(record.version || 1)), triggerModel: record.triggerModel || {}, phasePolicy: record.phasePolicy || [], reservePolicy: record.reservePolicy || {}, evidencePolicy: record.evidencePolicy || {}, switchPolicy: record.switchPolicy || {}, contexts: record.contexts || {}, transmissionHistory: record.transmissionHistory || [], revisions: record.revisions || [], status: record.status || "active" });
}

export function instantiateProtocolPlan(protocol, context = {}) {
  const record = migrateProtocolRecord(protocol, protocol?.key), phase = record.phasePolicy[0]?.id || record.phasePolicy[0] || context.phase || "evaluate";
  return Object.freeze({ schema: 1, protocolId: record.protocolId, protocolVersion: record.version, priority: record.priority, method: record.method, methodId: record.methodId, satisfierId: record.satisfierId, phase, protectedReserves: { ...record.reservePolicy, ...(context.protectedReserves || {}) }, evidenceSnapshot: context.evidenceSnapshot || null, contextSnapshot: context.contextSnapshot || null, completionCondition: context.completionCondition || record.phasePolicy.at(-1)?.completionCondition || "priority satisfied", interruptionConditions: Object.freeze([...(record.switchPolicy.interruptionConditions || []), ...(context.interruptionConditions || [])]), status: "active" });
}

export function reviseProtocol(record, { reason = "outcomes changed", changes = {}, tick = 0 } = {}) {
  const migrated = migrateProtocolRecord(record, record?.key), revision = { version: migrated.version, tick, reason, changes: Object.keys(changes) };
  Object.assign(migrated, changes); migrated.version += 1; migrated.revisions.push(revision);
  if (migrated.revisions.length > 12) migrated.revisions.splice(0, migrated.revisions.length - 12);
  return migrated;
}

export function protocolRetirementAssessment(record, { minimumAttempts = 5, failureRate = .7, replacementConfidence = 0 } = {}) {
  const migrated = migrateProtocolRecord(record, record?.key), observedFailureRate = migrated.attempts ? migrated.failures / migrated.attempts : 0;
  const retire = migrated.attempts >= minimumAttempts && observedFailureRate >= failureRate && replacementConfidence > migrated.confidence;
  return Object.freeze({ retire, observedFailureRate, reason: retire ? "repeated failure and a more reliable replacement exists" : "insufficient evidence to retire this protocol" });
}

export function observeCommitment(animal, chosen, tick, context = {}) {
  const state = migrateCommitment(animal, tick), previous = state.priority, changed = previous && previous !== chosen.drive;
  state.reconsiderations += 1; state.lastReviewedTick = tick;
  if (!previous || changed) {
    if (changed) { state.switches += 1; state.lastSwitchTick = tick; animal.commitmentHistory.push({ tick, from: previous, to: chosen.drive, reason: context.switchReason || (chosen.urgent ? "urgent override" : "stronger viable plan") }); }
    state.priority = chosen.drive; state.startedTick = tick; state.progress = 0; state.previousMetric = context.progressMetric ?? null; state.switchReason = changed ? (context.switchReason || "evidence justified a change") : "initial selection";
  } else if (Number.isFinite(context.progressMetric) && Number.isFinite(state.previousMetric)) {
    state.progress = clamp(state.progress * .7 + Math.max(0, context.progressMetric - state.previousMetric) * .03);
    state.previousMetric = context.progressMetric;
  }
  state.socialForecast = chosen.socialForecast || forecastSocialCommitment(animal, chosen, context);
  state.riskReward = chosen.riskReward || evaluateRiskReward(animal, chosen, context);
  const p = expressedCommitmentProfile(animal), risk = state.socialForecast.rejectionRisk + state.socialForecast.exclusionRisk;
  state.status = chosen.urgent ? "emergency" : changed || !previous ? "committed" : "continuing";
  state.publicIntention = risk > 1 && p.socialCourage < .48 ? "withheld" : risk > .55 ? "tentative proposal" : state.socialForecast.conflicts ? "public proposal" : "acting openly";
  state.protocolKey = protocolKey(chosen.drive, context.method || animal.needDependencyPlan?.method || animal.actionState?.key);
  const protocol = animal.learnedProtocols[state.protocolKey];
  state.confidence = clamp(state.confidence * .88 + (protocol?.confidence ?? p.confidence) * .12);
  if (animal.commitmentHistory.length > 24) animal.commitmentHistory.splice(0, animal.commitmentHistory.length - 24);
  return state;
}

export function recordProtocolOutcome(animal, { priority, method, success, duration = 0, gain = 0, risk = null, reward = null, source = "self", teacherId = null } = {}) {
  migrateCommitment(animal);
  const key = protocolKey(priority || animal.commitmentState.priority, method || animal.actionState?.key), record = migrateProtocolRecord(animal.learnedProtocols[key] || createProtocolRecord({ key, priority: priority || animal.commitmentState.priority, method: method || animal.actionState?.key, source, teacherId }), key);
  record.attempts += 1; if (success) record.successes += 1; else record.failures += 1;
  record.averageDuration += (duration - record.averageDuration) / record.attempts; record.averageGain += (gain - record.averageGain) / record.attempts;
  if (Number.isFinite(risk)) record.averageRisk = Number(record.averageRisk || 0) + (risk - Number(record.averageRisk || 0)) / record.attempts;
  if (Number.isFinite(reward)) record.averageReward = Number(record.averageReward || 0) + (reward - Number(record.averageReward || 0)) / record.attempts;
  record.confidence = clamp((record.successes + 1) / (record.attempts + 2)); record.lastOutcome = success ? "success" : "failure";
  animal.learnedProtocols[key] = record;
  if (animal.commitmentState.protocolKey === key) animal.commitmentState.confidence = clamp(record.confidence);
  return record;
}

export function transmitProtocol(teacher, learner, key) {
  const source = teacher?.learnedProtocols?.[key]; if (!source || source.confidence < .58) return null;
  migrateCommitment(learner); const existing = learner.learnedProtocols[key];
  if (existing?.confidence >= source.confidence * .72) return existing;
  const fidelity = clamp(.48 + Number(teacher.mateSkill || teacher.socialSkill || .5) * .18 + Number(learner.memoryPersistence || 1) * .16 - Number(learner.fatigue || 0) / 500);
  const copy = migrateProtocolRecord({ ...source, attempts: Math.max(0, Math.round(source.attempts * .2)), successes: Math.max(0, Math.round(source.successes * .15)), failures: 0, confidence: source.confidence * fidelity, source: "social", teacherId: teacher.id, version: 1 }, key);
  copy.transmissionHistory = [...(source.transmissionHistory || []).slice(-7), { from: teacher.id, to: learner.id, fidelity, sourceVersion: source.version || 1 }];
  return learner.learnedProtocols[key] = copy;
}

export function commitmentPopulationAudit(animals = []) {
  const rows = animals.filter(Boolean).map((animal) => { migrateCommitment(animal); return animal; }), styles = {}, protocols = { self: 0, social: 0 }, totals = { switches: 0, reconsiderations: 0, successes: 0, failures: 0 };
  for (const animal of rows) {
    const style = commitmentStyle(animal), row = styles[style] ||= { animals: 0, alive: 0, offspring: 0, leaders: 0, switches: 0, protocolSuccesses: 0, protocolFailures: 0 };
    row.animals += 1; row.alive += Number(animal.alive !== false); row.offspring += animal.offspringIds?.length || 0; row.leaders += Number(Boolean(animal.groupId && animal.groupLeaderId === animal.id)); row.switches += animal.commitmentState.switches;
    totals.switches += animal.commitmentState.switches; totals.reconsiderations += animal.commitmentState.reconsiderations;
    for (const protocol of Object.values(animal.learnedProtocols)) { row.protocolSuccesses += protocol.successes || 0; row.protocolFailures += protocol.failures || 0; totals.successes += protocol.successes || 0; totals.failures += protocol.failures || 0; protocols[protocol.source === "social" ? "social" : "self"] += 1; }
  }
  return { sampleSize: rows.length, styles, protocols, totals };
}

export function seedStartingCommitment(animal, random = Math.random, tick = 0) {
  migrateCommitment(animal, tick);
  const mature = ["adult", "old"].includes(animal.lifeStage), grouped = Boolean(animal.groupId && animal.groupGoal);
  const common = [
    { priority: "explore", method: "local exploration", supporting: "improve-local-awareness", weight: 1.15 },
    { priority: "rest", method: "rest and recover", supporting: "restore-reserves", weight: .8 },
    { priority: "water", method: "travel to remembered water", supporting: "restore-reserves", weight: .95 },
  ];
  const ecological = animal.speciesId === "hunter"
    ? [{ priority: "purposeful patrol", method: "patrol remembered prey area", supporting: "improve-local-awareness", weight: 1.05 }, { priority: "hunt", method: "hunt remembered prey", supporting: "restore-reserves", weight: .75 }, { priority: "scavenge", method: "travel to remembered carcass", supporting: "restore-reserves", weight: .45 }]
    : [{ priority: "hunger", method: "travel to remembered forage", supporting: "restore-reserves", weight: 1.15 }, { priority: "scan for danger", method: "focused vigilance", supporting: "maintain-local-safety", weight: .7 }, { priority: "herd safety", method: "seek nearby herd members", supporting: "maintain-local-safety", weight: .55 }];
  const social = grouped ? [{ priority: `group ${animal.groupGoal}`, method: "follow established group protocol", supporting: animal.groupGoal === "pregnancy support" ? "sustain-pregnancy" : "maintain-social-bonds", weight: 1.2 }] : [];
  const reproductive = mature && !animal.pregnant ? [{ priority: "reproduction", method: "seek compatible mate", supporting: "restore-before-reproduction", weight: .35 }] : [];
  const pregnancy = animal.pregnant ? [{ priority: "safeguard pregnancy", method: "build pregnancy support network", supporting: "sustain-pregnancy", weight: 2.2 }] : [];
  const dependent = animal.lifeStage === "dependent" ? [{ priority: "dependency", method: "seek caregiver", supporting: "care-for-dependent", weight: 4 }] : [];
  const choices = [...common, ...ecological, ...social, ...reproductive, ...pregnancy, ...dependent];
  const total = choices.reduce((sum, choice) => sum + choice.weight, 0), roll = random() * total; let cursor = 0, selected = choices[0];
  for (const choice of choices) { cursor += choice.weight; if (roll <= cursor) { selected = choice; break; } }
  const score = Math.round(55 + random() * 65), duration = 3 + Math.floor(random() * 12), immediate = { key: selected.priority, startedTick: tick, untilTick: tick + duration };
  const support = { key: selected.supporting, reviewedTick: tick }, life = { key: animal.pregnant ? "raise-current-offspring" : mature ? "survive-and-reproduce" : "survive-and-reach-maturity", reviewedTick: tick };
  const ranking = (primary, alternatives, horizon) => [primary, ...alternatives].slice(0, 3).map((goal, index) => ({ key: goal.key, score: Math.max(5, Math.round((goal.score ?? score) - index * (12 + random() * 8))), rank: index + 1, reviewedTick: tick, horizon }));
  const immediateRanking = ranking({ key: selected.priority, score }, choices.filter((choice) => choice !== selected).map((choice) => ({ key: choice.priority })), "immediate");
  const supportingRanking = ranking({ key: support.key, score: 100 }, [{ key: "maintain-local-safety" }, { key: "restore-reserves" }], "supporting");
  const lifeRanking = ranking({ key: life.key, score: 100 }, [{ key: "maintain-social-bonds" }, { key: "survive-and-maintain-condition" }], "life");
  animal.goalPlan = { currentPriority: immediate, immediateConcern: immediate, supportingGoal: support, lifeStrategy: life, shortTerm: immediate, mediumTerm: support, longTerm: life, rankings: { immediateConcern: immediateRanking, supportingGoal: supportingRanking, lifeStrategy: lifeRanking, shortTerm: immediateRanking, mediumTerm: supportingRanking, longTerm: lifeRanking } };
  const state = animal.commitmentState; state.priority = selected.priority; state.startedTick = tick - Math.floor(random() * 5); state.lastReviewedTick = tick; state.lastSwitchTick = state.startedTick; state.status = "pre-observation commitment"; state.progress = random() * .2; state.confidence = clamp(.32 + random() * .58); state.switchReason = "selected before observation began"; state.publicIntention = grouped && random() > .3 ? "acting openly" : random() > .62 ? "tentative proposal" : "not yet communicated"; state.protocolKey = protocolKey(selected.priority, selected.method);
  state.riskReward = evaluateRiskReward(animal, selected, { methodConfidence: state.confidence });
  const protocolCount = 1 + Math.floor(random() * 4), protocolChoices = [selected, ...choices.filter((choice) => choice !== selected)];
  for (let index = 0; index < protocolCount; index += 1) {
    const choice = protocolChoices[index % protocolChoices.length], attempts = 1 + Math.floor(random() * 8), successBias = .22 + random() * .68, successes = Math.floor(attempts * successBias), failures = attempts - successes, key = protocolKey(choice.priority, choice.method);
    const assessment = evaluateRiskReward(animal, choice, { methodConfidence: successBias });
    animal.learnedProtocols[key] = { key, attempts, successes, failures, confidence: clamp((successes + 1) / (attempts + 2)), averageDuration: 2 + random() * 18, averageGain: random() * 8, averageRisk: assessment.risk, averageReward: assessment.reward, source: random() < .24 ? "social" : "self", teacherId: null, lastOutcome: random() < successBias ? "success" : "failure", preObservation: true };
  }
  if (animal.learnedProtocols[state.protocolKey]) state.confidence = clamp((state.confidence + animal.learnedProtocols[state.protocolKey].confidence) / 2);
  animal.drive = selected.priority; animal.currentAction = `beginning with a pre-observation ${selected.priority} commitment`; animal.timeline ||= []; animal.timeline.push(`observation began with priority ${selected.priority}`);
  return { selected, state, plan: animal.goalPlan };
}
