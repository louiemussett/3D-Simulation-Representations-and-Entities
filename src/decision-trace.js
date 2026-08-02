import { observableBodyCues } from "./observable-body-cues.js";

export const ACCESS_MODES = Object.freeze(["laboratory", "selected-self", "observable-other", "strategic"]);
export const DECISION_TRACE_EVIDENCE_LIMIT = 32;

function fallbackClone(value, seen = new WeakMap()) {
  if (value == null || typeof value !== "object") return value;
  if (seen.has(value)) return seen.get(value);
  const copy = Array.isArray(value) ? [] : {};
  seen.set(value, copy);
  if (Array.isArray(value)) {
    for (const item of value) copy.push(fallbackClone(item, seen));
  } else {
    for (const [key, item] of Object.entries(value)) if (typeof item !== "function" && typeof item !== "symbol") copy[key] = fallbackClone(item, seen);
  }
  return copy;
}

function clone(value) {
  if (value == null) return value;
  if (typeof globalThis.structuredClone === "function") {
    try { return globalThis.structuredClone(value); } catch { /* fall through for non-cloneable presentation fields */ }
  }
  return fallbackClone(value);
}

function immutableProjection(value, { maxDepth = 4, maxArrayLength = 32, maxObjectKeys = 32, maxStringLength = 512 } = {}, depth = 0, seen = new WeakSet()) {
  if (value == null || typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "string") return value.length <= maxStringLength ? value : value.slice(0, maxStringLength);
  if (typeof value !== "object" || depth >= maxDepth || seen.has(value)) return null;
  seen.add(value);
  if (Array.isArray(value)) {
    const projected = value.slice(0, maxArrayLength).map((item) => immutableProjection(item, { maxDepth, maxArrayLength, maxObjectKeys, maxStringLength }, depth + 1, seen));
    seen.delete(value);
    return Object.freeze(projected);
  }
  const projected = {};
  for (const key of Object.keys(value).slice(0, maxObjectKeys)) {
    const item = value[key];
    if (typeof item === "function" || typeof item === "symbol" || item === undefined) continue;
    projected[key] = immutableProjection(item, { maxDepth, maxArrayLength, maxObjectKeys, maxStringLength }, depth + 1, seen);
  }
  seen.delete(value);
  return Object.freeze(projected);
}

export function evidenceRef(contact, tick, overrides = {}) {
  const originalChannel = overrides.originalChannel ?? contact.originalChannel ?? contact.channel ?? "inference";
  const channel = overrides.channel ?? contact.channel ?? "inference";
  const provenance = overrides.provenance ?? (channel === "memory" ? "memory" : channel === "hearing" || channel === "visual-signal" ? "communication" : ["sight", "smell"].includes(channel) ? "perception" : channel);
  const ref = {
    evidenceId: overrides.evidenceId || contact.evidenceId || `${tick}:${channel}:${contact.type || "evidence"}:${contact.targetId || contact.communicatedBy || `${contact.x ?? "?"},${contact.z ?? "?"}`}`,
    type: contact.type || "evidence", targetId: contact.targetId ?? null,
    x: Number.isFinite(contact.x) ? contact.x : null, z: Number.isFinite(contact.z) ? contact.z : null,
    confidence: Math.max(0, Math.min(1, Number(contact.confidence ?? 0))), age: Number(contact.age || 0),
    channel, provenance, originalChannel, uncertainty: Number(contact.uncertainty ?? 1 - (contact.confidence ?? 0)),
    signalKind: contact.signalKind ?? null, communicatedBy: contact.communicatedBy ?? null,
    soundIdentity: contact.soundIdentity ?? null, observedTick: contact.observedTick ?? tick,
    identifiedSpecies: contact.identifiedSpecies ?? null, speciesId: contact.speciesId ?? null,
    coarseClass: contact.coarseClass ?? null, identifiedIndividual: contact.identifiedIndividual ?? null,
    detectedMotion: contact.detectedMotion == null ? null : Boolean(contact.detectedMotion),
    vx: Number.isFinite(contact.vx) ? contact.vx : null, vz: Number.isFinite(contact.vz) ? contact.vz : null,
    velocityConfidence: Number.isFinite(contact.velocityConfidence) ? Math.max(0, Math.min(1, contact.velocityConfidence)) : 0,
    heading: Number.isFinite(contact.heading) ? contact.heading : null,
    headHeading: Number.isFinite(contact.headHeading) ? contact.headHeading : null,
    bearing: Number.isFinite(contact.bearing) ? contact.bearing : null,
    region: contact.region && typeof contact.region === "object" ? immutableProjection(contact.region, { maxDepth: 3, maxArrayLength: 12, maxObjectKeys: 16 }) : contact.region ?? null, occlusionReason: contact.occlusionReason ?? null,
    apparentMass: Number.isFinite(contact.apparentMass) ? contact.apparentMass : null,
    bodyCues: contact.bodyCues ? immutableProjection(contact.bodyCues, { maxDepth: 3, maxArrayLength: 12, maxObjectKeys: 24 }) : null
  };
  return Object.freeze(ref);
}

export function memoryEvidence(contact, tick) {
  return evidenceRef(contact, tick, { channel: "memory", provenance: "memory", originalChannel: contact.originalChannel || contact.channel });
}

