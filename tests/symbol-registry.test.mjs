import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { actionSymbol, BADGED_BEHAVIOURS, completeSymbolLegendSections, composeLegendExample, dominantWorldCue, emittedSymbol, LEGEND_COMPOSER_MEANINGS, presentationContainsHumanSymbol, PUBLIC_SIGNAL_AVAILABILITY, PUBLIC_SIGNAL_CONTRACT_LEGEND, PUBLIC_SIGNAL_CONTRACTS, PUBLIC_SIGNAL_LEGEND_SECTIONS, PUBLIC_SIGNAL_VARIANTS, RARE_SYMBOL_KEY_SECTIONS, reproductivelyMature, resolveSymbolPresentation, signalAllowed, signalVariant, SYMBOL_KEY_SECTIONS, thoughtSymbol } from "../src/symbol-registry.js";
import { PHYSIOLOGY_SYMBOL_ORDER } from "../src/physiology-symbols.js";

const animal = (speciesId, lifeStage, extra = {}) => ({ speciesId, lifeStage, ...extra });
const appSource = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");

test("care and contact calls split by maturity and social ecology", () => {
  assert.equal(signalVariant(animal("grazer", "dependent", { caregiverVisible: false }), "care"), "dependent-separated");
  assert.equal(signalVariant(animal("grazer", "dependent", { caregiverVisible: true }), "care"), "dependent-care");
  assert.equal(signalVariant(animal("grazer", "juvenile"), "lost"), "juvenile-contact");
  assert.equal(signalVariant(animal("grazer", "adult"), "lost"), "adult-herd-contact");
  assert.equal(signalVariant(animal("hunter", "adult"), "lost"), "adult-pack-contact");
});

test("wait-up is an age-independent vocal group call", () => {
  for (const lifeStage of ["dependent", "juvenile", "subadult", "adult", "old"]) {
    const animal = { speciesId: "grazer", lifeStage };
    const symbol = emittedSymbol(animal, "wait-up");
    const presentation = resolveSymbolPresentation({ animal, channel: "public-signal", symbol, vocal: true });
    assert.equal(signalAllowed(animal, "wait-up"), true);
    assert.equal(symbol.id, "wait-up");
    assert.equal(symbol.vocal, true);
    assert.equal(presentation.grammar.verb, "REQUESTS");
  }
});

test("the same need retains distinct species and age identity", () => {
  const youngGrazer = emittedSymbol(animal("grazer", "dependent"), "hunger");
  const adultHunter = emittedSymbol(animal("hunter", "adult"), "hunger");
  assert.equal(youngGrazer.id, "hunger");
  assert.equal(youngGrazer.species.id, "grazer");
  assert.equal(youngGrazer.stage.id, "dependent");
  assert.equal(adultHunter.species.id, "hunter");
  assert.equal(adultHunter.stage.id, "adult");
});

test("hearts are limited to mature courtship presentation", () => {
  for (const stage of ["dependent", "juvenile", "subadult"]) {
    const young = animal("grazer", stage);
    assert.equal(reproductivelyMature(young), false);
    assert.equal(signalAllowed(young, "courtship"), false);
    assert.equal(actionSymbol(young, "courtship"), null);
    assert.notEqual(thoughtSymbol(young, "seek mate").glyph, "♥");
  }
  const adult = animal("grazer", "adult");
  assert.equal(signalAllowed(adult, "courtship"), true);
  assert.equal(actionSymbol(adult, "courtship").glyph, "♥");
  assert.equal(thoughtSymbol(adult, "seek mate").glyph, "♥");
});

test("prey sequence carrion guarding and patrol have distinct semantics", () => {
  const hunter = animal("hunter", "adult", { offspringIds: [] });
  assert.deepEqual(["evaluate-prey", "stalk", "chase", "attack", "feed-carcass"].map((key) => actionSymbol(hunter, key).id), ["evaluate-prey", "stalk", "chase", "attack", "feed-carcass"]);
  assert.equal(actionSymbol(hunter, "search").id, "hunting-patrol");
  assert.equal(actionSymbol(animal("grazer", "adult"), "search").id, "herd-vigilance");
  assert.equal(actionSymbol(animal("grazer", "adult", { offspringIds: ["H2"] }), "guard").id, "guard-young");
  assert.ok(BADGED_BEHAVIOURS.has("evaluate-prey"));
});

test("one dominant emergency cue suppresses lower-priority badge stacking", () => {
  assert.equal(dominantWorldCue({ attacked: true, signal: { emergency: true }, injured: true, action: {} }), "attack");
  assert.equal(dominantWorldCue({ signal: { emergency: true }, injured: true, action: {} }), "signal");
  assert.equal(dominantWorldCue({ injured: true, action: {} }), "injury");
  assert.equal(dominantWorldCue({ action: {} }), "action");
});

