import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { LABORATORY_REFERENCE_SECTIONS, laboratoryReferenceHtml } from "../src/laboratory-reference.js";
import { SPECIES_IDS } from "../src/species-registry.js";
import { PREDICTION_ABSTENTIONS, PREDICTION_AUTHORITIES, PREDICTION_FRAMEWORKS } from "../src/prediction-contract.js";
import { PREDICTION_EMPTY_STATES, PREDICTION_INSIGHT_EFFECT_STATES, PREDICTION_INSIGHT_VARIANTS } from "../src/predictive-entity-presentation.js";
import { PREDICTION_ABSTENTION_GUIDE, PREDICTION_AUTHORITY_GUIDE, PREDICTION_FRAMEWORK_GUIDE, PREDICTION_MODE_GUIDE } from "../src/predictive-language.js";
import { ANIMAL_PREDICTION_SYMBOLS, GENERIC_PREDICTION_SYMBOL } from "../src/prediction-symbols.js";
import { EXPRESSION_PRECEDENCE, FACIAL_EXPRESSION_LEGEND } from "../src/visual-language.js";
import { PUBLIC_SIGNAL_CONTRACTS, PUBLIC_SIGNAL_VARIANTS } from "../src/symbol-registry.js";
import { EMPTY_CHANNEL_HIDDEN_MS, EMPTY_CHANNEL_VISIBLE_MS, PRESENTATION_MINIMUM_HOLD_MS } from "../src/presentation-channel-hold.js";
import { CALLOUT_PRESENTATION_TIMINGS, EXPRESSION_PRESENTATION_TIMINGS, FORECAST_EMPTY_PRESENTATION_TIMINGS, FORECAST_PRESENTATION_TIMINGS, THOUGHT_PRESENTATION_TIMINGS } from "../src/presentation-timing.js";

