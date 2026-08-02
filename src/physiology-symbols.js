const freezeSymbol = (key, label, shortLabel, colour, group, description, drawing) => Object.freeze({
  key,
  label,
  shortLabel,
  colour,
  group,
  description,
  drawing
});

/**
 * Canonical observer-facing symbols for internal physiology. These marks are
 * Laboratory notation: animals neither see them nor communicate them.
 *
 * The drawings deliberately use distinct silhouettes as well as colour so the
 * key remains readable in monochrome and for colour-vision deficiencies.
 */
export const PHYSIOLOGY_SYMBOLS = Object.freeze({
  gutNutrients: freezeSymbol(
    "gutNutrients",
    "Gut nutrients",
    "Gut",
    "#79d9a0",
    "metabolic-reserve",
    "Nutrients still inside the digestive system and awaiting absorption.",
    '<path class="physiology-symbol-fill" d="M8.2 7.1c0 4.7.4 6.7 3.2 8.3 1.8 1.1 1.6 4.8 4.8 5.5 3.4.8 7.1-1.7 7.1-5.5 0-3.1-2.1-5.1-5.3-5.1h-2.1V6.2"/><path d="M8.2 7.1c0 4.7.4 6.7 3.2 8.3 1.8 1.1 1.6 4.8 4.8 5.5 3.4.8 7.1-1.7 7.1-5.5 0-3.1-2.1-5.1-5.3-5.1h-2.1V6.2"/><circle cx="14.2" cy="14.2" r="1.2"/><circle cx="18.1" cy="13.5" r="1.2"/><circle cx="17.1" cy="17.3" r="1.2"/>'
  ),
  bloodLiverFuel: freezeSymbol(
    "bloodLiverFuel",
    "Blood/liver fuel",
    "Blood + liver",
    "#62ddb7",
    "metabolic-reserve",
    "Near-term circulating blood fuel and the liver glycogen that stabilises it.",
    '<path class="physiology-symbol-fill" d="M9.2 4.8C7.4 7.5 4.8 10.5 4.8 13a4.4 4.4 0 0 0 8.8 0c0-2.5-2.6-5.5-4.4-8.2Z"/><path d="M9.2 4.8C7.4 7.5 4.8 10.5 4.8 13a4.4 4.4 0 0 0 8.8 0c0-2.5-2.6-5.5-4.4-8.2Z"/><path class="physiology-symbol-fill" d="M15.3 14.1c2.4-3.7 8-4.5 11.7-1.8-.7 5.3-3.7 8.4-8.2 8.4-2.7 0-4.4-2.5-3.5-6.6Z"/><path d="M15.3 14.1c2.4-3.7 8-4.5 11.7-1.8-.7 5.3-3.7 8.4-8.2 8.4-2.7 0-4.4-2.5-3.5-6.6Z"/><path d="M19.3 13.2c.5 2.4-.1 4.7-1.7 6.3"/>'
  ),
  bodyFat: freezeSymbol(
    "bodyFat",
    "Body fat",
    "Fat reserve",
    "#e9c45c",
    "metabolic-reserve",
    "Long-term energy stored in adipose tissue as part of body mass.",
    '<circle class="physiology-symbol-fill" cx="16" cy="16" r="6.7"/><circle class="physiology-symbol-fill" cx="8.2" cy="10.1" r="3.2"/><circle class="physiology-symbol-fill" cx="24.2" cy="10.6" r="3.5"/><circle class="physiology-symbol-fill" cx="9.1" cy="23.3" r="3.1"/><circle class="physiology-symbol-fill" cx="23.5" cy="23" r="3.3"/><circle cx="16" cy="16" r="6.7"/><circle cx="8.2" cy="10.1" r="3.2"/><circle cx="24.2" cy="10.6" r="3.5"/><circle cx="9.1" cy="23.3" r="3.1"/><circle cx="23.5" cy="23" r="3.3"/><circle cx="16" cy="16" r="2"/>'
  ),
  water: freezeSymbol(
    "water",
    "Water",
    "Hydration",
    "#61c9ef",
    "metabolic-reserve",
    "The animal's currently available hydration reserve.",
    '<path class="physiology-symbol-fill" d="M16 3.8C12.4 9 7.4 14.5 7.4 19.2a8.6 8.6 0 1 0 17.2 0C24.6 14.5 19.6 9 16 3.8Z"/><path d="M16 3.8C12.4 9 7.4 14.5 7.4 19.2a8.6 8.6 0 1 0 17.2 0C24.6 14.5 19.6 9 16 3.8Z"/><path d="M11.5 20.1c.4 2.1 1.7 3.4 3.8 3.9"/>'
  ),
  aerobicEndurance: freezeSymbol(
    "aerobicEndurance",
    "Aerobic endurance",
    "Endurance",
    "#71e4c0",
    "performance",
    "Sustainable cardiovascular and muscular performance before fatigue.",
    '<path class="physiology-symbol-fill" d="M16 25.2C9.1 25.2 4.6 21.7 4.6 16S9.1 6.8 16 6.8 27.4 10.3 27.4 16 22.9 25.2 16 25.2Z"/><path d="M16 25.2C9.1 25.2 4.6 21.7 4.6 16S9.1 6.8 16 6.8 27.4 10.3 27.4 16 22.9 25.2 16 25.2Z"/><path d="M3.6 16h5.2l2.2-4.2 3.6 9 3.2-6.2 2 3.1h8.6"/>'
  ),
  muscleGlycogen: freezeSymbol(
    "muscleGlycogen",
    "Muscle glycogen",
    "Glycogen",
    "#6fd9f5",
    "performance",
    "Carbohydrate stored locally in muscle for intense work.",
    '<path class="physiology-symbol-fill" d="m10.1 6.2 4.3 2.5v5l-4.3 2.5-4.3-2.5v-5Zm11.8 0 4.3 2.5v5l-4.3 2.5-4.3-2.5v-5Zm-5.9 10 4.3 2.5v5L16 26.2l-4.3-2.5v-5Z"/><path d="m10.1 6.2 4.3 2.5v5l-4.3 2.5-4.3-2.5v-5Zm11.8 0 4.3 2.5v5l-4.3 2.5-4.3-2.5v-5Zm-5.9 10 4.3 2.5v5L16 26.2l-4.3-2.5v-5Z"/><path d="m14.4 11.2 3.2 0M12.2 15l1.8 2.4m5.8-2.4-1.8 2.4"/>'
  ),
  adrenalineCapacity: freezeSymbol(
    "adrenalineCapacity",
    "Adrenaline capacity",
    "Adrenaline",
    "#f2c55c",
    "performance",
    "Remaining emergency mobilisation capacity; the red arc denotes accumulated stress, not extra fuel.",
    '<path class="physiology-symbol-fill" d="m18.2 3.7-9.4 13h6.1l-1.3 11.6 9.6-14.7h-6.1Z"/><path d="m18.2 3.7-9.4 13h6.1l-1.3 11.6 9.6-14.7h-6.1Z"/><path class="physiology-symbol-stress" d="M5.1 8.3 2.9 6.1m24 2.2 2.2-2.2M4 23l-2.6 1.2m26.6-1.2 2.6 1.2M8.2 3.9 6.9 1.4m16.9 2.5 1.3-2.5"/>'
  )
});

