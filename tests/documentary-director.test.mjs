import test from "node:test";
import assert from "node:assert/strict";
import { DOCUMENTARY_TEMPLATES, chooseDocumentaryTransition, documentaryBeatSequence, documentaryShotDuration, editingPenalty, evaluateDocumentaryShotHealth, generateDocumentaryCandidates, resolveDocumentaryContext, selectDocumentaryCandidate } from "../src/documentary-director.js";

test("ecological activity resolves into documentary contexts", () => {
  assert.equal(resolveDocumentaryContext({ actionKey: "chasing prey" }), "predation");
  assert.equal(resolveDocumentaryContext({ actionKey: "allow-nursing" }), "care");
  assert.equal(resolveDocumentaryContext({ actionKey: "drinking" }), "water");
  assert.equal(resolveDocumentaryContext({ kind: "landscape" }), "quiet-landscape");
  assert.equal(resolveDocumentaryContext({ actionKey: "travelling", subjectCount: 8, speed: .2 }), "group-travel");
});

test("shot templates cover every requested film technique", () => {
  assert.deepEqual(new Set(DOCUMENTARY_TEMPLATES.map(template => template.family)), new Set(["establishing", "still", "tracking", "intercept", "sweep", "orbit", "push-in", "pull-out", "aerial"]));
  assert.ok(DOCUMENTARY_TEMPLATES.every(template => template.minDuration < template.maxDuration && template.minimumFraction > 0));
});

test("documentary rhythm uses context beats and authored shot timing", () => {
  assert.deepEqual(documentaryBeatSequence("flight", .2), ["action", "reaction", "develop", "release"]);
  assert.deepEqual(documentaryBeatSequence("quiet-landscape", .2), ["establish", "develop", "detail", "release"]);
  const detail = DOCUMENTARY_TEMPLATES.find(template => template.id === "detail-push"), aerial = DOCUMENTARY_TEMPLATES.find(template => template.id === "aerial-drift");
  assert.ok(documentaryShotDuration(detail, { pacing: "balanced", context: "predation", beat: "reaction", noise: .5 }) < documentaryShotDuration(aerial, { pacing: "balanced", context: "quiet-landscape", beat: "establish", noise: .5 }));
  assert.ok(documentaryShotDuration(aerial, { pacing: "relaxed", context: "quiet-landscape", beat: "establish", noise: .5 }) > documentaryShotDuration(aerial, { pacing: "lively", context: "quiet-landscape", beat: "establish", noise: .5 }));
});

test("candidate generation produces variants and hard rejects invalid cameras", () => {
  const story = { context: "group-travel", focus: { x: 0, y: 1, z: 0 }, heading: 0, speed: .2, subjectCount: 4, importance: 20 };
  const all = generateDocumentaryCandidates(story, { worldHalf: 80, noise: () => .5, validate: () => ({ valid: true, composition: .8, visibility: 1, landscape: .6, risk: 0 }) });
  assert.ok(all.length >= 16); assert.ok(new Set(all.map(candidate => candidate.side)).size > 1); assert.ok(new Set(all.map(candidate => candidate.scale)).size > 1);
  const rejected = generateDocumentaryCandidates(story, { worldHalf: 80, validate: () => ({ valid: false, reason: "occluded" }) }); assert.equal(rejected.length, 0);
});

test("composition quality wins while history prevents repetitive editing", () => {
  const story = { context: "water", focus: { x: 0, y: 1, z: 0 }, heading: 0, speed: .1, subjectCount: 3, importance: 10 };
  const candidates = generateDocumentaryCandidates(story, { worldHalf: 80, noise: () => 0, history: [{ family: "still", side: -1, scale: "medium", heading: 0 }], validate: candidate => ({ valid: true, composition: candidate.family === "orbit" ? .95 : .55, visibility: 1, landscape: .5, risk: 0 }) });
  assert.equal(selectDocumentaryCandidate(candidates, .01), candidates[0]); assert.ok(editingPenalty({ family: "still", side: -1, scale: "medium", heading: 0 }, [{ family: "still", side: -1, scale: "medium", heading: 0 }]) > 20);
});

test("the editor phases region changes, travels moderate distance and blends related rigs", () => {
  const previous = { family: "still", target: { x: -30, z: -30 }, heading: 0, subjectKey: "a", context: "foraging" }, distant = { family: "tracking", target: { x: 30, z: 30 }, heading: 1, subjectKey: "b", context: "flight" }, travelling = { family: "tracking", target: { x: -14, z: -14 }, heading: .4, subjectKey: "b", context: "group-travel" }, related = { family: "still", target: { x: -27, z: -28 }, heading: .1, subjectKey: "a", context: "foraging" };
  assert.equal(chooseDocumentaryTransition(null, related, 90).type, "dip"); assert.equal(chooseDocumentaryTransition(previous, distant, 90).type, "dip"); assert.equal(chooseDocumentaryTransition(previous, travelling, 90).type, "travel"); assert.equal(chooseDocumentaryTransition(previous, related, 90).type, "blend");
});

test("shot health tolerates a brief obstruction but terminates sustained failure", () => {
  assert.equal(evaluateDocumentaryShotHealth({ elapsed: 1, duration: 10, subjectsRequired: true, subjectsAlive: 2, occlusionSeconds: .3 }).end, false);
  assert.deepEqual(evaluateDocumentaryShotHealth({ elapsed: 2, duration: 10, subjectsRequired: true, subjectsAlive: 2, occlusionSeconds: 1 }), { end: true, hard: true, reason: "sustained-occlusion" });
  assert.equal(evaluateDocumentaryShotHealth({ elapsed: 5, minimumDuration: 2, duration: 10, subjectsAlive: 2, contextStillValid: false }).reason, "context-changed");
  assert.equal(evaluateDocumentaryShotHealth({ elapsed: 10, duration: 10, subjectsAlive: 2 }).reason, "planned-duration");
});
