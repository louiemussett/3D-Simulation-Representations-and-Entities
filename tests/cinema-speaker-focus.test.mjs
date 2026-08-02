import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { cinemaNarrationHighlightSubjectIds, cinemaObservableFocusStatus, cinemaObservableSpeakerCues, cinemaPanelAuthority } from "../src/cinema-speaker-focus.js";

test("Cinema panel authority honours the first present source, including an explicit world shot", () => {
  assert.deepEqual(cinemaPanelAuthority({ acssContract: { camera: { primarySubjects: [] } }, authorCameraIntention: { primarySubjects: ["A"] }, semanticRoleIds: ["B"], ids: ["C"] }), { source: "acss-camera", subjectIds: [] });
  assert.deepEqual(cinemaPanelAuthority({ authorCameraIntention: { primarySubjects: ["A", "A"] }, semanticRoleIds: ["B"], ids: ["C"] }), { source: "author-camera", subjectIds: ["A"] });
  assert.deepEqual(cinemaPanelAuthority({ semanticRoleIds: [], ids: ["C"] }), { source: "semantic-roles", subjectIds: [] });
  assert.deepEqual(cinemaPanelAuthority({ ids: ["C", "C"] }), { source: "scene-subjects", subjectIds: ["C"] });
  assert.deepEqual(cinemaPanelAuthority({}), { source: "none", subjectIds: [] });
});

test("Cinema speaker cues use the canonical visible face and only a current public signal", () => {
  const animal = { id: "A", health: 100, fear: 92, socialSignal: { kind: "alarm", urgency: 88, sourceId: "A", targetId: "H1", since: 5, until: 20 }, vocalUntil: 14 };
  const current = cinemaObservableSpeakerCues(animal, 12);
  assert.equal(current.expression.kind, "panic");
  assert.deepEqual(current.call, { kind: "alarm", urgency: 88, targetId: "H1", inferredTargetId: null, vocal: true, observable: true });
  assert.equal(current.privateThought, null);
  assert.equal(cinemaObservableSpeakerCues(animal, 20).call, null);
  const expiredAlarm = cinemaObservableSpeakerCues({ health: 100, socialSignal: { kind: "alarm", until: 20 } }, 20);
  assert.equal(expiredAlarm.expression.kind, "calm");
  assert.equal(expiredAlarm.call, null);
});

test("an evidence-bounded speaker focus narrows a multi-animal narration highlight", () => {
  const ids = cinemaNarrationHighlightSubjectIds({ speakerFocus: { subjectId: "B", basis: "OBSERVABLE_CALL", call: { kind: "contact", observable: true }, privateThought: null }, narrationSubjectIds: ["A", "B", "C"], contractSubjectIds: ["A", "B", "C"], sceneSubjectIds: ["A", "B", "C"] });
  assert.deepEqual(ids, ["B"]);
});

test("missing, unlicensed, or private-only focus safely retains legacy subject highlighting", () => {
  const fallback = { narrationSubjectIds: ["A", "B", "A"], contractSubjectIds: ["A", "B"], sceneSubjectIds: ["A", "B", "C"] };
  assert.deepEqual(cinemaNarrationHighlightSubjectIds(fallback), ["A", "B"]);
  assert.deepEqual(cinemaNarrationHighlightSubjectIds({ ...fallback, speakerFocus: { subjectId: "C", basis: "OBSERVABLE_CALL", call: { observable: true } } }), ["A", "B"]);
  assert.deepEqual(cinemaNarrationHighlightSubjectIds({ ...fallback, speakerFocus: { subjectId: "B", basis: "PRIVATE_THOUGHT", expression: { observable: false } } }), ["A", "B"]);
});

test("Cinema focus status separates current vocal, current non-vocal, and expired calls", () => {
  const speakerFocus = { subjectId: "A", basis: "OBSERVABLE_CALL", call: { kind: "alarm", urgency: 88, observable: true }, expression: { kind: "panic", observable: true }, privateThought: null };
  const live = cinemaObservableFocusStatus({ speakerFocus, highlightSubjectIds: ["A"], activeNarrationSubjectIds: ["A"], currentCues: { call: { kind: "alarm", urgency: 88, vocal: true, observable: true }, expression: { kind: "panic", observable: true } } });
  assert.equal(live.evidenceBoundedFocus, true);
  assert.equal(live.playbackState, "ACTIVE");
  assert.equal(live.callState, "CURRENT_VOCAL");
  assert.equal(live.expressionState, "CURRENT");

  const nonVocal = cinemaObservableFocusStatus({ speakerFocus, highlightSubjectIds: ["A"], currentCues: { call: { kind: "alarm", urgency: 88, vocal: false, observable: true }, expression: { kind: "calm", observable: true } } });
  assert.equal(nonVocal.callState, "CURRENT_NONVOCAL");
  assert.equal(nonVocal.expressionState, "CHANGED");

  const expired = cinemaObservableFocusStatus({ speakerFocus, highlightSubjectIds: ["A"], currentCues: { call: null, expression: null } });
  assert.equal(expired.callState, "EXPIRED_OR_CHANGED");
  assert.equal(expired.expressionState, "UNAVAILABLE");

  const replaced = cinemaObservableFocusStatus({ speakerFocus, highlightSubjectIds: ["A"], currentCues: { call: { kind: "alarm", urgency: 20, vocal: true, observable: true }, expression: { kind: "panic", observable: true } } });
  assert.equal(replaced.callState, "EXPIRED_OR_CHANGED");
});

test("Cinema focus status labels safe scene-subject fallback without inventing a speaker", () => {
  const multi = cinemaObservableFocusStatus({ highlightSubjectIds: ["A", "B", "A"], currentCues: null });
  assert.equal(multi.basis, "MULTI_SUBJECT_FALLBACK");
  assert.equal(multi.subjectId, null);
  assert.deepEqual(multi.highlightedSubjectIds, ["A", "B"]);

  const single = cinemaObservableFocusStatus({ highlightSubjectIds: ["A"], currentCues: { call: { kind: "contact", vocal: true, observable: true }, expression: { kind: "alert", observable: true } } });
  assert.equal(single.subjectId, "A");
  assert.equal(single.evidenceBoundedFocus, false);
  assert.equal(single.callState, "CURRENT_UNLICENSED");
  assert.equal(single.expressionState, "CURRENT_UNLICENSED");
});

test("the Cinema application consumes speaker focus and no longer reads stale raw call fields", async () => {
  const source = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
  assert.match(source, /setActiveNarrationSubjects\(narrationHighlightIdsForShot\(\)\)/);
  assert.match(source, /cinemaObservableSpeakerCues\(animal, sim\.tick\)/);
  assert.match(source, /narrationSpeakerFocus: lastContractNarrationResult\?\.speakerFocus \|\| null/);
  assert.match(source, /data-cinema-observable-focus/);
  assert.match(source, /cinemaObservableFocusStatus\(\{ speakerFocus, highlightSubjectIds: plannedIds, activeNarrationSubjectIds: activeIds, currentCues \}\)/);
  assert.match(source, /expired or changed and never presented as live/);
  assert.match(source, /does not infer private thought/);
  assert.doesNotMatch(source, /fact\.expression = animal\?\.expression \|\| animal\?\.emotion/);
  assert.doesNotMatch(source, /fact\.callout = animal\?\.callout \|\| animal\?\.lastCall/);
});
