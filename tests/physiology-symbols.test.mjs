import test from "node:test";
import assert from "node:assert/strict";
import {
  METABOLIC_RESERVE_SYMBOL_KEYS,
  PERFORMANCE_SYMBOL_KEYS,
  PHYSIOLOGY_SYMBOL_ORDER,
  PHYSIOLOGY_SYMBOLS,
  physiologyLegendEntries,
  physiologySymbolLegendHtml,
  physiologySymbolSvg
} from "../src/physiology-symbols.js";

const expected = ["gutNutrients", "bloodLiverFuel", "bodyFat", "water", "aerobicEndurance", "muscleGlycogen", "adrenalineCapacity"];

test("the internal physiology key has seven distinct shape-coded symbols", () => {
  assert.deepEqual(PHYSIOLOGY_SYMBOL_ORDER, expected);
  assert.deepEqual(METABOLIC_RESERVE_SYMBOL_KEYS, expected.slice(0, 4));
  assert.deepEqual(PERFORMANCE_SYMBOL_KEYS, expected.slice(4));
  assert.deepEqual(Object.keys(PHYSIOLOGY_SYMBOLS), expected);
  assert.equal(new Set(expected.map(key => PHYSIOLOGY_SYMBOLS[key].drawing)).size, expected.length);
  assert.equal(new Set(expected.map(key => PHYSIOLOGY_SYMBOLS[key].shortLabel)).size, expected.length);
  for (const key of expected) {
    const symbol = PHYSIOLOGY_SYMBOLS[key];
    assert.match(symbol.colour, /^#[0-9a-f]{6}$/i);
    assert.match(symbol.drawing, /<(?:path|circle)/);
    assert.ok(symbol.description.length > 20);
    assert.ok(Object.isFrozen(symbol));
  }
});

test("physiology SVG output is accessible in labelled and decorative contexts", () => {
  for (const key of expected) {
    const decorative = physiologySymbolSvg(key);
    assert.match(decorative, new RegExp(`data-physiology-symbol="${key}"`));
    assert.match(decorative, /viewBox="0 0 32 32"/);
    assert.match(decorative, /aria-hidden="true"/);
    assert.match(decorative, /focusable="false"/);
    const labelled = physiologySymbolSvg(key, { labelled: true });
    assert.match(labelled, /role="img"/);
    assert.match(labelled, new RegExp(`aria-label="${PHYSIOLOGY_SYMBOLS[key].label}"`));
  }
});

test("legend records and Laboratory markup enumerate the same canonical key", () => {
  const entries = physiologyLegendEntries();
  assert.deepEqual(entries.map(entry => entry.physiologyKey), expected);
  assert.deepEqual(entries.map(entry => entry.id), expected.map(key => `physiology:${key}`));
  const html = physiologySymbolLegendHtml();
  assert.match(html, /data-physiology-symbol-legend/);
  for (const key of expected) {
    assert.match(html, new RegExp(`data-physiology-key="${key}"`));
    assert.match(html, new RegExp(`data-physiology-symbol="${key}"`));
  }
});
