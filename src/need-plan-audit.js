const clamp = (value, low, high) => Math.max(low, Math.min(high, Number(value) || 0));
const HISTORY_LIMIT = 20;

export function migrateNeedPlanAudit(animal) {
  animal.needPlanAudit ||= { current: null, completed: [], totals: { started: 0, satisfied: 0, failed: 0, interrupted: 0, interruptions: 0, failedTargets: 0 } };
  animal.needPlanAudit.completed ||= [];
  animal.needPlanAudit.totals ||= { started: 0, satisfied: 0, failed: 0, interrupted: 0, interruptions: 0, failedTargets: 0 };
  return animal.needPlanAudit;
}

function closePhase(episode, ecologicalMinute) {
  const phase = episode.phases.at(-1);
  if (phase && phase.endedAt == null) {
    phase.endedAt = ecologicalMinute;
    phase.durationMinutes = Math.max(0, ecologicalMinute - phase.startedAt);
  }
}

function finish(animal, outcome, reason, context) {
  const audit = migrateNeedPlanAudit(animal), episode = audit.current;
  if (!episode) return null;
  closePhase(episode, context.ecologicalMinute);
  episode.endedAt = context.ecologicalMinute;
  episode.endedTick = context.tick;
  episode.durationMinutes = Math.max(0, context.ecologicalMinute - episode.startedAt);
  episode.outcome = outcome;
  episode.endReason = reason;
  episode.finalAmount = context.amount;
  episode.actualDurationHours = episode.durationMinutes / 60;
  episode.etaErrorHours = Number.isFinite(episode.predictedEtaHours) ? episode.actualDurationHours - episode.predictedEtaHours : null;
  audit.completed.push(episode);
  if (audit.completed.length > HISTORY_LIMIT) audit.completed.splice(0, audit.completed.length - HISTORY_LIMIT);
  audit.totals[outcome] = (audit.totals[outcome] || 0) + 1;
  audit.current = null;
  return episode;
}

export function observeNeedPlan(animal, plan, context = {}) {
  const audit = migrateNeedPlanAudit(animal), now = Number(context.ecologicalMinute) || 0, tick = Number(context.tick) || 0;
  if (!plan?.need) return audit;
  const amount = Number(context.amount) || 0, distance = Number(context.distance), eta = Number(context.etaHours), confidence = clamp(context.confidence, 0, 1);
  if (audit.current && audit.current.need !== plan.need) finish(animal, "interrupted", `terminal need changed to ${plan.need}`, { ...context, amount, ecologicalMinute: now, tick });
  if (!audit.current) {
    audit.current = {
      schema: 2, episodeId: `${animal.id || "animal"}:${tick}:${plan.need}`, id: `${animal.id || "animal"}:${tick}:${plan.need}`, planId: plan.planId || `${animal.id || "animal"}:${tick}:plan`, need: plan.need, needId: plan.needId || plan.need, satisfierId: plan.satisfierId || null, method: plan.method, methodId: plan.methodId || null, protocolId: plan.protocolId || null, phase: plan.phase,
      startedAt: now, startedTick: tick, startAmount: amount, finalAmount: amount, startHydration: Number(animal.hydration), startStomach: Number(animal.stomach),
      predictedEtaHours: Number.isFinite(eta) ? eta : null, currentEtaHours: Number.isFinite(eta) ? eta : null,
      startDistance: Number.isFinite(distance) ? distance : null, currentDistance: Number.isFinite(distance) ? distance : null,
      startConfidence: confidence, currentConfidence: confidence, distanceClosed: 0, resourceGained: 0, interruptions: 0, failedTargets: 0, repeatedAttempts: 0,
      observationMinutes: Number(context.observationMinutes) || null, groupConflict: Boolean(context.groupConflict), unsafeOptionalStart: Boolean(context.unsafeOptionalStart),
      phases: [{ name: plan.phase, startedAt: now }], invalidationConditions: context.invalidationConditions || plan.interruptionConditions || [],
      protectedReserves: plan.protectedReserves || context.protectedReserves || null, evidenceSnapshot: plan.evidenceSnapshot || context.evidenceSnapshot || null, contextSnapshot: plan.contextSnapshot || context.contextSnapshot || null,
      predictedOutcome: plan.forecast || context.forecast || null, effectsByNeed: {}, resourceCosts: {}, injuryCost: 0, socialEffects: [], learningUpdate: null,
    };
    audit.totals.started += 1;
    return audit;
  }
  const episode = audit.current;
  if (episode.method !== plan.method) { episode.interruptions += 1; audit.totals.interruptions += 1; episode.method = plan.method; }
  if (episode.phase !== plan.phase) { closePhase(episode, now); episode.phase = plan.phase; episode.phases.push({ name: plan.phase, startedAt: now }); }
  else episode.repeatedAttempts += 1;
  episode.currentEtaHours = Number.isFinite(eta) ? eta : episode.currentEtaHours;
  episode.currentDistance = Number.isFinite(distance) ? distance : episode.currentDistance;
  episode.currentConfidence = confidence || episode.currentConfidence;
  episode.distanceClosed = episode.startDistance == null || episode.currentDistance == null ? 0 : episode.startDistance - episode.currentDistance;
  episode.finalAmount = amount;
  return audit;
}

