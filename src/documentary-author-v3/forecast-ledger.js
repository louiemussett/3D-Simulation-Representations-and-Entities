import { createDefaultOutcomeObserverRegistry, WORLD_FAMILIES } from "./outcome-observers.js";

const epsilon = 1e-9;
const FORECAST_STATUSES = Object.freeze(["OPEN", "RESOLVED", "CENSORED", "INVALIDATED", "EXPIRED_UNOBSERVABLE"]);
const topOutcome = forecast => (forecast.outcomes || []).reduce((best, item) => !best || Number(item.probability || 0) > Number(best.probability || 0) ? item : best, null)?.id || null;
const productionKey = forecast => `${forecast.ensembleId || "none"}|${forecast.modelId || "none"}`;

export class ForecastLedger {
  constructor({ learning = null, maximum = 5000, onRecord = null, observers = createDefaultOutcomeObserverRegistry() } = {}) {
    this.learning = learning; this.maximum = maximum; this.onRecord = onRecord; this.observers = observers; this.items = new Map(); this.openIds = new Set(); this.openWorldIds = new Set(); this.openProductionByKey = new Map(); this.openProductionIndexById = new Map(); this.byExpiryTick = new Map(); this.statusCounts = Object.fromEntries(FORECAST_STATUSES.map(status => [status, 0])); this.sequence = 0; this.revision = 0; this.healthCache = null;
  }
  open(ensemble, context = {}, tick = 0) {
    const records = [];
    for (const source of ensemble?.forecasts || []) {
      const forecastId = `acss-forecast-${String(++this.sequence).padStart(10, "0")}`, record = Object.freeze({
        ...source, forecastId, ensembleId: ensemble.ensembleId, queryId: context.queryId || null, situationId: context.situationId || null,
        subjectIds: Object.freeze((context.subjects || []).map(item => item.identityId || item.id).filter(Boolean)), issuedAtTick: tick,
        earliestTick: source.earliestTick ?? tick + 1, latestTick: source.latestTick ?? tick + 30, evidenceIds: Object.freeze([...(source.evidenceIds || context.evidenceIds || [])]), profileRevision: this.learning?.revision || 0,
        context: Object.freeze({ sceneKind: context.scene?.kind || context.sceneKind || "unknown", methodId: context.methodId || null, phase: context.phase || null, preset: context.preset || "classic", subjectCount: context.subjectCount || 0, action: context.action || context.subjects?.[0]?.action?.key || "unknown", targetId: context.subjects?.[0]?.plan?.targetId || null, worldLink: Boolean(context.worldLink), worldRevision: context.worldRevision || null, predictedPosition: source.values?.predicted || null }),
        lifecycle: Object.freeze({ activation: source.activation || null, admission: source.admission || null, coordination: source.coordination || null, authority: source.authority || "ADVISORY", selectedAction: context.action || null, execution: null, attributedError: null }), status: "OPEN", resolution: null
      });
      this.items.set(forecastId, record); this.openIds.add(forecastId); this.statusCounts.OPEN += 1; if (!this.byExpiryTick.has(record.latestTick)) this.byExpiryTick.set(record.latestTick, new Set()); this.byExpiryTick.get(record.latestTick).add(forecastId); this.#indexOpen(record); records.push(record); this.record("author_forecast_opened", record);
    }
    if (records.length) { this.revision += 1; this.healthCache = null; }
    this.trim(); return records;
  }
  observe({ observation = null, snapshot = observation?.snapshot || null, simulation = null, tick = snapshot?.simulationTick ?? simulation?.tick ?? 0 } = {}) {
    const view = createObservationView({ observation, snapshot, simulation, tick }), resolutions = [];
    for (const id of this.openWorldIds) {
      const forecast = this.items.get(id); if (!forecast || tick < forecast.earliestTick || !this.observers.has(forecast.outcomeObserverId || forecast.modelId) || this.observers.kind(forecast) !== "world") continue;
      const result = this.observers.observe(forecast, view); if (!result || result.status === "PENDING") continue; resolutions.push(this.resolve(id, result, tick));
    }
    return resolutions.filter(Boolean);
  }
  resolveProduction(forecasts = [], actual = {}, tick = 0) {
    const resolutions = [];
    for (const source of forecasts) {
      const record = this.#latestProduction(source.ensembleId, source.modelId);
      if (!record || this.observers.kind(record) !== "production") continue;
      const result = this.observers.observe(record, { tick, actual, executed: actual.executed !== false }); if (!result || result.status === "PENDING") continue; resolutions.push(this.resolve(record.forecastId, result, tick));
    }
    return resolutions.filter(Boolean);
  }
  resolve(id, observation, tick) {
    const forecast = this.items.get(id); if (!forecast || forecast.status !== "OPEN") return null;
    const allowed = new Set(["RESOLVED", "CENSORED", "INVALIDATED", "EXPIRED_UNOBSERVABLE"]), status = allowed.has(observation.status) ? observation.status : "EXPIRED_UNOBSERVABLE", observed = status === "RESOLVED" ? observation.observedOutcome || null : null;
    const probabilityAssigned = observed ? Number(forecast.outcomes?.find(item => item.id === observed)?.probability || 0) : null, brier = observed ? (forecast.outcomes || []).reduce((sum, item) => sum + Math.pow(Number(item.probability || 0) - Number(item.id === observed), 2), 0) : null, logLoss = observed ? -Math.log(Math.max(epsilon, probabilityAssigned)) : null;
    const resolution = Object.freeze({ resolutionId: `${id}:resolution`, forecastId: id, status, resolvedAtTick: tick, observedOutcome: observed, observationEvidenceIds: Object.freeze(observation.evidenceIds || []), probabilityAssigned, brierScore: brier, logLoss, continuousErrors: Object.freeze({ ...(observation.continuousErrors || {}) }), attributionWeight: status === "RESOLVED" ? Number(observation.attributionWeight ?? 1) : 0, censorReason: observation.censorReason || (status === "EXPIRED_UNOBSERVABLE" ? "outcome-unobservable-at-expiry" : null) });
    const attributedError = status === "RESOLVED" && observed !== topOutcome(forecast) ? "PREDICTION_ERROR" : status === "INVALIDATED" ? "COORDINATION_ERROR" : status === "CENSORED" ? "EXECUTION_ERROR" : null, final = Object.freeze({ ...forecast, lifecycle: Object.freeze({ ...forecast.lifecycle, execution: status, attributedError }), status, resolution }); this.items.set(id, final); this.statusCounts.OPEN -= 1; this.statusCounts[status] += 1; this.#deindexOpen(forecast); const expiry = this.byExpiryTick.get(forecast.latestTick); expiry?.delete(id); if (expiry && !expiry.size) this.byExpiryTick.delete(forecast.latestTick); this.revision += 1; this.healthCache = null; this.record("author_forecast_resolved", { ...resolution, attributedError });
    if (status === "RESOLVED") this.learning?.resolveForecast?.({ forecast, resolution, context: { ...forecast.context, family: forecast.family }, attributable: true }); return resolution;
  }
  invalidateWhere(predicate, reason = "dependency-invalidated", tick = 0) { return [...this.openIds].filter(id => predicate(this.items.get(id))).map(id => this.resolve(id, { status: "INVALIDATED", censorReason: reason }, tick)).filter(Boolean); }
  censorAll(reason = "session-ended", tick = 0) { return [...this.openIds].map(id => this.resolve(id, { status: "CENSORED", censorReason: reason }, tick)).filter(Boolean); }
  record(type, payload) { this.onRecord?.({ type, payload }); }
  trim() { while (this.items.size > this.maximum) { const first = this.items.keys().next().value; if (this.openIds.has(first)) this.resolve(first, { status: "CENSORED", censorReason: "ledger-capacity" }, this.items.get(first)?.issuedAtTick || 0); const removed = this.items.get(first); if (removed) this.statusCounts[removed.status] -= 1; this.#deindexOpen(removed); this.items.delete(first); this.openIds.delete(first); this.revision += 1; this.healthCache = null; } }
  health() { if (this.healthCache?.revision === this.revision) return this.healthCache.value; const due = this.items.size - this.statusCounts.OPEN, resolved = this.statusCounts.RESOLVED, value = Object.freeze({ total: this.items.size, open: this.statusCounts.OPEN, resolved, censored: this.statusCounts.CENSORED, invalidated: this.statusCounts.INVALIDATED, expiredUnobservable: this.statusCounts.EXPIRED_UNOBSERVABLE, resolutionRate: due ? resolved / due : 1 }); this.healthCache = { revision: this.revision, value }; return value; }
  #indexOpen(record) {
    const kind = this.observers.kind(record); if (kind === "world") this.openWorldIds.add(record.forecastId);
    if (kind === "production") { const key = productionKey(record), bucket = this.openProductionByKey.get(key) || { ids: [], stale: 0 }; const index = bucket.ids.length; bucket.ids.push(record.forecastId); this.openProductionByKey.set(key, bucket); this.openProductionIndexById.set(record.forecastId, { key, bucket, index }); }
  }
  #deindexOpen(record) {
    if (!record) return; this.openIds.delete(record.forecastId); this.openWorldIds.delete(record.forecastId);
    const location = this.openProductionIndexById.get(record.forecastId); if (!location) return; this.openProductionIndexById.delete(record.forecastId);
    const { key, bucket, index } = location; if (bucket.ids[index] != null) { bucket.ids[index] = null; bucket.stale += 1; }
    while (bucket.ids.length && bucket.ids.at(-1) == null) { bucket.ids.pop(); bucket.stale -= 1; }
    if (!bucket.ids.length) { this.openProductionByKey.delete(key); return; }
    if (bucket.stale > 64 && bucket.stale * 2 >= bucket.ids.length) this.#compactProductionBucket(key, bucket);
  }
  #latestProduction(ensembleId, modelId) {
    const key = `${ensembleId || "none"}|${modelId || "none"}`, bucket = this.openProductionByKey.get(key); if (!bucket) return null;
    while (bucket.ids.length) { const id = bucket.ids.at(-1), record = id == null ? null : this.items.get(id); if (record?.status === "OPEN") return record; if (id != null) this.openProductionIndexById.delete(id); bucket.ids.pop(); if (id == null) bucket.stale -= 1; }
    this.openProductionByKey.delete(key); return null;
  }
  #compactProductionBucket(key, bucket) { const ids = bucket.ids.filter(Boolean); bucket.ids = ids; bucket.stale = 0; for (let index = 0; index < ids.length; index += 1) this.openProductionIndexById.set(ids[index], { key, bucket, index }); }
}

