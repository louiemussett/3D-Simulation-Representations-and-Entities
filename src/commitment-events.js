export const COMMITMENT_EVENT_SCHEMA = 1;
export const COMMITMENT_EVENT_KINDS = Object.freeze(["commitment-created", "commitment-retained", "commitment-reviewed", "commitment-suspended", "commitment-resumed", "commitment-completed", "commitment-failed", "priority-changed", "satisfier-changed", "method-changed", "target-changed", "phase-changed", "route-replanned", "destination-adjusted", "action-changed", "parallel-obligation-created", "parallel-obligation-completed", "personal-space-adjustment"]);

export function createCommitmentEvent({ eventId, kind, tick = 0, animalId, commitmentId = null, from = null, to = null, reason = "unspecified", evidenceIds = [], countsAsSwitch = false, details = null } = {}) {
  if (!COMMITMENT_EVENT_KINDS.includes(kind)) throw new Error(`Unknown commitment event kind: ${kind}`);
  return Object.freeze({ schema: COMMITMENT_EVENT_SCHEMA, eventId: eventId || `${animalId || "animal"}:${tick}:${kind}`, kind, tick: Number(tick) || 0, animalId: String(animalId || "animal"), commitmentId, from, to, reason, evidenceIds: Object.freeze([...new Set(evidenceIds.map(String))]), countsAsSwitch: Boolean(countsAsSwitch), details });
}

export function appendCommitmentEvent(animal, event, limit = 128) {
  animal.commitmentEvents ||= [];
  animal.commitmentEvents.push(event);
  if (animal.commitmentEvents.length > limit) animal.commitmentEvents.splice(0, animal.commitmentEvents.length - limit);
  return event;
}

export function commitmentEventCounts(events = []) {
  return events.reduce((counts, event) => { counts[event.kind] = (counts[event.kind] || 0) + 1; if (event.countsAsSwitch) counts.trueSwitches = (counts.trueSwitches || 0) + 1; return counts; }, {});
}
