import test from "node:test";
import assert from "node:assert/strict";
import { PREDICTION_EMPTY_STATES, PREDICTION_INSIGHT_VARIANTS } from "../src/predictive-entity-presentation.js";
import { PUBLIC_SIGNAL_VARIANTS } from "../src/symbol-registry.js";
import {
  CALLOUT_PRESENTATION_TIMINGS,
  EXPRESSION_PRESENTATION_TIMINGS,
  FORECAST_EMPTY_PRESENTATION_TIMINGS,
  FORECAST_PRESENTATION_TIMINGS,
  FORECAST_TIMING_MAX_MS,
  FORECAST_TIMING_MIN_MS,
  PRESENTATION_TIMING_MAX_MS,
  PRESENTATION_TIMING_MIN_MS,
  THOUGHT_PRESENTATION_TIMINGS,
  calloutPresentationTiming,
  expressionPresentationTiming,
  forecastPresentationTiming,
  presentationTimingFor,
  presentationTimingRange,
  thoughtPresentationTiming
} from "../src/presentation-timing.js";
import { FACIAL_EXPRESSION_LEGEND } from "../src/visual-language.js";

const assertBoundedProfile = profile => {
  assert.ok(profile, "timing profile exists");
  assert.ok(profile.id, "timing profile has a stable id");
  assert.ok(profile.minimumVisibleMs >= PRESENTATION_TIMING_MIN_MS, `${profile.id} meets 500 ms floor`);
  const maximum = profile.id.startsWith("forecast") ? FORECAST_TIMING_MAX_MS : PRESENTATION_TIMING_MAX_MS;
  assert.ok(profile.minimumVisibleMs <= maximum, `${profile.id} meets its channel ceiling`);
  assert.ok(profile.entryDelayMs >= 0 && profile.entryDelayMs <= PRESENTATION_TIMING_MAX_MS, `${profile.id} entry delay bounded`);
  assert.ok(profile.releaseDelayMs >= 0 && profile.releaseDelayMs <= PRESENTATION_TIMING_MAX_MS, `${profile.id} release delay bounded`);
  assert.ok(profile.interruptPriority >= 0 && profile.interruptPriority <= 100, `${profile.id} interrupt priority bounded`);
  assert.ok(profile.reason, `${profile.id} explains its timing`);
};

test("all 18 registered expressions resolve to bounded timing profiles", () => {
  assert.equal(FACIAL_EXPRESSION_LEGEND.length, 18);
  assert.equal(new Set(FACIAL_EXPRESSION_LEGEND.map(entry => entry.key)).size, 18);
  for (const entry of FACIAL_EXPRESSION_LEGEND) {
    const profile = expressionPresentationTiming({ key: entry.key });
    assertBoundedProfile(profile);
    assert.ok(profile.id.startsWith(`${entry.key}:`), `${entry.key} uses its own timing family`);
  }
  for (const profile of EXPRESSION_PRESENTATION_TIMINGS) assertBoundedProfile(profile);
});

test("startle is the 500 ms short expression and safe relaxation lasts 5000 ms", () => {
  const startled = expressionPresentationTiming({ key: "startled", role: "startle", timingKey: "startled:acute" });
  const relaxed = expressionPresentationTiming({ key: "relaxed", role: "recovery", timingKey: "relaxed:safe-rest" });
  assert.equal(startled.minimumVisibleMs, 500);
  assert.equal(startled.entryDelayMs, 0);
  assert.equal(relaxed.minimumVisibleMs, 5000);
  assert.ok(relaxed.entryDelayMs > startled.entryDelayMs);
  assert.ok(relaxed.interruptPriority < startled.interruptPriority);
});

test("all 28 concrete callouts have bounded type-specific profiles", () => {
  assert.equal(PUBLIC_SIGNAL_VARIANTS.length, 28);
  assert.equal(CALLOUT_PRESENTATION_TIMINGS.length, 28);
  assert.equal(new Set(CALLOUT_PRESENTATION_TIMINGS.map(profile => profile.id)).size, 28);
  for (const variant of PUBLIC_SIGNAL_VARIANTS) {
    const profile = calloutPresentationTiming(variant);
    assertBoundedProfile(profile);
    assert.equal(profile.id, `callout:${variant.id}`);
  }
});

test("a concrete callout variant takes precedence over its broad signal kind", () => {
  const profile = calloutPresentationTiming({
    kind: "contact",
    descriptor: { id: "dependent-contact" }
  });
  assert.equal(profile.id, "callout:dependent-contact");
});

test("every forecast variant and honest empty state resolves within the timing bounds", () => {
  assert.equal(FORECAST_PRESENTATION_TIMINGS.length, PREDICTION_INSIGHT_VARIANTS.length);
  assert.equal(FORECAST_EMPTY_PRESENTATION_TIMINGS.length, PREDICTION_EMPTY_STATES.length);
  for (const variant of PREDICTION_INSIGHT_VARIANTS) {
    const profile = forecastPresentationTiming({ variantId: variant.id });
    assertBoundedProfile(profile);
    assert.ok(profile.minimumVisibleMs >= FORECAST_TIMING_MIN_MS);
    assert.ok(profile.minimumVisibleMs <= FORECAST_TIMING_MAX_MS);
    assert.ok(profile.id.startsWith(`forecast:${variant.id}`));
  }
  for (const state of PREDICTION_EMPTY_STATES) {
    const profile = forecastPresentationTiming({ placeholder: true, emptyState: state.id });
    assertBoundedProfile(profile);
    assert.ok(profile.minimumVisibleMs >= FORECAST_TIMING_MIN_MS);
    assert.ok(profile.minimumVisibleMs <= FORECAST_TIMING_MAX_MS);
    assert.equal(profile.id, `forecast-empty:${state.id}`);
  }
});

test("all thought categories and the undecided placeholder are bounded", () => {
  const categories = ["danger", "hunting", "food", "water", "scavenge", "family", "social", "exploration", "reproduction", "rest", "unknown"];
  assert.equal(THOUGHT_PRESENTATION_TIMINGS.length, categories.length + 1);
  for (const category of categories) {
    const profile = thoughtPresentationTiming(category, category);
    assertBoundedProfile(profile);
    assert.equal(profile.id, `thought:${category}`);
  }
  const undecided = thoughtPresentationTiming("", "unknown", true);
  assertBoundedProfile(undecided);
  assert.equal(undecided.id, "thought:undecided");
});

test("generic channel dispatch and aggregate ranges preserve the canonical bounds", () => {
  assert.equal(presentationTimingFor("expression", { key: "startled", timingKey: "startled:acute" }).minimumVisibleMs, 500);
  assert.equal(presentationTimingFor("thought", { category: "rest" }).minimumVisibleMs, 5000);
  assert.equal(presentationTimingFor("callout", { id: "alarm" }).id, "callout:alarm");
  assert.equal(presentationTimingFor("forecast", { variantId: "water-available" }).id, "forecast:water-available");

  const range = presentationTimingRange([
    ...EXPRESSION_PRESENTATION_TIMINGS,
    ...CALLOUT_PRESENTATION_TIMINGS,
    ...THOUGHT_PRESENTATION_TIMINGS,
    ...FORECAST_PRESENTATION_TIMINGS,
    ...FORECAST_EMPTY_PRESENTATION_TIMINGS
  ]);
  assert.deepEqual(range, { minimumMs: 500, maximumMs: 8000 });
});
