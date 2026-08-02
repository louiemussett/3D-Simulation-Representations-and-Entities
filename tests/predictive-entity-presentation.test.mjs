import test from "node:test";
import assert from "node:assert/strict";
import { describeAnimalPrediction, describePredictionEvidence, describePredictiveDecisionImpact, emptyPredictionInsightCue, PREDICTION_EMPTY_STATES, PREDICTION_INSIGHT_EFFECT_STATES, PREDICTION_INSIGHT_VARIANTS, predictionContributorNames, predictionEvidenceLabels, predictionInsightEffectLabel, predictionInsightPresentation, predictiveInsightCue, salientAnimalPrediction } from "../src/predictive-entity-presentation.js";
import { PREDICTIVE_MODEL_NAMES } from "../src/predictive-language.js";
import { ANIMAL_PREDICTION_SYMBOLS, GENERIC_PREDICTION_SYMBOL, PREDICTION_INSIGHT_PALETTE, animalPredictionSymbol, animalPredictionSymbolSvg, predictionInsightAccent } from "../src/prediction-symbols.js";

const threatPrediction = (overrides = {}) => ({ predictionId: "VG11:44:threat-state.v1", modelId: "threat-state.v1", framework: "HIDDEN_STATE_BAYSIAN", target: "PREDATOR_PRESENCE", referent: null, createdAtTick: 44, horizon: { earliestTick: 45, latestTick: 52 }, evidenceRefs: ["opaque:memory:predator:443"], output: { probability: .43, status: "CONFLICTING_OR_AMBIGUOUS" }, confidence: .71, authority: "ADVISORY", ...overrides });
const activeImpact = Object.freeze({ protectedBranch: false, bypassed: false, coordinationQualified: true, scoreMutationApplied: true, scoringApplied: true, calculatedOnly: false, priorityChanged: true, baselineWinner: { drive: "graze", score: 72 }, selectedWinner: { drive: "seek safety", score: 81 }, candidateAdjustments: [{ drive: "seek safety", family: "safety", beforeScore: 60, afterScore: 81, scoreDelta: 21, modelAdjustment: 21, vetoApplied: false }], vetoApplied: false, resultingAction: "flee", resultingMethod: "flee", predictorWorkingStateUpdated: true });
const cycle = (overrides = {}) => ({ tick: 44, mode: "PREDICTIVE_ACTIVE", scheduler: { budget: 6, usedCost: 4, danger: true }, predictions: [threatPrediction()], contributorsByPrediction: {}, evidenceSnapshot: { ownerId: "VG11", tick: 44, records: [{ evidenceId: "opaque:memory:predator:443", channel: "memory", type: "predator", confidence: .62, age: 11 }] }, decisionImpact: activeImpact, ...overrides });

test("threat forecasts remain probabilistic, readable, and free of raw evidence keys", () => {
  const readable = describeAnimalPrediction(threatPrediction()), evidence = predictionEvidenceLabels(threatPrediction(), cycle().evidenceSnapshot);
  assert.match(readable.headline, /may|possible/i); assert.match(readable.detail, /43%/); assert.equal(readable.horizonLabel, "next 8 min"); assert.match(evidence[0], /Remembered danger clue/); assert.doesNotMatch(evidence.join(" "), /opaque:|\.v1/);
  assert.doesNotMatch(describePredictionEvidence(cycle().evidenceSnapshot.records[0]), /opaque:/);
  assert.match(describePredictionEvidence({ channel: "hearing", type: "predator", signalKind: "alarm", communicatedBy: "SENDER-1", provenance: "communication", confidence: .8 }), /^Communicated alarm: danger clue/);
  assert.doesNotMatch(describePredictionEvidence({ channel: "hearing", type: "predator", signalKind: "alarm", communicatedBy: "SENDER-1", provenance: "communication", confidence: .8 }), /SENDER-1/);
});

