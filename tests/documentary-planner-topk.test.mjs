import test from "node:test";
import assert from "node:assert/strict";
import { ACSSDecisionPlanner } from "../src/documentary-author-v3/planner.js";

const policy = {
  policyId: "test-policy",
  continuity: "on",
  continuityMargin: .1,
  allowElectiveReturns: true
};

function plannerFor(plans, { currentThreadId = null, returnThreadId = null } = {}) {
  const selected = [];
  const stories = {
    updateSituations() {},
    current: () => currentThreadId ? { threadId: currentThreadId } : null,
    returnable: () => returnThreadId ? { threadId: returnThreadId } : null,
    select: (thread, tick, options) => selected.push({ thread, tick, options })
  };
  const planner = new ACSSDecisionPlanner({ stories });
  planner.planScene = scene => plans.get(scene.id) || null;
  return { planner, selected };
}

function plan(id, score, { threadId = `thread-${id}`, critical = false } = {}) {
  return { planId: id, score, critical, thread: { threadId } };
}

test("decision planner retains the same stable top twenty without sorting every plan", () => {
  const source = Array.from({ length: 80 }, (_, index) => plan(`p${index}`, (index * 17) % 13));
  source.push(plan("tie-a", 99), plan("tie-b", 99), plan("tie-c", 99));
  const expected = source.slice().sort((left, right) => right.score - left.score).slice(0, 20).map(item => item.planId);
  const plans = new Map(source.map(item => [item.planId, item])), { planner } = plannerFor(plans);
  const best = planner.choose(source.map(item => ({ id: item.planId })), null, policy, 40);
  assert.equal(best.planId, expected[0]);
  assert.deepEqual(planner.lastPlans.map(item => item.planId), expected);
  assert.equal(planner.lastPlans.length, 20);
});

test("critical candidates remain eligible outside the retained top twenty", () => {
  const high = Array.from({ length: 30 }, (_, index) => plan(`high-${index}`, 100 - index));
  const incumbent = plan("incumbent", -50, { threadId: "current" });
  const returning = plan("returning", -60, { threadId: "return" });
  const critical = plan("critical", -70, { threadId: "critical", critical: true });
  const source = [...high, incumbent, returning, critical], plans = new Map(source.map(item => [item.planId, item])), { planner, selected } = plannerFor(plans, { currentThreadId: "current", returnThreadId: "return" });
  const best = planner.choose(source.map(item => ({ id: item.planId })), null, policy, 41);
  assert.equal(best, critical);
  assert.equal(planner.lastPlans.includes(critical), false);
  assert.equal(planner.lastPlans.includes(incumbent), false);
  assert.equal(planner.lastPlans.includes(returning), false);
  assert.equal(selected.at(-1).thread.threadId, "critical");
  assert.deepEqual(selected.at(-1).options, { interrupted: true, critical: true });
});

test("speech continuity can retain an incumbent outside the top twenty", () => {
  const high = Array.from({ length: 30 }, (_, index) => plan(`high-${index}`, 100 - index));
  const incumbent = plan("incumbent", -50, { threadId: "current" }), source = [...high, incumbent], plans = new Map(source.map(item => [item.planId, item])), { planner } = plannerFor(plans, { currentThreadId: "current" });
  const best = planner.choose(source.map(item => ({ id: item.planId })), null, policy, 42, { speechActive: true });
  assert.equal(best, incumbent);
  assert.equal(planner.lastPlans.includes(incumbent), false);
});

test("an equal-scoring return obligation remains eligible outside a stable top-twenty tie", () => {
  const high = Array.from({ length: 20 }, (_, index) => plan(`high-${index}`, 1));
  const returning = plan("returning", 1, { threadId: "return" }), source = [...high, returning], plans = new Map(source.map(item => [item.planId, item])), { planner } = plannerFor(plans, { returnThreadId: "return" });
  const best = planner.choose(source.map(item => ({ id: item.planId })), null, policy, 43);
  assert.equal(best, returning);
  assert.equal(planner.lastPlans.includes(returning), false);
});

test("special-plan ranking preserves input order for equal scores", () => {
  const criticalA = plan("critical-a", 3, { critical: true }), criticalB = plan("critical-b", 3, { critical: true });
  const incumbentA = plan("incumbent-a", 2, { threadId: "current" }), incumbentB = plan("incumbent-b", 2, { threadId: "current" });
  const source = [criticalA, criticalB, incumbentA, incumbentB], plans = new Map(source.map(item => [item.planId, item])), { planner } = plannerFor(plans, { currentThreadId: "current" });
  assert.equal(planner.choose(source.map(item => ({ id: item.planId })), null, policy, 44), criticalA);
});
