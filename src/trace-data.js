export const TRACE_HISTORY_LIMIT = 32;

export function compactTrace(record, history = [], limit = TRACE_HISTORY_LIMIT) {
  const compact = {
    tick: record.tick, contacts: record.contacts, primary: record.primary || null,
    drive: record.drive, actionKey: record.actionKey, deltas: { ...record.deltas },
    entityIndicator: record.entityIndicator, viability: record.viability,
    mismatch: record.mismatch, feedback: record.feedback, capabilityFlags: record.capabilityFlags
  };
  history.push(compact);
  if (history.length > limit) history.splice(0, history.length - limit);
  return history;
}

export function formatTrace(record) {
  if (!record) return ["Waiting for the next organism update…"];
  const signal = record.primary ? `${record.primary.channel} / ${record.primary.type} (${record.primary.confidence.toFixed(2)})` : "none";
  return [
    "Interface: vision, smell, hearing, interoception",
    `Contact: ${record.contacts} environmental contacts`, `Signal: ${signal}`,
    `Processing: attention + ${record.drive} drive`, `Action: ${record.actionKey}`,
    `Consequence: ΔE ${record.deltas.energy.toFixed(2)}, ΔH₂O ${record.deltas.hydration.toFixed(2)}, Δhealth ${record.deltas.health.toFixed(2)}`,
    `Feedback: ${record.feedback}`
  ];
}