test("every current animal prediction family has one unique accessible symbol", () => {
  assert.deepEqual(ANIMAL_PREDICTION_SYMBOLS.map(symbol => symbol.modelId).sort(), Object.keys(PREDICTIVE_MODEL_NAMES).sort());
  assert.equal(new Set(ANIMAL_PREDICTION_SYMBOLS.map(symbol => symbol.visualId)).size, ANIMAL_PREDICTION_SYMBOLS.length);
  assert.equal(new Set(ANIMAL_PREDICTION_SYMBOLS.map(symbol => symbol.svg)).size, ANIMAL_PREDICTION_SYMBOLS.length);
  assert.equal(new Set(ANIMAL_PREDICTION_SYMBOLS.map(symbol => symbol.shape)).size, ANIMAL_PREDICTION_SYMBOLS.length);
  for (const symbol of ANIMAL_PREDICTION_SYMBOLS) {
    assert.equal(symbol.label, PREDICTIVE_MODEL_NAMES[symbol.modelId]);
    assert.ok(symbol.description); assert.ok(symbol.fallbackGlyph); assert.ok(symbol.shape); assert.ok(symbol.svg);
    const svg = animalPredictionSymbolSvg(symbol.modelId);
    assert.match(svg, new RegExp(`data-prediction-symbol="${symbol.visualId}"`));
    assert.match(svg, /preserveAspectRatio="xMidYMid meet"/);
    assert.match(svg, /stroke="currentColor"/); assert.match(svg, /aria-hidden="true"/); assert.match(svg, /focusable="false"/);
    const readable = describeAnimalPrediction({ modelId: symbol.modelId, target: "TEST_TARGET", createdAtTick: 1, horizon: { latestTick: 2 }, output: {}, confidence: .5 });
    assert.equal(readable.symbolId, symbol.visualId); assert.equal(readable.symbolLabel, symbol.label); assert.equal(readable.glyph, symbol.fallbackGlyph);
  }
  const fallback = animalPredictionSymbol("future-model.v9");
  assert.equal(fallback, GENERIC_PREDICTION_SYMBOL); assert.notEqual(fallback.visualId, animalPredictionSymbol("threat-state.v1").visualId); assert.equal(fallback.fallbackGlyph, "•••"); assert.equal(fallback.shape, "Three dots inside a thin ring");
  assert.match(animalPredictionSymbolSvg("future-model.v9"), /data-prediction-symbol="bounded-forecast"/);
});

test("forecast-cloud text and semantic accents remain readable on the private-thought surface", () => {
  const channel = hex => hex.match(/[0-9a-f]{2}/gi).map(value => Number.parseInt(value, 16) / 255);
  const luminance = hex => channel(hex).map(value => value <= .03928 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4).reduce((total, value, index) => total + value * [.2126, .7152, .0722][index], 0);
  const contrast = (left, right) => { const values = [luminance(left), luminance(right)].sort((a, b) => b - a); return (values[0] + .05) / (values[1] + .05); };
  const palette = PREDICTION_INSIGHT_PALETTE;
  for (const colour of [palette.outline, palette.eyebrow, palette.text, palette.secondaryText, ...Object.values(palette.accents)]) assert.ok(contrast(palette.surface, colour) >= 4.5, `${colour} must remain readable on ${palette.surface}`);
  assert.equal(predictionInsightAccent({ tone: "water" }), palette.accents.water);
  assert.equal(predictionInsightAccent({ tone: "danger", priorityChanged: true }), palette.accents.changed);
  assert.equal(predictionInsightAccent({ tone: "unregistered" }), palette.accents.neutral);
});

