import { PREDICTIVE_MODEL_NAMES, PREDICTIVE_MODEL_PURPOSES } from "./predictive-language.js";

const defineSymbol = (modelId, visualId, tone, fallbackGlyph, shape, svg) => Object.freeze({
  modelId,
  visualId,
  tone,
  fallbackGlyph,
  shape,
  label: PREDICTIVE_MODEL_NAMES[modelId],
  description: PREDICTIVE_MODEL_PURPOSES[modelId],
  svg
});

export const ANIMAL_PREDICTION_SYMBOLS = Object.freeze([
  defineSymbol("body-state.v1", "body-reserve", "body", "◒", "Capacity gauge with a reserve needle", `<path d="M4.5 16.5a7.5 7.5 0 0 1 15 0"/><path d="M7 14l-1.5-1M12 11V8.5M17 14l1.5-1M12 16.5l3-5"/><circle cx="12" cy="16.5" r="1" fill="currentColor" stroke="none"/>`),
  defineSymbol("resource-water.v1", "water-availability", "water", "≈", "Water drop above a broken ripple", `<path d="M12 3.8s-4.4 5-4.4 8.5a4.4 4.4 0 0 0 8.8 0C16.4 8.8 12 3.8 12 3.8Z"/><path d="M5 19c2.3-1 4.7-1 7 0s4.7 1 7 0" stroke-dasharray="2.4 2"/>`),
  defineSymbol("motion.v1", "observed-motion", "motion", "↝", "Observed point with a dashed trajectory", `<circle cx="5" cy="17" r="1.4" fill="currentColor" stroke="none"/><path d="M6.6 16.4c3.2-.7 4.2-3.2 6-5.3 1.5-1.9 3-3.1 5.3-4.1" stroke-dasharray="2 2"/><path d="m15.5 5.8 2.7 1-1 2.7"/>`),
  defineSymbol("threat-state.v1", "threat-likelihood", "threat", "⌁", "Radar arcs with a possible-contact dot", `<circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><path d="M8.6 15.4a4.8 4.8 0 0 1 0-6.8M5.8 18.2a8.8 8.8 0 0 1 0-12.4"/><circle cx="17.5" cy="7.5" r="1.25"/>`),
  defineSymbol("action-forward.v1", "action-consequences", "action", "⋔", "One path branching to three outcomes", `<path d="M4.5 12H10m0 0 5-6m-5 6h8m-8 0 5 6"/><circle cx="16" cy="5" r="1.25"/><circle cx="19" cy="12" r="1.25"/><circle cx="16" cy="19" r="1.25"/>`)
]);

export const GENERIC_PREDICTION_SYMBOL = Object.freeze({
  modelId: null,
  visualId: "bounded-forecast",
  tone: "neutral",
  fallbackGlyph: "•••",
  shape: "Three dots inside a thin ring",
  label: "Other bounded forecast",
  description: "Neutral fallback for an imported or future model that has not yet received a registered symbol.",
  svg: `<circle cx="7" cy="12" r="1.35" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.35" fill="currentColor" stroke="none"/><circle cx="17" cy="12" r="1.35" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="8.2" opacity=".45"/>`
});

// Forecast clouds use a near-opaque version of the ordinary thought surface,
// with the dark outline language of thought bubbles and the coloured edge
// language of calls. Every text-bearing accent clears 4.5:1 against the
// surface so terrain colour cannot turn a private forecast into faint text.
export const PREDICTION_INSIGHT_PALETTE = Object.freeze({
  surface: "#e8eeea",
  outline: "#26372f",
  eyebrow: "#29443a",
  text: "#101814",
  secondaryText: "#30423a",
  track: "#b8c5be",
  accents: Object.freeze({
    changed: "#765900",
    danger: "#7b5500",
    caution: "#7b5500",
    water: "#006f82",
    motion: "#3f5f8e",
    action: "#426d2f",
    body: "#256b63",
    neutral: "#536159"
  })
});

export function predictionInsightAccent(cue = {}) {
  if (cue.priorityChanged) return PREDICTION_INSIGHT_PALETTE.accents.changed;
  return PREDICTION_INSIGHT_PALETTE.accents[cue.tone] || PREDICTION_INSIGHT_PALETTE.accents.neutral;
}

const SYMBOL_BY_MODEL = new Map(ANIMAL_PREDICTION_SYMBOLS.map(symbol => [symbol.modelId, symbol]));

export function animalPredictionSymbol(modelId) {
  return SYMBOL_BY_MODEL.get(String(modelId || "")) || GENERIC_PREDICTION_SYMBOL;
}

export function animalPredictionSymbolSvg(modelId) {
  const symbol = animalPredictionSymbol(modelId);
  return `<svg class="prediction-symbol-svg" viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false" data-prediction-symbol="${symbol.visualId}"><g fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${symbol.svg}</g></svg>`;
}
