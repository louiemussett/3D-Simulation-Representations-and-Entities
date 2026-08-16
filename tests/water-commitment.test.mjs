import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { equivalentMovementRequest, createMovementRequest } from "../src/locomotion-system.js";
import {
  HYDRATION_ACQUISITION_TARGET,
  HYDRATION_REENTRY_LEVEL,
  NEED_DEPENDENCY_PLAN_SCHEMA,
  ShorelineReservationBook,
  hydrationAcquisitionState,
  immediateThreatPrecedesWater,
  migrateNeedDependencyPlan,
  retainGoalPlanCommitment,
  shorelineContactKey,
  shouldRetainWaterTarget,
  stabilizeNeedDependencyPlan,
  suspendNeedDependencyPlan,
} from "../src/water-commitment.js";

test("hydration uses one 92 acquisition target and an 85 direct re-entry level", () => {
  assert.equal(NEED_DEPENDENCY_PLAN_SCHEMA, 3);
  assert.equal(HYDRATION_ACQUISITION_TARGET, 92);
  assert.equal(HYDRATION_REENTRY_LEVEL, 85);
  assert.deepEqual(hydrationAcquisitionState({ hydration: 94, atWater: true }), { satisfied: true, finishRehydrating: false, directReentry: false, shouldAcquire: false, forecastRequiresPlan: false });
  assert.equal(hydrationAcquisitionState({ hydration: 91, atWater: true, activeWaterPlan: true }).finishRehydrating, true);
  assert.equal(hydrationAcquisitionState({ hydration: 84 }).shouldAcquire, true);
  assert.equal(hydrationAcquisitionState({ hydration: 90, forecastState: "commit-now" }).shouldAcquire, true);
});

test("immediate lethal danger outranks water regardless of low hydration", () => {
  assert.equal(hydrationAcquisitionState({ hydration: 84 }).shouldAcquire, true);
  assert.equal(immediateThreatPrecedesWater({ action: "flee", urgency: 80 }), true);
  assert.equal(immediateThreatPrecedesWater({ action: "withdraw", attackImminence: .72 }), true);
  assert.equal(immediateThreatPrecedesWater({ action: "watch", urgency: 100 }), false);
});

test("a viable water plan retains plan, start, minimum hold, phase age, and target", () => {
  const target = { id: "lake-a", x: 4, z: 6, exact: true, confidence: 1 };
  const first = stabilizeNeedDependencyPlan(null, { need: "water", needId: "hydration", method: "drink", phase: "travel", startedAt: 100 }, { tick: 10, targetKey: "water-cell:lake-a", target, commitmentTicks: 16 });
  const second = stabilizeNeedDependencyPlan(first, { need: "water", needId: "hydration", method: "drink", phase: "travel", startedAt: 101 }, { tick: 11, targetKey: "water-cell:lake-a", target, commitmentTicks: 16 });
  assert.equal(second.planId, first.planId); assert.equal(second.startedTick, 10); assert.equal(second.minimumUntilTick, 26); assert.equal(second.phaseStartedTick, 10); assert.equal(second.targetSwitches, 0);
  const contact = stabilizeNeedDependencyPlan(second, { ...second, phase: "acquire" }, { tick: 14, targetKey: second.targetKey, target, commitmentTicks: 16 });
  assert.equal(contact.planId, first.planId); assert.equal(contact.phaseStartedTick, 14); assert.equal(contact.targetSwitches, 0);
});

test("water targets change only for explicit reconsideration rules", () => {
  const incumbent = { id: "a", x: 10, z: 0, exact: true, minimumUntilTick: 20 }, ordinary = { id: "b", x: 8, z: 0, exact: true }, nearer = { id: "c", x: 6, z: 0, exact: true };
  assert.equal(shouldRetainWaterTarget({ incumbent, candidate: ordinary, incumbentDistance: 10, candidateDistance: 8, tick: 12 }).retain, true);
  assert.equal(shouldRetainWaterTarget({ incumbent, candidate: nearer, incumbentDistance: 10, candidateDistance: 6, tick: 21 }).retain, false);
  assert.match(shouldRetainWaterTarget({ incumbent, candidate: ordinary, invalid: true }).reason, /inaccessible/);
  assert.equal(shouldRetainWaterTarget({ incumbent, candidate: incumbent, routeUnavailable: true }).retain, false);
  assert.equal(shouldRetainWaterTarget({ incumbent, candidate: ordinary, stalled: true }).retain, false);
  assert.equal(shouldRetainWaterTarget({ incumbent, candidate: ordinary, etaIncreaseRatio: .35 }).retain, false);
});