const app = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("Laboratory has a dedicated searchable reference tab", () => {
  assert.match(app, /\["reference", "Reference"/);
  assert.match(app, /laboratory-reference-search/);
  assert.match(css, /\.reference-toc/);
  assert.match(css, /\.reference-article-body/);
});

test("reference documents the complete physiology and presentation vocabulary", () => {
  assert.ok(LABORATORY_REFERENCE_SECTIONS.length >= 35);
  const text = laboratoryReferenceHtml();
  for (const term of ["Gut nutrients", "Blood/Liver", "Muscle glycogen", "Body fat", "Functional protein", "Adrenaline capacity", "Anaerobic debt", "Hydration", "Dependent babies", "Pregnancy", "Knowledge fog", "Overlay dictionary"]) assert.match(text, new RegExp(term, "i"));
  assert.match(text, /Adrenaline is a control signal, not fuel/);
  assert.match(text, /percentages of that individual animal's capacity/);
});

test("reference uses every canonical physiology symbol in the matching article", () => {
  const metabolic = LABORATORY_REFERENCE_SECTIONS.find(section => section.id === "metabolic-reserves-overlay");
  const performance = LABORATORY_REFERENCE_SECTIONS.find(section => section.id === "performance-fuels");
  assert.ok(metabolic); assert.ok(performance);
  const keys = html => [...html.matchAll(/data-physiology-key="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(keys(metabolic.html), ["gutNutrients", "bloodLiverFuel", "bodyFat", "water"]);
  assert.deepEqual(keys(performance.html), ["aerobicEndurance", "muscleGlycogen", "adrenalineCapacity"]);
  for (const section of [metabolic, performance]) assert.match(section.html, /data-physiology-symbol-legend/);
  for (const phrase of ["near-term accessible carbohydrate", "long-term reserve", "hydration reserve", "sustainable cardiovascular", "intense work", "control signal, not fuel"]) assert.match(`${metabolic.html} ${performance.html}`, new RegExp(phrase, "i"));
});

test("reference covers every major game-system family", () => {
  const ids = new Set(LABORATORY_REFERENCE_SECTIONS.map(section => section.id));
  for (const id of ["visual-atlas", "architecture", "simulation-clock", "world-generation", "terrain-hydrology", "plants-resources", "weather-seasons", "species-directory", "organism-design", "locomotion", "behaviour-ontology", "action-catalogue", "attention-memory", "symbols-communication", "predation", "relationships", "groups-leadership", "mate-choice", "traits-lifespan", "death-succession", "camera-interface", "settings", "saves-records", "diagnostics", "performance", "limits", "glossary"]) assert.ok(ids.has(id), id);
  const html = laboratoryReferenceHtml();
  for (const term of ["Valley Grazer", "African Spurred Tortoise", "Maintain hydration", "Drink at confirmed shoreline", "authoritative simulated minute", "Ecological accounting", "Personal space", "Meta-group", "Surface nests", "deterministic time skip"]) assert.match(html, new RegExp(term, "i"));
});

test("reference explains literal calculated ecology presets and manual overrides", () => {
  const section = LABORATORY_REFERENCE_SECTIONS.find(item => item.id === "species-directory");
  assert.ok(section);
  for (const term of ["Literal predator-and-prey population presets", "world scale", "ecological function", "Spotted Hyena", `current ${SPECIES_IDS.length}-species catalogue`, "20%", "200%", "one predator means one predator", "Custom selection"]) assert.match(section.html, new RegExp(term, "i"), term);
  assert.match(section.html, /pack breaker web[^]*American Bison 11[^]*Black Rhinoceros 7[^]*Spotted Hyena 1[^]*Musk Ox 10/i);
  assert.match(section.html, /data-reference-ecology-preset="full"/);
  assert.match(section.html, /Low-predator founder safeguard/i);
  assert.match(section.html, /only one or two literal animals[^]*adult female at 95% gestation/i);
  assert.match(section.html, /only when the world is created/i);
});

test("reference explains the public rail, selected integrated instrument and every independent line channel", () => {
  const section = LABORATORY_REFERENCE_SECTIONS.find(item => item.id === "symbols-communication");
  assert.ok(section);
  for (const term of [
    "Unselected public rail", "Selected integrated instrument", "Selection, not zoom, controls detail", "Scroll controls size", "Camera movement controls visibility", "Selected private attachments", "Centre-weighted screen budget",
    "Ownership tether", "Facing and movement intent", "Actor-to-target relation", "Decision-cause connector",
    "Recent motion trail", "Confirmed call receipt", "Optional sensory direction", "There is no permanent group, kinship or prediction line"
  ]) assert.match(section.html, new RegExp(term, "i"), term);
  assert.match(section.html, /Laboratory access, hover, screen-budget admission and Cinema interest[\s\S]*cannot place private cognition above an unselected animal/i);
  assert.match(section.html, /either transparent bay may be temporarily empty without creating a blank visible panel/i);
  assert.match(section.html, /Selecting a living animal makes its integrated instrument the only animal panel[\s\S]*every other rail, nameplate and tether disappears/i);
  assert.match(section.html, /Cinema applies the same one-owner rule without changing observer selection[\s\S]*world shot or a shot with no valid living animal shows no animal panel/i);
  assert.match(section.html, /bounded centre-ranked budget operates only in the unselected strategic view/i);
  assert.match(section.html, /neutral pale means no signal[\s\S]*pale green-grey means the same semantic family[\s\S]*grey means different families/i);
  assert.match(section.html, /Difference is not evidence of deception[\s\S]*forecast is a separate private exception[\s\S]*appear beside ordinary thought/i);
  assert.doesNotMatch(section.html, /Unselected medium strip|Unselected close summary|Selected close-up card/i);
});

test("reference documents one selected instrument root with uniform size and independent visibility", () => {
  const html = laboratoryReferenceHtml();
  assert.match(html, /selected animal only[\s\S]*ordinary thought/i);
  assert.match(html, /Empty-status heartbeat may replace it[\s\S]*forecast remains available in panels and ledgers/i);
  assert.match(html, /unselected animal receives a compact public rail/i);
  assert.match(html, /selecting that animal expands[\s\S]*one integrated instrument panel/i);
  assert.match(html, /full-width health row[\s\S]*plain-language decision context[\s\S]*metabolic reserves[\s\S]*fuel-and-performance columns/i);
  assert.match(html, /all sections below the clouds share one outer border, ownership colour, collision footprint, scale and tether/i);
  assert.match(html, /two transparent attachment bays[\s\S]*points back to the instrument/i);
  assert.match(html, /Presentation settings remain independent[\s\S]*Health, metabolic reserves, fuel and performance, expression, public cue, ordinary thought and private forecast/i);
  assert.match(html, /two presentation-only controls/i);
  assert.match(html, /<strong>Entity panel text<\/strong> independently redraws/i);
  assert.match(html, /complete unselected thick public rail[\s\S]*complete selected instrument uniformly/i);
  assert.match(html, /Individual content channels remain independently hideable[\s\S]*no longer have independent size controls/i);
  assert.match(html, /Obsolete component and standalone-physiology size controls are not shown/i);
  assert.match(html, /Interface scale, overall font scale and five typography roles/i);
  assert.match(html, /distance from the simulation screen centre[\s\S]*lower-ranked panel that overlaps it is hidden/i);
  assert.match(html, /never pins, shoves, shrinks or independently rearranges panel contents/i);
  assert.match(html, /wheel event[\s\S]*camera-to-animal distance/i);
  assert.match(html, /camera orbit, pitch and map movement[\s\S]*do not revise that stored scale/i);
  assert.doesNotMatch(html, /selected animal or a permitted Laboratory view/i);
  assert.doesNotMatch(html, /replaces the ordinary private-priority cloud/i);
});

test("reference documents the asymmetric thick public rail and wide action language", () => {
  const section = LABORATORY_REFERENCE_SECTIONS.find(item => item.id === "symbols-communication");
  assert.ok(section);
  assert.match(section.html, /public rail:[\s\S]*fixed 314 × 82 surface/i);
  assert.match(section.html, /82 × 82 square expression bay[\s\S]*128 × 82 identity bay[\s\S]*104 × 82 outward-cue bay/i);
  assert.match(section.html, /face occupies 66 × 66 pixels without stretching/i);
  assert.match(section.html, /calls and notable actions occupy a wide 92 × 68 frame/i);
  assert.match(section.html, /Empty public cues leave their bay reserved[\s\S]*pregnancy text never changes the rail width/i);
  assert.match(section.html, /wide frame = notable action/i);
  assert.doesNotMatch(section.html, /hexagon = notable action/i);
});

test("symbols reference exhaustively renders every observable expression and its precedence", () => {
  const section = LABORATORY_REFERENCE_SECTIONS.find(item => item.id === "symbols-communication");
  assert.ok(section);
  const atlas = section.html.match(/<table data-reference-expression-atlas>[\s\S]*?<\/table>/)?.[0] || "";
  const precedence = section.html.match(/<table data-reference-expression-precedence>[\s\S]*?<\/table>/)?.[0] || "";
  assert.deepEqual([...atlas.matchAll(/data-reference-expression="([^"]+)"/g)].map(match => match[1]), FACIAL_EXPRESSION_LEGEND.map(entry => entry.key));
  assert.deepEqual([...precedence.matchAll(/data-reference-expression-precedence="([^"]+)"/g)].map(match => match[1]), EXPRESSION_PRECEDENCE);
  for (const entry of FACIAL_EXPRESSION_LEGEND) {
    assert.ok(atlas.includes(entry.glyph), `${entry.key} glyph`);
    assert.ok(atlas.includes(entry.label), `${entry.key} explanation`);
    assert.ok(atlas.includes(entry.colour), `${entry.key} colour`);
  }
  assert.deepEqual([...atlas.matchAll(/data-reference-expression-timing="([^"]+)"/g)].map(match => match[1]), EXPRESSION_PRESENTATION_TIMINGS.map(profile => profile.id));
  assert.match(section.html, /startled onset is explicitly transient for 0\.5 seconds/i);
  assert.match(section.html, /relaxed safe-rest must remain eligible for 1\.5 seconds/i);
  assert.match(section.html, /deterministic first-match rule/i);
  assert.match(section.html, /not a readout of a need score or a prediction/i);
  assert.match(section.html, /First biological match wins[\s\S]*dangerously overheated animal does not appear merely relaxed/i);
});

test("symbols reference exhaustively renders concrete public-signal variants", () => {
  const section = LABORATORY_REFERENCE_SECTIONS.find(item => item.id === "symbols-communication");
  assert.ok(section);
  const atlas = section.html.match(/<table data-reference-public-signal-variants>[\s\S]*?<\/table>/)?.[0] || "";
  assert.deepEqual([...atlas.matchAll(/data-reference-signal-variant="([^"]+)"/g)].map(match => match[1]), PUBLIC_SIGNAL_VARIANTS.map(variant => variant.id));
  for (const variant of PUBLIC_SIGNAL_VARIANTS) {
    assert.ok(atlas.includes(variant.label), `${variant.id} label`);
    assert.ok(atlas.includes(variant.contract.replaceAll("-", " ")), `${variant.id} contract`);
    assert.ok(atlas.includes(variant.intent.replaceAll("-", " ")), `${variant.id} intent`);
    assert.ok(atlas.includes(variant.audience.replaceAll("-", " ")), `${variant.id} audience`);
  }
  assert.deepEqual([...atlas.matchAll(/data-reference-callout-timing="([^"]+)"/g)].map(match => match[1]), PUBLIC_SIGNAL_VARIANTS.map(variant => variant.id));
  for (const profile of CALLOUT_PRESENTATION_TIMINGS) assert.ok(atlas.includes(profile.id.slice("callout:".length)), `${profile.id} timing`);
  assert.match(atlas, /🌿 \/ 🦌/, "the species-dependent hunger call shows both concrete food glyphs");
  assert.match(section.html, /same semantic contract may therefore have several visible variants/i);
});

test("symbols reference derives every public-signal contract and guarded extension boundary", () => {
  const section = LABORATORY_REFERENCE_SECTIONS.find(item => item.id === "symbols-communication");
  assert.ok(section);
  const table = section.html.match(/<table data-reference-public-signal-contracts>[\s\S]*?<\/table>/)?.[0] || "";
  assert.deepEqual([...table.matchAll(/data-reference-signal-contract="([^"]+)"/g)].map(match => match[1]), Object.keys(PUBLIC_SIGNAL_CONTRACTS));
  for (const [kind, contract] of Object.entries(PUBLIC_SIGNAL_CONTRACTS)) {
    assert.ok(table.includes(contract.label), `${kind} label`);
    assert.ok(table.includes(contract.description), `${kind} description`);
    assert.ok(table.includes(contract.trigger.replaceAll("-", " ")), `${kind} trigger`);
    for (const evidence of contract.requiredEvidence) assert.ok(table.includes(evidence), `${kind} requires ${evidence}`);
  }
  const commonBoundary = Object.values(PUBLIC_SIGNAL_CONTRACTS)[0].privacyBoundary;
  assert.ok(section.html.includes(commonBoundary));
  assert.match(section.html, /warning establishes that the sender warned[\s\S]*does not establish that a predator is present/i);
  assert.match(section.html, /resource report[\s\S]*does not certify that the resource still exists/i);
  assert.match(section.html, /directive[\s\S]*does not prove that any receiver heard, accepted or obeyed/i);
  assert.match(section.html, /Private forecasts, confidence values, memories and uncommitted intentions never become public callouts/i);

  const guarded = Object.values(PUBLIC_SIGNAL_CONTRACTS).filter(contract => contract.trigger === "explicit-public-signal-record");
  const guardedSection = section.html.match(/<div data-reference-guarded-signal-contracts>[\s\S]*?<\/div>/)?.[0] || "";
  for (const contract of guarded) {
    assert.ok(guardedSection.includes(contract.id), `${contract.id} guarded contract`);
    for (const evidence of contract.requiredEvidence) assert.ok(guardedSection.includes(evidence), `${contract.id} guarded evidence ${evidence}`);
  }
  assert.match(guardedSection, /implemented extension points, not claims that the automatic animal scheduler currently emits them/i);
  assert.match(guardedSection, /remain unavailable until an explicit outward signal record supplies every required public-evidence field/i);
});

test("visual atlas exposes stable semantic hooks for the selected instrument anatomy", () => {
  const html = laboratoryReferenceHtml();
  for (const hook of [
    "data-reference-selected-instrument-panel",
    "data-reference-selected-private-attachments",
    "data-reference-public-identity-rail",
    "data-reference-instrument-health",
    "data-reference-instrument-decision",
    "data-reference-instrument-physiology",
    "data-reference-selected-instrument-contract"
  ]) assert.match(html, new RegExp(hook));
  assert.match(html, /IMMEDIATE CONCERN · SEEKING WATER/);
  assert.match(html, /FORECAST EFFECT · WATER ROUTE FAVOURED/);
});

test("in-world Entity Display Guide teaches the same single-surface contract", () => {
  assert.match(index, /One scroll-scaled ownership card/);
  assert.match(index, /There are no thin, summary or expanded zoom variants/i);
  assert.match(index, /active card samples distance to its own animal[\s\S]*stores one continuous bounded scale/i);
  assert.match(index, /Camera movement changes viewport visibility, not panel size/i);
  assert.match(index, /Selecting a living animal suppresses every other animal card and nameplate/i);
  assert.match(index, /Cinema follows the same exclusive rule[\s\S]*subjectless world shots show none/i);
  assert.match(index, /Only the selected animal may add the private upper row/i);
  assert.match(index, /semantic profiles between 0\.5 and 5 seconds/i);
  assert.match(index, /sudden startle lasts 0\.5 seconds[\s\S]*safe rest[\s\S]*5-second minimum/i);
  assert.match(index, /1\.25-second visible, 1\.75-second quiet heartbeat/i);
  assert.match(index, /empty forecast pulses vary from 3 to 5 seconds/i);
  assert.match(index, /Sound arcs are not held[\s\S]*only while the animal is actually vocalising/i);
  assert.match(index, /UNDECIDED/);
  assert.match(index, /NO QUALIFIED FORECAST[\s\S]*never mean safe, no predator, no water or no event/i);
});

test("reference contains an extensive, searchable predictive-systems chapter", () => {
  const ids = new Set(LABORATORY_REFERENCE_SECTIONS.map(section => section.id));
  for (const id of ["predictive-systems", "predictive-scheduler", "predictive-evidence", "predictive-contracts", "predictive-symbols", "predictive-lifecycle", "predictive-decisions", "predictive-learning", "predictive-examples", "cinema-predictive"]) assert.ok(ids.has(id), id);

  const predictiveSections = LABORATORY_REFERENCE_SECTIONS.filter(section => section.id.startsWith("predictive-") || section.id === "cinema-predictive");
  assert.equal(predictiveSections.length, 10);
  const text = predictiveSections.map(section => `${section.title} ${section.summary} ${section.html}`).join(" ");
  for (const term of [
    "authoritative truth", "animal epistemic state", "automatic", "computational budget", "local evidence snapshot", "immutable evidence snapshot", "current sensory contact", "memory", "communicated evidence",
    "activation", "admission", "coordination", "authority", "applicability", "referent", "horizon", "confidence", "cost", "evaluation condition", "abstention",
    "LEGACY", "PREDICTIVE_SHADOW", "PREDICTIVE_ACTIVE", "existing behaviour", "safety veto", "last-resort", "2500", "priority score",
    "observation error", "prediction error", "action-selection error", "execution failure", "structural", "human review",
    "ecological forecast", "production execution", "camera quality", "narration truth", "audience preference"
  ]) assert.match(text, new RegExp(term, "i"), term);

  const html = laboratoryReferenceHtml();
  const predictiveSearchEntries = [...html.matchAll(/data-reference-search="([^"]*predict[^\"]*)"/gi)];
  assert.equal(predictiveSearchEntries.length, 10, "the 'predict' search stem exposes the complete chapter");
});

test("Cinema reference explains observable single-subject emphasis without implying private speech", () => {
  const section = LABORATORY_REFERENCE_SECTIONS.find(item => item.id === "cinema-predictive");
  assert.ok(section);
  assert.match(section.html, /Who Cinema highlights while narration plays/i);
  assert.match(section.html, /present public call is preferred[\s\S]*licensed visible expression/i);
  assert.match(section.html, /do not mean that the animal is the documentary narrator/i);
  assert.match(section.html, /Expired calls are excluded/i);
  assert.match(section.html, /retains the established multi-subject emphasis instead of guessing a speaker/i);
  assert.match(section.html, /data-reference-cinema-channel-hold/);
  assert.match(section.html, /same cause-specific transition profiles[\s\S]*public expression and callout artwork/i);
  assert.match(section.html, /sudden startle[\s\S]*safe rest and sustained resource reports remain longer/i);
  assert.match(section.html, /hold is not fresh evidence[\s\S]*live vocal decoration ends when vocalisation ends/i);
  assert.match(section.html, /never displays[\s\S]*UNDECIDED[\s\S]*NO QUALIFIED FORECAST/i);
});

test("Cinema reference explains interaction-led threads and the concise live default", () => {
  const section = LABORATORY_REFERENCE_SECTIONS.find(item => item.id === "cinema-predictive");
  assert.ok(section);
  assert.match(section.html, /Interaction-led default and connected live threads/i);
  assert.match(section.html, /hunter evidence[\s\S]*prey response[\s\S]*pursuit progress[\s\S]*distance overview/i);
  assert.match(section.html, /Physiology is therefore an answer to an unfolding question, not the default subject/i);
  assert.match(section.html, /does not invent an event chain for every activity/i);
  assert.match(section.html, /two sentences and 42 words per live shot/i);
  assert.match(section.html, /also applies to V3 contract narration/i);
});

test("symbols reference documents bounded semantic timing and honest empty heartbeats", () => {
  assert.equal(PRESENTATION_MINIMUM_HOLD_MS, 500);
  assert.equal(EMPTY_CHANNEL_VISIBLE_MS, 1250);
  assert.equal(EMPTY_CHANNEL_HIDDEN_MS, 1750);
  const section = LABORATORY_REFERENCE_SECTIONS.find(item => item.id === "symbols-communication");
  assert.ok(section);
  assert.match(section.html, /data-reference-presentation-hold/);
  assert.match(section.html, /semantic timing profiles from 0\.5 s to 5 s/i);
  assert.match(section.html, /data-reference-channel-timing/);
  assert.match(section.html, /Visible expression[\s\S]*0\.5 s–5 s/);
  assert.match(section.html, /Public callout[\s\S]*0\.75 s–4 s/);
  assert.match(section.html, /Ordinary thought[\s\S]*0\.75 s–5 s/);
  assert.match(section.html, /Private forecast[\s\S]*3 s–8 s/);
  assert.match(section.html, /coalesces rapid replacements[\s\S]*latest eligible pending value/i);
  assert.match(section.html, /never freezes physiology, priority selection, action execution, memory, predictive learning/i);
  assert.match(section.html, /Undecided priority heartbeat[\s\S]*1\.25 s[\s\S]*1\.75 s quiet interval/i);
  assert.match(section.html, /Forecast-status heartbeat[\s\S]*qualified estimate has not changed[\s\S]*never implies safety or (?:environmental )?absence/i);
  for (const profile of [...EXPRESSION_PRESENTATION_TIMINGS, ...CALLOUT_PRESENTATION_TIMINGS, ...THOUGHT_PRESENTATION_TIMINGS]) assert.ok(profile.minimumVisibleMs >= 500 && profile.minimumVisibleMs <= 5000, profile.id);
  for (const profile of [...FORECAST_PRESENTATION_TIMINGS, ...FORECAST_EMPTY_PRESENTATION_TIMINGS]) assert.ok(profile.minimumVisibleMs >= 3000 && profile.minimumVisibleMs <= 8000, profile.id);
  assert.match(app, /publicSignalMaterialFromDescriptor\(signalDescriptor, liveVocalActive\)/);
});

test("predictive reference derives every framework, authority and abstention explanation from the shared language", () => {
  const text = LABORATORY_REFERENCE_SECTIONS.filter(section => section.id.startsWith("predictive-") || section.id === "cinema-predictive").map(section => section.html).join(" ");
  for (const framework of PREDICTION_FRAMEWORKS) {
    assert.match(text, new RegExp(framework.replaceAll("_", "[ _]"), "i"), framework);
    assert.ok(text.includes(PREDICTION_FRAMEWORK_GUIDE[framework]), `${framework} explanation`);
  }
  for (const authority of PREDICTION_AUTHORITIES) {
    assert.match(text, new RegExp(`\\b${authority}\\b`, "i"), authority);
    assert.ok(text.includes(PREDICTION_AUTHORITY_GUIDE[authority]), `${authority} explanation`);
  }
  for (const abstention of PREDICTION_ABSTENTIONS) {
    assert.match(text, new RegExp(abstention.replaceAll("_", "[ _]"), "i"), abstention);
    assert.ok(text.includes(PREDICTION_ABSTENTION_GUIDE[abstention]), `${abstention} explanation`);
  }
  for (const [mode, explanation] of Object.entries(PREDICTION_MODE_GUIDE)) {
    assert.match(text, new RegExp(`\\b${mode}\\b`));
    assert.ok(text.includes(explanation), `${mode} explanation`);
  }
});

test("predictive-symbols reference contains all registered medallions and the neutral fallback", () => {
  const section = LABORATORY_REFERENCE_SECTIONS.find(item => item.id === "predictive-symbols");
  assert.ok(section); assert.match(section.html, /complete implemented animal-prediction visual language/i); assert.match(section.html, /data-reference-prediction-symbol-table/);
  const table = section.html.match(/<table data-reference-prediction-symbol-table>[\s\S]*?<\/table>/)?.[0] || "";
  const processIds = [...table.matchAll(/data-reference-prediction-process="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(processIds, [...ANIMAL_PREDICTION_SYMBOLS.map(symbol => symbol.modelId), "unregistered-fallback"]);
  const visualIds = [...table.matchAll(/data-reference-prediction-symbol="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(visualIds, [...ANIMAL_PREDICTION_SYMBOLS.map(symbol => symbol.visualId), GENERIC_PREDICTION_SYMBOL.visualId]);
  for (const symbol of [...ANIMAL_PREDICTION_SYMBOLS, GENERIC_PREDICTION_SYMBOL]) {
    assert.ok(symbol.shape, `${symbol.visualId} shape metadata`);
    assert.match(table, new RegExp(symbol.label));
    assert.match(table, new RegExp(symbol.shape.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(table, new RegExp(`data-prediction-symbol="${symbol.visualId}"`));
    assert.match(table, new RegExp(`aria-label="${symbol.label} symbol: ${symbol.shape.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
  }
  assert.match(table, /interface fallback · not a sixth process/i);
  assert.match(section.html, /not a sixth predictor, an abstention mark or a no-forecast symbol/i);
});

test("predictive-symbols reference exhaustively renders every cloud phrase and effect state", () => {
  const section = LABORATORY_REFERENCE_SECTIONS.find(item => item.id === "predictive-symbols");
  assert.ok(section); assert.match(section.html, /data-reference-prediction-cloud-atlas/); assert.match(section.html, /data-reference-prediction-effect-atlas/);
  const cloudIds = [...section.html.matchAll(/data-reference-prediction-cloud="([^"]+)"/g)].map(match => match[1]);
  const effectIds = [...section.html.matchAll(/data-reference-prediction-effect="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(cloudIds, PREDICTION_INSIGHT_VARIANTS.map(variant => variant.id));
  assert.deepEqual(effectIds, PREDICTION_INSIGHT_EFFECT_STATES.map(effect => effect.id));
  assert.equal(cloudIds.length, 8); assert.equal(effectIds.length, 6);
  for (const variant of PREDICTION_INSIGHT_VARIANTS) {
    assert.match(section.html, new RegExp(`data-reference-prediction-cloud-preview="${variant.id}"`));
    assert.ok(section.html.includes(variant.shortLabel), `${variant.id} phrase`);
    assert.ok(section.html.includes(variant.eligibility), `${variant.id} eligibility`);
    assert.ok(section.html.includes(`${variant.metricLabel} · ${variant.metricText}`), `${variant.id} illustrative metric`);
  }
  for (const effect of PREDICTION_INSIGHT_EFFECT_STATES) {
    assert.match(section.html, new RegExp(`data-reference-prediction-effect-preview="${effect.id}"`));
    assert.ok(section.html.includes(effect.visibleLabel), `${effect.id} visible label`);
    assert.ok(section.html.includes(effect.meaning), `${effect.id} meaning`);
  }
  assert.match(section.html, /data-reference-prediction-anatomy-preview/);
  assert.match(section.html, /data-reference-prediction-visibility/);
});

test("predictive-symbols reference exhaustively identifies every honest empty forecast state", () => {
  const section = LABORATORY_REFERENCE_SECTIONS.find(item => item.id === "predictive-symbols");
  assert.ok(section);
  assert.match(section.html, /data-reference-prediction-empty-atlas/);
  const emptyIds = [...section.html.matchAll(/data-reference-prediction-empty="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(emptyIds, PREDICTION_EMPTY_STATES.map(state => state.id));
  for (const state of PREDICTION_EMPTY_STATES) {
    assert.ok(section.html.includes(state.shortLabel), `${state.id} label`);
    assert.ok(section.html.includes(state.metricText), `${state.id} metric`);
    assert.ok(section.html.includes(state.footerLabel), `${state.id} footer`);
    assert.ok(section.html.includes(state.detail), `${state.id} detail`);
  }
  assert.match(section.html, /3 s–5 s visible[\s\S]*1\.75 s quiet interval/i);
  assert.match(section.html, /NO QUALIFIED FORECAST[\s\S]*never means “no predator”, “safe”, “no water” or “nothing will happen”/i);
  assert.match(section.html, /distinct from the broken-ring empty status/i);
});

test("Reference prediction atlas uses the live cloud renderer and canonical registries", () => {
  assert.match(app, /renderReferencePredictionAtlas\(panels\.reference\.querySelector\("#reference-prediction-atlas"\)\)/);
  const start = app.indexOf("function renderReferencePredictionAtlas("), end = app.indexOf("\nfunction ", start + 10), renderer = app.slice(start, end);
  for (const hook of ["PREDICTION_INSIGHT_VARIANTS", "PREDICTION_INSIGHT_EFFECT_STATES", "predictionInsightCanvas", "data-reference-prediction-cloud-preview", "data-reference-prediction-effect-preview", "data-reference-prediction-preview-signature", "referencePredictionAtlasRendered"]) assert.match(renderer, new RegExp(hook));
  assert.match(renderer, /anatomy:threat-possible:applied/);
});

test("an empty admitted-forecast state is text-only rather than the generic model fallback", () => {
  const start = app.indexOf("function entityPredictiveSummaryHtml("), end = app.indexOf("\nfunction ", start + 10), renderer = app.slice(start, end);
  assert.ok(start >= 0 && end > start, "entity predictive summary renderer is extractable");
  assert.match(renderer, /No forecast admitted/);
  assert.doesNotMatch(renderer, /predictionSymbolHtml\(prediction\?\.modelId/);
});

test("predictive reference explains implemented limits without overstating learning or retained evidence", () => {
  const text = LABORATORY_REFERENCE_SECTIONS.filter(section => section.id.startsWith("predictive-") || section.id === "cinema-predictive").map(section => section.html).join(" ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  for (const limitation of [
    /(?:only admitted forecasts are shown|forecast cards show admitted forecasts)/i,
    /(?:current automatic outcome resolver updates model confidence|current animal adaptive correction changes confidence) only/i,
    /bounded immutable evidence snapshot.{0,180}exact retained clues/i,
    /forward-action process.{0,180}only from upstream processes.{0,180}budget-selected and admitted/i,
    /communicated alarm or resource report.{0,100}cannot establish the later outcome/i,
    /documentary stores[\s\S]{0,100}never mutate[\s\S]{0,100}animal cognition[\s\S]{0,150}authoritative ecology/i
  ]) assert.match(text, limitation);
});

test("predictive reference uses diagrams for information flow and automatic allocation", () => {
  const text = LABORATORY_REFERENCE_SECTIONS.filter(section => section.id.startsWith("predictive-") || section.id === "cinema-predictive").map(section => section.html).join(" ");
  assert.ok((text.match(/class="[^"]*reference-diagram/g) || []).length >= 3);
  for (const flow of ["local evidence", "admitted forecast", "action commitment", "simulation truth", "audience claim"]) assert.match(text, new RegExp(flow, "i"));
});

test("reference contains a substantial visual atlas and the canonical complete symbol dictionary", () => {
  const html = laboratoryReferenceHtml();
  assert.ok((html.match(/<figure class="reference-figure/g) || []).length >= 7);
  for (const diagram of ["Ecological matter and information", "One authoritative minute", "Hydrological landscape", "sensory world", "Life and care cycle", "World presentation channels", "Fuel movement and physiological work"]) assert.match(html, new RegExp(diagram, "i"));
  assert.match(html, /id="reference-symbol-atlas"/);
  assert.match(app, /renderReferenceSymbolAtlas/);
  assert.match(app, /completeSymbolLegendSections\(\)/);
  assert.match(app, /Every valid generated combination/);
  assert.match(css, /\.reference-context-grid/);
  assert.match(css, /\.reference-symbol-row/);
});

test("every implemented species directory entry has a distinct illustrated portrait", () => {
  const html = laboratoryReferenceHtml();
  const portraits = [...html.matchAll(/data-species-illustration="([^"]+)"/g)].map(match => match[1]);
  assert.equal(portraits.length, SPECIES_IDS.length);
  assert.equal(new Set(portraits).size, SPECIES_IDS.length);
  for (const id of ["grazer", "hunter", "great-plains-grazer", "armoured-browser", "waterline-ambusher", "sunscale-ambusher", "shieldback-colony"]) assert.ok(portraits.includes(id), id);
  assert.match(css, /\.reference-species-illustration/);
  assert.match(html, /class="reference-species-illustration original-grazer-portrait"/);
  assert.match(html, /aria-label="Illustration of the original Valley Grazer"/);
  assert.match(html, /class="reference-species-illustration original-hunter-portrait"/);
  assert.match(html, /aria-label="Illustration of the original Ridge Hunter"/);
  assert.doesNotMatch(html.match(/original-grazer-portrait[\s\S]*?<\/svg>/)?.[0] || "", /#6942cf/i);
});

test("every reference contents link resolves to an article", () => {
  const html = laboratoryReferenceHtml();
  for (const section of LABORATORY_REFERENCE_SECTIONS) {
    assert.match(html, new RegExp(`href="#reference-${section.id}"`));
    assert.match(html, new RegExp(`id="reference-${section.id}"`));
  }
});
