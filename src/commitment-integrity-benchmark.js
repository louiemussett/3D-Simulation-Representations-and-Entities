const comparable = value => value == null ? null : String(value);
const destinationKey = destination => destination && Number.isFinite(destination.x) && Number.isFinite(destination.z)
  ? `${Number(destination.x).toFixed(2)},${Number(destination.z).toFixed(2)}` : null;
const canonicalDestination = request => destinationKey(request?.destination);
const PRECEDENCE_RANK = Object.freeze({ optional: 0, ordinary: 1, "high-urgency": 2, "dependent-critical": 3, "physiological-failure": 4, "immediate-lethal": 5 });

export function commitmentNeedId(value) {
  const text = String(value || "").toLowerCase();
  if (/water|drink|hydrat/.test(text)) return "hydration";
  if (/food|hunger|graze|browse|forage|hunt|scavenge|carcass|prey|nurs/.test(text)) return "nutrition";
  if (/flee|fear|danger|safety|escape|defend|guard|threat|predator/.test(text)) return "safety";
  if (/heat|cold|thermal|shade|warm|cool|dorman|torpor|hibern/.test(text)) return "thermal";
  if (/rest|sleep|recover|digest|fatigue|endurance/.test(text)) return "recovery";
  if (/offspring|parental|caregiver|dependency|care|baby/.test(text)) return "care";
  if (/mate|court|reproduc|pregnan|birth/.test(text)) return "reproduction";
  if (/leave group|independent|autonomy/.test(text)) return "autonomy";
  if (/group alert|group |social|affiliate|herd|pack|friend/.test(text)) return "affiliation";
  if (/explore|learn|information|memory|observe|scan|listen|patrol/.test(text)) return "information";
  return text || "unknown";
}

export function commitmentBenchmarkSnapshot(animal, tick = 0) {
  const state = animal?.commitmentState || {}, episode = state.episode || {}, plan = animal?.needDependencyPlan || {}, action = animal?.actionState || {};
  const priority = comparable(state.priority || animal?.drive), methodId = comparable(episode.methodId || plan.methodId || state.method || action.key), targetKey = comparable(episode.targetKey || plan.targetKey || state.targetKey || action.target || animal?.actionTarget);
  const ranked = (animal?.priorities || []).find(candidate => candidate.drive === priority) || animal?.priorities?.[0];
  const proximity = animal?.primaryProximityRelationship || {}, proximityState = proximity.targetKey ? animal?.proximityStates?.[proximity.targetKey] : null;
  return Object.freeze({
    tick, animalId: comparable(animal?.id), priority, needId: comparable(episode.needId || plan.needId) || commitmentNeedId(priority), satisfierId: comparable(episode.satisfierId || plan.satisfierId), methodId,
    targetKey, targetKind: comparable(episode.targetRef?.targetKind), phase: comparable(episode.phase || plan.phase || state.phase), actionKey: comparable(action.key || animal?.currentAction), destinationKey: canonicalDestination(animal?.movementRequest) || destinationKey(action.destination),
    movementRequestId: comparable(animal?.movementRequest?.id), movementCommitmentId: comparable(animal?.movementRequest?.commitmentId), routeId: comparable(animal?.movementRequest?.routeId || animal?.routeState?.routeId), replanReason: comparable(animal?.routeState?.replanReason), localAdjustmentKind: comparable(animal?.movementRequest?.localAdjustment?.kind || animal?.movementRequest?.destinationSource === "personal-space" ? "personal-space" : null),
    commitmentId: comparable(episode.commitmentId || state.commitmentId), startedTick: Number.isFinite(episode.startedTick) ? episode.startedTick : Number.isFinite(state.startedTick) ? state.startedTick : null, minimumReviewTick: Number.isFinite(episode.minimumReviewTick) ? episode.minimumReviewTick : Number.isFinite(state.minimumReviewTick) ? state.minimumReviewTick : null,
    switchCount: Number(state.switches || 0), urgency: Number.isFinite(state.riskReward?.urgency) ? state.riskReward.urgency : Number.isFinite(ranked?.urgency) ? ranked.urgency : null,
    candidateScore: Number.isFinite(ranked?.score) ? ranked.score : null, precedenceClass: comparable(episode.precedenceClass || ranked?.precedenceClass), status: comparable(state.status || plan.status), suspended: Boolean(state.suspended || plan.suspended),
    retentionReason: comparable(state.lastRetentionReason || plan.targetDecision), switchReason: comparable(state.switchReason), targetChangeReason: comparable(plan.needId === episode.needId ? plan.targetDecision || plan.reconsiderationReason : state.switchReason), completionCondition: comparable(episode.completionCondition || plan.completionCondition),
    relationshipTargetKey: comparable(proximity.targetKey), relationshipBand: comparable(proximity.band || proximityState?.currentBand), relationshipDistance: Number.isFinite(proximity.estimatedDistance) ? proximity.estimatedDistance : Number.isFinite(proximityState?.estimatedDistance) ? proximityState.estimatedDistance : null,
    relationshipReleaseThreshold: Number.isFinite(proximity.releaseThreshold) ? proximity.releaseThreshold : Number.isFinite(proximityState?.activeReleaseThreshold) ? proximityState.activeReleaseThreshold : null,
    parallelObligations: Object.freeze((animal?.parallelObligations || []).filter(entry => entry.status === "active").map(entry => Object.freeze({ obligationKey: entry.obligationKey, needId: entry.needId, methodId: entry.methodId, targetKey: entry.targetKey }))),
  });
}

