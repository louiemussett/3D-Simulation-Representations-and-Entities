import test from "node:test";
import assert from "node:assert/strict";
import { CINEMA_THREAD_PHRASE_LIBRARY, CINEMA_THREAD_TEMPOS, cinemaThreadChanged, cinemaThreadNarration, cinemaThreadTempo, composeCinemaThreadFragments } from "../src/cinema-thread-language.js";

test("fast predation receives flash wording and interruptible timing", () => {
  const scene = { chainId: "predation:RH1:VG1", chainSignature: "pursuit", interactionKind: "predation", interactionPhase: "pursuit", chainStage: "hunter-progress", title: "Ridge Hunter RH1 follows the opportunity" };
  assert.equal(cinemaThreadTempo(scene), "flash");
  const narration = cinemaThreadNarration(scene, "A much longer fallback explanation that would outlast the chase.", { variant: 0 });
  assert.equal(narration.text, "Pursuit.");
  assert.equal(narration.realisation, "atom");
  assert.equal(narration.interruptible, true);
  assert.ok(narration.maximumHoldSeconds <= 2.2);
  assert.ok(narration.maximumWords <= 6);
});

test("one predation fact can be realised as an atom, pulse or complete sentence", () => {
  const scene = { chainId: "predation:RH1:VG1", interactionKind: "predation", interactionPhase: "pursuit", chainStage: "hunter-progress" };
  const atom = cinemaThreadNarration(scene, "fallback", { variant: 0 });
  const pulse = cinemaThreadNarration(scene, "fallback", { variant: 1 });
  const sentence = cinemaThreadNarration(scene, "fallback", { variant: 2 });
  assert.deepEqual([atom.realisation, pulse.realisation, sentence.realisation], ["atom", "pulse", "single"]);
  assert.equal(pulse.segments.length, 2);
  assert.match(pulse.text, /\. .+\.$/);
  assert.equal(sentence.text, "The chase is on.");
});

test("independently licensed fragments can become pulses or one linked clause", () => {
  assert.deepEqual(composeCinemaThreadFragments(["Scent confirmed", "the hunter closes"], { mode: "pulse" }), {
    text: "Scent confirmed. The hunter closes.",
    segments: ["Scent confirmed.", "The hunter closes."]
  });
  assert.deepEqual(composeCinemaThreadFragments(["Scent confirmed", "the hunter closes"], { mode: "linked" }), {
    text: "Scent confirmed; the hunter closes.",
    segments: ["Scent confirmed; the hunter closes."]
  });
});

test("phrase library covers the time-sensitive interaction families", () => {
  assert.ok(CINEMA_THREAD_PHRASE_LIBRARY.predation.contact.atoms.length >= 3);
  assert.ok(CINEMA_THREAD_PHRASE_LIBRARY.reproduction.mating.links.length);
  assert.ok(CINEMA_THREAD_PHRASE_LIBRARY.pregnancy.labour.atoms.length);
  assert.ok(CINEMA_THREAD_PHRASE_LIBRARY.caregiving.nursing.sentences.length);
});

test("slower reproductive and care states receive longer tempo bands", () => {
  assert.equal(cinemaThreadTempo({ chainStage: "maternal-state", interactionKind: "pregnancy", interactionPhase: "mid pregnancy" }), "developing");
  assert.equal(cinemaThreadTempo({ chainStage: "family-exchange", interactionKind: "caregiving", interactionPhase: "nursing" }), "active");
  assert.ok(CINEMA_THREAD_TEMPOS.developing.maximumWords > CINEMA_THREAD_TEMPOS.flash.maximumWords);
});

test("phase change and disappearance flag an urgent predation interruption", () => {
  const previous = { chainId: "predation:RH1:VG1", chainSignature: "evidence", interactionKind: "predation" };
  assert.deepEqual(cinemaThreadChanged(previous, { signature: "pursuit", kind: "predation", phase: "pursuit" }), { changed: true, urgent: true, reason: "thread-pursuit-changed" });
  assert.equal(cinemaThreadChanged(previous, null).urgent, true);
});

test("labour also interrupts a slower thread immediately", () => {
  const previous = { chainId: "pregnancy:VG1", chainSignature: "mid", interactionKind: "pregnancy", interactionPhase: "mid pregnancy" };
  const current = { signature: "labour", kind: "pregnancy", phase: "labour", scenes: [{ chainStage: "maternal-state" }] };
  assert.deepEqual(cinemaThreadChanged(previous, current), { changed: true, urgent: true, reason: "thread-labour-changed" });
});

test("contract-bound thread narration shortens only the validated wording", () => {
  const scene = { chainId: "predation:RH1:VG1", interactionKind: "predation", interactionPhase: "pursuit", chainStage: "hunter-progress", title: "Unlicensed editorial title" };
  const narration = cinemaThreadNarration(scene, "Validated pursuit wording.", { variant: 2, contractBound: true });
  assert.equal(narration.text, "Validated pursuit wording.");
});
