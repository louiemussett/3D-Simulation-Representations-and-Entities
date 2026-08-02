import test from "node:test";
import assert from "node:assert/strict";
import { observableBodyCues, visibleInjuryCue } from "../src/observable-body-cues.js";

test("observable injury cues are coarse and contain no exact health or injury record", () => {
  const cues = observableBodyCues({ health: 52, injuries: [{ type: "bite", severity: .62, sourceId: "hunter" }], actionState: { moving: true } });
  assert.equal(cues.injury, "obvious-injury"); assert.equal(cues.gait, "limp");
  assert.equal("health" in cues, false); assert.equal("injuries" in cues, false); assert.equal("sourceId" in cues, false);
});

test("visible injury classification distinguishes hidden health loss from severe impairment", () => {
  assert.equal(visibleInjuryCue({ health: 94, injuries: [] }), "none");
  assert.equal(visibleInjuryCue({ health: 78, injuries: [] }), "minor-injury");
  assert.equal(visibleInjuryCue({ health: 28, injuries: [{ severity: .8 }] }), "severe-impairment");
});

test("sight receives visible expression and only a currently emitted signal", () => {
  const animal = { health: 100, thermalStatus: "cold", energy: 0, socialSignal: { kind: "cold", until: 8 }, actionState: { moving: false } };
  const current = observableBodyCues(animal, 7), expired = observableBodyCues(animal, 8);
  assert.equal(current.expression, "cold"); assert.equal(current.emittedSignal, "cold");
  assert.equal(expired.emittedSignal, null); assert.equal("energy" in current, false);
});

test("pregnancy becomes a social cue only when outwardly apparent", () => {
  const base = { sex: "F", health: 100, actionState: { moving: false }, pregnant: { age: 1 } };
  assert.equal(observableBodyCues({ ...base, pregnancyHormones: { phase: "early pregnancy" } }).reproductiveCondition, null);
  assert.equal(observableBodyCues({ ...base, pregnancyHormones: { phase: "late pregnancy" } }).reproductiveCondition, "visibly-pregnant");
  assert.equal(observableBodyCues({ ...base, pregnancyHormones: { phase: "pre-labour" } }).reproductiveCondition, "visibly-pregnant");
});