test("the complete Laboratory legend enumerates valid species stage and precedence combinations", () => {
  const sections = completeSymbolLegendSections(), entries = sections.flatMap((section) => section.entries);
  assert.equal(sections.length, 4);
  assert.equal(sections.at(-1).entries.length, 16);
  assert.ok(entries.length > 250);
  assert.ok(entries.some((entry) => entry.label.includes("herbivore · dependent young") && entry.label.includes("critical hunger")));
  assert.ok(entries.some((entry) => entry.label.includes("carnivore · older adult") && entry.label.includes("hunting patrol")));
  assert.equal(entries.some((entry) => entry.label.includes("herbivore · juvenile") && entry.label.includes("courting")), false);
});

test("the standard legend teaches components while exhaustive combinations remain optional", () => {
  assert.deepEqual(SYMBOL_KEY_SECTIONS.map((section) => section.title), ["Identity", "Internal and visible state", "Communication", "Actions", "Emergency precedence"]);
  assert.ok(SYMBOL_KEY_SECTIONS.flatMap((section) => section.entries).length < 40);
  const internal = SYMBOL_KEY_SECTIONS.find(section => section.title === "Internal and visible state");
  assert.deepEqual(internal.entries.filter(entry => entry.physiologyKey).map(entry => entry.physiologyKey), PHYSIOLOGY_SYMBOL_ORDER);
  assert.equal(new Set(internal.entries.filter(entry => entry.physiologyKey).map(entry => entry.id)).size, PHYSIOLOGY_SYMBOL_ORDER.length);
  assert.equal(internal.entries.some(entry => entry.glyph === "Gut · Blood/liver · Fat · Water" || entry.glyph === "Endurance · Glycogen · Adrenaline"), false);
  const forecast = SYMBOL_KEY_SECTIONS.flatMap((section) => section.entries).find((entry) => entry.glyph === "☁?"); assert.ok(forecast); assert.match(forecast.label, /private, uncertain prediction/); assert.match(forecast.label, /not verified truth|not.*public warning/i);
  assert.deepEqual(RARE_SYMBOL_KEY_SECTIONS.map((section) => section.title), ["Dependent and caregiver communication", "Hunting sequence", "Reproductive behaviour", "Injury and emergencies"]);
});

test("interactive composer generates one readable valid phrase", () => {
  assert.ok(LEGEND_COMPOSER_MEANINGS.length >= 8);
  const preview = composeLegendExample({ speciesId: "grazer", lifeStage: "juvenile", meaning: "threat", vocal: true });
  assert.equal(preview.allowed, true);
  assert.equal(preview.stageCode, "J");
  assert.equal(preview.symbol.glyph, "⚠");
  assert.match(preview.explanation, /juvenile herbivore vocalising entity threat warning/i);
});

test("plain pictograms replace code-like primary signal glyphs", () => {
  assert.equal(emittedSymbol(animal("grazer", "adult"), "distress").glyph, "!");
  assert.equal(emittedSymbol(animal("grazer", "adult"), "injury").glyph, "🩹");
  assert.equal(emittedSymbol(animal("hunter", "adult"), "hunger").glyph, "🦌");
});

test("one canonical presentation identifies world panel legend and composer output", () => {
  const subject = animal("grazer", "juvenile"), world = resolveSymbolPresentation({ animal: subject, channel: "public-signal", kind: "threat", vocal: true });
  const composer = composeLegendExample({ speciesId: "grazer", lifeStage: "juvenile", meaning: "threat", vocal: true }).presentation;
  const legend = completeSymbolLegendSections().flatMap((section) => section.entries).find((entry) => entry.presentation?.signature === world.signature)?.presentation;
  assert.equal(world.signature, composer.signature); assert.equal(world.signature, legend.signature);
  assert.equal(world.grammar.verb, "WARNS"); assert.equal(world.frame, "rounded-square");
});

test("private thoughts use boldable uppercase grammar and signals use communication grammar", () => {
  const subject = animal("grazer", "dependent"), thought = resolveSymbolPresentation({ animal: subject, channel: "private-thought", priority: "find caregiver" });
  const signal = resolveSymbolPresentation({ animal: subject, channel: "public-signal", kind: "care", vocal: true });
  assert.equal(thought.grammar.verb, "IS"); assert.equal(signal.grammar.verb, "REQUESTS");
  assert.notEqual(thought.channel, signal.channel);
});

test("canonical animal vocabulary contains no human pictograms", () => {
  const presentations = completeSymbolLegendSections().flatMap((section) => section.entries).map((entry) => entry.presentation).filter(Boolean);
  assert.equal(presentations.some(presentationContainsHumanSymbol), false);
  assert.equal(presentationContainsHumanSymbol(resolveSymbolPresentation({ animal: animal("grazer", "dependent"), channel: "public-signal", kind: "care", vocal: true })), false);
});

