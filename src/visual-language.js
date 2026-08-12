const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

// First match wins. These are visible conditions, never private priorities.
export const EXPRESSION_PRECEDENCE = Object.freeze([
  "dangerous-temperature",
  "panic",
  "fear",
  "severe-pain",
  "pain",
  "collapse",
  "aggression",
  "startle",
  "temperature",
  "strain",
  "distress",
  "fatigue",
  "affiliation",
  "focus",
  "attention",
  "recovery",
  "calm"
]);

export const FACIAL_EXPRESSION_LEGEND = Object.freeze([
  Object.freeze({ key: "calm", glyph: "🙂", colour: "#f2ce7f", label: "Calm face — no strong involuntary expression is visible." }),
  Object.freeze({ key: "alert", glyph: "😯", colour: "#ffe69a", label: "Raised eyes — visibly alert and attending to the surroundings." }),
  Object.freeze({ key: "focused", glyph: "🧐", colour: "#d6e7ff", label: "Narrowed, steady gaze — visibly focused on the current action." }),
  Object.freeze({ key: "affiliative", glyph: "😊", colour: "#ffb6d9", label: "Softened face — visible affiliative or caregiving engagement." }),
  Object.freeze({ key: "worried", glyph: "😟", colour: "#d7c1ff", label: "Tense brow — visible distress, separation, or uncertainty." }),
  Object.freeze({ key: "startled", glyph: "😲", colour: "#b8e6ff", label: "Suddenly widened eyes — a visible startle or alarm response." }),
  Object.freeze({ key: "fear", glyph: "😨", colour: "#a9ddff", label: "Wide eyes and open mouth — visible fear." }),
  Object.freeze({ key: "panic", glyph: "😱", colour: "#8fc7ff", label: "Extreme alarm face — visible panic or desperate flight." }),
  Object.freeze({ key: "pain", glyph: "😣", colour: "#d2b2ff", label: "Tightly clenched face — visible pain or injury." }),
  Object.freeze({ key: "dizzy", glyph: "😵", colour: "#c7a4ff", label: "Spiral eyes — pain, serious injury, or poor health." }),
  Object.freeze({ key: "angry", glyph: "😠", colour: "#ff7b72", label: "Lowered brow — visible aggression or rejection." }),
  Object.freeze({ key: "strained", glyph: "😖", colour: "#f3a478", label: "Compressed, effortful face — visible physical strain." }),
  Object.freeze({ key: "exhausted", glyph: "😫", colour: "#a9a6c6", label: "Slack, overwhelmed face — visible collapse or complete exhaustion." }),
  Object.freeze({ key: "hot", glyph: "🥵", colour: "#ff8a6b", label: "Sweating face — visible heat stress; dangerous heat uses the same face." }),
  Object.freeze({ key: "cold", glyph: "🥶", colour: "#8cdcff", label: "Snowflake and trembling mouth — visible cold stress; dangerous cold uses the same face." }),
  Object.freeze({ key: "weary", glyph: "😩", colour: "#aebcd2", label: "Drooping, burdened face — visible fatigue or difficult recovery." }),
  Object.freeze({ key: "sleepy", glyph: "😴", colour: "#9ebce0", label: "Closed eyes and Z marks — visible sleep or extreme fatigue." }),
  Object.freeze({ key: "relaxed", glyph: "😌", colour: "#b7dfc4", label: "Closed, easy eyes — visibly settled during safe rest or recovery." })
]);

