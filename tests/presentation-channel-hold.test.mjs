import test from "node:test";
import assert from "node:assert/strict";
import {
  EMPTY_CHANNEL_HIDDEN_MS,
  EMPTY_CHANNEL_VISIBLE_MS,
  PRESENTATION_MAXIMUM_HOLD_MS,
  PRESENTATION_MINIMUM_HOLD_MS,
  PresentationChannelHoldStore,
  PresentationEmptyPulseStore
} from "../src/presentation-channel-hold.js";

const timing = (id, minimumVisibleMs, extra = {}) => Object.freeze({
  id,
  minimumVisibleMs,
  entryDelayMs: 0,
  releaseDelayMs: 0,
  interruptPriority: 0,
  ...extra
});
const cue = (semanticKey, presentationTiming, extra = {}) => Object.freeze({ semanticKey, presentationTiming, ...extra });

test("per-candidate holds are clamped to the 500-5000 ms readable range", () => {
  const store = new PresentationChannelHoldStore();
  assert.equal(PRESENTATION_MINIMUM_HOLD_MS, 500);
  assert.equal(PRESENTATION_MAXIMUM_HOLD_MS, 5000);

  const tooShort = store.resolve({ entityId: "VG1", channel: "expression", candidate: cue("startled", timing("startled", 50)), now: 0 });
  assert.equal(tooShort.holdUntil, 500);
  assert.equal(tooShort.timing.minimumVisibleMs, 500);

  const tooLong = store.resolve({ entityId: "VG2", channel: "expression", candidate: cue("relaxed", timing("relaxed", 9000)), now: 100 });
  assert.equal(tooLong.holdUntil, 5100);
  assert.equal(tooLong.timing.minimumVisibleMs, 5000);
});

test("replacement waits for both entry stability and the current cue release grace", () => {
  const store = new PresentationChannelHoldStore();
  const calm = cue("calm", timing("calm", 500, { releaseDelayMs: 300, interruptPriority: 10 }));
  const focused = cue("focused", timing("focused", 500, { entryDelayMs: 400, releaseDelayMs: 600, interruptPriority: 10 }));

  store.resolve({ entityId: "VG1", channel: "expression", candidate: calm, now: 0 });
  assert.equal(store.resolve({ entityId: "VG1", channel: "expression", candidate: focused, now: 600 }).pendingSince, 600);
  assert.equal(store.resolve({ entityId: "VG1", channel: "expression", candidate: focused, now: 999 }).semanticKey, "calm");
  const committed = store.resolve({ entityId: "VG1", channel: "expression", candidate: focused, now: 1000 });
  assert.equal(committed.semanticKey, "focused");
  assert.equal(committed.shownAt, 1000);

  assert.equal(store.resolve({ entityId: "VG1", channel: "expression", candidate: null, now: 1600 }).semanticKey, "focused");
  assert.equal(store.resolve({ entityId: "VG1", channel: "expression", candidate: null, now: 2199 }).semanticKey, "focused");
  assert.equal(store.resolve({ entityId: "VG1", channel: "expression", candidate: null, now: 2200 }).semanticKey, null);
});

test("a more urgent cue pre-empts a long hold only after the universal 500 ms floor", () => {
  const store = new PresentationChannelHoldStore();
  const relaxed = cue("relaxed", timing("relaxed", 5000, { interruptPriority: 20 }));
  const panic = cue("panic", timing("panic", 1500, { interruptPriority: 100 }));

  store.resolve({ entityId: "VG1", channel: "expression", candidate: relaxed, now: 0 });
  assert.equal(store.resolve({ entityId: "VG1", channel: "expression", candidate: panic, now: 100 }).semanticKey, "relaxed");
  assert.equal(store.resolve({ entityId: "VG1", channel: "expression", candidate: panic, now: 499 }).semanticKey, "relaxed");
  const interrupted = store.resolve({ entityId: "VG1", channel: "expression", candidate: panic, now: 500 });
  assert.equal(interrupted.semanticKey, "panic");
  assert.equal(interrupted.holdUntil, 2000);
});

test("same-key live metadata refreshes without flashing or restarting its timer", () => {
  const store = new PresentationChannelHoldStore();
  const profile = timing("callout:threat", 1250, { interruptPriority: 95 });
  store.resolve({ entityId: "VG1", channel: "callout", candidate: cue("callout:threat:8", profile, { vocalActive: true, urgency: 88 }), now: 10 });
  const refreshed = store.resolve({ entityId: "VG1", channel: "callout", candidate: cue("callout:threat:8", profile, { vocalActive: false, urgency: 91 }), now: 400 });

  assert.equal(refreshed.displayed.vocalActive, false);
  assert.equal(refreshed.displayed.urgency, 91);
  assert.equal(refreshed.shownAt, 10);
  assert.equal(refreshed.holdUntil, 1260);
  assert.equal(refreshed.pendingKey, null);
});

test("privacy or ownership loss clears immediately even inside a long hold", () => {
  const store = new PresentationChannelHoldStore();
  store.resolve({ entityId: "VG1", channel: "thought", candidate: cue("thought:rest", timing("thought:rest", 5000)), now: 0 });
  assert.equal(store.resolve({ entityId: "VG1", channel: "thought", candidate: cue("thought:rest", timing("thought:rest", 5000)), eligible: false, now: 200 }).semanticKey, null);
  assert.equal(store.snapshot("VG1", "thought").semanticKey, null);
});

test("empty-state heartbeat uses the new 1.25 s visible and 1.75 s quiet cadence", () => {
  const pulses = new PresentationEmptyPulseStore();
  assert.equal(EMPTY_CHANNEL_VISIBLE_MS, 1250);
  assert.equal(EMPTY_CHANNEL_HIDDEN_MS, 1750);
  assert.equal(pulses.resolve({ entityId: "VG1", channel: "forecast", now: 0 }).visible, true);
  assert.equal(pulses.resolve({ entityId: "VG1", channel: "forecast", now: 1249 }).visible, true);
  assert.equal(pulses.resolve({ entityId: "VG1", channel: "forecast", now: 1250 }).visible, false);
  assert.equal(pulses.resolve({ entityId: "VG1", channel: "forecast", now: 2999 }).visible, false);
  assert.equal(pulses.resolve({ entityId: "VG1", channel: "forecast", now: 3000 }).visible, true);
  assert.equal(pulses.resolve({ entityId: "VG1", channel: "forecast", empty: false, now: 3100 }).phase, "inactive");
  assert.equal(pulses.resolve({ entityId: "VG1", channel: "forecast", now: 9000 }).phaseStartedAt, 9000);
});

test("stores remain bounded and clear every channel owned by a removed entity", () => {
  const store = new PresentationChannelHoldStore({ maximumEntries: 2 });
  store.resolve({ entityId: "A", channel: "thought", candidate: cue("a", timing("a", 500)), now: 1 });
  store.resolve({ entityId: "B", channel: "thought", candidate: cue("b", timing("b", 500)), now: 2 });
  store.resolve({ entityId: "C", channel: "thought", candidate: cue("c", timing("c", 500)), now: 3 });
  assert.equal(store.size, 2);
  assert.equal(store.snapshot("A", "thought").semanticKey, null);
  store.resolve({ entityId: "C", channel: "forecast", candidate: cue("forecast", timing("forecast", 500)), now: 4 });
  store.clearEntity("C");
  assert.equal(store.snapshot("C", "thought").semanticKey, null);
  assert.equal(store.snapshot("C", "forecast").semanticKey, null);
});
