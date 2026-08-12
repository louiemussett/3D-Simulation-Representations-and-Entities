import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { EXPRESSION_LIBRARY_SECTIONS, expressionLibrarySection, visualLanguagePopulationSnapshot } from "../src/visual-language-laboratory.js";
import { FACIAL_EXPRESSION_LEGEND } from "../src/visual-language.js";
import { PUBLIC_SIGNAL_CONTRACT_LEGEND, PUBLIC_SIGNAL_LEGEND_SECTIONS, PUBLIC_SIGNAL_VARIANTS } from "../src/symbol-registry.js";

const app = readFileSync(new URL("../src/app.js", import.meta.url), "utf8"), css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const rendererStart = app.indexOf("function visualLanguageWords(");
const rendererEnd = app.indexOf("\nfunction needEvidenceSummary(", rendererStart);
const renderer = app.slice(rendererStart, rendererEnd);

test("expression Laboratory categories are exhaustive and non-overlapping", () => {
  const grouped = EXPRESSION_LIBRARY_SECTIONS.flatMap(section => section.keys);
  assert.deepEqual(grouped.slice().sort(), FACIAL_EXPRESSION_LEGEND.map(entry => entry.key).sort());
  assert.equal(new Set(grouped).size, FACIAL_EXPRESSION_LEGEND.length);
  for (const entry of FACIAL_EXPRESSION_LEGEND) assert.ok(expressionLibrarySection(entry.key).title);
});

test("live visual-language snapshot counts public projections without carrying private cognition", () => {
  const animals = [
    { id: "VG1", speciesId: "grazer", lifeStage: "subadult", alive: true, health: 100, thermalStatus: "comfortable", fear: 0, fatigue: 0, aggression: 0, injuries: [], actionState: { key: "orient" }, socialSignal: { kind: "contact", until: 20 }, vocalUntil: 12, predictiveCognition: { forbiddenSecret: "private-confidence-73" } },
    { id: "RH1", speciesId: "hunter", lifeStage: "adult", alive: true, health: 100, thermalStatus: "dangerously-hot", fear: 0, fatigue: 0, aggression: 0, injuries: [], actionState: { key: "rest" }, socialSignal: { kind: "water", sharesLocation: true, x: 3, z: 4, until: 20 }, vocalUntil: 8, memories: [{ forbiddenSecret: "hidden-water-memory" }] },
    { id: "VG2", speciesId: "grazer", lifeStage: "adult", alive: false, health: 0, socialSignal: { kind: "threat", until: 20 } }
  ];
  const snapshot = visualLanguagePopulationSnapshot(animals, 10);
  assert.equal(snapshot.population, 2);
  assert.equal(snapshot.activePublicEmitters, 2);
  assert.equal(snapshot.vocalising, 1);
  assert.equal(snapshot.signalUsage["juvenile-contact"].count, 1);
  assert.equal(snapshot.signalUsage["water-report"].count, 1);
  assert.equal(snapshot.expressionUsage.alert.count, 1);
  assert.equal(snapshot.expressionUsage.hot.count, 1);
  assert.deepEqual(snapshot.emitters.map(item => item.entityId), ["RH1", "VG1"]);
  const projectionText = JSON.stringify(snapshot);
  assert.doesNotMatch(projectionText, /private-confidence-73|hidden-water-memory|predictiveCognition|memories/);
});

test("live visual-language snapshot admits only contract-valid public records", () => {
  const base = { speciesId: "grazer", lifeStage: "adult", alive: true, health: 100, thermalStatus: "comfortable", fear: 0, fatigue: 0, aggression: 0, injuries: [], actionState: { key: "rest" } };
  const animals = [
    { ...base, id: "VALID", socialSignal: { kind: "water-report", sharesLocation: true, x: 3, z: 4, until: 20 } },
    { ...base, id: "INCOMPLETE", socialSignal: { kind: "water-report", sharesLocation: true, x: 3, until: 20 } },
    { ...base, id: "UNKNOWN", socialSignal: { kind: "legacy-private-guess", until: 20 } }
  ];
  const snapshot = visualLanguagePopulationSnapshot(animals, 10);
  assert.equal(snapshot.population, 3, "all living animals remain part of the expression population");
  assert.equal(snapshot.activePublicEmitters, 1);
  assert.deepEqual(snapshot.emitters.map(item => item.entityId), ["VALID"]);
  assert.equal(snapshot.signalUsage["water-report"].count, 1);
});

