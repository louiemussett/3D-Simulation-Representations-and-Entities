import test from "node:test";
import assert from "node:assert/strict";
import { CINEMA_INFORMATION_CHANNELS, CINEMA_PRESETS, applyCinemaPresetValues, isWorldSceneCandidate, resolveCinemaInformationLens } from "../src/cinema-presets.js";

test("complete Cinema presets configure the whole production while leaving AI off by default", () => {
  for (const key of ["classic", "characters", "ecology", "world", "perception", "complete", "quiet", "events", "research"]) {
    const preset = CINEMA_PRESETS[key]; assert.ok(preset, key);
    for (const property of ["lensPreset", "subjectMode", "continuity", "pacing", "eventPriority", "shotLength", "shotTypes", "motionTypes", "perceptionInserts", "narrationPreset", "contextDepth", "narrationLength", "voice", "captions", "ai"]) assert.notEqual(preset[property], undefined, `${key}.${property}`);
    assert.equal(preset.ai, false, `${key} must not automatically enable the prototype AI`);
  }
  assert.equal(CINEMA_PRESETS.world.subjectMode, "world");
  assert.equal(CINEMA_PRESETS.complete.lensPreset, "complete");
  assert.equal(CINEMA_PRESETS.classic.subjectMode, "balanced");
  assert.equal(CINEMA_PRESETS.classic.continuity, "strong");
  assert.equal(CINEMA_PRESETS.classic.lensPreset, "adaptive");
  assert.equal(CINEMA_PRESETS.classic.shotTypes, "all");
  assert.equal(CINEMA_PRESETS.classic.narrationLength, "short");
  assert.equal(CINEMA_PRESETS.classic.eventPriority, "events");
});

test("documentary lenses add scene context instead of replacing it", () => {
  const lens = resolveCinemaInformationLens({ preset: "documentary", directed: { physiology: true, vision: true, decisions: true } });
  for (const channel of ["expressions", "calls", "actions", "identity", "physiology", "vision", "decisions"]) assert.equal(lens[channel], true, channel);
});

test("complete lens exposes every Cinema information channel", () => {
  const lens = resolveCinemaInformationLens({ preset: "complete", directed: {} });
  assert.deepEqual(Object.keys(lens).sort(), [...CINEMA_INFORMATION_CHANNELS].sort());
  assert.ok(Object.values(lens).every(Boolean));
});

test("world lens excludes animal channels and keeps world evidence", () => {
  const lens = resolveCinemaInformationLens({ preset: "world", directed: { thoughts: true, expressions: true, water: true, biomass: true, decisions: true } });
  assert.deepEqual(lens, { water: true, biomass: true });
});

test("channel overrides apply after contextual composition", () => {
  const lens = resolveCinemaInformationLens({ preset: "documentary", directed: { vision: true, sound: false }, overrides: { expressions: "never", vision: "prefer", smell: "always" } });
  assert.equal(lens.expressions, undefined);
  assert.equal(lens.vision, true);
  assert.equal(lens.smell, true);
});

test("world scene recognition includes actual environmental candidate kinds", () => {
  for (const kind of ["landscape", "waterhole", "habitat-landmark", "weather-system", "hydrology", "vegetation-transition", "terrain-transition"]) assert.equal(isWorldSceneCandidate({ kind }), true, kind);
  assert.equal(isWorldSceneCandidate({ kind: "activity", ids: ["g1"] }), false);
  assert.equal(isWorldSceneCandidate({ kind: "activity", worldSubject: true }), true);
});

test("preset application preserves unrelated runtime state", () => {
  const result = applyCinemaPresetValues("world", { active: true, sequence: 12 });
  assert.equal(result.active, true); assert.equal(result.sequence, 12); assert.equal(result.subjectMode, "world"); assert.equal(result.presetName, "world");
  assert.equal(applyCinemaPresetValues("unknown", { active: true }).presetName, "custom");
});
