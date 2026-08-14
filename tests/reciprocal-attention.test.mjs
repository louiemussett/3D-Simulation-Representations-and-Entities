import test from "node:test";
import assert from "node:assert/strict";
import { chooseStalkingAction, estimatePredatorExposure, preyTargetingEstimate, stalkingReroutePoint, validateReciprocalAttentionInput } from "../src/reciprocal-attention.js";

const hunter = () => ({ id: "H", x: 0, z: 0, movementNoise: .02 });
const observedPrey = (heading = Math.PI) => ({ targetId: "P", x: 8, z: 0, heading, headHeading: heading, confidence: .85, motionConfidence: .7, bodyCues: { headMovement: "forward" } });

test("predators estimate exposure from visible prey evidence", () => {
  const facing = estimatePredatorExposure(hunter(), observedPrey(Math.PI), { observedGroupSize: 1 }), away = estimatePredatorExposure(hunter(), observedPrey(0), { observedGroupSize: 1 });
  assert.ok(facing.probability > away.probability); assert.equal(facing.informationBoundary, "normalized-observation-only");
});

test("prey targeting remains an observer-owned estimate", () => {
  const estimate = preyTargetingEstimate({ predatorId: "H", selfTargetLikelihood: .72, attackImminence: .6, confidence: .55, level: "high" });
  assert.equal(estimate.predatorId, "H"); assert.equal(estimate.probability, .72); assert.equal(estimate.informationBoundary, "observer-inference-only");
});

test("stalking selects move freeze and reroute without indefinite freezing", () => {
  const animal = hunter();
  assert.equal(chooseStalkingAction(animal, { probability: .2, confidence: .8 }, { tick: 1, distance: 12, chaseRange: 6, targetId: "P" }).phase, "move");
  assert.equal(chooseStalkingAction(animal, { probability: .9, confidence: .8 }, { tick: 2, distance: 12, chaseRange: 6, targetId: "P" }).phase, "freeze");
  chooseStalkingAction(animal, { probability: .9, confidence: .8 }, { tick: 3, distance: 12, chaseRange: 6, targetId: "P" });
  assert.equal(chooseStalkingAction(animal, { probability: .9, confidence: .8 }, { tick: 4, distance: 12, chaseRange: 6, targetId: "P" }).phase, "reroute");
});

test("reroute points derive only from hunter and observed prey positions", () => {
  const left = stalkingReroutePoint(hunter(), observedPrey(), -1), right = stalkingReroutePoint(hunter(), observedPrey(), 1);
  assert.equal(left.x, right.x); assert.equal(left.z, -right.z); assert.equal(left.source, "observation-derived-stalking-reroute");
});

test("authoritative sensor and decision geometry is rejected at the boundary", () => {
  assert.equal(validateReciprocalAttentionInput(observedPrey()).valid, true);
  const invalid = validateReciprocalAttentionInput({ ...observedPrey(), sensorAnchors: [], privateTargetId: "H" });
  assert.equal(invalid.valid, false); assert.deepEqual(invalid.forbiddenPresent, ["sensorAnchors", "privateTargetId"]);
  assert.throws(() => estimatePredatorExposure(hunter(), { ...observedPrey(), visionCone: {} }), /observations only/);
});
