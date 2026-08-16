export const PRESENTATION_MINIMUM_HOLD_MS = 500;
export const PRESENTATION_MAXIMUM_HOLD_MS = 5000;
export const PRESENTATION_EXTENDED_MAXIMUM_HOLD_MS = 8000;
export const EMPTY_CHANNEL_VISIBLE_MS = 1250;
export const EMPTY_CHANNEL_HIDDEN_MS = 1750;

const boundedDuration = (value, fallback) => Math.max(0, Number.isFinite(Number(value)) ? Number(value) : fallback);
const boundedHold = (value, fallback = PRESENTATION_MINIMUM_HOLD_MS, maximum = PRESENTATION_MAXIMUM_HOLD_MS) => Math.min(maximum, Math.max(PRESENTATION_MINIMUM_HOLD_MS, boundedDuration(value, fallback)));
const boundedRank = value => Math.max(0, Math.min(100, Number.isFinite(Number(value)) ? Number(value) : 0));
const recordKey = (entityId, channel) => `${String(entityId)}\u0000${String(channel)}`;

function normaliseTiming(candidate, supplied, fallbackHold) {
  const timing = supplied || candidate?.presentationTiming || candidate?.timing || {};
  const maximumVisibleMs = Math.min(PRESENTATION_EXTENDED_MAXIMUM_HOLD_MS, Math.max(PRESENTATION_MAXIMUM_HOLD_MS, boundedDuration(timing.maximumVisibleMs, PRESENTATION_MAXIMUM_HOLD_MS)));
  return Object.freeze({
    id: String(timing.id || "default"),
    minimumVisibleMs: boundedHold(timing.minimumVisibleMs ?? timing.minimumHoldMs, fallbackHold, maximumVisibleMs),
    maximumVisibleMs,
    entryDelayMs: Math.min(PRESENTATION_MAXIMUM_HOLD_MS, boundedDuration(timing.entryDelayMs ?? timing.enterStableMs, 0)),
    releaseDelayMs: Math.min(PRESENTATION_MAXIMUM_HOLD_MS, boundedDuration(timing.releaseDelayMs ?? timing.releaseGraceMs, 0)),
    interruptPriority: boundedRank(timing.interruptPriority ?? timing.preemptRank)
  });
}

function semanticKey(candidate) {
  if (candidate == null) return null;
  const value = candidate.semanticKey ?? candidate.key ?? candidate.signature ?? candidate.fingerprint;
  if (value == null || value === "") throw new TypeError("presentation candidates require a semanticKey");
  return String(value);
}

function publicSnapshot(record = null) {
  return Object.freeze({
    displayed: record?.displayed ?? null,
    semanticKey: record?.displayedKey ?? null,
    placeholder: Boolean(record?.displayed?.placeholder),
    shownAt: record?.shownAt ?? null,
    holdUntil: record?.holdUntil ?? null,
    pendingKey: record?.pendingSet ? record.pendingKey : null,
    pendingSince: record?.pendingSet ? record.pendingSince : null,
    timing: record?.timing ?? null
  });
}

/**
 * Presentation-only wall-clock latch. It never writes to simulation state and
 * retains at most one pending replacement for each entity/channel pair.
 */
export class PresentationChannelHoldStore {
  constructor({ minimumHoldMs = PRESENTATION_MINIMUM_HOLD_MS, maximumEntries = 1024 } = {}) {
    this.minimumHoldMs = boundedHold(minimumHoldMs, PRESENTATION_MINIMUM_HOLD_MS);
    this.maximumEntries = Math.max(1, Math.floor(Number(maximumEntries) || 1024));
    this.records = new Map();
  }

  resolve({ entityId, channel, candidate = null, eligible = true, now = performance.now(), minimumHoldMs = this.minimumHoldMs, timing = null } = {}) {
    if (entityId == null || !channel) throw new TypeError("entityId and channel are required");
    const key = recordKey(entityId, channel), time = Number(now) || 0;
    if (!eligible) {
      this.records.delete(key);
      return publicSnapshot();
    }

    const nextKey = semanticKey(candidate), nextTiming = normaliseTiming(candidate, timing, minimumHoldMs);
    let record = this.records.get(key);
    if (!record) {
      if (candidate == null) return publicSnapshot();
      record = this.#commit({ entityId: String(entityId), channel: String(channel) }, candidate, nextKey, time, nextTiming);
      this.records.set(key, record);
      this.#enforceBound();
      return publicSnapshot(record);
    }

    record.touchedAt = time;
    if (record.displayedKey === nextKey) {
      // Refresh non-semantic/live metadata (for example whether a held public
      // call is still vocal) without making the artwork flash or restarting a
      // timer. A timing-significant cause change may extend the current hold.
      record.displayed = candidate;
      if (candidate != null && nextTiming.id !== record.timing.id) {
        record.timing = nextTiming;
        record.holdUntil = Math.max(record.holdUntil, time + nextTiming.minimumVisibleMs);
      }
      record.pendingSet = false;
      record.pending = null;
      record.pendingKey = null;
      record.pendingSince = null;
      record.mismatchSince = null;
      return publicSnapshot(record);
    }

    if (!record.pendingSet || record.pendingKey !== nextKey) {
      record.pendingSince = time;
      record.pendingKey = nextKey;
    }
    record.pendingSet = true;
    record.pending = candidate;
    record.pendingTiming = nextTiming;
    record.mismatchSince ??= time;

    const urgentReplacement = candidate != null && nextTiming.interruptPriority > record.timing.interruptPriority;
    const readableFloor = record.shownAt + PRESENTATION_MINIMUM_HOLD_MS;
    const currentReleaseAt = urgentReplacement
      ? readableFloor
      : Math.max(record.holdUntil, record.mismatchSince + record.timing.releaseDelayMs);
    const candidateStableAt = candidate == null
      ? record.mismatchSince + record.timing.releaseDelayMs
      : record.pendingSince + nextTiming.entryDelayMs;
    if (time < Math.max(currentReleaseAt, candidateStableAt)) return publicSnapshot(record);

    if (candidate == null) {
      this.records.delete(key);
      return publicSnapshot();
    }

    record = this.#commit(record, candidate, nextKey, time, nextTiming);
    this.records.set(key, record);
    return publicSnapshot(record);
  }

