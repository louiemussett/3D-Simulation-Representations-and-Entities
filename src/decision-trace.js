export const ACCESS_MODES = Object.freeze(["laboratory", "selected-self", "observable-other", "strategic"]);

function clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }

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
    soundIdentity: contact.soundIdentity ?? null, observedTick: contact.observedTick ?? tick
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
  const snapshots = evidence.map((item) => evidenceRef(clone(item), tick));
  const allowedIds = new Set(snapshots.map((item) => item.evidenceId));
  const trace = {
    tick, selectedPriority: { key: priority?.key || "unknown", score: Number(priority?.score || 0) },
    trigger: trigger || priority?.key || "decision", actionKey: actionState?.key || "idle",
    target: clone(actionState?.target ?? null), destination: clone(actionState?.destination ?? null),
    intendedOutcome: actionState?.intendedOutcome || null, evidence: snapshots,
    primaryEvidenceId: allowedIds.has(primaryEvidenceId) ? primaryEvidenceId : null,
    constraints: clone(constraints)
  };
  return Object.freeze(trace);
}

export function tracePrimaryEvidence(trace) {
  return trace?.evidence?.find((item) => item.evidenceId === trace.primaryEvidenceId) || null;
}

export function threatAssessment(contacts) {
  const contributors = contacts.filter((item) => item.type === "predator" || ["threat", "alarm"].includes(item.signalKind)).map((item) => evidenceRef(item, item.observedTick || 0));
  const complement = contributors.reduce((remaining, item) => remaining * (1 - item.confidence), 1);
  return { overallConfidence: 1 - complement, contributors };
}

export function splitCommunicationEvidence(contacts) {
  const mapReveals = [], heardEvents = [], receivedSignals = [];
  for (const contact of contacts) {
    if (contact.channel === "hearing" && !contact.signalKind) heardEvents.push(clone(contact));
    if (contact.signalKind || contact.channel === "visual-signal") receivedSignals.push(clone(contact));
    if (contact.explicitMapReveal === true) mapReveals.push(clone(contact));
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
    x: entity.x, z: entity.z, orientation: entity.orientation, health: entity.health,
    injuries: clone(entity.injuries || []), movementNoise: entity.movementNoise || 0,
    visibleAction: entity.actionState?.moving ? "moving" : "stationary",
    socialSignal: clone(entity.socialSignal || null), attackFlashUntil: entity.attackFlashUntil || 0,
    injuryFlashUntil: entity.injuryFlashUntil || 0
  };
}
