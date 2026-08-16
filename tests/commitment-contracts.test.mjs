import assert from "node:assert/strict";
import test from "node:test";
import { commitmentIdentity, createCommitmentEpisode, createMethodCandidate, createTargetRef, shouldReplaceCommitment, targetIdentityEqual } from "../src/commitment-contracts.js";
import { resourceTargetKey, stabilizeNeedDependencyPlan, waterTargetKey } from "../src/water-commitment.js";
import { activeParallelObligations, completeParallelObligation, upsertParallelObligation } from "../src/parallel-obligations.js";
import { needDependencyPlan } from "../src/need-dependency-planning.js";
import { createMovementRequest, equivalentMovementRequest } from "../src/locomotion-system.js";
import { assessNeedStates } from "../src/need-state-engine.js";
import { satisfierOptionsForNeed } from "../src/satisfier-generation.js";
import { retainResourceTarget } from "../src/resource-commitment.js";
import { safetyMethodCandidate } from "../src/safety-planner.js";
import { careMethodCandidate } from "../src/care-planner.js";
import { migrateCommitment, observeCommitment } from "../src/commitment-system.js";

test("refreshed evidence ticks do not change physical resource identity", () => {
  const first = resourceTargetKey({ evidenceId: "water-evidence:59:sight:food:3.000,4.000" }, "food");
  const second = resourceTargetKey({ evidenceId: "water-evidence:60:sight:food:3.000,4.000" }, "food");
  assert.equal(first, second);
  assert.equal(first.startsWith("food-evidence:"), true);
  assert.equal(first.includes("water-evidence"), false);
});

test("target refs separate mutable evidence metadata from identity", () => {
  const first = createTargetRef({ patchId: 8, evidenceId: "vision:10", observationTick: 10, confidence: .4 }, { needId: "nutrition" });
  const second = createTargetRef({ patchId: 8, evidenceId: "vision:11", observationTick: 11, confidence: .9 }, { needId: "nutrition" });
  assert.equal(targetIdentityEqual(first, second), true);
  assert.notEqual(first.lastConfirmedTick, second.lastConfirmedTick);
});

test("phase changes retain a commitment episode", () => {
  const candidate = createMethodCandidate({ drive: "water", needId: "hydration", satisfierId: "surface-water", methodId: "drink-confirmed-shoreline", targetKey: "water-body:4", score: 100 });
  const travel = createCommitmentEpisode({ ...candidate, phase: "travel" }, { animalId: "A", tick: 10, sequence: 1, commitTicks: 16 });
  const acquire = createCommitmentEpisode({ ...candidate, phase: "acquire" }, { animalId: "A", tick: 12, sequence: 1, commitTicks: 16, previous: travel });
  assert.equal(travel.commitmentId, acquire.commitmentId);
  assert.equal(travel.startedTick, acquire.startedTick);
  assert.equal(acquire.phaseChangeCount, 1);
  assert.equal(commitmentIdentity(travel), commitmentIdentity(acquire));
});

test("precedence overrides score while ordinary challengers respect hold", () => {
  const incumbent = { precedenceClass: "ordinary", candidateScore: 500, minimumReviewTick: 20 };
  assert.equal(shouldReplaceCommitment(incumbent, { precedenceClass: "ordinary", candidateScore: 900 }, { tick: 15, switchThreshold: 10 }).replace, false);
  assert.equal(shouldReplaceCommitment(incumbent, { precedenceClass: "immediate-lethal", candidateScore: 100 }, { tick: 15, switchThreshold: 10 }).replace, true);
});

test("food plan diagnostics use neutral or food terminology", () => {
  const plan = stabilizeNeedDependencyPlan(null, { need: "food", needId: "nutrition", method: "graze", phase: "travel" }, { tick: 2, targetKey: "food-patch:2", target: { id: 2, x: 1, z: 1 }, resourceLabel: "food" });
  assert.equal(plan.targetDecision, "food target selected");
  assert.equal(plan.targetDecision.includes("water"), false);
  assert.equal(waterTargetKey({ id: 2 }), "water-cell:2");
});

test("care can execute as a parallel obligation", () => {
  const animal = {};
  const obligation = upsertParallelObligation(animal, { kind: "care", targetId: "young-1", methodId: "permit-nursing" }, 5);
  assert.equal(activeParallelObligations(animal).length, 1);
  completeParallelObligation(animal, obligation.obligationKey, 8);
  assert.equal(activeParallelObligations(animal).length, 0);
});

test("safety and care expose satisfiers, methods, targets and completion", () => {
  const threat = { entityId: "predator-1", targetKey: "entity:predator-1" };
  const safety = needDependencyPlan({ need: "safety", immediateDanger: true, target: threat });
  const care = needDependencyPlan({ need: "care", target: { entityId: "young-1" } });
  for (const plan of [safety, care]) { assert.ok(plan.satisfierId); assert.ok(plan.methodId); assert.ok(plan.target); assert.ok(plan.completionCondition); }
  assert.equal(safety.methodId, "ordinary-escape");
});