test("Society mounts a Main visual-language instrument with a deliberately condensed Mini surface", () => {
  assert.ok(rendererStart >= 0 && rendererEnd > rendererStart, "visual-language renderer is extractable");
  assert.match(app, /panels\.society\.append\(visualLanguage, society, societyEcology\)/);
  assert.match(app, /if \(id === "society"\) renderVisualLanguageLaboratory\(\)/);
  assert.match(app, /renderVisualLanguageLaboratory\(\);\s*\n/);
  for (const hook of ["data-visual-language-surface=\"mini\"", "data-visual-language-surface=\"main\"", "data-open-main-visual-language", "data-visual-language-mini-expression-samples", "data-visual-language-mini-emitter-samples"]) assert.match(renderer, new RegExp(hook));
  for (const selector of [".visual-language-mini-detail", ".visual-language-main-detail", ".inspector.is-mini-laboratory .visual-language-main-detail", ".inspector.is-mini-laboratory .visual-language-mini-detail"]) assert.ok(css.includes(selector), selector);
  for (const mutableField of ["item.speciesId", "item.lifeStage", "item.expressionLabel", "item.expressionRole", "item.signalLabel", "item.contractId", "item.source", "item.availability"]) assert.ok(renderer.includes(mutableField), `${mutableField} participates in the live refresh signature`);
});

test("Main visual-language surface derives every expression, callout variant and semantic contract", () => {
  for (const source of ["FACIAL_EXPRESSION_LEGEND", "EXPRESSION_LIBRARY_SECTIONS", "PUBLIC_SIGNAL_LEGEND_SECTIONS", "PUBLIC_SIGNAL_CONTRACT_LEGEND", "PUBLIC_SIGNAL_AVAILABILITY"]) assert.match(renderer, new RegExp(source));
  for (const hook of ["data-visual-language-expression", "data-visual-language-signal", "data-visual-language-contract", "data-visual-language-expression-count", "data-visual-language-signal-count", "data-visual-language-current-emitters"]) assert.match(renderer, new RegExp(hook));
  assert.equal(PUBLIC_SIGNAL_LEGEND_SECTIONS.reduce((sum, section) => sum + section.entries.length, 0), PUBLIC_SIGNAL_VARIANTS.length);
  assert.ok(PUBLIC_SIGNAL_CONTRACT_LEGEND.length >= 20);
  assert.match(renderer, /Complete observable-expression library/);
  assert.match(renderer, /Complete public-callout library/);
  assert.match(renderer, /Complete semantic contracts/);
  assert.doesNotMatch(renderer, /<pre\b|JSON\.stringify|raw diagnostic/i);
});

test("Laboratory previews reuse exact world face and public-callout rendering", () => {
  assert.match(renderer, /documentationFacePreview\(/);
  assert.match(renderer, /documentationBadgePreview\(/);
  assert.match(renderer, /visualLanguagePopulationSnapshot\(sim\.animals \|\| \[\], sim\.tick\)/);
  for (const phrase of ["What can become public", "Private prediction · confidence · memory · uncommitted intention", "not a public callout", "Warning", "Resource report", "Directive", "Expression"]) assert.match(renderer, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("Main Laboratory owns the detailed call and private-forecast caveats removed from the Social tab", () => {
  for (const phrase of [
    "Calls are public evidence.",
    "sound arcs appear only while the animal is actively vocalising",
    "does not reveal the exact private thought",
    "different semantic families",
    "does not by itself mean deception",
    "Forecast exception:",
    "can appear beside the ordinary thought cloud",
    "not social agreement or mismatch"
  ]) assert.match(renderer, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(renderer, /data-visual-language-boundary-notes/);
});
