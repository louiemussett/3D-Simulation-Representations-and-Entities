import test from "node:test";
import assert from "node:assert/strict";
import { inferPredatorIntent, predatorIntentResponseThresholds, shouldRecomputePredatorIntent } from "../src/predator-intent-inference.js";

test("direct persistent pursuit is distinguished from a passing predator", () => {
  const passing = inferPredatorIntent({ distance: 8, bodyHeading: Math.PI / 2, headHeading: Math.PI / 2, bearingToObserver: 0, closingSpeed: 0, routeDirectness: .1, observationConfidence: .9, alternativePrey: 2 });
  const pursuit = inferPredatorIntent({ distance: 5, bodyHeading: 0, headHeading: 0, bearingToObserver: 0, closingSpeed: .14, closingAcceleration: .04, routeDirectness: .95, trackingDuration: 7, observablePosture: "chase", observationConfidence: .9 });
  assert.ok(pursuit.selfTargetLikelihood > passing.selfTargetLikelihood + .45);
  assert.ok(pursuit.attackImminence > .7);
});

test("confidence remains separate from inferred likelihood", () => {
  const vague = inferPredatorIntent({ distance: 5, bodyHeading: 0, bearingToObserver: 0, closingSpeed: .12, observationConfidence: .18 });
  assert.ok(vague.selfTargetLikelihood > vague.confidence);
});

test("individual thresholds vary and cache notices meaningful changes", () => {
  assert.notDeepEqual(predatorIntentResponseThresholds({ vigilanceSkill: 1 }), predatorIntentResponseThresholds({ vigilanceSkill: 0, aggression: 1 }));
  assert.equal(shouldRecomputePredatorIntent({ tick: 8, distance: 5, bodyHeading: 0 }, { distance: 5.1, bodyHeading: .02 }, 9), false);
  assert.equal(shouldRecomputePredatorIntent({ tick: 8, distance: 5, bodyHeading: 0 }, { distance: 3, bodyHeading: 0 }, 9), true);
});
