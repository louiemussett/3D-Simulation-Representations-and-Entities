import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const app = fs.readFileSync(new URL("../src/app.js", import.meta.url), "utf8"), cognition = fs.readFileSync(new URL("../src/predictive-cognition.js", import.meta.url), "utf8"), presentation = fs.readFileSync(new URL("../src/predictive-entity-presentation.js", import.meta.url), "utf8"), css = fs.readFileSync(new URL("../src/styles.css", import.meta.url), "utf8"), html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const rendererStart = app.indexOf("function renderPredictiveLaboratory(");
const rendererEnd = app.indexOf("\nfunction updateUI(", rendererStart);
const predictiveRenderer = app.slice(rendererStart, rendererEnd);

test("Main Laboratory exposes a dedicated readable predictive systems workspace", () => {
  for (const text of ["Predictive systems", "Automatic predictive allocation", "Predictive systems overview", "Animal predictive mind", "Cinema Mode predictive coalition", "How to read predictive systems"]) assert.match(app, new RegExp(text));
  for (const removed of ["predictive-animal-mode", "predictive-animal-profile", "predictive-experiment-profile"]) assert.equal(app.includes(removed), false, removed);
});

test("predictive UI explains all three automatic behavior depths and preserves the lifecycle table", () => {
  for (const text of ["LEGACY", "PREDICTIVE_SHADOW", "PREDICTIVE_ACTIVE", "How this decision was assembled", "Evidence retained for these admitted forecasts", "Bounded decision history", "Structural proposals awaiting review"]) assert.match(app, new RegExp(text));
  for (const heading of ["Process", "Framework", "Activated", "Admission", "Influence", "Authority", "Target / referent", "Horizon", "Confidence", "Cost"]) assert.match(app, new RegExp(`<th>${heading.replace(" / ", " \/ ")}</th>`));
});

test("predictive mode is selected automatically from confidence relevance and computational value", () => {
  for (const text of ["automatic cost/relevance scheduler", "existing behavior is the safe fallback", "qualified to influence action"]) assert.match(cognition, new RegExp(text));
  assert.match(app, /small computation budget/);
  assert.match(app, /others remain dormant/);
});

