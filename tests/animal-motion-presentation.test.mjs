import test from "node:test";
import assert from "node:assert/strict";
import { animalGroundOffset, gradualHeading, locomotionAnimation, matingPosture, movingTurnTolerance, requiresTurnInPlace } from "../src/animal-motion-presentation.js";

test("animal roots retain clearance and lowered postures receive extra clearance", () => {
  assert.equal(animalGroundOffset(1, "travel"), .12);
  assert.equal(animalGroundOffset(1, "rest"), .2);
  assert.ok(animalGroundOffset(.55, "stalk") > 0);
});

test("ordinary walking bobs slower than urgent locomotion", () => {
  const walking = locomotionAnimation("travel", 250), chase = locomotionAnimation("chase", 250);
  assert.equal(walking.active, true); assert.equal(chase.active, true);
  assert.ok(walking.frequency < chase.frequency);
  assert.equal(locomotionAnimation("rest", 250).bob, 0);
});

test("male mating posture lifts and supports the head with the raised body", () => {
  const hunter = matingPosture("hunter", 1), grazer = matingPosture("grazer", 1);
  assert.ok(hunter.headLift > hunter.bodyLift);
  assert.ok(grazer.headLift > grazer.bodyLift);
  assert.ok(hunter.bodyPitch < Math.PI / 4);
  assert.ok(hunter.headPitch < 0);
});

test("heading correction uses the shortest slow turn and ignores tiny reversals", () => {
  const maximum = Math.PI / 24;
  assert.ok(Math.abs(gradualHeading(0, Math.PI) - 0) <= maximum + 1e-9);
  const wrapped = gradualHeading(Math.PI - .03, -Math.PI + .03);
  assert.ok(Math.atan2(Math.sin(wrapped - (Math.PI - .03)), Math.cos(wrapped - (Math.PI - .03))) > 0);
  assert.equal(gradualHeading(1, 1.01), 1);
});

test("translation waits for meaningful body alignment", () => {
  assert.equal(requiresTurnInPlace(0, Math.PI / 2), true);
  assert.equal(requiresTurnInPlace(0, Math.PI / 36), false);
  assert.equal(requiresTurnInPlace(Math.PI - .02, -Math.PI + .02), false);
});

test("fast locomotion permits only modest moving corrections", () => {
  assert.ok(movingTurnTolerance(true) > movingTurnTolerance(false));
  assert.equal(requiresTurnInPlace(0, Math.PI / 9, movingTurnTolerance(false)), true);
  assert.equal(requiresTurnInPlace(0, Math.PI / 9, movingTurnTolerance(true)), false);
  assert.equal(requiresTurnInPlace(0, Math.PI / 2, movingTurnTolerance(true)), true);
});
