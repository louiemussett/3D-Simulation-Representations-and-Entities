import test from "node:test";
import assert from "node:assert/strict";
import { composeAdaptiveDocumentaryNarration, composeDocumentaryNarration, deterministicArchiveEvidencePassage, deterministicSemanticPassage, deterministicWorldRealityPassage, limitDocumentaryNarration, normalizeNarrationSettings } from "../src/documentary-narration.js";
import { DOCUMENTARY_LANGUAGE, documentaryLanguageCapacity } from "../src/documentary-language-library.js";
import { ACTION_SCENARIO_TEXT, EVENT_SCENARIO_TEXT, LANDSCAPE_SCENARIO_TEXT, deterministicScenarioText, narrationScenarioCoverage } from "../src/documentary-scenario-library.js";

test("narration reports observed ecological pressure without inventing a target", () => {
  const text = composeDocumentaryNarration({ lensPreset: "research", season: "Spring", weather: "rain", habitat: "river meadow", actionKey: "seeking water", actionLabel: "following remembered water", subjectCount: 1, subjects: [{ speciesLabel: "Valley Grazer", lifeStage: "adult", hydration: 24, health: 90, energy: 60, fatigue: 10, visibleContacts: 2 }], waterDistance: 8, groupSize: 1 });
  assert.match(text, /water reserves have fallen to 24 per cent/);
  assert.match(text, /nearest known water lies about 8 body lengths away/);
  assert.doesNotMatch(text, /predator/);
});

test("rare death narration communicates population consequence", () => {
  const text = composeDocumentaryNarration({ eventKind: "death", habitat: "woodland edge", speciesRemaining: 3, actionKey: "death", subjects: [] });
  assert.match(text, /only 3 of its kind remaining/);
});

test("narration settings are accessible by default and bounded", () => {
  assert.deepEqual(normalizeNarrationSettings({}), { enabled: true, captions: true, preset: "brief", contextDepth: 2, length: "short", volume: .85, rate: .96 });
  assert.equal(normalizeNarrationSettings({ volume: 4, rate: .1 }).volume, 1);
  assert.equal(normalizeNarrationSettings({ contextDepth: 99 }).contextDepth, 5);
});

test("live narration limits both sentence and word count without losing a complete opening", () => {
  const source = "The hunter has found a fresh scent trail. The grazer has not shown an outward response. The pursuit is closing. A second hunter is nearby. The camera now checks body reserves.";
  const brief = limitDocumentaryNarration(source, { length: "short" });
  assert.equal(brief.split(/(?<=[.!?])\s+/).length, 2);
  assert.ok(brief.split(/\s+/).length <= 42);
  assert.match(brief, /^The hunter has found/);
});

test("interaction narration leads with the active chain beat", () => {
  const text = composeDocumentaryNarration({ narrationLength: "short", contextDepth: 2, interactionStage: "prey-response", interactionDetail: "The camera checks VG1 for an outward response; absence of one does not prove the hunter is unknown.", subjectCount: 1, subjects: [{ id: "VG1", speciesLabel: "Valley Grazer" }], actionKey: "vigilant walk" });
  assert.match(text, /^The camera checks VG1/);
  assert.ok(text.split(/(?<=[.!?])\s+/).length <= 2);
});

test("scene variants change the prose without relying on repeated analytical language", () => {
  const context = { lensPreset: "perception", season: "Spring", weather: "Passing front", habitat: "grassland", actionKey: "scanning", actionLabel: "scanning for danger", subjectCount: 3, groupSize: 3, subjects: [{ speciesLabel: "Valley Grazer", lifeStage: "adult", visibleContacts: 24 }] };
  const first = composeDocumentaryNarration({ ...context, variant: 1 }), second = composeDocumentaryNarration({ ...context, variant: 2 });
  assert.notEqual(first, second);
  assert.doesNotMatch(`${first} ${second}`, /crowded with evidence|shaping the decision/i);
});

test("omniscient narration can explain an unseen remembered threat", () => {
  const text = composeDocumentaryNarration({ lensPreset: "documentary", habitat: "grassland", actionKey: "pause", actionLabel: "standing still", subjectCount: 1, predatorsNearby: 0, subjects: [{ speciesLabel: "Valley Grazer", rememberedThreats: 1, visibleContacts: 0 }] });
  assert.match(text, /No predator is visible/);
  assert.match(text, /remembered danger/);
});

test("landscape scenes narrate hydrology and vegetation succession", () => {
  const runoff = composeDocumentaryNarration({ contextDepth: 4, narrationLength: "long", subjectCount: 0, habitat: "floodplain", weatherDetail: { rain: .8 }, landscape: { cellCount: 20, local: { meanRunoff: .08 } } });
  const fallen = composeDocumentaryNarration({ contextDepth: 4, narrationLength: "long", subjectCount: 0, habitat: "woodland", weatherDetail: {}, landscape: { cellCount: 20, fallenTree: true, local: { fallenTrees: 1 } } });
  assert.match(runoff, /runoff, feeding channels beyond the frame/);
  assert.match(fallen, /ecological work continues/);
});

