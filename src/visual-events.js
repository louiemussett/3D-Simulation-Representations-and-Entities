export const VISUAL_EVENT_TYPES = Object.freeze(["attack", "call", "injury-alert", "priority-change", "thought-transition"]);

export class VisualEventManager {
  constructor({ now = () => performance.now(), maxEvents = 512, priorityHysteresisMs = 650 } = {}) {
    this.now = now; this.maxEvents = maxEvents; this.priorityHysteresisMs = priorityHysteresisMs;
    this.events = new Map(); this.pendingPriorities = new Map(); this.committedPriorities = new Map();
  }

  emit({ type, entityId, originTick, minimumVisibleMs = 500, durationMs = minimumVisibleMs, restart = "new-origin", payload = null }) {
    if (!VISUAL_EVENT_TYPES.includes(type)) throw new Error(`Unknown visual event type: ${type}`);
    const stableId = `${type}:${entityId}:${originTick}`;
    const existing = this.events.get(stableId), createdAt = this.now();
    if (existing && restart !== "always") return existing;
    const event = Object.freeze({ id: stableId, type, entityId, originTick, createdAt, minimumVisibleMs, expiresAt: createdAt + Math.max(minimumVisibleMs, durationMs), payload });
    this.events.set(stableId, event); this.prune(createdAt);
    return event;
  }

  priority(entityId, priority, originTick, options = {}) {
    const now = this.now(), pending = this.pendingPriorities.get(entityId);
    if (this.committedPriorities.get(entityId) === priority) { this.pendingPriorities.delete(entityId); return null; }
    if (!pending || pending.priority !== priority) { this.pendingPriorities.set(entityId, { priority, since: now, originTick }); return null; }
    if (now - pending.since < (options.hysteresisMs ?? this.priorityHysteresisMs)) return null;
    this.pendingPriorities.delete(entityId);
    this.committedPriorities.set(entityId, priority);
    return this.emit({ type: "priority-change", entityId, originTick: pending.originTick, minimumVisibleMs: options.minimumVisibleMs ?? 1200, durationMs: options.durationMs ?? 2400, payload: { priority } });
  }

  active(type, entityId, now = this.now()) { this.prune(now); return [...this.events.values()].filter((event) => event.type === type && event.entityId === entityId && event.expiresAt > now); }
  firstActive(type, entityId, now = this.now()) { this.prune(now); for (const event of this.events.values()) if (event.type === type && event.entityId === entityId && event.expiresAt > now) return event; return null; }
  hasActive(type, entityId, now = this.now()) { return this.firstActive(type, entityId, now) !== null; }
  prune(now = this.now()) { for (const [id, event] of this.events) if (event.expiresAt <= now) this.events.delete(id); while (this.events.size > this.maxEvents) this.events.delete(this.events.keys().next().value); }
  clear() { this.events.clear(); this.pendingPriorities.clear(); this.committedPriorities.clear(); }
}

export function lostCallEligible(animal) { return animal.lifeStage !== "dependent" && !animal.groupId && (animal.stationaryTicks || 0) > 8; }