test("incomplete legacy action symbols receive a readable fallback label", () => {
  const presentation = resolveSymbolPresentation({
    animal: animal("grazer", "adult"),
    channel: "activity",
    symbol: { id: "orient-to-water", glyph: "·", colour: "#fff", channel: "activity", species: { id: "grazer", label: "herbivore", colour: "#e6bc52" }, stage: { id: "adult", label: "adult", scale: 1 } }
  });
  assert.equal(presentation.symbol.label, "orient to water");
  assert.equal(presentation.grammar.verb, "ORIENT");
});

test("the public-signal legend partitions all 28 rendered variants by active or guarded source", () => {
  assert.deepEqual(PUBLIC_SIGNAL_LEGEND_SECTIONS.map(section => section.id), Object.keys(PUBLIC_SIGNAL_AVAILABILITY));
  assert.deepEqual(PUBLIC_SIGNAL_LEGEND_SECTIONS.map(section => section.entries.length), [14, 5, 9]);
  const entries = PUBLIC_SIGNAL_LEGEND_SECTIONS.flatMap(section => section.entries);
  assert.equal(entries.length, 28);
  assert.equal(entries.length, PUBLIC_SIGNAL_VARIANTS.length);
  assert.deepEqual(new Set(entries.map(entry => entry.id)), new Set(PUBLIC_SIGNAL_VARIANTS.map(variant => variant.id)));
  assert.equal(new Set(entries.map(entry => entry.presentation.signature)).size, entries.length);
  for (const entry of entries) {
    const variant = PUBLIC_SIGNAL_VARIANTS.find(candidate => candidate.id === entry.id);
    assert.ok(variant, `missing concrete variant ${entry.id}`);
    const availability = PUBLIC_SIGNAL_AVAILABILITY[variant.source];
    assert.equal(entry.source, variant.source);
    assert.equal(entry.availability, variant.availability);
    assert.equal(entry.contractId, variant.contract);
    assert.equal(entry.presentation.channel, "public-signal");
    assert.ok(entry.presentation.signature);
    assert.match(entry.label, new RegExp(availability.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
    assert.ok(entry.label.includes(PUBLIC_SIGNAL_CONTRACTS[variant.contract].description));
  }
});

test("the public-signal contract legend exhaustively exposes all 22 authority boundaries", () => {
  assert.equal(PUBLIC_SIGNAL_CONTRACT_LEGEND.length, 22);
  assert.deepEqual(PUBLIC_SIGNAL_CONTRACT_LEGEND.map(contract => contract.id), Object.keys(PUBLIC_SIGNAL_CONTRACTS));
  for (const contract of PUBLIC_SIGNAL_CONTRACT_LEGEND) {
    const source = PUBLIC_SIGNAL_CONTRACTS[contract.id], expectedSource = source.trigger === "authoritative-status" ? "automatic-status" : source.trigger === "explicit-call" ? "explicit-call" : "explicit-record";
    assert.equal(contract.source, expectedSource);
    assert.equal(contract.availability, expectedSource === "explicit-record" ? "guarded" : "active");
    assert.equal(contract.description, source.description);
    assert.equal(contract.privacyBoundary, source.privacyBoundary);
    assert.deepEqual(contract.requiredEvidence, source.requiredEvidence);
  }
});

test("both visual-dictionary builders render exhaustive faces and signals without raw JSON", () => {
  const worldStart = appSource.indexOf("function renderWorldSymbolKey()"), referenceStart = appSource.indexOf("function renderReferenceSymbolAtlas(root)", worldStart), referenceEnd = appSource.indexOf("function renderReferencePredictionAtlas(root)", referenceStart);
  assert.ok(worldStart >= 0 && referenceStart > worldStart && referenceEnd > referenceStart);
  const worldLegend = appSource.slice(worldStart, referenceStart), referenceLegend = appSource.slice(referenceStart, referenceEnd);
  for (const source of [worldLegend, referenceLegend]) {
    assert.match(source, /documentationFacePreview\(entry\.expressionKey, "grazer"/);
    assert.match(source, /documentationBadgePreview\(entry\.presentation\)/);
    assert.match(source, /physiologySymbolSvg\(entry\.physiologyKey\)/);
    assert.match(source, /PUBLIC_SIGNAL_LEGEND_SECTIONS/);
    assert.match(source, /PUBLIC_SIGNAL_CONTRACT_LEGEND/);
    assert.match(source, /Every facial expression/);
    assert.match(source, /callout variants/);
    assert.match(source, /symbolAvailability/);
    assert.doesNotMatch(source, /JSON\.stringify/);
  }
  assert.match(worldLegend, /Every public-signal contract/);
  assert.match(referenceLegend, /Every public-signal contract/);
});
