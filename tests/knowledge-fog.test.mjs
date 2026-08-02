import test from "node:test";
import assert from "node:assert/strict";
import { FOG_STATE, fogKnowledgeState, withinLocalFogReveal } from "../src/knowledge-fog.js";

test("unseen terrain is black unknown fog", () => {
  assert.equal(fogKnowledgeState(), FOG_STATE.UNKNOWN);
});

test("previously seen terrain remains dimly explored", () => {
  assert.equal(fogKnowledgeState({ explored: true }), FOG_STATE.EXPLORED);
});

test("current sight clears fog and does not depend on exploration history", () => {
  assert.equal(fogKnowledgeState({ currentlyVisible: true }), FOG_STATE.CLEAR);
  assert.equal(fogKnowledgeState({ currentlyVisible: true, explored: true }), FOG_STATE.CLEAR);
});

test("only an explicit map reveal clears unknown terrain", () => {
  assert.equal(fogKnowledgeState({ communicatedReveal: true }), FOG_STATE.CLEAR);
  assert.equal(fogKnowledgeState({ explored: false, communicatedReveal: false }), FOG_STATE.UNKNOWN);
});

test("selected animal receives a stable circular local reveal", () => {
  const observer = { x: 10, z: 10 };
  assert.equal(withinLocalFogReveal({ x: 13, z: 14 }, observer, 5), true);
  assert.equal(withinLocalFogReveal({ x: 14, z: 14 }, observer, 5), false);
});
