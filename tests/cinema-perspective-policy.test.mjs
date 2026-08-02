import test from "node:test";
import assert from "node:assert/strict";
import { adaptiveCinemaLens, adaptiveCinemaPerspective, adaptiveCinemaPerspectivePlan, cinemaWideContext, preferredPerspectiveCandidates } from "../src/cinema-perspective-policy.js";

test("adaptive Cinema opens a meta-group through wide medium and close perspectives", () => {
  const plan = adaptiveCinemaPerspectivePlan({ kind: "meta-group" }, ["establish", "develop", "detail"], { sequence: 0 });
  assert.deepEqual(plan, ["wide", "medium", "close"]);
});

test("interaction stages receive editorially meaningful perspectives", () => {
  assert.equal(adaptiveCinemaPerspective({ scene: { chainStage: "distance-overview" } }), "wide");
  assert.equal(adaptiveCinemaPerspective({ scene: { chainStage: "hunter-progress" } }), "medium");
  assert.equal(adaptiveCinemaPerspective({ scene: { chainStage: "prey-condition" } }), "close");
});

test("shot history alone never forces wide context", () => {
  assert.equal(adaptiveCinemaPerspective({ scene: { kind: "activity", ids: ["A"] }, beat: "action", sequence: 80, recentScales: Array(20).fill("close") }), "medium");
});

test("wide context is requested by spatial story evidence", () => {
  const group = { kind: "group", ids: ["A", "B", "C", "D"], subjectCount: 4, radius: 9 };
  assert.deepEqual(cinemaWideContext(group, "establish", 12), { requested: true, reason: "dispersed-multi-subject-context" });
  assert.equal(adaptiveCinemaPerspective({ scene: group, beat: "establish", sequence: 12 }), "wide");
  assert.equal(adaptiveCinemaPerspective({ scene: group, beat: "reaction", sequence: 13 }), "close");
});

test("adaptive information begins clean and reveals detail by distance", () => {
  const directed = { thoughts: true, physiology: true, vision: true, decisions: true };
  assert.deepEqual(adaptiveCinemaLens({ directed, scale: "wide" }), {});
  assert.deepEqual(adaptiveCinemaLens({ directed, scale: "medium" }), { expressions: true, calls: true, actions: true, identity: true });
  const close = adaptiveCinemaLens({ directed, scale: "close", beat: "detail" });
  assert.equal(close.physiology, true);
  assert.equal(close.thoughts, true);
});

test("candidate preference preserves safe fallbacks when a scale is unavailable", () => {
  const candidates = [{ id: "w", scale: "wide" }, { id: "m", scale: "medium" }];
  assert.deepEqual(preferredPerspectiveCandidates(candidates, "medium").map(item => item.id), ["m"]);
  assert.equal(preferredPerspectiveCandidates(candidates, "close"), candidates);
});