test("cloud-variant registry is the exhaustive canonical set of seven semantic phrases plus renderer fallback", () => {
  const expected = [
    ["threat-probable", "threat-state.v1", "PREDATOR MAY BE NEAR"],
    ["threat-possible", "threat-state.v1", "POSSIBLE DANGER"],
    ["water-available", "resource-water.v1", "WATER MAY REMAIN"],
    ["water-uncertain", "resource-water.v1", "WATER UNCERTAIN"],
    ["body-recovery", "body-state.v1", "RECOVERY MAY BE NEEDED"],
    ["motion-continuing", "motion.v1", "MOVEMENT MAY CONTINUE"],
    ["action-compared", "action-forward.v1", "ACTION OUTCOME COMPARED"],
    ["bounded-renderer-fallback", null, "NEW FORECAST"]
  ];
  assert.deepEqual(PREDICTION_INSIGHT_VARIANTS.map(({ id, modelId, shortLabel }) => [id, modelId, shortLabel]), expected);
  assert.equal(new Set(PREDICTION_INSIGHT_VARIANTS.map(variant => variant.id)).size, 8);
  for (const variant of PREDICTION_INSIGHT_VARIANTS) {
    assert.ok(variant.tone); assert.ok(variant.metricLabel); assert.ok(variant.metricText); assert.ok(variant.metricBand); assert.ok(variant.eligibility);
    assert.ok(Number.isFinite(variant.metricLevel)); assert.ok(variant.metricLevel >= 0 && variant.metricLevel <= 1);
  }

  const forecastOnlyImpact = { ...activeImpact, coordinationQualified: false, scoreMutationApplied: false, scoringApplied: false, calculatedOnly: true, priorityChanged: false, candidateAdjustments: [] };
  const prediction = (modelId, output, confidence = .6, referent = null) => ({ predictionId: `VG11:44:${modelId}`, modelId, referent, createdAtTick: 44, horizon: { earliestTick: 45, latestTick: 52 }, evidenceRefs: [], output, confidence, authority: "ADVISORY" });
  const cases = [
    ["threat-probable", prediction("threat-state.v1", { probability: .72 }, .7)],
    ["threat-possible", prediction("threat-state.v1", { probability: .43 }, .7)],
    ["water-available", prediction("resource-water.v1", { likelyAvailable: true, memoryAge: 4 }, .6, "water")],
    ["water-uncertain", prediction("resource-water.v1", { likelyAvailable: false, memoryAge: 20 }, .6, "water")],
    ["body-recovery", prediction("body-state.v1", { hydrationAtHorizon: 60, sustainableTravelTicks: 0, recoveryRequired: true }, .6)],
    ["motion-continuing", prediction("motion.v1", { velocity: { x: .2, z: 0 }, radius: 2 }, .72, "RH1")],
    ["action-compared", prediction("action-forward.v1", { waterUtility: 1, escapeUtility: 20, recoveryUtility: 2 }, .72)]
  ];
  for (const [variantId, currentPrediction] of cases) {
    const registered = PREDICTION_INSIGHT_VARIANTS.find(variant => variant.id === variantId);
    const action = variantId === "action-compared", resource = variantId.startsWith("water-");
    const current = cycle({ predictions: [currentPrediction], scheduler: { budget: 6, usedCost: 1, danger: variantId.startsWith("threat-"), resourcePressure: resource }, decisionImpact: action ? activeImpact : forecastOnlyImpact });
    const cue = predictiveInsightCue(current);
    assert.ok(cue, `${variantId} produces a meaningful cue`);
    assert.equal(cue.shortLabel, registered.shortLabel, `${variantId} uses the canonical phrase`);
  }
  assert.equal(PREDICTION_INSIGHT_VARIANTS.at(-1).modelId, null, "renderer fallback is not an eighth animal prediction process");
});

test("effect-state registry and visible footer mapping cover all six recorded states", () => {
  const expected = [
    ["forecast-only", "FORECAST ONLY", false, false],
    ["bypassed", "FORECAST ONLY", false, false],
    ["qualified-no-effect", "QUALIFIED · NO CANDIDATE CHANGED", false, false],
    ["applied", "USED IN SCORING", true, false],
    ["changed-priority", "AFFECTED CHOICE", true, true],
    ["details", "OPEN FORECASTS PANEL", false, false]
  ];
  assert.deepEqual(PREDICTION_INSIGHT_EFFECT_STATES.map(({ id, visibleLabel, activeEffect, priorityChanged }) => [id, visibleLabel, activeEffect, priorityChanged]), expected);
  assert.equal(new Set(PREDICTION_INSIGHT_EFFECT_STATES.map(effect => effect.id)).size, 6);
  for (const effect of PREDICTION_INSIGHT_EFFECT_STATES) { assert.equal(effect.effectBand, effect.id); assert.ok(effect.meaning); }
  const cues = {
    "forecast-only": { effectBand: "forecast-only" },
    bypassed: { effectBand: "bypassed" },
    "qualified-no-effect": { effectBand: "qualified-no-effect" },
    applied: { effectBand: "applied", activeEffect: true },
    "changed-priority": { effectBand: "changed-priority", activeEffect: true, priorityChanged: true },
    details: { effectBand: "details" }
  };
  for (const effect of PREDICTION_INSIGHT_EFFECT_STATES) assert.equal(predictionInsightEffectLabel(cues[effect.id]), effect.visibleLabel, effect.id);
});