export function classifyCommitmentTransition(previous, current) {
  if (!previous || !current) return [];
  const events = [], add = (kind, details = {}) => events.push(Object.freeze({ kind, tick: current.tick, animalId: current.animalId, ...details }));
  const changed = key => previous[key] !== current[key];
  if (changed("needId")) add("need-switch", { from: previous.needId, to: current.needId });
  if (changed("satisfierId")) add("satisfier-change", { from: previous.satisfierId, to: current.satisfierId });
  if (changed("methodId")) add("method-change", { from: previous.methodId, to: current.methodId });
  if (changed("targetKey")) add("target-change", { from: previous.targetKey, to: current.targetKey, reason: current.targetChangeReason });
  if (changed("phase")) add("phase-change", { from: previous.phase, to: current.phase });
  if (changed("actionKey")) add("action-change", { from: previous.actionKey, to: current.actionKey });
  if (changed("destinationKey")) add("destination-change", { from: previous.destinationKey, to: current.destinationKey });
  if (changed("routeId")) add("route-change", { from: previous.routeId, to: current.routeId, reason: current.replanReason });
  if (changed("relationshipTargetKey")) add("relationship-target-change", { from: previous.relationshipTargetKey, to: current.relationshipTargetKey });
  if (changed("relationshipBand")) add("relationship-band-change", { from: previous.relationshipBand, to: current.relationshipBand });
  if (!previous.suspended && current.suspended) add("suspension", { reason: current.switchReason });
  if (previous.suspended && !current.suspended) add("resumption");
  if (previous.status !== "completed" && current.status === "completed") add("completion");
  if (previous.status !== "failed" && current.status === "failed") add("failure");
  const priorityChanged = changed("priority"), sameCommitmentIdentity = previous.needId === current.needId && previous.satisfierId === current.satisfierId && previous.methodId === current.methodId;
  if (priorityChanged && previous.needId === current.needId) add("anomaly:wording-or-action-priority-switch", { from: previous.priority, to: current.priority });
  if (changed("commitmentId") && sameCommitmentIdentity && previous.commitmentId && current.commitmentId) add("anomaly:commitment-id-reset", { from: previous.commitmentId, to: current.commitmentId });
  if (current.switchCount > previous.switchCount && sameCommitmentIdentity) add("anomaly:switch-counted-without-commitment-change", { increase: current.switchCount - previous.switchCount, targetChanged: changed("targetKey") });
  const higherPrecedence = (PRECEDENCE_RANK[current.precedenceClass] ?? 1) > (PRECEDENCE_RANK[previous.precedenceClass] ?? 1);
  const permittedEarlyReason = /higher .*precedence|immediate|lethal|target invalid|route unavailable|no viable route|blocked|stalled|negligible progress|eta deteriorated|physiological|playable map|boundary/i.test(current.switchReason || "");
  if (priorityChanged && previous.minimumReviewTick != null && current.tick < previous.minimumReviewTick && !current.suspended) {
    if (higherPrecedence || permittedEarlyReason) add("permitted-early-interruption", { minimumReviewTick: previous.minimumReviewTick, reason: current.switchReason, higherPrecedence });
    else add("anomaly:switch-during-minimum-hold", { minimumReviewTick: previous.minimumReviewTick });
  }
  if (changed("targetKey") && previous.targetKey && current.targetKey && !current.targetChangeReason) add("anomaly:unexplained-target-change");
  if (changed("destinationKey") && current.localAdjustmentKind === "personal-space") add("personal-space-adjustment", { from: previous.destinationKey, to: current.destinationKey });
  else if (changed("destinationKey") && previous.targetKey && previous.targetKey === current.targetKey && previous.phase === current.phase && !current.replanReason) add("anomaly:destination-churn-under-stable-target");
  if (changed("routeId") && previous.targetKey === current.targetKey && !current.replanReason) add("anomaly:route-replan-without-material-cause");
  if (current.movementCommitmentId && current.commitmentId && current.movementCommitmentId !== current.commitmentId && !current.localAdjustmentKind) add("anomaly:movement-owned-by-different-commitment", { movementCommitmentId: current.movementCommitmentId, commitmentId: current.commitmentId });
  if (changed("relationshipTargetKey") && previous.relationshipTargetKey && current.relationshipTargetKey && previous.relationshipBand === current.relationshipBand) add("anomaly:relationship-target-changed-without-band-change");
  const responseText = `${current.priority} ${current.actionKey}`.toLowerCase();
  if (current.relationshipBand === "flight" && !/flee|retreat|escape|withdraw/.test(responseText)) add("anomaly:flight-band-action-contradiction", { band: current.relationshipBand });
  if (current.relationshipBand === "defence" && !/flee|retreat|defend|escape|withdraw|attack|warn|guard|rally/.test(responseText)) add("anomaly:defence-band-action-contradiction", { band: current.relationshipBand });
  if (current.needId === "safety" && /flee|escape|withdraw/.test(String(current.methodId || "")) && !/flee|retreat|escape|withdraw/.test(String(current.actionKey || "").toLowerCase())) add("anomaly:safety-escape-method-action-contradiction", { methodId: current.methodId, actionKey: current.actionKey });
  if (previous.relationshipBand === "withdrawal" && !current.relationshipBand && Number.isFinite(previous.relationshipReleaseThreshold) && Number.isFinite(current.relationshipDistance) && current.relationshipDistance < previous.relationshipReleaseThreshold) add("anomaly:withdrawal-cancelled-before-release-threshold");
  return events;
}

