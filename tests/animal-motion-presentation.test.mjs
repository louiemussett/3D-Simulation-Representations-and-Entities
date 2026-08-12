import test from "node:test";
import assert from "node:assert/strict";
import { SPECIES_LOCOMOTION, animalGroundOffset, feedingAnimation, gradualHeading, isGroundRestPosture, locomotionAnimation, matingPosture, movingTurnTolerance, postureTransitionDuration, requiresTurnInPlace, smoothPostureProgress, speciesLocomotionProfile } from "../src/animal-motion-presentation.js";
import { SPECIES_IDS } from "../src/species-registry.js";

test("animal roots retain standing clearance while ground rest settles into terrain", () => {
  assert.equal(animalGroundOffset(1, "travel"), .12);
  assert.equal(animalGroundOffset(1, "rest"), -.02);
  assert.ok(animalGroundOffset(1, "rest") < animalGroundOffset(1, "travel"));
  assert.ok(animalGroundOffset(.55, "stalk") > 0);
});

test("ordinary walking bobs slower than urgent locomotion", () => {
  const walking = locomotionAnimation("travel", 250), chase = locomotionAnimation("chase", 250);
  assert.equal(walking.active, true); assert.equal(chase.active, true);
  assert.ok(walking.frequency < chase.frequency);
  assert.equal(locomotionAnimation("rest", 250).bob, 0);
});

test("every species has an explicit visible gait", () => {
  assert.deepEqual(Object.keys(SPECIES_LOCOMOTION).sort(), [...SPECIES_IDS].sort());
  for (const id of SPECIES_IDS) assert.ok(speciesLocomotionProfile(id).label.length > 5, id);
});

test("rabbits hop, hares bound, snakes undulate and heavy animals shift mass", () => {
  const rabbit = locomotionAnimation("meadow-nibbler", "travel", 250);
  const hare = locomotionAnimation("brush-nibbler", "travel", 250);
  const python = locomotionAnimation("sunscale-ambusher", "travel", 250);
  const elephant = locomotionAnimation("african-elephant", "travel", 250);
  assert.equal(rabbit.gait, "hop");
  assert.equal(hare.gait, "bound");
  assert.equal(python.gait, "serpentine");
  assert.notEqual(python.bodyYaw, 0);
  assert.equal(elephant.gait, "heavy-amble");
  assert.notEqual(elephant.bodyRoll, 0);
});

test("hunting movement visibly lowers predators into a slow ground stalk", () => {
  const stalk = locomotionAnimation("hunter", "stalk", 500), chase = locomotionAnimation("hunter", "chase", 500);
  assert.equal(stalk.gait, "ground-stalk");
  assert.ok(stalk.bodyLower > .1);
  assert.ok(stalk.headLower > .08);
  assert.ok(stalk.frequency < chase.frequency);
});

test("feeding styles produce different head and body poses", () => {
  const rabbit = feedingAnimation("meadow-nibbler", 350), moose = feedingAnimation("woodland-browser", 350), ostrich = feedingAnimation("common-ostrich", 350);
  assert.equal(rabbit.style, "nibble");
  assert.equal(moose.style, "browse");
  assert.equal(ostrich.style, "peck");
  assert.notEqual(rabbit.headDrop, moose.headDrop);
  assert.ok(ostrich.headPitch > rabbit.headPitch);
});

test("rest, suckling and nursing mothers share one grounded posture family", () => {
  assert.equal(isGroundRestPosture("rest"), true);
  assert.equal(isGroundRestPosture("suckle"), true);
  assert.equal(isGroundRestPosture("nursing-mother"), true);
  assert.equal(isGroundRestPosture("stand"), false);
});

test("grounding and standing transitions are eased and bounded by age and condition", () => {
  assert.equal(postureTransitionDuration({ lifeStage: "juvenile", health: 100, fatigue: 0 }), .55);
  assert.equal(postureTransitionDuration({ lifeStage: "dependent", health: 100, fatigue: 0 }), .65);
  assert.ok(postureTransitionDuration({ lifeStage: "old", health: 35, fatigue: 80, injuries: [{}, {}] }) > 3);
  assert.equal(postureTransitionDuration({ lifeStage: "old", health: 0, fatigue: 100, injuries: [{}, {}, {}] }), 4);
  assert.equal(smoothPostureProgress(0, 1, 0, 1000), 0);
  assert.equal(smoothPostureProgress(0, 1, 500, 1000), .5);
  assert.equal(smoothPostureProgress(0, 1, 1000, 1000), 1);
  assert.equal(smoothPostureProgress(1, 0, 500, 1000), .5);
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