export const PHYSIOLOGY_SYMBOL_ORDER = Object.freeze([
  "gutNutrients",
  "bloodLiverFuel",
  "bodyFat",
  "water",
  "aerobicEndurance",
  "muscleGlycogen",
  "adrenalineCapacity"
]);

export const METABOLIC_RESERVE_SYMBOL_KEYS = Object.freeze(PHYSIOLOGY_SYMBOL_ORDER.slice(0, 4));
export const PERFORMANCE_SYMBOL_KEYS = Object.freeze(PHYSIOLOGY_SYMBOL_ORDER.slice(4));

export function physiologySymbol(key) {
  return PHYSIOLOGY_SYMBOLS[key] || null;
}

const escapeHtml = value => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll('"', "&quot;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;");

export function physiologySymbolSvg(key, { className = "physiology-symbol", labelled = false } = {}) {
  const symbol = physiologySymbol(key);
  if (!symbol) return "";
  const accessibility = labelled
    ? `role="img" aria-label="${escapeHtml(symbol.label)}"`
    : 'aria-hidden="true" focusable="false"';
  return `<svg class="${escapeHtml(className)}" data-physiology-symbol="${symbol.key}" viewBox="0 0 32 32" ${accessibility} style="--physiology-symbol-colour:${symbol.colour}">${symbol.drawing}</svg>`;
}

export function physiologyLegendEntries(keys = PHYSIOLOGY_SYMBOL_ORDER) {
  return Object.freeze(keys.map(key => {
    const symbol = physiologySymbol(key);
    return Object.freeze({
      id: `physiology:${symbol.key}`,
      physiologyKey: symbol.key,
      glyph: symbol.shortLabel,
      colour: symbol.colour,
      label: `${symbol.label} — ${symbol.description}`,
      search: `physiology internal reserve performance ${symbol.key} ${symbol.label} ${symbol.shortLabel} ${symbol.description}`
    });
  }));
}

export function physiologySymbolLegendHtml(keys = PHYSIOLOGY_SYMBOL_ORDER) {
  return `<div class="physiology-symbol-legend" data-physiology-symbol-legend>${keys.map(key => {
    const symbol = physiologySymbol(key);
    return `<div class="physiology-symbol-legend-item" data-physiology-key="${symbol.key}">${physiologySymbolSvg(symbol.key)}<span><strong>${symbol.label}</strong><small>${symbol.description}</small></span></div>`;
  }).join("")}</div>`;
}