test("Predictive Laboratory renders semantic summaries without developer data dumps", () => {
  assert.ok(rendererStart >= 0 && rendererEnd > rendererStart, "predictive renderer is extractable");
  for (const forbidden of [/<pre\b/i, /predictive-raw/i, /Evidence ID/i, /Evidence references/i, /Complete serialized cognition state/i, /Complete ACSS diagnostic snapshot/i, /predictiveJson\s*\(/]) assert.doesNotMatch(predictiveRenderer, forbidden);
  for (const helper of ["predictiveAdjustmentDiagram", "predictiveVetoSummary", "predictiveLastResortSummary", "predictiveOutputCard", "predictiveParameterTable", "predictiveProposalTable", "predictiveAuthorityTable", "predictiveCinemaPlanSummary", "predictiveLearningEvents"]) assert.match(predictiveRenderer, new RegExp(`${helper}\\(`));
});

test("persisted Predictive Laboratory startup uses function-declared render helpers", () => {
  for (const helper of ["predictivePercent", "predictiveModeDescription"]) {
    const declaration = app.indexOf(`function ${helper}(`);
    assert.ok(declaration >= 0 && declaration < rendererStart, `${helper} is declared before the renderer`);
  }
  assert.equal(/const predictive(?:Percent|ModeDescription)\s*=/.test(app), false);
});

test("predictive diagrams expose stable semantic hooks", () => {
  for (const name of ["animal-information-flow", "automatic-mode-allocation", "cinema-truth-flow"]) assert.match(predictiveRenderer, new RegExp(`data-predictive-diagram=["']${name}["']`));
  assert.match(predictiveRenderer, /data-open-predictive-reference/);
  assert.match(predictiveRenderer, /Retained cycle evidence/);
  assert.match(predictiveRenderer, /Current buffers are separate from that recorded causal path/);
  assert.doesNotMatch(predictiveRenderer, /<b>Current local buffers<\/b>/);
});

test("Mini Laboratory shows a condensed predictive surface while Main retains full detail", () => {
  for (const selector of [".predictive-workspace", ".predictive-layer-flow", ".predictive-model-card", ".predictive-table", ".predictive-impact-diagram", ".predictive-output-grid", ".predictive-gate-grid", "#predictive-mini-summary", ".predictive-main-detail", ".inspector.is-mini-laboratory #predictive-mini-summary", ".inspector.is-mini-laboratory .predictive-main-detail"]) assert.ok(css.includes(selector), selector);
  assert.doesNotMatch(css, /\.inspector\.is-mini-laboratory\s+#predictive-systems-workspace\s*\{\s*display\s*:\s*none/);
  for (const text of ["Mini Laboratory · live predictive digest", "Open full Predictive Laboratory", "data-predictive-surface=\"mini\"", "data-predictive-surface=\"main\""]) assert.match(app, new RegExp(text));
  for (const hook of ["data-predictive-mini-card", "data-predictive-mini-entity", "data-open-predictive-detail", "data-predictive-full-forecast", "showOpenButton: false"]) assert.match(app, new RegExp(hook));
  assert.match(app, /function updatePredictiveMarkup/);
  assert.equal((predictiveRenderer.match(/miniRoot\.innerHTML\s*=/g) || []).length, 1, "Mini card structure is created once; live summaries update inside stable controls");
});

test("selected organism exposes a readable Forecasts tab and impact domains", () => {
  assert.match(html, /data-observer-tab="predictive">Forecasts/); assert.match(html, /id="selected-predictive-summary"[^>]*data-entity-predictive/);
  for (const hook of ["entity-forecast-flow", "data-predictive-impact=\"priority\"", "data-predictive-impact=\"needs\"", "data-predictive-impact=\"method\"", "data-predictive-impact=\"memory\""]) assert.match(app, new RegExp(hook));
  for (const phrase of ["Made by", "Estimated by", "Effect scored by", "Input", "Need values", "Satisfying method", "Ordinary memory unchanged", "Forecast only; behaviour was unchanged", "Qualified forecasts were bypassed"]) assert.match(`${app}\n${presentation}`, new RegExp(phrase));
  assert.match(app, /predictiveNumber\(cycle\.scheduler\?\.usedCost\)/); assert.match(app, /predictiveNumber\(record\.tick\)/); assert.match(app, /predictiveNumber\(item\.tick\)/);
  assert.match(app, /predictiveNumber\(item\?\.cost \?\? item\?\.admission\?\.cost, "—"\)/);
  assert.match(app, /blockedCandidates = \(cycle\.decisionImpact\?\.candidateAdjustments \|\| \[\]\)\.filter\(item => item\.vetoApplied\)/);
  assert.match(app, /Number\(a\.needDependencyPlan\?\.tick\) === sim\.tick/);
  assert.doesNotMatch(predictiveRenderer, /\$\{(?:cycle\?\.)?scheduler\?\.usedCost\s*\?\?/);
});

test("entity Social tab keeps the complete live four-channel visual guide out of Overview", () => {
  const guideStart = app.indexOf("function observerSocialVisualGuideHtml(");
  const guideEnd = app.indexOf("\nfunction renderObserverDetail(", guideStart);
  const guideMarkup = app.slice(guideStart, guideEnd);
  assert.ok(guideStart >= 0 && guideEnd > guideStart, "Social visual guide is extractable");
  assert.match(guideMarkup, /data-observer-social-visual-guide/);
  assert.match(guideMarkup, /data-observer-symbol-bays[\s\S]*\$\{thoughtChannel\.bay\}\$\{actionChannel\.bay\}\$\{faceChannel\.bay\}\$\{signalChannel\.bay\}/, "all four symbol bays occupy stable slots");
  assert.match(guideMarkup, /data-observer-symbol-explanations[\s\S]*\$\{thoughtChannel\.explanation\}\$\{actionChannel\.explanation\}\$\{faceChannel\.explanation\}\$\{signalChannel\.explanation\}/, "all four explanations follow the symbol grid");
  assert.match(guideMarkup, /aria-labelledby=/); assert.match(guideMarkup, /aria-describedby=/); assert.match(guideMarkup, /data-social-epistemic=/);
  for (const [channel, source] of [
    ["private-thought", "thoughtPreview"],
    ["notable-action", "actionPreview"],
    ["visible-expression", "facePreview"],
    ["public-signal", "signalPreview"]
  ]) {
    assert.match(guideMarkup, new RegExp(`channelPresentation\\(${source}, "${channel}"`), `${channel} uses its live preview`);
  }
  for (const helper of ["thoughtBubbleMaterialFromPresentation", "actionBadgeMaterial", "emotionFaceMaterial", "semanticBadgeMaterial", "exactSymbolPreview"]) {
    assert.match(guideMarkup, new RegExp(`${helper}\\(`), `${helper} renders the same pixels used in the world`);
  }

  assert.match(guideMarkup, /thoughtSignalAlignment\(priority, signalSymbol\)/);
  assert.match(guideMarkup, /data-current-thought-alignment=/);
  assert.match(guideMarkup, /data-thought-alignment-key=/);
  const alignmentStates = [...guideMarkup.matchAll(/keyItem\("(private|aligned|divergent)"/g)].map(match => match[1]);
  assert.deepEqual(alignmentStates, ["private", "aligned", "divergent"]);
  for (const copy of [
    /current private priority\. Cloud colour compares it with any public signal/i,
    /behaviour worth labelling because posture and movement arrows do not already explain it/i,
    /observable face other animals may see, not the animal's exact private priority/i,
    /call or outward display\. It can be mistaken and does not expose the exact private thought/i,
    /Private priority and signal align/i,
    /Private priority and signal differ/i
  ]) assert.match(guideMarkup, copy);
  assert.match(guideMarkup, /data-social-visual-explanation/);
  for (const movedDetail of [/Calls are public evidence/i, /Forecast exception/i, /observer-social-channel-note/]) assert.doesNotMatch(guideMarkup, movedDetail);

  const rendererStart = app.indexOf("function renderObserverDetail(");
  const rendererEnd = app.indexOf("\nfunction observerPerceptionEvidenceHtml(", rendererStart);
  const observerRenderer = app.slice(rendererStart, rendererEnd);
  const socialStart = observerRenderer.indexOf('observerDetailTab === "memory"');
  const socialEnd = observerRenderer.indexOf('observerDetailTab === "priorities"', socialStart);
  const socialBranch = observerRenderer.slice(socialStart, socialEnd);
  assert.ok(rendererStart >= 0 && rendererEnd > rendererStart && socialStart >= 0 && socialEnd > socialStart, "Social branch is extractable");
  assert.match(socialBranch, /observer-social-summary[\s\S]*\$\{observerSocialVisualGuideHtml\(selected\)\}[\s\S]*Recent social memory/);
  assert.equal((observerRenderer.match(/observerSocialVisualGuideHtml\(selected\)/g) || []).length, 1, "visual guide is mounted only by the Social branch");

  const overviewStart = app.indexOf("function observerWholeAnimalOverviewHtml(");
  const overviewEnd = app.indexOf("\nfunction observerSocialVisualGuideHtml(", overviewStart);
  const overviewMarkup = app.slice(overviewStart, overviewEnd);
  assert.ok(overviewStart >= 0 && overviewEnd > overviewStart, "Overview is extractable independently of the Social helper");
  for (const socialOnly of ["observerSocialVisualGuideHtml", "data-observer-social-visual-guide", "data-social-visual-channel", "data-thought-alignment-key", "observer-symbol-bays", "observer-symbol-explanations"]) assert.doesNotMatch(overviewMarkup, new RegExp(socialOnly));
});

test("Forecasts and Main Laboratory share the complete five-symbol prediction key", () => {
  for (const hook of ["predictionSymbolHtml", "predictionSymbolLegendHtml", "data-prediction-symbol-legend", "data-prediction-symbol-key", "data-prediction-model-symbol", "prediction-symbol-medallion", "prediction-symbol-svg"]) assert.match(`${app}\n${presentation}\n${css}`, new RegExp(hook));
  assert.match(app, /All \$\{ANIMAL_PREDICTION_SYMBOLS\.length\} current animal forecast types/);
  assert.match(app, /data-predictive-full-forecast[^\n]+\$\{predictionSymbolLegendHtml\(\)\}/);
  for (const selector of [".prediction-symbol-legend", ".prediction-symbol-legend-grid", ".predictive-model-title", ".prediction-confidence-ring", ".entity-predictive-forecast-card"]) assert.ok(css.includes(selector), selector);
});

test("admitted forecasts use accessible circular confidence meters without losing their explanations", () => {
  const ringStart = app.indexOf("function predictionConfidenceRingHtml("), summaryStart = app.indexOf("function entityPredictiveSummaryHtml("), summaryEnd = app.indexOf("\nfunction observerWholeAnimalOverviewHtml(", summaryStart), summaryMarkup = app.slice(ringStart, summaryEnd);
  for (const hook of ["predictionConfidenceRingHtml", "data-forecast-confidence-grid", "data-forecast-confidence-card", "data-prediction-confidence-ring", "data-forecast-confidence"]) assert.match(summaryMarkup, new RegExp(hook));
  for (const accessibility of ['role="meter"', 'aria-valuemin="0"', 'aria-valuemax="100"', "aria-valuenow"]) assert.match(summaryMarkup, new RegExp(accessibility));
  for (const retained of ["description.moduleName", "description.headline", "description.detail", "description.horizonLabel", "predictiveWords(item.authority)"]) assert.ok(summaryMarkup.includes(retained), `${retained} remains visible below the ring`);
  assert.match(summaryMarkup, /description\?\.confidenceLabel/);
  assert.match(summaryMarkup, /predictionSymbolHtml\(prediction\?\.modelId, \{ tone, decorative: true \}\)/, "the confidence meter reuses the canonical semantic symbol");
  assert.match(css, /\.entity-predictive-forecast-grid \{ grid-template-columns:repeat\(auto-fit,minmax\(140px,1fr\)\)/);
  assert.match(css, /\.prediction-confidence-gauge \{[^\n]+border-radius:50%;[^\n]+conic-gradient/);
});

test("entity Overview combines a compact forecast with a dense whole-animal summary", () => {
  const summaryStart = app.indexOf("const summaryContent =", app.indexOf("function entityPredictiveSummaryHtml("));
  const compactReturn = app.indexOf("if (compact) return", summaryStart);
  const compactMarkup = app.slice(summaryStart, compactReturn), overviewStart = app.indexOf("function observerWholeAnimalOverviewHtml("), overviewEnd = app.indexOf("function observerSocialVisualGuideHtml(", overviewStart), overviewMarkup = app.slice(overviewStart, overviewEnd);
  assert.ok(summaryStart >= 0 && compactReturn > summaryStart, "compact forecast summary is extractable");
  for (const retained of ["entity-predictive-heading", "entity-predictive-hero", "entity-predictive-modules"]) assert.match(compactMarkup, new RegExp(retained));
  for (const omitted of ["entity-predictive-flow", "entity-predictive-effect", "entity-predictive-impact", "entity-predictive-expanded", "entity-predictive-open", "prediction-symbol-legend"]) assert.doesNotMatch(compactMarkup, new RegExp(omitted));
  assert.ok(overviewStart >= 0 && overviewEnd > overviewStart, "whole-animal Overview is extractable");
  assert.match(overviewMarkup, /entityPredictiveSummaryHtml\(animal, \{ expanded: false, compact: true, surface: "observer-overview", showOpenButton: false \}\)/);
  for (const section of ["physiology", "forecast", "needs-goals", "action", "social", "memory", "life-traits"]) assert.match(overviewMarkup, new RegExp(`data-overview-section="${section}"`));
  for (const label of ["Whole animal now", "Body and performance", "Needs and goals", "Action and context", "Social and outward state", "Awareness and memory", "Condition, life and traits"]) assert.match(overviewMarkup, new RegExp(label));
  for (const omitted of ["predictionSymbolLegendHtml", "entity-predictive-flow", "entity-predictive-effect", "<details", "<summary", "observerSocialVisualGuideHtml", "data-observer-social-visual-guide", "data-social-visual-channel", "data-thought-alignment-key", "observer-symbol-bays", "observer-symbol-explanations", "observer-trait-profile"]) assert.doesNotMatch(overviewMarkup, new RegExp(omitted));
  assert.match(app, /^\s*ui\.hudDetail\.innerHTML = observerWholeAnimalOverviewHtml\(selected\);$/m);
  assert.match(app, /entityPredictiveSummaryHtml\(selected, \{ expanded: true, surface: "observer-tab" \}\)/);
  assert.match(app, /entityPredictiveSummaryHtml\(selected, \{ expanded: true, surface: "laboratory-entity" \}\)/);
});

test("world prediction insight is a transient private forecast variant, not a public signal", () => {
  for (const phrase of ["function predictionInsightMaterial", "predictionInsightPresentation", "forecastPresentationTiming", "predictionInsight", "POSSIBLE DANGER", "FORECAST ONLY"]) assert.match(`${app}\n${presentation}`, new RegExp(phrase));
  assert.match(app, /predictionSourceKey = predictionCue \? `\$\{predictionCue\.fingerprint\}:\$\{predictionCue\.metricBand\}:\$\{predictionCue\.effectBand\}` : null/);
  assert.match(app, /thoughtState\.insightSourceKey !== predictionSourceKey/);
  assert.match(app, /!urgentImpact/);
  assert.match(app, /labToggle\.addEventListener\("click"[^\n]+renderAll\(\); updateUI\(\)/);
  assert.match(presentation, /public: false/);
  assert.match(presentation, /possible danger|may be nearby/i);
  const canvasStart = app.indexOf("function predictionInsightCanvas("), canvasEnd = app.indexOf("\nfunction predictionInsightMaterial", canvasStart), canvasFactory = app.slice(canvasStart, canvasEnd);
  for (const visual of ["PREDICTION_INSIGHT_PALETTE", "predictionInsightAccent", "palette.surface", "palette.outline", "palette.text", "palette.secondaryText"]) assert.match(canvasFactory, new RegExp(visual.replace(".", "\\.")));
  assert.match(canvasFactory, /setLineDash\(\[9, 6\]\)/, "forecast identity remains a coloured dashed edge");
  assert.match(canvasFactory, /shadowColor = "rgba\(0,0,0,\.38\)"/, "cloud remains separated from bright terrain");
});

test("prediction medallions optically centre a large canonical symbol", () => {
  assert.match(css, /\.entity-predictive-glyph \{ position:relative/);
  assert.match(css, /\.prediction-symbol-medallion \{ position:relative/);
  assert.match(css, /\.entity-predictive-glyph \.prediction-symbol-svg,[^\n]+position:absolute; left:50%; top:50%;[^\n]+width:76%; height:76%;[^\n]+transform:translate\(-50%,-50%\)/);
  assert.match(css, /data-prediction-symbol="water-availability"[^\n]+width:86%; height:86%; transform:translate\(-50%,-50%\) translateY\(\.5px\)/);
});

test("forecast visual materials are shared by bounded appearance rather than entity referent", () => {
  const start = app.indexOf("function predictionInsightMaterial("), end = app.indexOf("\nfunction actionBadgeMaterial", start), materialFactory = app.slice(start, end);
  assert.match(materialFactory, /cue\.shortLabel/); assert.match(app, /PREDICTION_INSIGHT_MATERIAL_LIMIT = 96/); assert.match(materialFactory, /size >= PREDICTION_INSIGHT_MATERIAL_LIMIT - 1/);
  assert.match(materialFactory, /map\.colorSpace = THREE\.SRGBColorSpace/, "authored forecast colours are not reinterpreted as linear canvas data");
  assert.doesNotMatch(materialFactory, /\$\{cue\.fingerprint\}/);
  assert.doesNotMatch(materialFactory, /\$\{a\.(?:id|speciesId|lifeStage)\}/);
});
