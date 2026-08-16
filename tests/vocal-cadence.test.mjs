import test from "node:test";
import assert from "node:assert/strict";
import { evaluateVocalCadence, releaseVocalEpisode, socialCueCompatibility, vocalTraitProfile, wolfPackHowlWindow } from "../src/vocal-cadence.js";

const deer = (extra = {}) => ({ id: "D", speciesId: "valley-grazer-updated", lifeStage: "adult", vocalCooldownUntil: 0, ...extra });

test("routine hunger thirst and temperature remain non-vocal", () => {
  for (const kind of ["water", "hunger", "heat", "cold"]) assert.equal(evaluateVocalCadence(deer(), { kind, urgency: 100 }, { tick: 1, roll: 0 }).allow, false);
});

test("unresearched call contexts remain silent across species by default", () => {
  for (const speciesId of ["european-rabbit", "common-ostrich", "nile-crocodile"]) {
    assert.equal(evaluateVocalCadence({ id: speciesId, speciesId, lifeStage: "adult" }, { kind: "contact", urgency: 80 }, { tick: 1, roll: 0 }).allow, false);
  }
});

test("wolves only admit routine contact howls as explicit pack sessions", () => {
  const wolf = { id: "wolf", speciesId: "ridge-hunter-updated", lifeStage: "adult" };
  assert.equal(evaluateVocalCadence(wolf, { kind: "contact", urgency: 32 }, { tick: 1, roll: 0 }).allow, false);
  assert.equal(evaluateVocalCadence(wolf, { kind: "contact", urgency: 32, packHowlSession: true, sessionId: "pack:1:dawn", howlRole: "initiator" }, { tick: 2, roll: 0 }).allow, true);
  assert.equal(evaluateVocalCadence(wolf, { kind: "contact", urgency: 32, packHowlSession: true, sessionId: "pack:1:dawn", howlRole: "initiator" }, { tick: 3, roll: 0 }).allow, false);
});

test("wolf pack opportunities are sparse and seasonally increased", () => {
  assert.equal(wolfPackHowlWindow(60, "Summer"), null);
  assert.equal(wolfPackHowlWindow(360, "Summer").id, "dawn");
  assert.equal(wolfPackHowlWindow(1080, "Summer").id, "dusk");
  assert.equal(wolfPackHowlWindow(780, "Summer"), null);
  assert.equal(wolfPackHowlWindow(780, "Winter").id, "winter-spacing");
});

test("individual traits produce stable bounded call ranges", () => {
  const bold = { id: "bold", speciesId: "ridge-hunter-updated", lifeStage: "adult", aggression: .95, careAffinity: .3 };
  const calm = { id: "calm", speciesId: "ridge-hunter-updated", lifeStage: "adult", aggression: .1, careAffinity: .3 };
  const boldCall = evaluateVocalCadence(bold, { kind: "attacked", urgency: 100 }, { tick: 1, roll: 0 });
  const calmCall = evaluateVocalCadence(calm, { kind: "attacked", urgency: 100 }, { tick: 1, roll: 0 });
  assert.ok(boldCall.probability > calmCall.probability);
  assert.deepEqual(vocalTraitProfile(bold), vocalTraitProfile({ ...bold }));
});

test("listeners respond differently to calls according to relationship and trait matching", () => {
  const sender = { id: "S", groupId: "pack", aggression: .8, careAffinity: .7 };
  const bonded = { id: "B", groupId: "pack", aggression: .75, careAffinity: .8, socialMemory: { S: { affinity: .8 } } };
  const stranger = { id: "X", groupId: "other", aggression: .1, careAffinity: .1, socialMemory: {} };
  assert.ok(socialCueCompatibility(sender, bonded, "contact").score > socialCueCompatibility(sender, stranger, "contact").score);
  assert.ok(socialCueCompatibility(sender, stranger, "alarm").score >= .68);
});

test("a deer alarm is considered once per continuous danger encounter", () => {
  const animal = deer(), signal = { kind: "alarm", urgency: 95, predatorId: "W" };
  assert.equal(evaluateVocalCadence(animal, signal, { tick: 1, roll: 0 }).allow, true);
  assert.equal(evaluateVocalCadence(animal, signal, { tick: 40, roll: 0 }).allow, false);
});

test("sustained quiet releases the previous alarm encounter", () => {
  const animal = deer(), signal = { kind: "alarm", urgency: 95, predatorId: "W" };
  evaluateVocalCadence(animal, signal, { tick: 1, roll: 0 });
  releaseVocalEpisode(animal, 2); releaseVocalEpisode(animal, 10);
  animal.vocalCooldownUntil = 0;
  assert.equal(evaluateVocalCadence(animal, signal, { tick: 11, roll: 0 }).allow, true);
});

test("courtship calls require an active reproductive interaction", () => {
  assert.equal(evaluateVocalCadence(deer(), { kind: "courtship" }, { tick: 20, roll: 0 }).allow, false);
  assert.equal(evaluateVocalCadence(deer({ rutContest: { phase: "roar-assessment", rivalId: "R" } }), { kind: "courtship", targetId: "R" }, { tick: 20, roll: 0 }).allow, true);
});

test("dependent contact calls are bouts separated by a long interval", () => {
  const fawn = deer({ lifeStage: "dependent" }), signal = { kind: "care", caregiverVisible: false };
  const first = evaluateVocalCadence(fawn, signal, { tick: 1, roll: 0 });
  assert.equal(first.allow, true); assert.ok(first.cooldownTicks >= 18);
  fawn.vocalCooldownUntil = 19;
  assert.equal(evaluateVocalCadence(fawn, signal, { tick: 2, roll: 0 }).allow, false);
});
