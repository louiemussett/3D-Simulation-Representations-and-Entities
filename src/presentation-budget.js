export const PRESENTATION_TIERS = Object.freeze({ SELECTED: "selected", CLOSE: "close", MEDIUM: "medium", DISTANT: "distant", STRATEGIC: "strategic" });

export const PRESENTATION_CHANNELS = Object.freeze({
  selected: Object.freeze(["body", "posture", "movement", "signals", "urgent", "healthBars", "thoughts", "callRings", "trails", "connectors", "actionBadges", "movementArrows", "urgentHalos"]),
  close: Object.freeze(["body", "posture", "movement", "signals", "urgent", "healthBars", "thoughts", "callRings", "actionBadges", "urgentHalos"]),
  medium: Object.freeze(["body", "movement", "urgent", "healthBars", "movementArrows", "urgentHalos"]),
  distant: Object.freeze(["body", "urgent", "urgentHalos"]),
  strategic: Object.freeze(["aggregates"])
});

export const DEFAULT_PRESENTATION_BUDGETS = Object.freeze({ connectors: 8, trails: 16, thoughts: 1, callRings: 12, healthBars: 24, actionBadges: 12, movementArrows: 24, urgentHalos: 16 });
const PRIVATE_REQUIREMENTS = Object.freeze({ connectors: "cause", thoughts: "thought" });
const CHANNEL_REQUIREMENTS = Object.freeze({ callRings: "signals", healthBars: "exact-health", trails: "movement", movementArrows: "movement" });
const TIER_RANK = Object.freeze({ selected: 5, close: 4, medium: 3, distant: 2, strategic: 0 });

export function resolvePresentationTier({ selected = false, strategic = false, distance = Infinity, cameraDistance = 0, closeDistance = 34, mediumDistance = 86, mediumZoom = 110, distantZoom = 175 }) {
  if (selected) return PRESENTATION_TIERS.SELECTED;
  if (strategic) return PRESENTATION_TIERS.STRATEGIC;
  if (cameraDistance >= distantZoom) return PRESENTATION_TIERS.DISTANT;
  if (cameraDistance >= mediumZoom) return distance <= mediumDistance ? PRESENTATION_TIERS.MEDIUM : PRESENTATION_TIERS.DISTANT;
  if (distance <= closeDistance) return PRESENTATION_TIERS.CLOSE;
  if (distance <= mediumDistance) return PRESENTATION_TIERS.MEDIUM;
  return PRESENTATION_TIERS.DISTANT;
}

export function presentationPartVisibility(tier) {
  if (tier === PRESENTATION_TIERS.SELECTED || tier === PRESENTATION_TIERS.CLOSE) return { head: true, eyes: true, tail: true, face: true, lifeStageMarker: true };
  if (tier === PRESENTATION_TIERS.MEDIUM) return { head: true, eyes: true, tail: true, face: false, lifeStageMarker: true };
  if (tier === PRESENTATION_TIERS.DISTANT) return { head: false, eyes: false, tail: false, face: false, lifeStageMarker: false };
  return { head: false, eyes: false, tail: false, face: false, lifeStageMarker: false };
}

export function channelPermitted(candidate, channel) {
  if (!PRESENTATION_CHANNELS[candidate.tier]?.includes(channel)) return false;
  const required = PRIVATE_REQUIREMENTS[channel] || CHANNEL_REQUIREMENTS[channel];
  return !required || candidate.permittedChannels?.includes(required);
}

function importance(candidate, previous, hysteresis) {
  return (candidate.selected ? 1e9 : 0) + (candidate.immediateThreat ? 5e8 : 0) + (TIER_RANK[candidate.tier] || 0) * 1e6 + (candidate.urgent ? 2e5 : 0) - Math.min(99999, candidate.distance || 0) + (previous ? hysteresis : 0);
}

export class PresentationBudgetAllocator {
  constructor(budgets = DEFAULT_PRESENTATION_BUDGETS, hysteresis = 2500) { this.budgets = { ...DEFAULT_PRESENTATION_BUDGETS, ...budgets }; this.hysteresis = hysteresis; this.previous = new Map(); }
  configure(budgets = {}) { Object.assign(this.budgets, budgets); }
  allocate(candidates) {
    const result = new Map(candidates.map((candidate) => [candidate.id, new Set(PRESENTATION_CHANNELS[candidate.tier] || [])]));
    for (const [channel, rawLimit] of Object.entries(this.budgets)) {
      const prior = this.previous.get(channel) || new Set(), limit = Math.max(0, Math.floor(rawLimit));
      const eligible = candidates.filter((candidate) => channelPermitted(candidate, channel));
      eligible.sort((a, b) => importance(b, prior.has(b.id), this.hysteresis) - importance(a, prior.has(a.id), this.hysteresis) || String(a.id).localeCompare(String(b.id)));
      const winners = new Set(eligible.slice(0, limit).map((candidate) => candidate.id));
      this.previous.set(channel, winners);
      for (const candidate of candidates) if (!winners.has(candidate.id)) result.get(candidate.id)?.delete(channel);
    }
    return result;
  }
  reset() { this.previous.clear(); }
}

export function shouldRunBoundedUpdate({ visible, now, lastRun = -Infinity, interval = 0, force = false }) { return Boolean(visible && (force || now - lastRun >= interval)); }

export class MinimapInvalidation {
  constructor() { this.staticKey = null; this.dynamicKey = null; }
  needsStatic(key) { return key !== this.staticKey; }
  markStatic(key) { this.staticKey = key; }
  needsDynamic(key) { return key !== this.dynamicKey; }
  markDynamic(key) { this.dynamicKey = key; }
  reset() { this.staticKey = this.dynamicKey = null; }
}