const AGGRESSIVE_ACTIONS = new Set(["attack", "defend", "dominance", "social-attack", "spar", "caregiver-dispute"]);
const STARTLE_ACTIONS = new Set(["freeze"]);
const STARTLE_SIGNALS = new Set(["alarm", "attacked", "threat"]);
const STRAIN_ACTIONS = new Set(["birth", "chase", "flee", "attack", "social-attack", "spar"]);
const ACUTE_DISTRESS_ACTIONS = new Set(["blocked", "submit", "yield-carcass"]);
const SEPARATION_DISTRESS_ACTIONS = new Set(["abandon-hunt", "abandon-dependent", "leave-group"]);
const DISTRESS_SIGNALS = new Set(["lost", "wait-up", "care", "distress", "injury", "water", "hunger"]);
const SLEEP_ACTIONS = new Set(["sleep", "deep-rest"]);
const WEARY_ACTIONS = new Set(["active-recovery", "recover-after-combat", "recover-after-flight", "recover-after-travel"]);
const COURTSHIP_ACTIONS = new Set(["courtship", "accept-mate"]);
const SUSTAINED_CARE_ACTIONS = new Set(["mating", "nurse", "allow-nursing", "attend-birth"]);
const AFFILIATIVE_SIGNALS = new Set(["courtship"]);
const ASSESSMENT_ACTIONS = new Set(["evaluate-prey", "assess-rival"]);
const SUSTAINED_FOCUS_ACTIONS = new Set(["stalk", "track-scent", "guard", "protect-offspring", "claim-kill", "coordinate-group"]);
const SUDDEN_ORIENTATION_ACTIONS = new Set(["wake", "orient-after-waking"]);
const SUSTAINED_ATTENTION_ACTIONS = new Set(["orient", "listen", "search", "wander"]);
const ATTENTIVE_SIGNALS = new Set(["contact"]);
const SAFE_REST_ACTIONS = new Set(["rest", "alert-rest"]);
const TEMPERATURE_RECOVERY_ACTIONS = new Set(["cool", "warm"]);

const finite = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const actionKey = (animal) => typeof animal?.actionState?.key === "string" ? animal.actionState.key : "";
const signalKind = (animal, tick = null) => {
  const signal = animal?.socialSignal;
  if (typeof signal?.kind !== "string") return "";
  if (Number.isFinite(Number(tick)) && Number.isFinite(Number(signal.until)) && Number(signal.until) <= Number(tick)) return "";
  return signal.kind;
};
const expression = (key, role, label, timingKey = null) => Object.freeze({ key, role, label, timingKey });

export function facialExpressionSymbol(expression = "calm") {
  const key = typeof expression === "string" ? expression : expression?.key;
  return FACIAL_EXPRESSION_LEGEND.find((entry) => entry.key === key) || FACIAL_EXPRESSION_LEGEND[0];
}

