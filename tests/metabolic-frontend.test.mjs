import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const symbols = readFileSync(new URL("../src/symbol-registry.js", import.meta.url), "utf8");
const physiologySymbols = readFileSync(new URL("../src/physiology-symbols.js", import.meta.url), "utf8");

test("world physiology overlays expose conserved fuel terminology", () => {
  assert.match(app, /Muscle glycogen/i);
  assert.match(app, /Adrenaline capacity.*stress/is);
  assert.match(app, /Gut nutrients.*Blood\/liver fuel.*Body fat.*Water/is);
  assert.doesNotMatch(app, /STOMACH \$\{stomach\}/);
});

test("selected organism tabs remain readable after adding Forecasts", () => {
  assert.match(html, /role="tab" aria-selected="true"[^>]*>Overview/);
  assert.match(html, /data-observer-tab="predictive">Forecasts/);
  assert.match(html, /data-observer-tab="view">Overlays/);
  assert.match(css, /#observer-selection \.observer-tabs[^}]*repeat\(5/);
  assert.doesNotMatch(css, /@media \(max-width: 420px\)[\s\S]*#observer-selection \.observer-tabs[^}]*repeat\(3/);
  assert.match(css, /\.observer-tabs button[^}]*white-space:normal/);
  assert.match(css, /\.observer-detail[^}]*overflow-y:auto/);
});

test("selected organism tables keep their values wide and their authored type hierarchy", () => {
  const compactStart = css.indexOf("The selected-organism panel is a dense live instrument");
  const compactCss = css.slice(compactStart);
  assert.ok(compactStart >= 0, "observer density layer is present after the generic definition-list rules");
  for (const component of [".observer-overview-card dl", ".observer-social-summary", ".entity-predictive-impact", ".observer-detail-grid"]) assert.match(compactCss, new RegExp(component.replaceAll(".", "\\.")));
  assert.match(compactCss, /grid-template-columns:\s*minmax\(0, 1fr\)/);
  assert.match(compactCss, /#observer-selection \.entity-predictive-impact dd[^}]*font-size:\s*9px/);
  assert.match(compactCss, /#observer-selection \.observer-overlay-groups[^}]*gap:\s*5px/);
  assert.match(compactCss, /#observer-selection \.observer-fuel-panel[^}]*padding:\s*6px/);
});

test("runtime typography scales authored component sizes instead of flattening every role", () => {
  const start = app.indexOf("function applyInterfacePresentation(");
  const end = app.indexOf("\nfunction resetIconTextureCaches(", start);
  const scaler = app.slice(start, end);
  assert.ok(start >= 0 && end > start, "typography scaler is extractable");
  assert.match(scaler, /typographyManaged/);
  assert.match(scaler, /removeProperty\("font-size"\)/);
  assert.match(scaler, /node\.matches\("#observer-selection, #observer-selection \*, #movie-hud, #movie-hud \*"\)/);
  assert.match(scaler, /Number\.parseFloat\(getComputedStyle\(node\)\.fontSize\)/);
  assert.match(scaler, /measured\.push\(\{ node, role, authoredSize/);
  assert.match(scaler, /authoredSize \* scale/);
  assert.doesNotMatch(scaler, /typographyDefaults\[role\] \* graphicsSettings\.fontScale/);
});

test("dynamic selected-panel typography is remeasured from the complete authored panel", () => {
  const app = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
  const observerStart = app.indexOf("const typographyObserver = new MutationObserver");
  const observerEnd = app.indexOf("typographyObserver.observe(document.body", observerStart);
  const observer = app.slice(observerStart, observerEnd);
  assert.match(observer, /node\.closest\("#observer-selection, #movie-hud"\)/);
  assert.match(observer, /pendingTypographyRoots\.add\(authoredPanel \|\| node\)/);
});

test("selected organism commitment and Laboratory expose metabolic state", () => {
  assert.match(app, /observerFuelOverviewHtml/);
  assert.match(app, /function observerWholeAnimalOverviewHtml[\s\S]*observer-overview-physiology/);
  assert.match(app, /function observerWholeAnimalOverviewHtml[\s\S]*instrumentMetricSnapshot/);
  assert.match(app, /function observerCommitmentVisualHtml[\s\S]*observer-physiology-badges/);
  for (const label of ["Health", "Hydration", "Accessible fuel", "Burst capacity", "Aerobic headroom", "Recovery burden"]) assert.match(app, new RegExp(label));
  assert.match(app, /ui\.selectedEnergy\.textContent/);
  assert.match(app, /anaerobic debt/);
  assert.match(html, /Metabolic fuel and performance/);
});

test("overlay tab reduces entity presentation to three coherent controls", () => {
  for (const label of ["Personal space", "Known world only", "No panel and bubbles"]) assert.match(app, new RegExp(label));
  assert.match(app, /data-observer-overlay="presentation"/);
  assert.match(app, /entityPublicPanelsVisible: visible/);
  assert.match(app, /entitySelectedPresentationVisible: visible/);
});

test("entity display guide documents the redesigned physiology overlays", () => {
  for (const label of ["Gut nutrients", "Blood/liver fuel", "Body fat", "Performance fuels", "muscle glycogen", "adrenaline capacity", "adrenaline stress"]) assert.match(html, new RegExp(label, "i"));
  assert.match(html, /Adrenaline mobilises fuel; it is not itself an energy reserve/);
  assert.doesNotMatch(html, /<dt>Endurance<\/dt>/);
  assert.match(symbols, /physiologyLegendEntries/);
  assert.match(app, /entry\.physiologyKey/);
  assert.doesNotMatch(symbols, /Gut · Blood\/liver · Fat · Water/);
  assert.doesNotMatch(symbols, /Endurance · Glycogen · Adrenaline/);
  for (const key of ["gutNutrients", "bloodLiverFuel", "bodyFat", "water", "aerobicEndurance", "muscleGlycogen", "adrenalineCapacity"]) assert.match(physiologySymbols, new RegExp(key));
  for (const selector of [".physiology-symbol", ".physiology-symbol-fill", ".physiology-symbol-stress", ".physiology-symbol-legend", ".physiology-symbol-legend-item"]) assert.ok(css.includes(selector), selector);
  assert.doesNotMatch(symbols, /Fat · Stomach · Water/);
  assert.doesNotMatch(`${html}\n${symbols}\n${app}`, /Rapid fuel/i);
});

test("retired standalone physiology controls are absent while interface typography remains adjustable", () => {
  assert.doesNotMatch(html, /id="graphics-diagnostic-(?:size|text)"/);
  assert.match(html, /id="font-scale"/);
  assert.match(app, /id="font-body-scale"/);
  assert.match(app, /Typography categories/);
  assert.match(app, /graphicsSettings\.diagnosticTextScale/);
  assert.match(app, /canvas\.width = 576/);
  assert.match(app, /canvas\.width = 576; canvas\.height = 168/);
  assert.match(app, /compositionHeight = diagnosticWidth \* 84 \/ 288/);
  assert.match(app, /label: "Blood\/liver fuel"/);
  assert.doesNotMatch(app, /Blood\/liv\s+er fuel/);
  assert.match(app, /drawDiagnosticMeter/);
  assert.match(app, /METABOLIC RESERVES/);
  assert.match(app, /FUEL AND PERFORMANCE/);
  assert.doesNotMatch(app, /previousDiagnosticTextScale/);
});
