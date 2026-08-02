export const PRESENTATION_TIMING_MIN_MS = 500;
export const PRESENTATION_TIMING_MAX_MS = 5000;

const bounded = (value, low = 0, high = PRESENTATION_TIMING_MAX_MS) => Math.min(high, Math.max(low, Number(value) || 0));
const defineTiming = (id, entryDelayMs, minimumVisibleMs, releaseDelayMs, interruptPriority, reason) => Object.freeze({
  id,
  entryDelayMs: bounded(entryDelayMs),
  minimumVisibleMs: bounded(minimumVisibleMs, PRESENTATION_TIMING_MIN_MS),
  releaseDelayMs: bounded(releaseDelayMs),
  interruptPriority: bounded(interruptPriority, 0, 100),
  reason
});

export const EXPRESSION_PRESENTATION_TIMINGS = Object.freeze([
  defineTiming("calm:fallback", 1000, 3000, 0, 10, "A neutral face settles slowly and yields immediately to a stronger observable cue."),
  defineTiming("alert:sudden-orientation", 100, 1000, 250, 45, "Waking, orienting, or a contact call produces a brief attention change."),
  defineTiming("alert:sustained-attention", 250, 1500, 500, 40, "Searching or listening must remain visible before the attentive face settles."),
  defineTiming("focused:assessment", 250, 1800, 500, 50, "Assessment is confirmed briefly before the focused face replaces another cue."),
  defineTiming("focused:sustained-task", 400, 3000, 750, 45, "Tracking, guarding, or coordinated work supports a longer focused display."),
  defineTiming("affiliative:courtship-signal", 150, 1500, 500, 45, "A courtship signal produces a relatively quick affiliative display."),
  defineTiming("affiliative:courtship", 300, 2500, 750, 40, "Courtship or mate acceptance must persist before the softened face settles."),
  defineTiming("affiliative:sustained-care", 500, 3500, 1000, 35, "Nursing, mating, or birth attendance is sustained affiliative engagement."),
  defineTiming("worried:public-distress-signal", 100, 1750, 500, 65, "An outward distress, loss, care, thirst, hunger, or injury signal is noticed quickly."),
  defineTiming("worried:acute-social-action", 250, 2250, 750, 60, "Blocking, submission, or yielding produces a moderately persistent tense face."),
  defineTiming("worried:separation-or-abandonment", 300, 3000, 1000, 55, "Separation and abandonment are slower-changing visible distress states."),
  defineTiming("startled:acute", 0, 500, 0, 95, "A sudden freeze, alarm, attack, or threat onset is intentionally the shortest expression."),
  defineTiming("fear:fear-level", 0, 1750, 750, 85, "Visible fear enters immediately and receives release grace to avoid threshold flicker."),
  defineTiming("panic:extreme-fear", 0, 1500, 750, 100, "Extreme fear pre-empts every settled expression."),
  defineTiming("panic:flight", 0, 1250, 500, 98, "Desperate flight produces a fast, high-priority panic display."),
  defineTiming("pain:health", 0, 3000, 1000, 88, "Low health produces an immediate and persistent pain display."),
  defineTiming("pain:injury", 0, 3500, 1250, 90, "A retained injury supports a longer visible pain state."),
  defineTiming("dizzy:critical-health", 0, 4500, 1500, 96, "Critical health is slow to clear and may interrupt ordinary expressions."),
  defineTiming("dizzy:multiple-injuries", 0, 4000, 1500, 94, "Several injuries support a long severe-pain display."),
  defineTiming("angry:rejection", 0, 1250, 500, 80, "Rejection is an abrupt but relatively brief outward response."),
  defineTiming("angry:aggressive-action", 100, 1800, 750, 82, "Sustained aggression confirms a longer lowered-brow display."),
  defineTiming("strained:birth", 0, 3000, 1000, 78, "Birth is an immediate, sustained physical strain."),
  defineTiming("strained:intense-exertion", 100, 1500, 500, 75, "Chasing, fleeing, or fighting under fatigue produces a shorter effort face."),
  defineTiming("exhausted:collapse", 0, 5000, 1500, 93, "Collapse is a persistent visible state at the upper timing bound."),
  defineTiming("hot:dangerous-temperature", 0, 5000, 2000, 97, "Dangerous heat enters immediately and clears slowly."),
  defineTiming("hot:ordinary-temperature", 300, 3000, 1000, 72, "Ordinary heat must persist before replacing a settled face."),
  defineTiming("hot:public-heat-signal", 100, 1500, 500, 74, "An active public heat signal produces a quicker thermal face."),
  defineTiming("cold:dangerous-temperature", 0, 5000, 2000, 97, "Dangerous cold enters immediately and clears slowly."),
  defineTiming("cold:ordinary-temperature", 300, 3000, 1000, 72, "Ordinary cold must persist before replacing a settled face."),
  defineTiming("cold:public-cold-signal", 100, 1500, 500, 74, "An active public cold signal produces a quicker thermal face."),
  defineTiming("weary:recovery-action", 500, 3500, 1250, 48, "Visible recovery work settles into a relatively long weary display."),
  defineTiming("weary:fatigue", 750, 3000, 1000, 46, "Moderate fatigue must persist before the face changes."),
  defineTiming("sleepy:sleep-action", 1000, 5000, 1500, 30, "Sleep takes time to establish and remains readable at the upper bound."),
  defineTiming("sleepy:extreme-fatigue", 750, 4000, 1250, 52, "Extreme fatigue settles faster than ordinary sleep but remains visible longer."),
  defineTiming("relaxed:safe-rest", 1500, 5000, 1500, 20, "Closed, easy eyes require sustained safe rest and then remain long enough to read."),
  defineTiming("relaxed:temperature-recovery", 750, 3500, 1000, 28, "Cooling or warming must persist before the recovered face appears.")
]);