export function recordNeedAcquisition(animal, { need, before = 0, after = 0, tick = 0, ecologicalMinute = 0, target = null, satisfactionTarget = 92 } = {}) {
  const audit = migrateNeedPlanAudit(animal), episode = audit.current;
  if (!episode || episode.need !== need) return audit;
  episode.resourceGained += Math.max(0, after - before);
  episode.finalAmount = after;
  episode.target = target || episode.target;
  if (after >= satisfactionTarget) finish(animal, "satisfied", `${need} acquisition target reached`, { tick, ecologicalMinute, amount: after });
  return audit;
}

export function recordPlanEffect(animal, { needId, amount = 0, resource = null, resourceCost = 0, injuryCost = 0, socialEffect = null } = {}) {
  const episode = migrateNeedPlanAudit(animal).current;
  if (!episode) return null;
  if (needId) episode.effectsByNeed[needId] = Number(episode.effectsByNeed[needId] || 0) + Number(amount || 0);
  if (resource) episode.resourceCosts[resource] = Number(episode.resourceCosts[resource] || 0) + Number(resourceCost || 0);
  episode.injuryCost += Number(injuryCost || 0);
  if (socialEffect) episode.socialEffects.push(socialEffect);
  return episode;
}

export function recordNeedTargetFailure(animal, { need, tick = 0, ecologicalMinute = 0, target = null, reason = "resource target disproved" } = {}) {
  const audit = migrateNeedPlanAudit(animal), episode = audit.current;
  audit.totals.failedTargets += 1;
  if (episode && episode.need === need) { episode.failedTargets += 1; episode.lastFailure = { tick, ecologicalMinute, target, reason }; }
  return audit;
}

export function abandonNeedPlan(animal, { outcome = "failed", reason = "plan abandoned", tick = 0, ecologicalMinute = 0, amount = 0 } = {}) {
  finish(animal, outcome, reason, { tick, ecologicalMinute, amount });
  return migrateNeedPlanAudit(animal);
}

export function populationPlanAudit(animals = []) {
  const episodes = [], active = [];
  for (const animal of animals) { const audit = migrateNeedPlanAudit(animal); episodes.push(...audit.completed.map((episode) => ({ ...episode, animalId: animal.id, speciesId: animal.speciesId, lifeStage: animal.lifeStage }))); if (audit.current) active.push({ ...audit.current, animalId: animal.id, speciesId: animal.speciesId, lifeStage: animal.lifeStage }); }
  const satisfied = episodes.filter((episode) => episode.outcome === "satisfied");
  const phaseStalls = {};
  for (const episode of episodes.filter((item) => item.outcome !== "satisfied")) phaseStalls[episode.phase || "unknown"] = (phaseStalls[episode.phase || "unknown"] || 0) + 1;
  const etaSamples = episodes.filter((episode) => Number.isFinite(episode.etaErrorHours));
  const byObservationMode = {};
  for (const mode of [60, 180, 360]) {
    const modeEpisodes = episodes.filter((episode) => episode.observationMinutes === mode), modeSatisfied = modeEpisodes.filter((episode) => episode.outcome === "satisfied").length;
    byObservationMode[mode] = { completed: modeEpisodes.length, successRate: modeEpisodes.length ? modeSatisfied / modeEpisodes.length : null };
  }
  return { episodes, active, completed: episodes.length, successRate: episodes.length ? satisfied.length / episodes.length : 0, averageEtaErrorHours: etaSamples.length ? etaSamples.reduce((sum, item) => sum + Math.abs(item.etaErrorHours), 0) / etaSamples.length : null, phaseStalls, byObservationMode, groupConflictEpisodes: episodes.filter((episode) => episode.groupConflict).length, unsafeOptionalStarts: episodes.filter((episode) => episode.unsafeOptionalStart).length };
}
