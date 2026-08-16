import test from "node:test";
import assert from "node:assert/strict";
import { DEER_DYNAMIC_MOTIFS, deerAnimationDynamics, deerDynamicPose, selectDeerAnimationMotif } from "../src/deer-dynamic-animation.js";

const deer = (extra = {}) => ({ id: "stag-a", speciesId: "valley-grazer-updated", sex: "M", lifeStage: "adult", aggression: .6, careAffinity: .55, fear: 10, fatigue: 10, injuries: [], ...extra });

test("deer grammar provides broad ordinary social care flight and rut coverage", () => {
  assert.ok(DEER_DYNAMIC_MOTIFS.length >= 40);
  for (const family of ["idle", "vigilance", "feeding", "locomotion", "flight", "rest", "care", "rut-display", "rut-contact", "defence", "courtship"]) assert.ok(DEER_DYNAMIC_MOTIFS.some(entry => entry.family === family));
});

test("individual deer dynamics are deterministic and trait-sensitive selection stays bounded", () => {
  assert.deepEqual(deerAnimationDynamics(deer()), deerAnimationDynamics(deer()));
  const aggressive = deer({ id: "aggressive", aggression: 1 }), cautious = deer({ id: "cautious", aggression: .05 });
  const first = deerDynamicPose(aggressive, { actionKey: "spar", wallTimeMs: 4000 }), second = deerDynamicPose(cautious, { actionKey: "spar", wallTimeMs: 4000 });
  assert.equal(first.active, true); assert.equal(second.active, true);
  for (const pose of [first, second]) for (const channel of [pose.body, pose.head, pose.tail]) for (const value of Object.values(channel)) assert.ok(value >= -.28 && value <= .28);
});

test("motif history discourages immediate repetition and original founder remains excluded", () => {
  const animal = deer(), first = selectDeerAnimationMotif(animal, { actionKey: "idle", wallTimeMs: 1000, recentMotifs: [] });
  const replacement = selectDeerAnimationMotif(animal, { actionKey: "idle", wallTimeMs: 1000, recentMotifs: [first.id] });
  assert.notEqual(first.id, replacement.id);
  assert.equal(deerDynamicPose({ ...animal, speciesId: "grazer" }, { actionKey: "idle", wallTimeMs: 1000 }).active, false);
});