  snapshot(entityId, channel) {
    return publicSnapshot(this.records.get(recordKey(entityId, channel)));
  }

  clearEntity(entityId) {
    const owner = `${String(entityId)}\u0000`;
    for (const key of this.records.keys()) if (key.startsWith(owner)) this.records.delete(key);
  }

  clear() { this.records.clear(); }

  get size() { return this.records.size; }

  #commit(previous, candidate, candidateKey, now, timing) {
    const duration = boundedHold(timing.minimumVisibleMs, this.minimumHoldMs, timing.maximumVisibleMs);
    return {
      entityId: previous.entityId,
      channel: previous.channel,
      displayed: candidate,
      displayedKey: candidateKey,
      shownAt: now,
      holdUntil: now + duration,
      pendingSet: false,
      pending: null,
      pendingKey: null,
      pendingSince: null,
      pendingTiming: null,
      mismatchSince: null,
      timing,
      touchedAt: now
    };
  }

  #enforceBound() {
    while (this.records.size > this.maximumEntries) {
      let oldestKey = null, oldestTime = Infinity;
      for (const [key, record] of this.records) if (record.touchedAt < oldestTime) { oldestKey = key; oldestTime = record.touchedAt; }
      if (oldestKey == null) break;
      this.records.delete(oldestKey);
    }
  }
}

/**
 * Repeating empty-state heartbeat. It supplies visibility only; callers feed
 * the resulting placeholder through PresentationChannelHoldStore so each
 * appearance still receives the same minimum-readable duration.
 */
export class PresentationEmptyPulseStore {
  constructor({ visibleMs = EMPTY_CHANNEL_VISIBLE_MS, hiddenMs = EMPTY_CHANNEL_HIDDEN_MS, maximumEntries = 512 } = {}) {
    this.visibleMs = boundedDuration(visibleMs, EMPTY_CHANNEL_VISIBLE_MS);
    this.hiddenMs = boundedDuration(hiddenMs, EMPTY_CHANNEL_HIDDEN_MS);
    this.maximumEntries = Math.max(1, Math.floor(Number(maximumEntries) || 512));
    this.records = new Map();
  }

  resolve({ entityId, channel, empty = true, eligible = true, now = performance.now(), visibleMs = this.visibleMs, hiddenMs = this.hiddenMs } = {}) {
    if (entityId == null || !channel) throw new TypeError("entityId and channel are required");
    const key = recordKey(entityId, channel), time = Number(now) || 0;
    if (!eligible || !empty) {
      this.records.delete(key);
      return Object.freeze({ visible: false, phase: "inactive", phaseStartedAt: null, nextTransitionAt: null });
    }
    const shownFor = boundedDuration(visibleMs, this.visibleMs), quietFor = boundedDuration(hiddenMs, this.hiddenMs), cycle = Math.max(1, shownFor + quietFor);
    let record = this.records.get(key);
    if (!record) {
      record = { entityId: String(entityId), channel: String(channel), startedAt: time, touchedAt: time };
      this.records.set(key, record);
      this.#enforceBound();
    }
    record.touchedAt = time;
    const elapsed = Math.max(0, time - record.startedAt), cycleIndex = Math.floor(elapsed / cycle), offset = elapsed - cycleIndex * cycle;
    const visible = offset < shownFor, phaseStartedAt = record.startedAt + cycleIndex * cycle + (visible ? 0 : shownFor), nextTransitionAt = phaseStartedAt + (visible ? shownFor : quietFor);
    return Object.freeze({ visible, phase: visible ? "visible" : "quiet", phaseStartedAt, nextTransitionAt });
  }

  clearEntity(entityId) {
    const owner = `${String(entityId)}\u0000`;
    for (const key of this.records.keys()) if (key.startsWith(owner)) this.records.delete(key);
  }

  clear() { this.records.clear(); }

  get size() { return this.records.size; }

  #enforceBound() {
    while (this.records.size > this.maximumEntries) {
      let oldestKey = null, oldestTime = Infinity;
      for (const [key, record] of this.records) if (record.touchedAt < oldestTime) { oldestKey = key; oldestTime = record.touchedAt; }
      if (oldestKey == null) break;
      this.records.delete(oldestKey);
    }
  }
}
