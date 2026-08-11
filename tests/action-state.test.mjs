import test from "node:test";
import assert from "node:assert/strict";
import { ACTION_KEYS, ACTION_PRESENTATION, clearFrameMotion, completeActionArrival, completedVisibleVelocity, createActionState, createRetargetedVisualMove, directionTo, migrateActionState, setAction, setBlockedAction } from "../src/action-state.js";

test("every authoritative action key has one exhaustive presentation entry", () => {
  const required = ["idle", "rest", "travel", "wander", "graze", "browse", "drink", "flee", "join-herd", "evaluate-prey", "stalk", "chase", "attack", "search", "listen", "track-scent", "guard", "defend", "blocked", "courtship", "reject", "scavenge", "nurse", "communicate", "dominance", "submit", "spar", "social-attack", "intervene", "assess-rival", "collapse"];
  assert.deepEqual([...ACTION_KEYS].sort(), Object.keys(ACTION_PRESENTATION).sort());
  for (const key of required) assert.ok(ACTION_PRESENTATION[key], `missing ${key}`);
  for (const [key, value] of Object.entries(ACTION_PRESENTATION)) assert.ok(value.label && value.posture, `incomplete ${key}`);
});

test("unknown action keys fail immediately", () => assert.throws(() => createActionState("sprinting prose"), /Unknown action key/));

test("stationary action clears incompatible movement state", () => {
  const animal = { x: 1, z: 2, visualMove: { fromX: 0, toX: 1 }, motionTarget: { x: 3, z: 4 }, moveIntent: { x: 3, z: 4 }, movementNoise: 1 };
  setAction(animal, "rest", { label: "Sleeping" });
  assert.equal(animal.actionState.moving, false); assert.equal(animal.visualMove, null); assert.equal(animal.motionTarget, null); assert.equal(animal.moveIntent, null); assert.equal(animal.movementNoise, 0);
});

test("zero-distance movement has null direction", () => assert.equal(directionTo({ x: 4, z: 9 }, { x: 4, z: 9 }), null));

test("completed interpolation reports zero visible velocity", () => {
  const move = { fromX: 0, fromZ: 0, toX: 4, toZ: 0, started: 100, duration: 200 };
  assert.ok(completedVisibleVelocity(move, 150) > 0); assert.equal(completedVisibleVelocity(move, 300), 0); assert.equal(completedVisibleVelocity(move, 400), 0);
});

test("pausing after arrival cannot report visible movement", () => {
  const move = { fromX: 0, fromZ: 0, toX: 1, toZ: 0, started: 100, duration: 200 };
  assert.equal(completedVisibleVelocity(move, 150, true), 0);
});

test("accelerated ticks retain a drawable visual transition", () => {
  const move = createRetargetedVisualMove(
    { x: 2, z: 0, orientation: 0, authoritativeX: 8, authoritativeZ: 0, authoritativeDistanceTravelled: 100 },
    { x: 38, z: 0, orientation: .2, authoritativeDistanceTravelled: 130 },
    { now: 100, duration: 1000 / 60 }
  );
  assert.equal(move.fromX, 2);
  assert.equal(move.toX, 38);
  assert.equal(move.duration, 80);
});

test("only an authoritative discontinuity bypasses interpolation", () => {
  const move = createRetargetedVisualMove(
    { x: 2, z: 0, orientation: 0, authoritativeX: 8, authoritativeZ: 0 },
    { x: 12, z: 0, orientation: 0 },
    { now: 100, duration: 80 }
  );
  assert.equal(move, null);
});

test("legacy animals default safely without parsing display prose", () => {
  const animal = { x: 0, z: 0, currentAction: "sprinting after prey" };
  migrateActionState(animal);
  assert.equal(animal.actionState.key, "idle"); assert.equal(animal.actionState.label, "sprinting after prey");
});

test("chase is authoritative even when its label says sprinting", () => {
  const animal = { x: 0, z: 0 };
  setAction(animal, "chase", { label: "sprinting after prey", moving: true, destination: { x: 2, z: 0 } });
  assert.equal(animal.actionState.key, "chase"); assert.notEqual(animal.actionState.key, "flee");
});

test("blocked actions carry a reason and no movement", () => {
  const animal = { x: 0, z: 0, motionTarget: { x: 1, z: 0 } };
  setBlockedAction(animal, "no traversable neighbouring cell", { label: "Cannot move" });
  assert.equal(animal.actionState.reason, "no traversable neighbouring cell"); assert.equal(animal.actionState.moving, false); assert.equal(animal.motionTarget, null);
});

test("arrival clears the active destination", () => {
  const animal = { x: 0, z: 0 };
  setAction(animal, "travel", { moving: true, destination: { x: 1, z: 0 } });
  completeActionArrival(animal, "travel", { label: "arrived" });
  assert.equal(animal.actionState.destination, null); assert.equal(animal.actionState.direction, null); assert.equal(animal.actionState.moving, true);
});

test("load/reset frame cleanup removes interpolation and trail-driving motion", () => {
  const animal = { visualMove: {}, motionTarget: {}, moveIntent: {}, movementNoise: 1 };
  clearFrameMotion(animal);
  assert.deepEqual(animal, { visualMove: null, motionTarget: null, moveIntent: null, movementNoise: 0, movementRequest: null, routeState: null });
});
