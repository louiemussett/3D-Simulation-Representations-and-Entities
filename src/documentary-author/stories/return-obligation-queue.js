import { deepFreeze } from "../runtime/immutable.js";

const TERMINAL = new Set(["FULFILLED", "INVALIDATED", "EXPIRED"]);

export class ReturnObligationQueue {
  constructor() { this.items = new Map(); this.activeByThread = new Map(); this.sequence = 0; this.revision = 0; this.snapshotCache = null; }
  create({ threadId, situationId, createdAtTick, deadlineTick = null, causalValue = .5, characterImportance = .5, reason = "interrupted", requiredBeatIds = [] }) {
    const existing = this.items.get(this.activeByThread.get(threadId)); if (existing && !TERMINAL.has(existing.state)) return existing;
    const item = { obligationId: `return-${String(++this.sequence).padStart(8, "0")}`, threadId, situationId, state: "CREATED", createdAtTick, eligibleAtTick: createdAtTick, selectedAtTick: null, terminalAtTick: null, deadlineTick, causalValue, characterImportance, reason, requiredBeatIds: [...new Set(requiredBeatIds)], terminalReason: null };
    this.items.set(item.obligationId, item); this.activeByThread.set(threadId, item.obligationId); this.#changed(); return deepFreeze({ ...item });
  }
  update(tick, validThreadIds = null) {
    for (const obligationId of [...this.activeByThread.values()]) {
      const item = this.items.get(obligationId); if (!item || TERMINAL.has(item.state)) continue;
      if (validThreadIds && !validThreadIds.has(item.threadId)) this.#terminal(item, "INVALIDATED", tick, "thread-invalid");
      else if (item.deadlineTick != null && tick > item.deadlineTick) this.#terminal(item, "EXPIRED", tick, "deadline-passed");
      else if (item.state === "CREATED" && tick >= item.eligibleAtTick) { item.state = "ELIGIBLE"; this.#changed(); }
    }
  }
  select(obligationId, tick) { const item = this.items.get(obligationId); if (!item || item.state !== "ELIGIBLE") return null; item.state = "SELECTED"; item.selectedAtTick = tick; this.#changed(); return deepFreeze({ ...item }); }
  fulfill(obligationId, tick, reason = "required-beat-presented") { const item = this.items.get(obligationId); if (!item || !["ELIGIBLE", "SELECTED"].includes(item.state)) return null; this.#terminal(item, "FULFILLED", tick, reason); return deepFreeze({ ...item }); }
  invalidate(obligationId, tick, reason) { const item = this.items.get(obligationId); if (!item || TERMINAL.has(item.state)) return null; this.#terminal(item, "INVALIDATED", tick, reason); return deepFreeze({ ...item }); }
  closeAll(tick, reason = "session-ended") { const closed = []; for (const obligationId of [...this.activeByThread.values()]) { const item = this.items.get(obligationId); if (!item || TERMINAL.has(item.state)) continue; this.#terminal(item, "INVALIDATED", tick, reason); closed.push(deepFreeze({ ...item })); } return closed; }
  #terminal(item, state, tick, reason) { item.state = state; item.terminalAtTick = tick; item.terminalReason = reason; if (this.activeByThread.get(item.threadId) === item.obligationId) this.activeByThread.delete(item.threadId); this.#changed(); }
  eligible(tick) { this.update(tick); return [...this.activeByThread.values()].map(id => this.items.get(id)).filter(item => item?.state === "ELIGIBLE").sort((left, right) => priority(right, tick) - priority(left, tick) || left.createdAtTick - right.createdAtTick).map(item => deepFreeze({ ...item })); }
  topEligible(tick) { this.update(tick); let best = null, bestPriority = -Infinity; for (const obligationId of this.activeByThread.values()) { const item = this.items.get(obligationId); if (item?.state !== "ELIGIBLE") continue; const itemPriority = priority(item, tick); if (!best || itemPriority > bestPriority || itemPriority === bestPriority && item.createdAtTick < best.createdAtTick) { best = item; bestPriority = itemPriority; } } return best ? deepFreeze({ ...best }) : null; }
  forThread(threadId) { const item = this.items.get(this.activeByThread.get(threadId)); return item && !TERMINAL.has(item.state) ? item : null; }
  snapshot() { if (this.snapshotCache?.revision === this.revision) return this.snapshotCache.value; const value = deepFreeze({ active: [...this.items.values()].filter(item => !TERMINAL.has(item.state)).map(item => ({ ...item })), terminal: [...this.items.values()].filter(item => TERMINAL.has(item.state)).map(item => ({ ...item })) }); this.snapshotCache = { revision: this.revision, value }; return value; }
  #changed() { this.revision += 1; this.snapshotCache = null; }
}

const priority = (item, tick) => item.causalValue * .4 + item.characterImportance * .25 + Math.min(.25, Math.max(0, tick - item.createdAtTick) / 240) + (item.deadlineTick == null ? 0 : Math.max(0, .1 - (item.deadlineTick - tick) / 1000));
