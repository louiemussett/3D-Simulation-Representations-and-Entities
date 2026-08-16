import test from "node:test";
import assert from "node:assert/strict";
import { DYNAMIC_INTERACTION_ACTIONS, dynamicAnimationIdentity, dynamicInteractionPose, interactionAnimationFamily, pairedInteractionRole } from "../src/dynamic-interaction-animation.js";

test("all-species animation identities are deterministic and provide broad variation", () => {
  const variants = new Set();
  for (let index = 0; index < 64; index += 1) {
    const animal = { id: `animal-${index}`, speciesId: `species-${index % 28}` }, first = dynamicAnimationIdentity(animal), second = dynamicAnimationIdentity({ ...animal });
    assert.deepEqual(first, second); variants.add(first.variant);
  }
  assert.ok(variants.size >= 20);
});

test("paired roles are complementary and independent of evaluation order", () => {
  const left = { id: "A", speciesId: "one" }, right = { id: "B", speciesId: "two" };
  const a = pairedInteractionRole(left, right, "spar"), b = pairedInteractionRole(right, left, "spar");
  assert.equal(a.pairKey, b.pairKey); assert.equal(a.side, -b.side); assert.notEqual(a.phaseOffset, b.phaseOffset);
});

test("generic interaction poses remain bounded for arbitrary species", () => {
  const actor = { id: "actor", speciesId: "unknown-future-species", aggression: .9, careAffinity: .4, fear: 12, fatigue: 20 }, partner = { id: "partner", speciesId: "another" };
  for (const actionKey of DYNAMIC_INTERACTION_ACTIONS) {
    assert.ok(interactionAnimationFamily(actionKey));
    const pose = dynamicInteractionPose(actor, { actionKey, partner, wallTimeMs: 12345, separation: .6, contactSpan: .7 });
    assert.equal(pose.active, true);
    for (const channel of [pose.body, pose.head, pose.tail]) for (const value of Object.values(channel)) assert.ok(value >= -.3 && value <= .3);
  }
  assert.equal(dynamicInteractionPose(actor, { actionKey: "travel" }).active, false);
});