test("animal scenes may connect behaviour to hidden land processes", () => {
  const text = composeDocumentaryNarration({ contextDepth: 4, narrationLength: "long", subjectCount: 1, habitat: "mudflat", actionKey: "travel", actionLabel: "crossing the basin", subjects: [{ speciesLabel: "Valley Grazer" }], landscape: { cellCount: 12, local: { mudCells: 5 } }, weatherDetail: {} });
  assert.match(text, /crossed from firm ground into mud/);
});

test("five context levels progressively admit hidden and world-scale facts", () => {
  const context = { narrationLength: "extended", subjectCount: 1, habitat: "grassland", actionKey: "pause", actionLabel: "waiting", predatorsNearby: 0, worldPopulation: 12, births: 2, deaths: 1, world: { waterCells: 20, wetlandCells: 4, woodlandCells: 8 }, subjects: [{ speciesLabel: "Valley Grazer", rememberedThreats: 1 }] };
  const small = composeDocumentaryNarration({ ...context, contextDepth: 1 }), hidden = composeDocumentaryNarration({ ...context, contextDepth: 3 }), maximum = composeDocumentaryNarration({ ...context, contextDepth: 5 });
  assert.doesNotMatch(small, /remembered danger|whole world/);
  assert.match(hidden, /remembered danger/);
  assert.match(maximum, /whole world/);
});

test("length presets bound the number of spoken sentences", () => {
  const context = { contextDepth: 5, subjectCount: 1, habitat: "grassland", actionKey: "pause", actionLabel: "waiting", groupSize: 3, worldPopulation: 12, world: { waterCells: 20, wetlandCells: 4, woodlandCells: 8 }, subjects: [{ speciesLabel: "Valley Grazer", hydration: 20, rememberedThreats: 1 }] };
  const short = composeDocumentaryNarration({ ...context, narrationLength: "short" }), extended = composeDocumentaryNarration({ ...context, narrationLength: "extended" });
  assert.ok(extended.split(/(?<=[.!?])\s+/).length > short.split(/(?<=[.!?])\s+/).length);
});

test("adaptive narration suppresses a recently explained hidden mechanism", () => {
  const context = { contextDepth: 5, narrationLength: "long", subjectCount: 1, habitat: "grassland", actionKey: "pause", actionLabel: "waiting", predatorsNearby: 0, subjects: [{ id: "g1", speciesLabel: "Valley Grazer", rememberedThreats: 1 }] };
  const first = composeAdaptiveDocumentaryNarration(context), second = composeAdaptiveDocumentaryNarration({ ...context, narrativeMemory: { recentTopics: first.topics, subjectMentions: { g1: 1 }, lastSubjectIds: ["g1"], lastHabitat: "grassland" } });
  assert.match(first.text, /remembered danger/);
  assert.doesNotMatch(second.text, /remembered danger/);
  assert.match(second.text, /same animal|remains in view|Still with/);
});

test("adaptive narration recognises a returning subject across the wider story", () => {
  const plan = composeAdaptiveDocumentaryNarration({ contextDepth: 2, narrationLength: "standard", subjectCount: 1, habitat: "woodland", actionKey: "drink", actionLabel: "drinking", subjects: [{ id: "g1", speciesLabel: "Valley Grazer" }], narrativeMemory: { recentTopics: [], subjectMentions: { g1: 2 }, lastSubjectIds: ["h1"], lastHabitat: "river" } });
  assert.match(plan.text, /We return|Some time later|Once more/);
  assert.deepEqual(plan.subjectIds, ["g1"]);
});

test("verified calls become connected passages with a bounded question", () => {
  const context = { contextDepth: 3, narrationLength: "long", subjectCount: 1, groupSize: 3, nearbyCount: 2, habitat: "grassland", actionKey: "communicate", actionLabel: "giving an alarm", subjects: [{ id: "g1", speciesLabel: "Valley Grazer", activeSignal: { kind: "alarm", urgency: .8 } }] };
  const passage = deterministicSemanticPassage(context), plan = composeAdaptiveDocumentaryNarration(context);
  assert.match(passage.text, /gives an alarm signal/);
  assert.match(passage.text, /Will another animal answer it\?/);
  assert.deepEqual(plan.questions, ["Will another animal answer the verified signal?"]);
  assert.equal(plan.hypotheses.length, 1);
});

test("memory narration preserves provenance and uncertainty", () => {
  const passage = deterministicSemanticPassage({ subjectCount: 1, subjects: [{ id: "g1", speciesLabel: "Valley Grazer", priority: "water", strongestMemory: { type: "water", channel: "hearing", confidence: .7 } }] });
  assert.match(passage.text, /memory of water/);
  assert.match(passage.text, /began through hearing/);
  assert.match(passage.text, /still accurate\?/);
  assert.match(passage.hypothesis, /may be contributing/);
});