export function evidenceCaption(ref) {
  const age = ref.age > 0 ? `, age ${Math.round(ref.age)} ticks` : "";
  const uncertainty = ref.uncertainty > .2 ? `, uncertainty ${Math.round(ref.uncertainty * 100)}%` : "";
  if (ref.channel === "memory") return `remembered ${ref.originalChannel || "evidence"}${age}${uncertainty}`;
  if (ref.channel === "sight") return `current sight${uncertainty}`;
  if (ref.channel === "smell") return `current smell${uncertainty}`;
  if (ref.channel === "hearing") return `heard event${uncertainty}`;
  if (ref.provenance === "internal") return "internal state";
  return `${ref.provenance} evidence${age}${uncertainty}`;
}

export function captureDecisionTrace({ tick, priority, trigger, actionState, evidence = [], primaryEvidenceId = null, constraints = [] }) {
  const boundedEvidence = evidence.slice(0, DECISION_TRACE_EVIDENCE_LIMIT);
  if (primaryEvidenceId && !boundedEvidence.some((item) => item?.evidenceId === primaryEvidenceId)) {
    const primary = evidence.find((item) => item?.evidenceId === primaryEvidenceId);
    if (primary) {
      if (boundedEvidence.length >= DECISION_TRACE_EVIDENCE_LIMIT) boundedEvidence[DECISION_TRACE_EVIDENCE_LIMIT - 1] = primary;
      else boundedEvidence.push(primary);
    }
  }
  const snapshots = Object.freeze(boundedEvidence.map((item) => evidenceRef(item, tick)));
  const allowedIds = new Set(snapshots.map((item) => item.evidenceId));
  const trace = {
    tick, selectedPriority: Object.freeze({ key: priority?.key || "unknown", score: Number(priority?.score || 0) }),
    trigger: trigger || priority?.key || "decision", actionKey: actionState?.key || "idle",
    target: immutableProjection(actionState?.target ?? null), destination: immutableProjection(actionState?.destination ?? null),
    intendedOutcome: actionState?.intendedOutcome || null, evidence: snapshots,
    primaryEvidenceId: allowedIds.has(primaryEvidenceId) ? primaryEvidenceId : null,
    constraints: immutableProjection(constraints, { maxDepth: 5, maxArrayLength: 16, maxObjectKeys: 32 })
  };
  return Object.freeze(trace);
}

export function tracePrimaryEvidence(trace) {
  return trace?.evidence?.find((item) => item.evidenceId === trace.primaryEvidenceId) || null;
}

export function selectDecisionEvidence(evidence, { target = null, evidenceType = null } = {}) {
  const targetMatch = target == null ? null : evidence.find((item) => item.targetId === target);
  if (targetMatch) return targetMatch;
  if (!evidenceType) return null;
  let strongest = null;
  for (const item of evidence) {
    if (item.type !== evidenceType) continue;
    if (!strongest || item.confidence > strongest.confidence || (item.confidence === strongest.confidence && item.age < strongest.age)) strongest = item;
  }
  return strongest;
}

export function threatAssessment(contacts) {
  const contributors = contacts.filter((item) => item.type === "predator" || ["threat", "alarm"].includes(item.signalKind)).map((item) => evidenceRef(item, item.observedTick || 0));
  const complement = contributors.reduce((remaining, item) => remaining * (1 - item.confidence), 1);
  return { overallConfidence: 1 - complement, contributors };
}

export function splitCommunicationEvidence(contacts) {
  const mapReveals = [], heardEvents = [], receivedSignals = [];
  for (const contact of contacts) {
    const heard = contact.channel === "hearing" && !contact.signalKind, signal = Boolean(contact.signalKind || contact.channel === "visual-signal"), reveal = contact.explicitMapReveal === true;
    if (!heard && !signal && !reveal) continue;
    const projected = immutableProjection(contact, { maxDepth: 4, maxArrayLength: 16, maxObjectKeys: 40 });
    if (heard) heardEvents.push(projected);
    if (signal) receivedSignals.push(projected);
    if (reveal) mapReveals.push(projected);
  }
  return { mapReveals, heardEvents, receivedSignals };
}

export function alarmObservation(sender, signal, confidence) {
  return evidenceRef({ type: `signal:${signal.kind}`, targetId: sender.id, x: sender.x, z: sender.z, confidence, age: 0, channel: "visual-signal", signalKind: signal.kind, communicatedBy: sender.id }, signal.tick || 0);
}

export function accessProjection(entity, mode) {
  if (!ACCESS_MODES.includes(mode)) throw new Error(`Unknown access mode: ${mode}`);
  if (mode === "laboratory" || mode === "selected-self") return clone(entity);
  if (mode === "strategic") return { id: entity.id, speciesId: entity.speciesId, x: entity.x, z: entity.z, alive: entity.alive };
  return {
    id: entity.id, speciesId: entity.speciesId, sex: entity.sex, lifeStage: entity.lifeStage,
    x: entity.x, z: entity.z, orientation: entity.orientation, bodyCues: observableBodyCues(entity), movementNoise: entity.movementNoise || 0,
    visibleAction: entity.actionState?.moving ? "moving" : "stationary",
    socialSignal: clone(entity.socialSignal || null), attackFlashUntil: entity.attackFlashUntil || 0,
    injuryFlashUntil: entity.injuryFlashUntil || 0
  };
}