export function visibleExpression(animal = {}, tick = null, { suppressStartle = false } = {}) {
  const showcase = FACIAL_EXPRESSION_LEGEND.find((entry) => entry.key === animal.showcaseExpression);
  if (showcase) return expression(showcase.key, "showcase", showcase.label.split(" — ")[1]?.replace(/\.$/, "") || showcase.label);
  const thermal = animal.thermalStatus || "comfortable";
  const health = finite(animal.health, 100);
  const fear = finite(animal.fear, 0);
  const fatigue = finite(animal.fatigue, 0);
  const aggression = finite(animal.aggression, 0);
  const injuries = Array.isArray(animal.injuries) ? animal.injuries.length : 0;
  const action = actionKey(animal);
  const signal = signalKind(animal, tick);

  if (thermal === "dangerously-hot") return expression("hot", "dangerous-temperature", "visibly dangerously overheated", "hot:dangerous-temperature");
  if (thermal === "dangerously-cold") return expression("cold", "dangerous-temperature", "visibly dangerously cold", "cold:dangerous-temperature");
  if (fear > 88) return expression("panic", "panic", "visibly panicked", "panic:extreme-fear");
  if (action === "flee" && fear > 60) return expression("panic", "panic", "visibly panicked", "panic:flight");
  if (fear > 68) return expression("fear", "fear", "visibly fearful", "fear:fear-level");
  if (health < 32) return expression("dizzy", "severe-pain", "visibly seriously injured", "dizzy:critical-health");
  if (injuries > 1) return expression("dizzy", "severe-pain", "visibly seriously injured", "dizzy:multiple-injuries");
  if (health < 65) return expression("pain", "pain", "visibly in pain", "pain:health");
  if (injuries > 0) return expression("pain", "pain", "visibly in pain", "pain:injury");
  if (action === "collapse") return expression("exhausted", "collapse", "visibly collapsed from exhaustion", "exhausted:collapse");
  if (action === "reject") return expression("angry", "aggression", "visibly aggressive", "angry:rejection");
  if (AGGRESSIVE_ACTIONS.has(action) && aggression > .7) return expression("angry", "aggression", "visibly aggressive", "angry:aggressive-action");
  if (!suppressStartle && (STARTLE_ACTIONS.has(action) || STARTLE_SIGNALS.has(signal))) return expression("startled", "startle", "visibly startled or alarmed", "startled:acute");
  if (thermal === "hot") return expression("hot", "temperature", "visibly hot", "hot:ordinary-temperature");
  if (signal === "heat") return expression("hot", "temperature", "visibly hot", "hot:public-heat-signal");
  if (thermal === "cold") return expression("cold", "temperature", "visibly cold", "cold:ordinary-temperature");
  if (signal === "cold") return expression("cold", "temperature", "visibly cold", "cold:public-cold-signal");
  if (action === "birth") return expression("strained", "strain", "visibly straining", "strained:birth");
  if (STRAIN_ACTIONS.has(action) && fatigue > 42) return expression("strained", "strain", "visibly straining", "strained:intense-exertion");
  if (ACUTE_DISTRESS_ACTIONS.has(action)) return expression("worried", "distress", "visibly distressed or uncertain", "worried:acute-social-action");
  if (SEPARATION_DISTRESS_ACTIONS.has(action)) return expression("worried", "distress", "visibly distressed or uncertain", "worried:separation-or-abandonment");
  if (DISTRESS_SIGNALS.has(signal)) return expression("worried", "distress", "visibly distressed or uncertain", "worried:public-distress-signal");
  if (SLEEP_ACTIONS.has(action)) return expression("sleepy", "fatigue", "visibly asleep or extremely fatigued", "sleepy:sleep-action");
  if (fatigue > 84) return expression("sleepy", "fatigue", "visibly asleep or extremely fatigued", "sleepy:extreme-fatigue");
  if (WEARY_ACTIONS.has(action)) return expression("weary", "fatigue", "visibly weary", "weary:recovery-action");
  if (fatigue > 58) return expression("weary", "fatigue", "visibly weary", "weary:fatigue");
  if (COURTSHIP_ACTIONS.has(action)) return expression("affiliative", "affiliation", "visibly affiliative", "affiliative:courtship");
  if (SUSTAINED_CARE_ACTIONS.has(action)) return expression("affiliative", "affiliation", "visibly affiliative", "affiliative:sustained-care");
  if (AFFILIATIVE_SIGNALS.has(signal)) return expression("affiliative", "affiliation", "visibly affiliative", "affiliative:courtship-signal");
  if (ASSESSMENT_ACTIONS.has(action)) return expression("focused", "focus", "visibly focused", "focused:assessment");
  if (SUSTAINED_FOCUS_ACTIONS.has(action)) return expression("focused", "focus", "visibly focused", "focused:sustained-task");
  if (SUDDEN_ORIENTATION_ACTIONS.has(action)) return expression("alert", "attention", "visibly attentive", "alert:sudden-orientation");
  if (SUSTAINED_ATTENTION_ACTIONS.has(action)) return expression("alert", "attention", "visibly attentive", "alert:sustained-attention");
  if (ATTENTIVE_SIGNALS.has(signal)) return expression("alert", "attention", "visibly attentive", "alert:sudden-orientation");
  if (SAFE_REST_ACTIONS.has(action)) return expression("relaxed", "recovery", "visibly settled in recovery", "relaxed:safe-rest");
  if (TEMPERATURE_RECOVERY_ACTIONS.has(action)) return expression("relaxed", "recovery", "visibly settled in recovery", "relaxed:temperature-recovery");
  return expression("calm", "calm", "no strong involuntary expression", "calm:fallback");
}

export function visibleBodyCondition(animal = {}) {
  const condition = Number.isFinite(Number(animal.bodyCondition)) ? Number(animal.bodyCondition) : 1;
  const key = condition < .7 ? "emaciated" : condition < .88 ? "lean" : condition > 1.15 ? "heavy" : "ordinary";
  return Object.freeze({ key, widthScale: clamp(.76 + condition * .24, .82, 2.2) });
}

export function activeEmittedSignal(animal = {}, tick = 0) {
  const signal = animal.socialSignal;
  return signal?.kind && signal.until > tick ? signal : null;
}

export function decisionTraceVisible(accessMode) { return accessMode === "laboratory" || accessMode === "selected-self"; }