export class CommitmentIntegrityBenchmark {
  constructor() { this.reset(); }
  reset() { this.running = false; this.startedTick = 0; this.targetTicks = 0; this.scope = "population"; this.selectedId = null; this.metadata = {}; this.previous = new Map(); this.events = []; this.structuredEvents = []; this.seenStructuredEventIds = new Set(); this.counts = {}; this.anomalies = {}; this.byAnimal = {}; this.coverage = {}; this.samples = 0; this.animalsObserved = new Set(); this.initialSwitches = new Map(); this.finalSwitches = new Map(); return this; }
  start({ tick = 0, targetTicks = 100, scope = "population", selectedId = null, metadata = {} } = {}) { this.reset(); this.running = true; this.startedTick = tick; this.targetTicks = Math.max(1, Number(targetTicks) || 100); this.scope = scope; this.selectedId = selectedId; this.metadata = Object.freeze({ ...metadata }); return this; }
  sample(animals = [], tick = 0) {
    if (!this.running) return false;
    const observed = animals.filter(animal => animal?.alive !== false && (this.scope !== "selected" || animal.id === this.selectedId));
    for (const animal of observed) {
      const current = commitmentBenchmarkSnapshot(animal, tick), previous = this.previous.get(animal.id);
      for (const event of animal.commitmentEvents || []) if (event.tick >= this.startedTick && !this.seenStructuredEventIds.has(event.eventId)) { this.seenStructuredEventIds.add(event.eventId); this.structuredEvents.push(event); }
      this.animalsObserved.add(animal.id); if (!this.initialSwitches.has(animal.id)) this.initialSwitches.set(animal.id, current.switchCount); this.finalSwitches.set(animal.id, current.switchCount);
      const coverage = this.coverage[current.needId] ||= { observations: 0, satisfier: 0, method: 0, target: 0, phase: 0, completionCondition: 0, urgency: 0, candidateScore: 0 };
      coverage.observations += 1; coverage.satisfier += Number(Boolean(current.satisfierId)); coverage.method += Number(Boolean(current.methodId)); coverage.target += Number(Boolean(current.targetKey)); coverage.phase += Number(Boolean(current.phase)); coverage.completionCondition += Number(Boolean(current.completionCondition)); coverage.urgency += Number(Number.isFinite(current.urgency)); coverage.candidateScore += Number(Number.isFinite(current.candidateScore));
      const transitions = classifyCommitmentTransition(previous, current);
      for (const event of transitions) {
        this.counts[event.kind] = (this.counts[event.kind] || 0) + 1;
        if (event.kind.startsWith("anomaly:")) { const key = event.kind.slice(8); this.anomalies[key] = (this.anomalies[key] || 0) + 1; }
        const row = this.byAnimal[event.animalId] ||= { events: 0, anomalies: 0, needSwitches: 0, targetChanges: 0, destinationChanges: 0 };
        row.events += 1; row.anomalies += Number(event.kind.startsWith("anomaly:")); row.needSwitches += Number(event.kind === "need-switch"); row.targetChanges += Number(event.kind === "target-change"); row.destinationChanges += Number(event.kind === "destination-change");
      }
      this.events.push(...transitions); if (this.events.length > 5000) this.events.splice(0, this.events.length - 5000); this.previous.set(animal.id, current);
    }
    this.samples += 1;
    if (tick - this.startedTick >= this.targetTicks) this.running = false;
    return !this.running;
  }
  report(finalMetadata = {}) {
    const observedTicks = Math.max(0, Math.max(...[...this.previous.values()].map(value => value.tick), this.startedTick) - this.startedTick), switchDelta = [...this.finalSwitches].reduce((sum, [id, value]) => sum + Math.max(0, value - (this.initialSwitches.get(id) || 0)), 0);
    const trueSwitches = this.structuredEvents.filter(event => event.countsAsSwitch).length, falseSwitchIncrements = Math.max(0, switchDelta - trueSwitches);
    return Object.freeze({ benchmarkSchema: 3, benchmarkKind: "commitment-integrity", metadata: Object.freeze({ ...this.metadata, ...finalMetadata }), scope: this.scope, selectedId: this.selectedId, startedTick: this.startedTick, observedTicks, requestedTicks: this.targetTicks, samples: this.samples, animalsObserved: this.animalsObserved.size, switchDelta, trueSwitches, falseSwitchIncrements, counts: { ...this.counts }, anomalies: { ...this.anomalies }, coverageByNeed: Object.fromEntries(Object.entries(this.coverage).map(([need, row]) => [need, { ...row }])), byAnimal: { ...this.byAnimal }, finalStates: [...this.previous.values()].slice(0, 1000), retainedEventLimit: 5000, recentEvents: this.events.slice(-200), structuredEvents: this.structuredEvents.slice(-500) });
  }
}
