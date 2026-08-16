import test from "node:test";
import assert from "node:assert/strict";
import { createPredictionContract } from "../src/prediction-contract.js";

const base = { predictionId: "p1", owner: { kind: "ANIMAL", id: "A" }, framework: "DYNAMICAL", target: "BODY", horizon: { earliestTick: 2, latestTick: 4 }, confidence: .7 };

test("prediction contracts are immutable, versioned, and serializable", () => {
  const value = createPredictionContract(base); assert.equal(value.schemaVersion, 1); assert.equal(Object.isFrozen(value), true); assert.doesNotThrow(() => JSON.stringify(value));
});

test("unregistered processes cannot acquire veto authority", () => {
  assert.throws(() => createPredictionContract({ ...base, authority: "VETO" }), /registered safety/);
  assert.equal(createPredictionContract({ ...base, authority: "VETO", safetyRegistered: true }).authority, "VETO");
});

test("contracts reject unknown frameworks and invalid horizons", () => {
  assert.throws(() => createPredictionContract({ ...base, framework: "MAGIC" }), /unsupported/);
  assert.throws(() => createPredictionContract({ ...base, horizon: { earliestTick: 5, latestTick: 2 } }), /horizon/);
});