test("safety suspension preserves and later resumes the same water plan", () => {
  const target = { id: "river-a", x: 3, z: 2, exact: true }, first = stabilizeNeedDependencyPlan(null, { need: "water", needId: "hydration", method: "drink", phase: "travel", startedAt: 20 }, { tick: 2, targetKey: "water-cell:river-a", target, commitmentTicks: 16 });
  const suspended = suspendNeedDependencyPlan(first, { tick: 4, reason: "immediate predator threat" });
  const resumed = stabilizeNeedDependencyPlan(suspended, { ...first, phase: "travel" }, { tick: 6, targetKey: first.targetKey, target, commitmentTicks: 16 });
  assert.equal(suspended.suspended, true); assert.equal(resumed.suspended, false); assert.equal(resumed.planId, first.planId); assert.equal(resumed.targetKey, first.targetKey); assert.equal(resumed.startedTick, first.startedTick); assert.match(resumed.resumeReason, /resumed/);
});

test("shoreline contacts are deterministic, exclusive, retained, and bounded for 100 ticks", () => {
  const book = new ShorelineReservationBook({ ttlTicks: 12 }), left = shorelineContactKey("lake", { edgeX: 1, edgeZ: 2 }), right = shorelineContactKey("lake", { edgeX: 2, edgeZ: 2 });
  assert.equal(book.reserve("A", left, 0), true); assert.equal(book.reserve("B", left, 0), false); assert.equal(book.reserve("B", right, 0), true);
  for (let tick = 1; tick <= 100; tick += 1) { book.touch("A", tick); book.touch("B", tick); assert.equal(book.reservationFor("A").key, left); assert.equal(book.reservationFor("B").key, right); }
  assert.equal(book.byContact.size, 2); book.release("A"); assert.equal(book.owner(left, 100), null);
  book.cleanup(114, () => true); assert.equal(book.reservationFor("B"), null);
  book.rebuild([{ id: "C", alive: true, needDependencyPlan: { need: "water", contactReservationKey: left } }], 115);
  assert.equal(book.reservationFor("C").key, left);
});

test("equivalent movement requests and goal plans retain execution identity", () => {
  const current = createMovementRequest("travel:lake", { x: 4, z: 5 }, { mode: "walk" }), same = createMovementRequest("travel:lake", { x: 4.03, z: 5.02 }, { mode: "walk" }), changed = createMovementRequest("travel:lake", { x: -4, z: -5 }, { mode: "walk" });
  assert.equal(equivalentMovementRequest(current, same), true); assert.equal(equivalentMovementRequest(current, changed), false);
  const prior = { currentPriority: { key: "water", startedTick: 2, untilTick: 18 } }, next = { currentPriority: { key: "water", startedTick: 3, untilTick: 19 }, immediateConcern: {}, shortTerm: {} }, retained = retainGoalPlanCommitment(prior, next, "water");
  assert.deepEqual(retained.currentPriority, { key: "water", startedTick: 2, untilTick: 18 });
});

test("legacy water plans migrate without randomness and the old bypass/96 loop are absent", () => {
  const legacy = { need: "water", needId: "hydration", method: "drink", phase: "travel", tick: 8, destination: { x: 2, z: 3 } };
  assert.deepEqual(migrateNeedDependencyPlan(legacy, { tick: 20 }), migrateNeedDependencyPlan(legacy, { tick: 20 }));
  const app = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
  assert.doesNotMatch(app, /emergency water acquisition[\s\S]{0,100}score:\s*2600/);
  assert.doesNotMatch(app, /finishRehydrating\s*=\s*atWater\s*&&\s*a\.hydration\s*<\s*96/);
  assert.doesNotMatch(app, /finishRehydrating[\s\S]{0,120}\(96\s*-\s*a\.hydration\)/);
  assert.match(app, /immediateDefence[\s\S]{0,800}immediate predator threat/);
  assert.match(app, /stableWaterRequestId/);
  assert.match(app, /HYDRATION_ACQUISITION_TARGET/);
});