function createObservationView({ observation, snapshot, simulation, tick }) {
  const snap = snapshot || legacySnapshot(simulation || {}), evidence = observation?.evidence || { get: () => null }, beliefs = observation?.beliefs || { records: [] };
  return {
    tick, snapshot: snap, evidence, beliefs,
    entity(id) { const key = String(id); return snap?.entities?.get?.(key) || snap?.entityByIdentityId?.get?.(key) || snap?.corpses?.get?.(key) || snap?.corpseByIdentityId?.get?.(key) || [...(snap?.corpses?.values?.() || [])].find(item => item.identityId === key) || null; },
    evidenceIds(predicate, subjectIds = []) { const records = beliefs.match?.({ predicate, subjectIds }) || beliefs.records.filter(item => item.predicate === predicate && subjectIds.every(id => item.subjectIds.includes(String(id)))); return records.flatMap(item => item.evidenceIds); }
  };
}

function legacySnapshot(simulation) {
  const entity = item => ({ ...item, identityId: item.id, position: { x: item.x, z: item.z }, velocity: { x: item.locomotion?.vx || 0, z: item.locomotion?.vz || 0 }, action: item.action || item.actionState || { key: item.actionKey }, plan: item.plan || item.needDependencyPlan || {}, physiology: item.physiology || item });
  return { simulationTick: simulation.tick || 0, worldRevision: null, entities: new Map((simulation.animals || []).map(item => [String(item.id), entity(item)])), corpses: new Map((simulation.corpses || []).map(item => [String(item.id), { ...entity(item), identityId: item.sourceId || item.id }])), cells: new Map((simulation.cells || []).map(item => [String(item.id), item])) };
}

export function probabilityCalibrationError(forecast, observedOutcome) { return Math.max(0, Math.min(1, 1 - Number(forecast.outcomes?.find(item => item.id === observedOutcome)?.probability || 0))); }
export { WORLD_FAMILIES, topOutcome };
