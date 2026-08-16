import { ontologyNeedId } from "./behaviour-ontology.js";

export const COMMITMENT_EPISODE_SCHEMA = 1;
export const TARGET_REF_SCHEMA = 1;
export const NEED_STATE_SCHEMA = 2;

const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, Number(value) || 0));
const finite = value => Number.isFinite(Number(value));
const clean = value => value == null ? null : String(value);
const pointKey = point => finite(point?.x) && finite(point?.z) ? `${Number(point.x).toFixed(3)},${Number(point.z).toFixed(3)}` : null;

export const PRECEDENCE = Object.freeze({
  "immediate-lethal": 5,
  "physiological-failure": 4,
  "dependent-critical": 3,
  "high-urgency": 2,
  ordinary: 1,
  optional: 0,
});

const DEFAULT_METHODS = Object.freeze({
  hydration: Object.freeze({ satisfierId: "surface-water", methodId: "drink-confirmed-shoreline", completionCondition: "hydration reaches acquisition target" }),
  nutrition: Object.freeze({ satisfierId: "graze-browse", methodId: "graze-local", completionCondition: "nutrition acquisition target reached" }),
  safety: Object.freeze({ satisfierId: "threat-monitoring", methodId: "vigilance", completionCondition: "perceived danger falls below the release threshold" }),
  thermal: Object.freeze({ satisfierId: "thermal-shelter", methodId: "seek-thermal-terrain", completionCondition: "thermal trend returns to the safe band" }),
  recovery: Object.freeze({ satisfierId: "reduce-exertion", methodId: "rest-safe", completionCondition: "required locomotion and physiological reserves recover" }),
  care: Object.freeze({ satisfierId: "caregiver-contact", methodId: "seek-caregiver", completionCondition: "care or dependency pressure falls below its release threshold" }),
  affiliation: Object.freeze({ satisfierId: "join-group", methodId: "join-compatible-group", completionCondition: "preferred relationship band is restored" }),
  participation: Object.freeze({ satisfierId: "follow-group-protocol", methodId: "coordinate-group-goal", completionCondition: "the bounded group protocol resolves" }),
  autonomy: Object.freeze({ satisfierId: "independent-travel", methodId: "independent-route", completionCondition: "autonomy pressure falls below its release threshold" }),
  reproduction: Object.freeze({ satisfierId: "courtship", methodId: "court-compatible-mate", completionCondition: "the reproductive episode resolves" }),
  information: Object.freeze({ satisfierId: "local-exploration", methodId: "bounded-exploration", completionCondition: "the bounded evidence question is resolved or search budget expires" }),
});

export function canonicalNeedId(value) {
  const text = String(value || "").toLowerCase();
  if (/rest|recover|sleep|fatigue|endurance|health|injur/.test(text)) return "recovery";
  return ontologyNeedId(value || "information");
}

export function createNeedState({ needId, amount = 1, urgency, pressure, trend = 0, predictedFailureHours = Infinity, confidence = .7, crossedBoundaries = [], tick = 0, evidenceIds = [] } = {}) {
  const normalizedAmount = clamp(amount), normalizedUrgency = finite(urgency) ? clamp(Number(urgency) / (Number(urgency) > 1 ? 100 : 1)) : 1 - normalizedAmount;
  return Object.freeze({ schema: NEED_STATE_SCHEMA, needId: canonicalNeedId(needId), amount: normalizedAmount, urgency: normalizedUrgency * 100, pressure: clamp(pressure ?? normalizedUrgency), trend: Number(trend) || 0, predictedFailureHours: finite(predictedFailureHours) ? Number(predictedFailureHours) : Infinity, confidence: clamp(confidence), crossedBoundaries: Object.freeze([...crossedBoundaries]), assessedTick: Number(tick) || 0, evidenceIds: Object.freeze([...new Set(evidenceIds.map(String))]) });
}

export function createSatisfierOption({ satisfierId, supports = [], impairs = [], expectedEffects = {}, confidence = .7, available = true, evidenceIds = [], methods = [], reason = null } = {}) {
  return Object.freeze({ schema: 1, satisfierId: clean(satisfierId), supports: Object.freeze([...supports]), impairs: Object.freeze([...impairs]), expectedEffects: Object.freeze({ ...expectedEffects }), confidence: clamp(confidence), available: Boolean(available), evidenceIds: Object.freeze([...new Set(evidenceIds.map(String))]), methods: Object.freeze(methods.map(method => Object.freeze({ ...method }))), reason });
}