const expressionByTimingKey = new Map(EXPRESSION_PRESENTATION_TIMINGS.map(profile => [profile.id, profile]));
const expressionFallbackByKey = new Map();
for (const profile of EXPRESSION_PRESENTATION_TIMINGS) expressionFallbackByKey.set(profile.id.split(":")[0], expressionFallbackByKey.get(profile.id.split(":")[0]) || profile);

const explicitExpressionTiming = new Map();
export function expressionPresentationTiming(expression = "calm") {
  const key = typeof expression === "string" ? expression : expression?.key || "calm";
  const timingKey = typeof expression === "object" ? expression?.timingKey : null;
  const profile = expressionByTimingKey.get(timingKey) || expressionFallbackByKey.get(key) || expressionByTimingKey.get("calm:fallback");
  if (typeof expression !== "object" || expression?.role !== "showcase") return profile;
  if (!explicitExpressionTiming.has(profile.id)) explicitExpressionTiming.set(profile.id, Object.freeze({ ...profile, id: `${profile.id}:showcase`, entryDelayMs: 0 }));
  return explicitExpressionTiming.get(profile.id);
}

const calloutDurations = Object.freeze({
  "dependent-care": 2500, "dependent-separated": 2000, "family-care": 2500,
  "dependent-contact": 1250, "juvenile-contact": 1250, "adult-herd-contact": 1250, "adult-pack-contact": 1250,
  "wait-up": 2000, threat: 1250, alarm: 1000, "direct-threat-warning": 1250, attacked: 750,
  distress: 1500, injury: 3500, water: 3500, "water-report": 4000, hunger: 3500,
  "forage-report": 4000, "prey-report": 4000, "shelter-report": 4000, "route-blocked": 3000,
  "follow-me": 2500, stop: 2500, rally: 2500, "all-clear": 3000, heat: 3500, cold: 3500, courtship: 2500
});

export const CALLOUT_PRESENTATION_TIMINGS = Object.freeze(Object.entries(calloutDurations).map(([id, duration]) => {
  const emergency = ["attacked", "alarm", "threat", "direct-threat-warning", "distress"].includes(id);
  const report = id.endsWith("-report") || id === "route-blocked";
  return defineTiming(`callout:${id}`, 0, duration, emergency ? 100 : 400, emergency ? 95 : report ? 60 : 50, emergency ? "Urgent public evidence appears immediately." : report ? "A directional report remains long enough to inspect." : "The explicit outward cue receives a type-specific readable hold.");
}));
const calloutById = new Map(CALLOUT_PRESENTATION_TIMINGS.map(profile => [profile.id.slice("callout:".length), profile]));
export function calloutPresentationTiming(signal = null) {
  // Prefer the concrete rendered variant over its broader semantic kind. A
  // dependent-contact call, for example, is still a contact signal but needs
  // the dependent-contact transition profile shown in the Laboratory atlas.
  const id = signal?.id || signal?.descriptor?.id || signal?.kind || "contact";
  const known = calloutById.get(id);
  if (known) return known;
  const descriptor = signal?.descriptor || signal || {};
  if (descriptor.emergency || descriptor.impact) return defineTiming(`callout:${id}:emergency-fallback`, 0, 1250, 100, 95, "Unregistered emergency callout fallback.");
  if (descriptor.report) return defineTiming(`callout:${id}:report-fallback`, 0, 3500, 400, 60, "Unregistered public report fallback.");
  return defineTiming(`callout:${id}:fallback`, 0, 1750, 300, 50, "Unregistered ordinary callout fallback.");
}

