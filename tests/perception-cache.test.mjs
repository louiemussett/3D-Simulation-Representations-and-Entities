import test from "node:test";
import assert from "node:assert/strict";
import { PerceptionResultCache, perceptionPoseSignature } from "../src/perception-cache.js";

test("unchanged perception pose reuses cached line-of-sight results", () => {
  const cache = new PerceptionResultCache(4), signature = perceptionPoseSignature({ x: 1, z: 2, orientation: .5, headYaw: 0, sensoryFocusTicks: 2 }, { range: 8, terrainVersion: 3, vegetationVersion: 4, season: "Spring", ecologicalHour: 10 });
  cache.prepare(signature); cache.set(7, { visible: true, confidence: .8 });
  assert.deepEqual(cache.get(7), { visible: true, confidence: .8 });
  assert.equal(cache.hits, 1);
});

test("movement focus and landscape changes invalidate perception results", () => {
  const animal = { x: 1, z: 2, orientation: .5, headYaw: 0, sensoryFocusTicks: 2 }, context = { range: 8, terrainVersion: 3, vegetationVersion: 4, season: "Spring", ecologicalHour: 10 };
  const base = perceptionPoseSignature(animal, context);
  assert.notEqual(perceptionPoseSignature({ ...animal, x: 2 }, context), base);
  assert.notEqual(perceptionPoseSignature({ ...animal, headYaw: .1 }, context), base);
  assert.notEqual(perceptionPoseSignature(animal, { ...context, vegetationVersion: 5 }), base);
  assert.notEqual(perceptionPoseSignature(animal, { ...context, ecologicalHour: 11 }), base);
});

test("perception cache stays bounded", () => {
  const cache = new PerceptionResultCache(2); cache.prepare("pose");
  cache.set(1, "a"); cache.set(2, "b"); cache.set(3, "c");
  assert.equal(cache.results.size, 2); assert.equal(cache.get(1), null); assert.equal(cache.get(3), "c");
});