test("salient forecast and contributing module names use friendly semantic labels", () => {
  const forward = { predictionId: "VG11:44:action-forward.v1", modelId: "action-forward.v1", createdAtTick: 44, horizon: { latestTick: 56 }, evidenceRefs: [], output: { waterUtility: 4, escapeUtility: 38, recoveryUtility: 9 }, confidence: .66, authority: "SCORING" };
  const current = cycle({ predictions: [forward, threatPrediction()], contributorsByPrediction: { [forward.predictionId]: ["body-state.v1", "threat-state.v1"] } });
  assert.equal(salientAnimalPrediction(current).modelId, "threat-state.v1");
  assert.deepEqual(predictionContributorNames(current, forward), ["Action consequence comparison", "Body reserve forecast", "Threat likelihood estimate"]);
});

test("prediction insight cue is semantic, uncertain, and does not retrigger from prediction IDs alone", () => {
  const first = predictiveInsightCue(cycle()), second = predictiveInsightCue(cycle({ predictions: [threatPrediction({ predictionId: "VG11:45:threat-state.v1", createdAtTick: 45, horizon: { earliestTick: 46, latestTick: 53 } })] }));
  assert.ok(first); assert.match(first.label, /may|possible/i); assert.equal(first.fingerprint, second.fingerprint); assert.equal(first.priorityChanged, true); assert.doesNotMatch(first.shortLabel, /IS THERE|CONFIRMED/i);
  assert.equal(first.metricLabel, "EST. CHANCE"); assert.equal(first.metricText, "40%");
  assert.equal(predictiveInsightCue(cycle({ predictions: [threatPrediction({ output: { probability: .18, status: "UNKNOWN" } })] })), null);
});

test("empty forecast cues distinguish presentation absence without claiming environmental absence", () => {
  assert.deepEqual(PREDICTION_EMPTY_STATES.map(state => state.id), ["not-yet-run", "below-admission", "below-display", "no-new-insight"]);
  const notReady = emptyPredictionInsightCue(null);
  const notAdmitted = emptyPredictionInsightCue(cycle({ predictions: [], lifecycles: [] }));
  const belowDisplay = emptyPredictionInsightCue(cycle({ predictions: [threatPrediction({ output: { probability: .18, status: "UNKNOWN" } })] }));
  const unchanged = emptyPredictionInsightCue(cycle(), "no-new-insight");
  for (const cue of [notReady, notAdmitted, belowDisplay, unchanged]) {
    assert.equal(cue.placeholder, true);
    assert.equal(cue.metricLevel, 0);
    assert.match(cue.shortLabel, /FORECAST/);
    assert.doesNotMatch(`${cue.shortLabel} ${cue.detail}`, /no predator|safe|absent/i);
    assert.equal(predictionInsightEffectLabel(cue), cue.footerLabel);
  }
  assert.equal(notReady.emptyState, "not-yet-run");
  assert.equal(notAdmitted.emptyState, "below-admission");
  assert.equal(belowDisplay.emptyState, "below-display");
  assert.equal(unchanged.emptyState, "no-new-insight");
  assert.equal(unchanged.shortLabel, "FORECAST UNCHANGED");
});

test("an ineligible threat estimate does not suppress another meaningful forecast cue", () => {
  const weakThreat = threatPrediction({ output: { probability: .18, status: "UNKNOWN" }, confidence: .9 });
  const recovery = { predictionId: "VG11:44:body-state.v1", modelId: "body-state.v1", createdAtTick: 44, horizon: { earliestTick: 45, latestTick: 56 }, evidenceRefs: [], output: { hydrationAtHorizon: 68, sustainableTravelTicks: 0, recoveryRequired: true }, confidence: .74, authority: "CONSTRAINING" };
  const current = cycle({ predictions: [weakThreat, recovery] }), cue = predictiveInsightCue(current);
  assert.equal(salientAnimalPrediction(current).modelId, "threat-state.v1");
  assert.equal(cue.modelId, "body-state.v1"); assert.equal(cue.metricLabel, "MODEL CONF."); assert.equal(cue.metricText, "HIGH");
});