export const THOUGHT_PRESENTATION_TIMINGS = Object.freeze([
  defineTiming("thought:danger", 0, 750, 200, 95, "Danger priorities should be apparent quickly and may pre-empt settled goals."),
  defineTiming("thought:hunting", 100, 1500, 400, 75, "A hunt commitment is fast-moving but not a single-frame event."),
  defineTiming("thought:food", 200, 2500, 500, 65, "Food acquisition remains readable through short planner changes."),
  defineTiming("thought:water", 150, 2500, 500, 70, "Water acquisition receives a medium hold and relatively fast entry."),
  defineTiming("thought:scavenge", 250, 2500, 600, 62, "Carrion search is a sustained resource priority."),
  defineTiming("thought:family", 500, 3000, 800, 58, "Care and dependency goals settle and clear gradually."),
  defineTiming("thought:social", 500, 3000, 750, 48, "Social organisation is a sustained priority."),
  defineTiming("thought:exploration", 750, 3500, 750, 35, "Exploration is deliberately slow to replace or be replaced by another settled goal."),
  defineTiming("thought:reproduction", 750, 4000, 1000, 42, "Reproductive commitments are sustained rather than momentary."),
  defineTiming("thought:rest", 1000, 5000, 1000, 25, "Rest and recovery take time to establish and receive the longest hold."),
  defineTiming("thought:unknown", 300, 1500, 500, 40, "Unclassified priorities use a short neutral fallback."),
  defineTiming("thought:undecided", 0, 1250, 0, 15, "The undecided placeholder is a short status pulse, not an invented motive.")
]);
const thoughtByCategory = new Map(THOUGHT_PRESENTATION_TIMINGS.map(profile => [profile.id.slice("thought:".length), profile]));
export function thoughtPresentationTiming(priority = "", category = null, placeholder = false) {
  if (placeholder) return thoughtByCategory.get("undecided");
  return thoughtByCategory.get(category) || thoughtByCategory.get("unknown");
}

const forecastDurations = Object.freeze({
  "motion-continuing": 1000,
  "threat-probable": 1500,
  "action-compared": 2000,
  "threat-possible": 2500,
  "water-available": 4000,
  "water-uncertain": 4000,
  "body-recovery": 4500,
  "bounded-renderer-fallback": 1500
});
export const FORECAST_PRESENTATION_TIMINGS = Object.freeze(Object.entries(forecastDurations).map(([id, duration]) => {
  const urgent = id.startsWith("threat-") || id === "body-recovery";
  return defineTiming(`forecast:${id}`, urgent ? 0 : 150, duration, urgent ? 300 : 500, urgent ? 85 : 55, urgent ? "A safety-relevant private estimate enters quickly." : "The forecast remains long enough to interpret its uncertainty and effect.");
}));
export const FORECAST_EMPTY_PRESENTATION_TIMINGS = Object.freeze([
  defineTiming("forecast-empty:not-yet-run", 0, 1500, 0, 15, "Waiting for the first predictive cycle."),
  defineTiming("forecast-empty:below-admission", 0, 2500, 0, 15, "No result passed prediction admission."),
  defineTiming("forecast-empty:below-display", 0, 2000, 0, 15, "Estimates exist but none qualifies for a world cloud."),
  defineTiming("forecast-empty:no-new-insight", 0, 1250, 0, 15, "The admitted estimate has not materially changed.")
]);
const forecastByVariant = new Map(FORECAST_PRESENTATION_TIMINGS.map(profile => [profile.id.slice("forecast:".length), profile]));
const forecastEmptyByState = new Map(FORECAST_EMPTY_PRESENTATION_TIMINGS.map(profile => [profile.id.slice("forecast-empty:".length), profile]));
const forecastEffectCache = new Map();
export function forecastPresentationTiming(cue = null) {
  if (cue?.placeholder) return forecastEmptyByState.get(cue.emptyState) || forecastEmptyByState.get("below-display");
  const variantId = cue?.variantId || "bounded-renderer-fallback";
  const base = forecastByVariant.get(variantId) || forecastByVariant.get("bounded-renderer-fallback");
  const extension = cue?.priorityChanged ? 1000 : cue?.activeEffect ? 500 : 0;
  if (!extension) return base;
  const cacheKey = `${base.id}:${extension}`;
  if (!forecastEffectCache.has(cacheKey)) forecastEffectCache.set(cacheKey, Object.freeze({ ...base, id: `${base.id}:${cue.priorityChanged ? "changed-choice" : "used-in-scoring"}`, minimumVisibleMs: bounded(base.minimumVisibleMs + extension, PRESENTATION_TIMING_MIN_MS) }));
  return forecastEffectCache.get(cacheKey);
}

export function presentationTimingFor(channel, candidate = null) {
  if (channel === "expression") return expressionPresentationTiming(candidate);
  if (channel === "callout") return calloutPresentationTiming(candidate);
  if (channel === "thought") return thoughtPresentationTiming(candidate?.priority, candidate?.category, candidate?.placeholder);
  if (channel === "forecast") return forecastPresentationTiming(candidate);
  return defineTiming(`${channel || "unknown"}:fallback`, 0, 1500, 0, 0, "Generic presentation fallback.");
}

export function presentationTimingRange(profiles) {
  const values = profiles.map(profile => profile.minimumVisibleMs);
  return Object.freeze({ minimumMs: Math.min(...values), maximumMs: Math.max(...values) });
}