test("group and private priorities create a question without choosing an outcome", () => {
  const passage = deterministicSemanticPassage({ subjectCount: 1, subjects: [{ id: "g1", speciesLabel: "Valley Grazer", priority: "water", groupGoal: "protection" }] });
  assert.match(passage.text, /committed to water/);
  assert.match(passage.text, /group is organised around protection/);
  assert.match(passage.text, /Will the animal continue/);
  assert.doesNotMatch(passage.text, /will leave|will follow/);
});

test("world reality passages use measured land and water state without animals", () => {
  const passage = deterministicWorldRealityPassage({ habitat: "floodplain", weatherDetail: { rain: .7 }, landscape: { groundwater: 40, local: { meanRunoff: .08, heavilyGrazedCells: 3, mudCells: 2, dryCells: 1 } }, world: { waterCells: 14, wetlandCells: 5, woodlandCells: 9 } });
  assert.match(passage.text, /Rain is active over the floodplain/);
  assert.match(passage.text, /Surface runoff/);
  assert.match(passage.text, /3 nearby vegetation patches/);
  assert.match(passage.text, /How far will the present runoff/);
  assert.doesNotMatch(passage.text, /animal|herd|predator/);
});

test("specific entity identity is retained in instant narration", () => {
  const text = composeDocumentaryNarration({ contextDepth: 2, narrationLength: "short", subjectCount: 1, habitat: "grassland", actionKey: "forage", actionLabel: "grazing", subjects: [{ id: "grazer-17", speciesLabel: "Valley Grazer", lifeStage: "adult" }] });
  assert.match(text, /Valley Grazer grazer 17/);
});

test("archive evidence verbalizes female mate preferences without claiming an outcome", () => {
  const passage = deterministicArchiveEvidencePassage({ subjects: [{ id: "grazer-17", speciesLabel: "Valley Grazer", archiveEvidence: [{ path: "entity.grazer-17.matePreferences.valuesCare", value: .82, type: "number" }] }] });
  assert.match(passage.text, /female choice record/i);
  assert.match(passage.text, /care/i);
  assert.match(passage.text, /does not compel acceptance/i);
});

test("archive evidence gives unknown scalar fields a safe deterministic commentary", () => {
  const passage = deterministicArchiveEvidencePassage({ worldEvidence: [{ path: "simulation.experimental.newMetric", value: 42, type: "number" }], habitat: "valley" });
  assert.match(passage.text, /new metric/i);
  assert.match(passage.text, /42/);
  assert.match(passage.text, /rather than being silently discarded/i);
});

test("archive evidence rotates past recently covered records", () => {
  const records = [
    { path: "entity.a.expression", value: "alert", type: "string" },
    { path: "entity.a.needPlanAudit.current.need", value: "water", type: "string" }
  ];
  const first = deterministicArchiveEvidencePassage({ subjects: [{ id: "a", archiveEvidence: records }] });
  const second = deterministicArchiveEvidencePassage({ subjects: [{ id: "a", archiveEvidence: records }], narrativeMemory: { recentTopics: [first.key] } });
  assert.notEqual(first.key, second.key);
  assert.match(second.text, /need record/i);
});

test("expanded language library covers major simulation systems at more than tenfold capacity", () => {
  assert.ok(Object.keys(DOCUMENTARY_LANGUAGE).length >= 30);
  assert.ok(documentaryLanguageCapacity() >= 900);
  for (const key of ["hydration", "metabolism", "pregnancy", "perception", "memory", "predation", "bereavement", "weather", "hydrology", "vegetation", "fallenTree", "population"]) assert.ok(DOCUMENTARY_LANGUAGE[key]);
});

test("every authoritative deterministic action has exact documentary text", () => {
  const coverage = narrationScenarioCoverage();
  assert.equal(coverage.valid, true, JSON.stringify(coverage));
  assert.ok(coverage.actionCount >= 50);
  for (const [actionKey, text] of Object.entries(ACTION_SCENARIO_TEXT)) { assert.ok(text.length > 30); assert.equal(deterministicScenarioText({ actionKey }).text, text); }
});

test("lifecycle and landscape transition scenarios have explicit narration", () => {
  for (const key of ["conception", "pregnancy-loss", "birth", "maturation", "death", "kill", "group-formation", "bereavement", "extinction"]) assert.ok(EVENT_SCENARIO_TEXT[key]);
  for (const key of ["rainfall", "snowfall", "snowmelt", "runoff", "flooding", "grass-to-mud", "mud-to-grass", "grass-to-shrub", "shrub-to-woodland", "tree-to-leafless", "leafless-to-fallen", "fallen-to-grass"]) assert.ok(LANDSCAPE_SCENARIO_TEXT[key]);
  assert.match(deterministicScenarioText({ landscapeTransition: "leafless-to-fallen" }).text, /fallen/);
});
