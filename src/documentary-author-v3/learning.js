const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, Number(value) || 0));
const canonical = value => { const visit = item => Array.isArray(item) ? item.map(visit) : item && typeof item === "object" ? Object.fromEntries(Object.keys(item).sort().map(key => [key, visit(item[key])])) : item; return JSON.stringify(visit(value)); };
const checksum = value => { let hash = 2166136261; for (const character of canonical(value)) { hash ^= character.charCodeAt(0); hash = Math.imul(hash, 16777619); } return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`; };
const contextKey = context => [context?.scene?.kind || context?.sceneKind || "unknown", context?.simulationMethodId || context?.methodId || "none", context?.phase || "none", context?.preset || "classic", context?.subjectCount > 2 ? "group" : context?.subjectCount ? "single" : "world"].join("|");
const CAPABILITIES = Object.freeze({
  OBSERVING: new Set(["RECORD"]),
  CALIBRATING: new Set(["RECORD", "CALIBRATE_WORLD"]),
  SHADOW_POLICY: new Set(["RECORD", "CALIBRATE_WORLD", "PROPOSE_POLICY", "LEARN_EXECUTED_POLICY"]),
  BOUNDED_ACTIVE: new Set(["RECORD", "CALIBRATE_WORLD", "PROPOSE_POLICY", "LEARN_EXECUTED_POLICY", "CONTROL_BOUNDED"]),
  VALIDATED_ACTIVE: new Set(["RECORD", "CALIBRATE_WORLD", "PROPOSE_POLICY", "LEARN_EXECUTED_POLICY", "CONTROL_BOUNDED", "CONTROL_VALIDATED"])
});

const emptyCalibration = () => ({ alpha: 2, beta: 2, samples: 0, meanError: 0, meanAbsoluteError: 0, meanBrier: 0, meanLogLoss: 0, outcomes: {}, continuous: {} });
const parseJson = raw => { try { return JSON.parse(raw || "null"); } catch { return null; } };
const boundedQuantiles = (prior = {}, value, maximum = 64) => {
  let values = [...(prior.values || []), Number(value)].filter(Number.isFinite).sort((left, right) => left - right);
  if (values.length > maximum) values = Array.from({ length: maximum }, (_, index) => values[Math.round(index * (values.length - 1) / Math.max(1, maximum - 1))]);
  const at = probability => values.length ? values[Math.round(probability * (values.length - 1))] : 0;
  return { values, p10: at(.1), p50: at(.5), p90: at(.9), p95: at(.95) };
};

export function lifecycleAllows(lifecycle, capability) { return CAPABILITIES[lifecycle]?.has(capability) || false; }

export class CalibrationStore {
  constructor(snapshot = {}) { this.records = new Map(Object.entries(snapshot.records || {})); }
  key(modelId, context = {}) { return `${modelId}::${contextKey(context)}`; }
  parentKey(modelId) { return `${modelId}::*`; }
  record(modelId, context = {}) { return this.records.get(this.key(modelId, context)) || this.records.get(this.parentKey(modelId)) || emptyCalibration(); }
  reliability(modelId, context = {}) { const item = this.record(modelId, context); return item.alpha / Math.max(1, item.alpha + item.beta); }
  update(modelId, context, { success, weight = 1, error = null, brier = null, logLoss = null, continuousErrors = {}, observedOutcome = null } = {}) {
    const apply = key => { const previous = { ...emptyCalibration(), ...(this.records.get(key) || {}) }, boundedWeight = clamp(weight, 0, 1), samples = previous.samples + boundedWeight, signedError = Number(error || 0), outcomes = { ...(previous.outcomes || {}) }, continuous = { ...(previous.continuous || {}) }; if (observedOutcome) outcomes[observedOutcome] = Number(outcomes[observedOutcome] || 1) + boundedWeight; for (const [name, value] of Object.entries(continuousErrors || {})) { if (!Number.isFinite(Number(value))) continue; const old = continuous[name] || { samples: 0, mean: 0, m2: 0, maximumAbsolute: 0, quantiles: {} }, count = old.samples + boundedWeight, delta = Number(value) - old.mean, mean = old.mean + boundedWeight * delta / Math.max(1, count), m2 = old.m2 + boundedWeight * delta * (Number(value) - mean); continuous[name] = { samples: count, mean, m2, variance: count > 1 ? m2 / (count - 1) : 0, maximumAbsolute: Math.max(old.maximumAbsolute || 0, Math.abs(Number(value))), quantiles: boundedQuantiles(old.quantiles, value) }; } this.records.set(key, { alpha: previous.alpha + boundedWeight * Number(Boolean(success)), beta: previous.beta + boundedWeight * Number(!success), samples, meanError: previous.meanError + (signedError - previous.meanError) * boundedWeight / Math.max(1, samples), meanAbsoluteError: previous.meanAbsoluteError + (Math.abs(signedError) - previous.meanAbsoluteError) * boundedWeight / Math.max(1, samples), meanBrier: brier == null ? previous.meanBrier : previous.meanBrier + (Number(brier) - previous.meanBrier) * boundedWeight / Math.max(1, samples), meanLogLoss: logLoss == null ? previous.meanLogLoss : previous.meanLogLoss + (Number(logLoss) - previous.meanLogLoss) * boundedWeight / Math.max(1, samples), outcomes, continuous }); };
    apply(this.key(modelId, context)); apply(this.parentKey(modelId)); return this.record(modelId, context);
  }
  calibrate(modelId, context, outcomes = []) { const record = this.record(modelId, context), samples = record.samples || 0; if (!samples || !outcomes.length) return outcomes; const labels = outcomes.map(item => item.id), total = labels.reduce((sum, id) => sum + Number(record.outcomes?.[id] || 1), 0), reliability = this.reliability(modelId, context), lambda = Math.min(.65, samples / 20) * reliability, blended = outcomes.map(item => ({ ...item, rawProbability: item.rawProbability ?? item.probability, probability: (1 - lambda) * Number(item.probability || 0) + lambda * Number(record.outcomes?.[item.id] || 1) / Math.max(1, total) })), normalization = blended.reduce((sum, item) => sum + item.probability, 0) || 1; return blended.map(item => Object.freeze({ ...item, calibratedProbability: item.probability / normalization, probability: item.probability / normalization })); }
  snapshot() { return { records: Object.fromEntries(this.records) }; }
}

export class BoundedPolicyLearner {
  constructor(snapshot = {}, { maximumDeltaPerUpdate = .025, maximumAbsoluteAdjustment = .2, minimumSamples = 4 } = {}) { this.records = new Map(Object.entries(snapshot.records || {})); this.maximumDeltaPerUpdate = maximumDeltaPerUpdate; this.maximumAbsoluteAdjustment = maximumAbsoluteAdjustment; this.minimumSamples = minimumSamples; }
  key(action, context = {}) { return `${action}::${contextKey(context)}`; }
  adjustment(action, context = {}) { const item = this.records.get(this.key(action, context)); return item && item.samples >= this.minimumSamples ? item.adjustment : 0; }
  update(action, context, reward, { weight = 1 } = {}) { const key = this.key(action, context), previous = this.records.get(key) || { samples: 0, meanReward: 0, adjustment: 0 }, boundedReward = clamp(reward, -1, 1), boundedWeight = clamp(weight, 0, 1), samples = previous.samples + boundedWeight, meanReward = previous.meanReward + (boundedReward - previous.meanReward) * boundedWeight / Math.max(1, samples), delta = clamp(meanReward * this.maximumDeltaPerUpdate, -this.maximumDeltaPerUpdate, this.maximumDeltaPerUpdate), adjustment = clamp(previous.adjustment + delta, -this.maximumAbsoluteAdjustment, this.maximumAbsoluteAdjustment); const item = { samples, meanReward, adjustment }; this.records.set(key, item); return item; }
  snapshot() { return { records: Object.fromEntries(this.records) }; }
}

export class OperatorPreferenceStore {
  constructor(snapshot = {}) { this.characters = new Map(Object.entries(snapshot.characters || {})); this.actions = new Map(Object.entries(snapshot.actions || {})); }
  character(id) { return clamp(this.characters.get(id) || 0, -1, 1); }
  markCharacter(id, value = 1) { if (!id) return; this.characters.set(id, clamp(this.character(id) + value, -1, 1)); }
  action(action, context = {}) { return clamp(this.actions.get(`${action}::${contextKey(context)}`) || 0, -1, 1); }
  markAction(action, context, value) { const key = `${action}::${contextKey(context)}`; this.actions.set(key, clamp((this.actions.get(key) || 0) + value, -1, 1)); }
  snapshot() { return { characters: Object.fromEntries(this.characters), actions: Object.fromEntries(this.actions) }; }
}

export class ProductionFaultStore {
  constructor(snapshot = {}) { this.records = new Map(Object.entries(snapshot.records || {})); }
  key(component, variant = "global") { return `${component}::${variant || "global"}`; }
  record(report = {}) { const confirmed = report.corroboration?.status === "CONFIRMED_BY_TELEMETRY", partial = report.corroboration?.status === "PARTIALLY_CONFIRMED", weight = confirmed ? 1 : partial ? .35 : 0; if (!weight) return []; const family = report.capture?.family || "global", components = []; for (const code of report.faultCodes || []) { const component = /CAMERA|SUBJECT_OUT_OF_FRAME|EXCESSIVE_(ZOOM|CUTTING)/.test(code) ? "camera-family" : /NARRATION|FACTUAL|UNSUPPORTED|VOICE/.test(code) ? "narration" : /EVENT|STORY|TERRAIN|ENTITY|SUBJECT/.test(code) ? "story-selection" : "technical", variant = component === "camera-family" ? family : code, key = this.key(component, variant), previous = this.records.get(key) || { confirmed: 0, partial: 0, penalty: 0, quarantined: false }, confirmedCount = previous.confirmed + Number(confirmed), partialCount = previous.partial + Number(partial), penalty = clamp(previous.penalty - .06 * weight, -.24, 0), quarantined = previous.quarantined || report.severity === "UNUSABLE" && confirmed || confirmedCount >= 2; const next = { confirmed: confirmedCount, partial: partialCount, penalty, quarantined, lastCode: code, updatedAt: Date.now() }; this.records.set(key, next); components.push({ component, variant, ...next }); } return components; }
  penalty(component, variant) { return this.records.get(this.key(component, variant))?.penalty || 0; }
  quarantined(component, variant) { return Boolean(this.records.get(this.key(component, variant))?.quarantined); }
  snapshot() { return { records: Object.fromEntries(this.records) }; }
}

export class AuthorLearningProfile {
  constructor(snapshot = {}) { this.schema = 2; this.registryVersion = 2; this.lifecycle = snapshot.lifecycle || "OBSERVING"; this.familyLifecycles = { ...(snapshot.familyLifecycles || {}) }; this.componentLifecycles = { ...(snapshot.componentLifecycles || {}) }; this.calibration = new CalibrationStore(snapshot.calibration); this.policy = new BoundedPolicyLearner(snapshot.policy); this.production = new BoundedPolicyLearner(snapshot.production, { maximumDeltaPerUpdate: .015, maximumAbsoluteAdjustment: .12, minimumSamples: 6 }); this.preferences = new OperatorPreferenceStore(snapshot.preferences); this.faults = new ProductionFaultStore(snapshot.faults); this.learningEvents = Array.isArray(snapshot.learningEvents) ? snapshot.learningEvents.slice(-500) : []; this.revision = Number(snapshot.revision || 0); this.validated = Boolean(snapshot.validated); this.validationCertificate = snapshot.validationCertificate || null; this.profileChecksum = snapshot.profileChecksum || null; this.refreshCapabilities(); }
  refreshCapabilities() { this.capabilities = new CapabilityMatrix({ defaultLifecycle: this.lifecycle, families: this.familyLifecycles, components: this.componentLifecycles, certificate: this.validationCertificate, profileRevision: this.revision, registryVersion: this.registryVersion }); return this.capabilities; }
  allows(capability, context = {}) { this.refreshCapabilities(); return this.capabilities.allows(capability, context); }
  resolveForecast({ forecast, resolution, context = {}, attributable = true } = {}) {
    if (!forecast || !resolution || resolution.status !== "RESOLVED" || !attributable) return { updated: false, reason: "forecast-not-resolvable" };
    if (!this.allows("MUTATE_CALIBRATION", { family: forecast.family || context.family })) return { updated: false, reason: "lifecycle-read-only" };
    const outcomes = forecast.outcomes || [], observed = resolution.observedOutcome, assigned = outcomes.find(item => item.id === observed)?.probability ?? 0, predicted = [...outcomes].sort((a, b) => b.probability - a.probability)[0]?.id, brier = resolution.brierScore ?? outcomes.reduce((sum, item) => sum + Math.pow(Number(item.probability || 0) - Number(item.id === observed), 2), 0), success = predicted === observed;
    const record = this.calibration.update(forecast.modelId, context, { success, weight: resolution.attributionWeight ?? 1, error: resolution.continuousError || 0, brier, logLoss: resolution.logLoss, continuousErrors: resolution.continuousErrors, observedOutcome: observed }); this.revision += 1; this.refreshCapabilities(); const event = this.recordEvent({ type: "FORECAST_CALIBRATED", forecastId: forecast.forecastId, modelId: forecast.modelId, family: forecast.family || context.family || null, observedOutcome: observed, probabilityAssigned: assigned, brier, logLoss: resolution.logLoss ?? null, continuousErrors: resolution.continuousErrors || {}, success }); return { updated: true, success, brier, record, event };
  }
  resolveProduction({ decision, context = {}, actual = {}, attributable = true, executed = true } = {}) {
    if (!decision || !attributable || !executed) return { updated: false, reason: !executed ? "unexecuted-action" : "unattributable" };
    if (!this.allows("LEARN_EXECUTED_POLICY", { component: actual.component || "production-policy" })) return { updated: false, reason: "lifecycle-read-only" };
    const camera = clamp(actual.cameraQualityMean ?? .5), newInformation = actual.newClaimsShown ? .2 : 0, resolved = actual.questionResolved ? .15 : 0, duplicate = clamp(actual.semanticDuplication || 0), missed = clamp(actual.criticalEventsMissed || 0), invalid = clamp(actual.invalidPoseFraction || 0), reward = clamp(camera + newInformation + resolved - duplicate - missed - invalid, -1, 1), weight = actual.partial ? .35 : 1, record = this.policy.update(decision.action, context, reward, { weight }), components = [];
    for (const [kind, value] of [["CAMERA_FAMILY", actual.cameraFamily], ["SHOT_SIZE", actual.shotSize], ["NARRATION_FUNCTION", actual.narrationFunction]]) if (value) components.push({ kind, value, record: this.production.update(`${kind}:${value}`, context, reward, { weight }) });
    this.revision += 1; this.refreshCapabilities(); const event = this.recordEvent({ type: "EXECUTED_POLICY_LEARNED", decisionId: decision.decisionId, reward, action: decision.action, components: components.map(item => ({ kind: item.kind, value: item.value })) }); return { updated: true, reward, record, components, event };
  }
  resolve(input = {}) { if (input.forecast && input.resolution) return this.resolveForecast(input); return this.resolveProduction({ decision: input.decision, context: input.context, actual: input.actual, attributable: input.attributable, executed: input.executed !== false }); }
  recordProductionFault(report = {}) { if (!report?.faultCodes?.length) return { updated: false, reason: "invalid-fault" }; if (!this.allows("LEARN_EXECUTED_POLICY", { component: "fault-learning" })) return { updated: false, reason: "lifecycle-read-only" }; const components = this.faults.record(report); if (!components.length) return { updated: false, reason: "fault-not-corroborated" }; this.revision += 1; const event = this.recordEvent({ type: "PRODUCTION_FAULT_LEARNED", reportId: report.reportId, components }); return { updated: true, components, event }; }
  recordEvent(event) { const entry = { at: Date.now(), ...event }; this.learningEvents.push(entry); this.learningEvents = this.learningEvents.slice(-500); return entry; }
  snapshot({ includeChecksum = true } = {}) { const value = { schema: this.schema, registryVersion: this.registryVersion, lifecycle: this.lifecycle, familyLifecycles: { ...this.familyLifecycles }, componentLifecycles: { ...this.componentLifecycles }, calibration: this.calibration.snapshot(), policy: this.policy.snapshot(), production: this.production.snapshot(), preferences: this.preferences.snapshot(), faults: this.faults.snapshot(), learningEvents: this.learningEvents.slice(-500), revision: this.revision, validated: this.validated, validationCertificate: this.validationCertificate }; return includeChecksum ? { ...value, profileChecksum: checksum(value) } : value; }
  verify() { return this.profileChecksum == null || this.profileChecksum === checksum(this.snapshot({ includeChecksum: false })); }
}

export class BrowserAuthorProfileStore {
  constructor({ key = "rss-acss-documentary-author-profile-v2", storage = globalThis.localStorage, profileId = "default", indexedStore = null } = {}) { this.key = key; this.storage = storage; this.profileId = profileId; this.indexedStore = indexedStore || new IndexedDbAuthorProfileStore(); this.quarantined = null; this.pendingCommit = Promise.resolve(); }
  parse(raw) { try { const parsed = JSON.parse(raw || "null"); if (!parsed) return null; if (parsed.schema !== 2 || parsed.registryVersion !== 2) { this.quarantined = parsed; return null; } const profile = new AuthorLearningProfile(parsed); if (!profile.verify()) { this.quarantined = parsed; return null; } return profile; } catch { return null; } }
  load() { const current = this.storage?.getItem(this.key), parsed = this.parse(current); if (parsed) return parsed; if (current) { const previous = this.parse(this.storage?.getItem(`${this.key}:previous`)); if (previous) { try { this.storage?.setItem(`${this.key}:quarantined`, current); this.storage?.setItem(this.key, JSON.stringify(previous.snapshot())); } catch {} return previous; } } const manifest = parseJson(this.storage?.getItem(`${this.key}:manifest`)); for (const revision of [...(manifest?.revisions || [])].sort((a, b) => b - a)) { const profile = this.parse(this.storage?.getItem(`${this.key}:revision:${revision}`)); if (profile) return profile; } return new AuthorLearningProfile(); }
  async loadAsync() { if (!this.indexedStore.available()) return this.load(); try { const snapshot = await this.indexedStore.load(this.profileId); if (!snapshot) { const legacy = this.parse(this.storage?.getItem(this.key)); if (legacy) { await this.indexedStore.commit(this.profileId, legacy.snapshot()); return legacy; } return new AuthorLearningProfile(); } validateProfileBounds(snapshot); const profile = new AuthorLearningProfile(snapshot); if (!profile.verify()) throw new TypeError("IndexedDB profile checksum mismatch"); return profile; } catch (error) { await this.indexedStore.quarantine(this.profileId, null, error.message).catch(() => false); return this.load(); } }
  save(profile) { try { const current = this.storage?.getItem(this.key), snapshot = profile.snapshot(), next = JSON.stringify(snapshot); if (current === next && !this.indexedStore.available()) return true; validateProfileBounds(snapshot); if (this.indexedStore.available()) { this.pendingCommit = this.pendingCommit.then(() => this.indexedStore.commit(this.profileId, snapshot)).catch(error => { this.quarantined = { snapshot, reason: error.message }; return false; }); this.storage?.setItem(`${this.key}:selection`, JSON.stringify({ profileId: this.profileId, revision: snapshot.revision, checksum: snapshot.profileChecksum })); } else { const revisionKey = `${this.key}:revision:${snapshot.revision}`; this.storage?.setItem(revisionKey, next); const verified = this.parse(this.storage?.getItem(revisionKey)); if (!verified) throw new TypeError("profile revision read-back failed"); const manifest = parseJson(this.storage?.getItem(`${this.key}:manifest`)) || { currentRevision: null, revisions: [] }, revisions = [...new Set([...(manifest.revisions || []), snapshot.revision])].sort((a, b) => a - b).slice(-32); this.storage?.setItem(`${this.key}:manifest`, JSON.stringify({ schema: 1, currentRevision: snapshot.revision, revisions, checksum: snapshot.profileChecksum })); if (current) this.storage?.setItem(`${this.key}:previous`, current); this.storage?.setItem(this.key, next); } profile.profileChecksum = snapshot.profileChecksum; return true; } catch { return false; } }
  async flush() { await this.pendingCommit; return true; }
  backup() { try { const current = this.storage?.getItem(this.key); if (!current) return false; this.storage?.setItem(`${this.key}:previous`, current); return true; } catch { return false; } }
  rollback() { try { const previous = this.storage?.getItem(`${this.key}:previous`), profile = this.parse(previous); if (!profile) return null; const current = this.storage?.getItem(this.key); if (current) this.storage?.setItem(`${this.key}:rolled-forward`, current); this.storage?.setItem(this.key, previous); return profile; } catch { return null; } }
  async rollbackAsync(revision = null) { if (!this.indexedStore.available()) return this.rollback(); try { const snapshot = await this.indexedStore.rollback(this.profileId, revision); if (!snapshot) return null; validateProfileBounds(snapshot); const profile = new AuthorLearningProfile(snapshot); return profile.verify() ? profile : null; } catch { return null; } }
  reset() { try { const current = this.storage?.getItem(this.key); if (current) this.storage?.setItem(`${this.key}:previous`, current); this.storage?.removeItem(this.key); return true; } catch { return false; } }
}

export function attributeOutcome({ decision, actual = {}, interruption = null } = {}) {
  const errors = [];
  if (interruption && !["CRITICAL_EVENT", "SUBJECT_LOST", "CAMERA_INVALID"].includes(interruption)) errors.push("EXTERNAL_INTERRUPTION");
  if ((actual.unsupportedClaims || 0) > 0) errors.push("NARRATION_REALISATION_ERROR");
  if ((actual.criticalEventsMissed || 0) > 0) errors.push("STORY_SELECTION_ERROR");
  if ((actual.cameraQualityMean ?? 1) < .35) errors.push("CAMERA_EXECUTION_ERROR");
  if ((actual.semanticDuplication || 0) >= .5) errors.push("AUDIENCE_MODEL_ERROR");
  return { attributable: !errors.includes("EXTERNAL_INTERRUPTION"), decisionId: decision?.decisionId || null, errors };
}

function validateProfileBounds(snapshot) {
  if (snapshot.schema !== 2 || snapshot.registryVersion !== 2) throw new TypeError("unsupported profile schema");
  if (!Number.isInteger(snapshot.revision) || snapshot.revision < 0) throw new TypeError("invalid profile revision");
  for (const record of Object.values(snapshot.policy?.records || {})) if (Math.abs(Number(record.adjustment || 0)) > .200001) throw new TypeError("policy adjustment outside safety bound");
  for (const record of Object.values(snapshot.production?.records || {})) if (Math.abs(Number(record.adjustment || 0)) > .120001) throw new TypeError("production adjustment outside safety bound");
  if (snapshot.lifecycle === "VALIDATED_ACTIVE") {
    const result = validateCertificate(snapshot.validationCertificate, { profileRevision: snapshot.revision, registryVersion: snapshot.registryVersion, requiredCapabilities: ["CONTROL_VALIDATED"] });
    if (!result.valid) throw new TypeError(`invalid validation certificate: ${result.errors.join(", ")}`);
  }
  return true;
}
import { CapabilityMatrix } from "../documentary-author/runtime/capability-matrix.js";
import { validateCertificate } from "../documentary-author/learning/validation-certificate.js";
import { IndexedDbAuthorProfileStore } from "../documentary-author/persistence/indexeddb-profile-store.js";
