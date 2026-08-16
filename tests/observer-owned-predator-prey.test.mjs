import test from "node:test";
import assert from "node:assert/strict";
import { estimateObserverMotion, ageMotionObservation } from "../src/perception/motion-estimator.js";
import { validateMotionObservation } from "../src/perception/motion-observation.js";
import { inferPredatorIntent } from "../src/predator-intent-inference.js";
import { createThreatHypothesis } from "../src/perception/threat-hypothesis.js";
import { createPreyHypothesis } from "../src/perception/prey-hypothesis.js";
import { planEscapeFromThreat } from "../src/behaviour/escape-planner.js";
import { planInterceptionRegion } from "../src/behaviour/interception-planner.js";
import { migrateObserverEvidenceState } from "../src/perception/evidence-migration.js";

const observer = { id: "deer", worldSeed: 17, x: 0, z: 0, decisionOrder: 2 };
const target = { id: "wolf", x: 5, z: 1, vx: -.2, vz: 0 };

test("motion estimates are deterministic and not copied from authoritative coordinates", () => {
  const options = { tick: 10, confidence: .68, motionConfidence: .62, velocityConfidence: .5, velocityUncertainty: .12 };
  const first = estimateObserverMotion(observer, target, options), second = estimateObserverMotion(observer, target, options);
  assert.deepEqual(first, second);
  assert.notDeepEqual(first.position.estimate, { x: target.x, z: target.z });
  assert.equal(first.motionState, "possibly-moving");
  assert.equal(first.velocity.estimate, null);
  assert.equal(validateMotionObservation(first).valid, true);
});

test("unknown motion is not converted into stationary or zero velocity", () => {
  const result = inferPredatorIntent({ distance: 5, observationConfidence: .8, motionState: "unknown", velocityConfidence: 0, observablePosture: "stalk", bodyHeading: 0, bearingToObserver: 0 });
  assert.equal(result.motionUnknown, true);
  assert.ok(result.unknownFeatures.includes("closing-speed"));
  assert.ok(result.selfTargetLikelihood > 0);
});

test("successive observations estimate velocity and aging expands uncertainty", () => {
  const first = estimateObserverMotion(observer, target, { tick: 1, confidence: .9, motionConfidence: .8, velocityConfidence: .7, velocityUncertainty: .06 });
  const moved = { ...target, x: 4.7 };
  const second = estimateObserverMotion(observer, moved, { tick: 2, confidence: .9, motionConfidence: .8, velocityConfidence: .7, velocityUncertainty: .06, prior: first });
  assert.ok(second.velocity.estimate);
  assert.notEqual(second.velocity.estimate.x, target.vx);
  const aged = ageMotionObservation(second, 3);
  assert.ok(aged.position.covariance.xx > second.position.covariance.xx);
  assert.ok(aged.velocity.confidence < second.velocity.confidence);
});

test("threat hypotheses drive robust escape without a live predator object", () => {
  const motion = estimateObserverMotion(observer, target, { tick: 2, confidence: .8, motionConfidence: .7, velocityConfidence: .4, velocityUncertainty: .1 });
  const contact = { targetId: target.id, type: "predator", confidence: .8, x: motion.position.estimate.x, z: motion.position.estimate.z, motionObservation: motion, evidenceId: "seen:wolf" };
  const threat = createThreatHypothesis(observer, contact, { selfTargetLikelihood: .7, attackImminence: .65, confidence: .55 }, { tick: 2 });
  const plan = planEscapeFromThreat(observer, [threat], { tick: 2, distance: 6 });
  assert.ok(plan.escapeDirection.x < 0);
  assert.equal(plan.provenance.source, "observer-owned-threat-hypotheses");
});

test("prey interception changes mode with uncertainty", () => {
  const motion = estimateObserverMotion({ ...observer, id: "wolf" }, { ...target, id: "deer" }, { tick: 1, confidence: .7, motionConfidence: .5, velocityConfidence: 0, velocityUncertainty: .3 });
  const prey = createPreyHypothesis({ ...observer, id: "wolf" }, { targetId: "deer", confidence: .7, x: motion.position.estimate.x, z: motion.position.estimate.z, motionObservation: motion, evidenceId: "seen:deer" });
  const plan = planInterceptionRegion(observer, prey, { tick: 1, speed: 1 });
  assert.ok(["reacquire", "search", "last-known-position"].includes(plan.mode));
  assert.ok(plan.covariance.xx > 0);
});

test("legacy observation migration is conservative and consumes no supplied RNG", () => {
  const animal = { id: "A", x: 0, z: 0, motionTracks: { B: { x: 3, z: 2, vx: 1, vz: 0, confidence: .9, observedTick: 4 } } };
  migrateObserverEvidenceState(animal, 8);
  assert.equal(animal.motionTracks.B.motionState, "unknown");
  assert.equal(animal.motionTracks.B.velocity.estimate, null);
  assert.equal(animal.motionTracks.B.provenance.channel, "memory");
});
