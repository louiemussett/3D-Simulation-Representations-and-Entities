import test from "node:test";
import assert from "node:assert/strict";
import { PREDICTION_ABSTENTIONS, PREDICTION_AUTHORITIES, PREDICTION_FRAMEWORKS } from "../src/prediction-contract.js";
import {
  PREDICTION_ABSTENTION_GUIDE,
  PREDICTION_AUTHORITY_GUIDE,
  PREDICTION_FRAMEWORK_GUIDE,
  PREDICTION_MODE_GUIDE,
  PREDICTIVE_FIELD_GUIDE,
  PREDICTIVE_GATE_GUIDE,
  PREDICTIVE_MODEL_NAMES,
  PREDICTIVE_MODEL_PURPOSES,
  predictiveModeExplanation,
  predictiveModelName,
  predictiveModelPurpose,
  predictiveWords
} from "../src/predictive-language.js";

test("readable prediction language covers every versioned contract enum", () => {
  assert.deepEqual(Object.keys(PREDICTION_FRAMEWORK_GUIDE), PREDICTION_FRAMEWORKS);
  assert.deepEqual(Object.keys(PREDICTION_AUTHORITY_GUIDE), PREDICTION_AUTHORITIES);
  assert.deepEqual(Object.keys(PREDICTION_ABSTENTION_GUIDE), PREDICTION_ABSTENTIONS);
  assert.deepEqual(Object.keys(PREDICTION_MODE_GUIDE), ["LEGACY", "PREDICTIVE_SHADOW", "PREDICTIVE_ACTIVE"]);
  for (const guide of [PREDICTION_FRAMEWORK_GUIDE, PREDICTION_AUTHORITY_GUIDE, PREDICTION_ABSTENTION_GUIDE, PREDICTION_MODE_GUIDE]) {
    assert.ok(Object.isFrozen(guide));
    for (const explanation of Object.values(guide)) assert.ok(explanation.length >= 45, explanation);
  }
});

test("animal process names and purposes are complete and user-facing", () => {
  assert.deepEqual(Object.keys(PREDICTIVE_MODEL_NAMES), Object.keys(PREDICTIVE_MODEL_PURPOSES));
  assert.deepEqual(Object.keys(PREDICTIVE_MODEL_NAMES), ["body-state.v1", "resource-water.v1", "motion.v1", "threat-state.v1", "action-forward.v1"]);
  for (const modelId of Object.keys(PREDICTIVE_MODEL_NAMES)) {
    assert.equal(predictiveModelName(modelId), PREDICTIVE_MODEL_NAMES[modelId]);
    assert.equal(predictiveModelPurpose(modelId), PREDICTIVE_MODEL_PURPOSES[modelId]);
    assert.doesNotMatch(predictiveModelName(modelId), /\.v\d|[-_]/i);
  }
});

test("presentation helpers humanise unknown keys without hiding explicit uncertainty", () => {
  assert.equal(predictiveWords("HIDDEN_STATE_BAYESIAN"), "HIDDEN STATE BAYESIAN");
  assert.equal(predictiveModelName("camera.subject-trajectory.v1"), "Camera Subject Trajectory");
  assert.match(predictiveModelPurpose("future-model.v2"), /bounded forecast/i);
  assert.equal(predictiveModeExplanation("LEGACY"), PREDICTION_MODE_GUIDE.LEGACY);
  assert.match(predictiveModeExplanation("NOT_READY"), /not produced a current predictive state/i);
});

test("field and emergency-gate language explains every value exposed by the readable tables", () => {
  for (const field of ["threatBaseRate", "waterPersistence", "motionPersistence", "threatEvidenceWeight", "motionScale", "actionCostScale", "body", "resource", "motion", "threat", "action", "selector"]) assert.ok(PREDICTIVE_FIELD_GUIDE[field]?.length > 20, field);
  for (const gate of ["survivalNeed", "currentCompatiblePrey", "health", "hydration", "travel", "burst", "metabolicJourney", "interception"]) assert.ok(PREDICTIVE_GATE_GUIDE[gate]?.length > 20, gate);
});
