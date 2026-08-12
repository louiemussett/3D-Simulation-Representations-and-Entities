import { resolveSymbolPresentation, thoughtSymbol } from "./symbol-registry.js";

const THERMAL_SIGNAL_EXPRESSION = Object.freeze({ heat: "hot", cold: "cold" });

export function undecidedThoughtPresentation(animal = {}) {
  const ordinaryFallback = thoughtSymbol(animal, "");
  const symbol = Object.freeze({ ...ordinaryFallback, id: "undecided-priority", glyph: "⋯", label: "undecided", colour: "#526b5a" });
  const resolved = resolveSymbolPresentation({ animal, channel: "private-thought", symbol });
  return Object.freeze({
    ...resolved,
    placeholder: true,
    semanticKey: "thought-empty:undecided",
    explanation: "No private priority has committed yet.",
    accessibleLabel: "Undecided; no private priority has committed yet."
  });
}

export function thoughtPresentation({ selected = false, urgentImpact = false } = {}) {
  const persistent = Boolean(selected);
  const visible = !urgentImpact && persistent;
  return Object.freeze({ visible, persistent, transient: false });
}

export function publicSignalPresentation({ signal = null, expressionKey = "calm", vocalActive = false } = {}) {
  if (!signal) return Object.freeze({ exists: false, visible: false, vocal: false, suppressedDuplicate: false, mode: "none" });
  const id = signal.id || signal.kind || "signal";
  const suppressedDuplicate = !vocalActive && THERMAL_SIGNAL_EXPRESSION[id] === expressionKey;
  return Object.freeze({
    exists: true,
    visible: !suppressedDuplicate,
    vocal: Boolean(vocalActive),
    suppressedDuplicate,
    mode: vocalActive ? "vocal call" : "non-vocal outward display"
  });
}

export function actionBadgePresentation({ notable = false, dominant = "none", urgentImpact = false } = {}) {
  const visible = Boolean(notable && !urgentImpact && dominant === "action");
  const suppression = visible ? "" : urgentImpact ? "temporarily hidden by an impact" : dominant !== "action" ? "hidden by a higher-priority world cue" : notable ? "" : "ordinary movement uses arrows, not a badge";
  return Object.freeze({ visible, suppression });
}

export function simplifyAttachedSignal(symbol = {}, vocalActive = false) {
  const simple = new Set(["water", "hunger", "heat", "cold"]);
  return Object.freeze({ ...symbol, vocal: Boolean(vocalActive), hideSpecies: simple.has(symbol.id) });
}

const semanticFamily = (value = "") => {
  const text = String(value).toLowerCase();
  if (/water|thirst|drink/.test(text)) return "water";
  if (/food|hunger|graze|feed|prey|hunt/.test(text)) return "food";
  if (/threat|fear|danger|alarm|attack|flee/.test(text)) return "danger";
  if (/care|offspring|dependent|family/.test(text)) return "care";
  if (/contact|herd|pack|group|social|lost/.test(text)) return "social";
  if (/court|mate|reproduc/.test(text)) return "courtship";
  if (/heat|cool/.test(text)) return "heat";
  if (/cold|warm/.test(text)) return "cold";
  return text || "other";
};

export function thoughtSignalAlignment(priority, signal = null) {
  if (!signal) return Object.freeze({ compared: false, aligned: null, tone: "private" });
  const aligned = semanticFamily(priority) === semanticFamily(`${signal.id || signal.kind || ""} ${signal.label || ""}`);
  return Object.freeze({ compared: true, aligned, tone: aligned ? "aligned" : "divergent" });
}

export function lifeStageCode(lifeStage) {
  return ({ dependent: "B", juvenile: "J", subadult: "YA", adult: "A", old: "O" })[lifeStage] || "?";
}

const sexGlyph = (sex) => {
  const value = String(sex || "").trim().toLowerCase();
  if (value === "f" || value === "female") return "♀";
  if (value === "m" || value === "male") return "♂";
  return "?";
};

function compactEntityId(id, maximumLength = 10) {
  const fullId = String(id ?? "").trim() || "UNKNOWN";
  if (fullId.length <= maximumLength) return fullId;
  const numericSuffix = fullId.match(/\d+$/)?.[0] || "";
  const stem = numericSuffix ? fullId.slice(0, -numericSuffix.length) : fullId;
  const words = stem.match(/[A-Z]+(?=[A-Z][a-z]|\b)|[A-Z]?[a-z]+/g) || [];
  const initials = words.map((word) => word[0]).join("").toUpperCase();
  const compressed = `${initials}${numericSuffix}`;
  if (initials.length >= 2 && compressed.length <= maximumLength) return compressed;
  return `${fullId.slice(0, maximumLength - 1)}…`;
}

/**
 * Formats only public identity and caller-authorised observable symbols.
 * Private priorities, memories, physiology and predictions are deliberately
 * outside this contract and are never inspected here.
 */
export function entityIdentityPresentation(entity = {}, { observableExpressionGlyph = "", publicCueGlyph = "" } = {}) {
  const fullId = String(entity.id ?? "").trim() || "UNKNOWN";
  const shortId = compactEntityId(fullId);
  const resolvedSexGlyph = sexGlyph(entity.sex);
  const resolvedLifeStageCode = lifeStageCode(entity.lifeStage);
  const pregnancyMarker = entity.pregnant ? "P" : "";
  const compactText = `[${[shortId, resolvedSexGlyph, resolvedLifeStageCode, pregnancyMarker, observableExpressionGlyph, publicCueGlyph].filter(Boolean).join(" ")}]`;
  return Object.freeze({ fullId, shortId, sexGlyph: resolvedSexGlyph, lifeStageCode: resolvedLifeStageCode, pregnancyMarker, compactText });
}