function inferTargetKind(target = {}, needId = null) {
  if (target.targetKind) return String(target.targetKind);
  if (target.entityId || target.animalId) return needId === "safety" ? "perceived-threat" : "entity";
  if (target.carcassId) return "carcass";
  if (target.waterBodyId || target.waterCellId || needId === "hydration") return "water-body";
  if (target.patchId || target.vegetationId || needId === "nutrition") return "resource-patch";
  if (target.regionId) return "search-region";
  return "location";
}

function stableResourceIdentity(target = {}, kind) {
  const explicit = target.targetKey || target.resourceId || target.waterBodyId || target.waterCellId || target.carcassId || target.patchId || target.vegetationId || target.cellId || target.memoryId || target.entityId || target.animalId || target.regionId || target.id;
  if (explicit != null) return `${kind}:${explicit}`;
  const coordinates = pointKey(target);
  return coordinates ? `${kind}:${coordinates}` : null;
}

export function createTargetRef(target, { needId = null, targetKind = null, fallbackKey = null, tick = 0 } = {}) {
  if (!target && !fallbackKey) return null;
  const source = target || {}, kind = targetKind || inferTargetKind(source, canonicalNeedId(needId));
  const targetKey = clean(source.targetKey || fallbackKey || stableResourceIdentity(source, kind));
  if (!targetKey) return null;
  const evidenceIds = source.sourceEvidenceIds || source.evidenceIds || (source.evidenceId ? [source.evidenceId] : []);
  return Object.freeze({
    schema: TARGET_REF_SCHEMA,
    targetKey,
    targetKind: kind,
    entityId: clean(source.entityId || source.animalId),
    resourceId: clean(source.resourceId || source.waterBodyId || source.waterCellId || source.carcassId || source.patchId || source.vegetationId || source.id),
    cellId: clean(source.cellId || source.waterCellId),
    contactId: clean(source.contactId || source.contactReservationKey || source.reservationKey),
    regionId: clean(source.regionId),
    position: finite(source.x) && finite(source.z) ? Object.freeze({ x: Number(source.x), z: Number(source.z) }) : source.position && finite(source.position.x) && finite(source.position.z) ? Object.freeze({ x: Number(source.position.x), z: Number(source.position.z) }) : null,
    exact: Boolean(source.exact), confidence: clamp(source.confidence ?? 1), lastConfirmedTick: Number(source.lastConfirmedTick ?? source.observationTick ?? tick) || 0,
    sourceEvidenceIds: Object.freeze([...new Set(evidenceIds.map(String))]),
  });
}

export function targetIdentityEqual(left, right) {
  return (left?.targetKey || null) === (right?.targetKey || null);
}

export function createMethodCandidate(candidate = {}) {
  const needId = canonicalNeedId(candidate.needId || candidate.need || candidate.drive), targetRef = createTargetRef(candidate.targetRef || candidate.target, { needId, fallbackKey: candidate.targetKey, tick: candidate.tick });
  const defaults = DEFAULT_METHODS[needId] || DEFAULT_METHODS.information;
  const precedenceClass = PRECEDENCE[candidate.precedenceClass] != null ? candidate.precedenceClass : candidate.deathIfUnsatisfied ? "physiological-failure" : candidate.immediateLethal ? "immediate-lethal" : candidate.urgent ? "high-urgency" : "ordinary";
  return Object.freeze({ ...candidate, needId, satisfierId: clean(candidate.satisfierId || defaults.satisfierId), methodId: clean(candidate.methodId || candidate.method || defaults.methodId), targetRef, targetKey: targetRef?.targetKey || null, completionCondition: candidate.completionCondition || defaults.completionCondition, precedenceClass, candidateScore: Number(candidate.candidateScore ?? candidate.score ?? 0), viable: candidate.viable !== false, blockedReasons: Object.freeze([...(candidate.blockedReasons || [])]), confidence: clamp(candidate.confidence ?? 1) });
}

export function commitmentIdentity(value = {}) {
  return [canonicalNeedId(value.needId || value.need || value.priority || value.drive), clean(value.satisfierId) || "none", clean(value.methodId || value.method) || "none", value.targetRef?.targetKey || clean(value.targetKey) || "none"].join("|");
}