test("world insight presentation is selected-only, private, transient, and suppressed by urgent impact", () => {
  assert.deepEqual(predictionInsightPresentation({ selected: true, admitted: true, transitionActive: true }), { visible: true, private: true, public: false, transient: true, suppressed: "" });
  assert.equal(predictionInsightPresentation({ admitted: true, transitionActive: true }).visible, false);
  assert.match(predictionInsightPresentation({ admitted: true, transitionActive: true }).suppressed, /private forecast/);
  assert.equal(predictionInsightPresentation({ laboratory: true, admitted: true, transitionActive: true }).visible, false);
  assert.equal(predictionInsightPresentation({ hovered: true, admitted: true, transitionActive: true }).visible, false);
  assert.equal(predictionInsightPresentation({ movieFeatured: true, admitted: true, transitionActive: true }).visible, false);
  assert.equal(predictionInsightPresentation({ laboratory: true, admitted: true, transitionActive: false }).visible, false);
  assert.match(predictionInsightPresentation({ selected: true, admitted: true, transitionActive: true, urgentImpact: true }).suppressed, /urgent impact/);
});

test("decision effect description distinguishes priority, needs, method, memory, and learning", () => {
  const described = describePredictiveDecisionImpact(cycle());
  assert.match(described.headline, /changed the selected priority/i); assert.match(described.priority, /graze.*seek safety/i); assert.match(described.needs, /Unchanged/); assert.match(described.method, /did not|no method record was edited directly/i); assert.match(described.memory, /Ordinary memory unchanged/); assert.match(described.learning, /only after/i); assert.equal(described.adjustments[0].effectLabel, "+21.0 actual score");
  const clamped = describePredictiveDecisionImpact(cycle({ decisionImpact: { ...activeImpact, priorityChanged: false, baselineWinner: { drive: "hunt" }, selectedWinner: { drive: "hunt" }, candidateAdjustments: [{ drive: "hunt", family: "hunt", beforeScore: 5, afterScore: 0, scoreDelta: -5, modelAdjustment: -18, vetoApplied: false }] } }));
  assert.equal(clamped.adjustments[0].effectLabel, "-5.0 actual score");
});

test("shadow and protected decisions never claim behavior changed", () => {
  const shadow = describePredictiveDecisionImpact(cycle({ mode: "PREDICTIVE_SHADOW", decisionImpact: { ...activeImpact, coordinationQualified: false, scoreMutationApplied: false, scoringApplied: false, calculatedOnly: true, priorityChanged: false, baselineWinner: { drive: "graze" }, selectedWinner: { drive: "graze" }, candidateAdjustments: [] } }));
  assert.match(shadow.headline, /Forecast only; behaviour was unchanged/);
  const bypass = describePredictiveDecisionImpact(cycle({ decisionImpact: { ...activeImpact, protectedBranch: true, bypassed: true, coordinationQualified: false, scoreMutationApplied: false, scoringApplied: false, calculatedOnly: true, priorityChanged: false, selectedWinner: { drive: "emergency food acquisition" }, bypassReason: "A protected emergency-need branch committed first.", candidateAdjustments: [] } }));
  assert.match(bypass.headline, /bypassed/); assert.match(bypass.priority, /Protected branch/); assert.doesNotMatch(bypass.headline, /changed the selected priority/i);
  const qualified = describePredictiveDecisionImpact(cycle({ decisionImpact: { ...activeImpact, coordinationQualified: true, scoreMutationApplied: false, scoringApplied: false, priorityChanged: false, baselineWinner: { drive: "social" }, selectedWinner: { drive: "social" }, candidateAdjustments: [] } }));
  assert.match(qualified.headline, /qualified; no compatible candidate changed/i);
  const protectedOnly = describePredictiveDecisionImpact(cycle({ predictions: [], decisionImpact: { ...activeImpact, protectedBranch: true, bypassed: false, coordinationQualified: false, scoreMutationApplied: false, scoringApplied: false, calculatedOnly: false, priorityChanged: false, selectedWinner: { drive: "dependency" }, candidateAdjustments: [] } }));
  assert.match(protectedOnly.headline, /protected commitment used established behaviour/i); assert.doesNotMatch(protectedOnly.headline, /bypassed/i);
});