test("movement identity is owned by commitment and target", () => {
  const first = createMovementRequest("travel", { x: 2, z: 3 }, { commitmentId: "c:1", targetKey: "water:4" });
  const equivalent = createMovementRequest("travel", { x: 2.02, z: 3.01 }, { commitmentId: "c:1", targetKey: "water:4" });
  const otherCommitment = createMovementRequest("travel", { x: 2.02, z: 3.01 }, { commitmentId: "c:2", targetKey: "water:4" });
  assert.equal(equivalentMovementRequest(first, equivalent), true);
  assert.equal(equivalentMovementRequest(first, otherCommitment), false);
});

test("all concurrent need states include explicit recovery", () => {
  const states = assessNeedStates({ hydration: 60, stomach: 80, energy: 70, fatigue: 55, injuries: [{ severity: 20 }] }, {}, 4);
  assert.equal(states.hydration.urgency, 40);
  assert.equal(states.recovery.needId, "recovery");
  assert.ok(states.recovery.pressure > 0);
});

test("satisfier generation exposes many-to-many effects", () => {
  const water = satisfierOptionsForNeed("hydration").find(item => item.satisfierId === "surface-water");
  assert.ok(water.supports.includes("hydration"));
  assert.ok(water.impairs.includes("safety"));
  assert.ok(water.methods.length);
});

test("food target stays retained through evidence refresh and weak challengers", () => {
  const incumbent = { patchId: "P1", x: 10, z: 0 };
  const refreshed = retainResourceTarget({ needId: "nutrition", resourceKind: "forage", incumbent, challenger: { patchId: "P1", x: 10, z: 0, evidenceId: "vision:8" }, tick: 8, minimumReviewTick: 12, incumbentDistance: 10, challengerDistance: 10 });
  const weak = retainResourceTarget({ needId: "nutrition", resourceKind: "forage", incumbent, challenger: { patchId: "P2", x: 8, z: 0 }, tick: 14, minimumReviewTick: 12, incumbentDistance: 10, challengerDistance: 8 });
  assert.equal(refreshed.retain, true);
  assert.equal(weak.retain, true);
});

test("safety and care candidates carry complete executable identity", () => {
  const safety = safetyMethodCandidate({ observation: { targetId: "wolf", evidenceId: "sight:1" }, immediate: true, tick: 2 });
  const care = careMethodCandidate({ actorId: "mother", targetId: "young", nursing: true, tick: 2 });
  for (const candidate of [safety, care]) { assert.ok(candidate.needId); assert.ok(candidate.satisfierId); assert.ok(candidate.methodId); assert.ok(candidate.targetKey); assert.ok(candidate.completionCondition); }
  assert.equal(safety.precedenceClass, "immediate-lethal");
});

test("event ledger separates phase action and true commitment switches", () => {
  const animal = { id: "A", hydration: 50, stomach: 80, energy: 80, fatigue: 0, actionState: { key: "travel" }, needDependencyPlan: { needId: "hydration", satisfierId: "surface-water", methodId: "drink-confirmed-shoreline", phase: "travel", targetKey: "water:1", completionCondition: "hydration 92" } };
  migrateCommitment(animal, 0); observeCommitment(animal, { drive: "water", needId: "hydration", satisfierId: "surface-water", methodId: "drink-confirmed-shoreline", targetKey: "water:1", score: 100 }, 0);
  animal.needDependencyPlan.phase = "acquire"; animal.actionState.key = "drink"; observeCommitment(animal, { drive: "water", needId: "hydration", satisfierId: "surface-water", methodId: "drink-confirmed-shoreline", targetKey: "water:1", score: 100 }, 1);
  assert.equal(animal.commitmentState.switches, 0);
  assert.ok(animal.commitmentEvents.some(event => event.kind === "phase-changed"));
  assert.ok(animal.commitmentEvents.some(event => event.kind === "action-changed"));
  assert.equal(animal.commitmentEvents.filter(event => event.countsAsSwitch).length, 0);
});

test("an unrelated stale resource plan cannot explain a new safety target", () => {
  const animal = { id: "A", hydration: 50, stomach: 80, energy: 80, fatigue: 0, actionState: { key: "travel" }, needDependencyPlan: { needId: "hydration", targetDecision: "no incumbent water target" } };
  migrateCommitment(animal, 0);
  observeCommitment(animal, { drive: "water", needId: "hydration", satisfierId: "surface-water", methodId: "drink-confirmed-shoreline", targetKey: "water-search:1", score: 100 }, 0);
  observeCommitment(animal, { drive: "return to playable map", needId: "safety", satisfierId: "playable-terrain", methodId: "return-inside-boundary", targetKey: "safe-region:interior", switchReason: "physical boundary recovery", score: 5000 }, 1);
  const targetEvent = animal.commitmentEvents.findLast(event => event.kind === "target-changed");
  assert.equal(targetEvent.reason, "physical boundary recovery");
});