// The target is deliberately excluded here. A refreshed observation or a more
// precise contact point must not make an otherwise identical method disappear
// from commitment hysteresis before target-retention policy has evaluated it.
export function commitmentMethodIdentity(value = {}) {
  return [canonicalNeedId(value.needId || value.need || value.priority || value.drive), clean(value.satisfierId) || "none", clean(value.methodId || value.method) || "none"].join("|");
}

export function createCommitmentEpisode(candidate, { animalId = "animal", tick = 0, sequence = 1, commitTicks = 1, previous = null } = {}) {
  // A commitment owns a biological need, satisfier and method. Targets are
  // replaceable execution details inside that commitment (lake search region
  // -> confirmed shoreline, one carcass -> another viable carcass, etc.).
  // Coupling episode identity to target identity regenerated IDs and minimum
  // holds during ordinary target refinement.
  const normalized = createMethodCandidate(candidate), same = previous && commitmentMethodIdentity(previous) === commitmentMethodIdentity(normalized), startedTick = same ? Number(previous.startedTick) : Number(tick);
  return Object.freeze({
    schema: COMMITMENT_EPISODE_SCHEMA, commitmentId: same ? previous.commitmentId : `commitment:${animalId}:${sequence}`, animalId: String(animalId),
    needId: normalized.needId, satisfierId: normalized.satisfierId, methodId: normalized.methodId, targetRef: normalized.targetRef, targetKey: normalized.targetKey,
    precedenceClass: normalized.precedenceClass, candidateScore: normalized.candidateScore, status: same ? previous.status : "active", phase: candidate.phase || previous?.phase || "evaluate",
    startedTick, minimumReviewTick: same ? Number(previous.minimumReviewTick) : Number(tick) + Math.max(1, Number(commitTicks || candidate.commitTicks) || 1), lastReviewedTick: Number(tick), lastProgressTick: same ? Number(previous.lastProgressTick ?? tick) : Number(tick),
    progress: same ? Number(previous.progress || 0) : 0, confidence: normalized.confidence, suspension: same ? previous.suspension || null : null,
    switchCount: Number(previous?.switchCount || 0) + Number(Boolean(previous && !same)), targetChangeCount: Number(previous?.targetChangeCount || 0) + Number(Boolean(previous && previous.targetKey !== normalized.targetKey)), phaseChangeCount: Number(previous?.phaseChangeCount || 0) + Number(Boolean(same && previous.phase !== candidate.phase)), routeReplanCount: Number(previous?.routeReplanCount || 0),
    completionCondition: candidate.completionCondition || previous?.completionCondition || null,
  });
}

export function candidatePrecedence(candidate) { return PRECEDENCE[candidate?.precedenceClass] ?? PRECEDENCE.ordinary; }

export function shouldReplaceCommitment(incumbent, challenger, { tick = 0, blocked = false, targetInvalid = false, routeUnavailable = false, stalled = false, etaIncreaseRatio = 0, switchThreshold = 0 } = {}) {
  if (!incumbent) return Object.freeze({ replace: true, reason: "no incumbent commitment" });
  if (!challenger) return Object.freeze({ replace: false, reason: "no viable challenger" });
  if (blocked || targetInvalid || routeUnavailable || stalled || etaIncreaseRatio >= .35) return Object.freeze({ replace: true, reason: targetInvalid ? "incumbent target invalid" : routeUnavailable ? "incumbent route unavailable" : stalled ? "incumbent made negligible progress" : etaIncreaseRatio >= .35 ? "incumbent ETA deteriorated by at least 35%" : "incumbent method blocked" });
  const precedenceDelta = candidatePrecedence(challenger) - candidatePrecedence(incumbent);
  if (precedenceDelta > 0) return Object.freeze({ replace: true, reason: `challenger has higher ${challenger.precedenceClass} precedence` });
  if (precedenceDelta < 0) return Object.freeze({ replace: false, reason: "incumbent has higher precedence" });
  if (challenger.urgent && Number(challenger.candidateScore || 0) > Number(incumbent.candidateScore || 0)) return Object.freeze({ replace: true, reason: "stronger urgent challenger within the same precedence class" });
  if (Number(tick) < Number(incumbent.minimumReviewTick || -Infinity)) return Object.freeze({ replace: false, reason: "incumbent remains inside its minimum hold" });
  const improvement = Number(challenger.candidateScore || 0) - Number(incumbent.candidateScore || 0);
  return Object.freeze({ replace: improvement > switchThreshold, reason: improvement > switchThreshold ? "challenger exceeded the switching threshold" : "challenger did not exceed the switching threshold", improvement, switchThreshold });
}
