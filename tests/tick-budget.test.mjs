import test from "node:test";
import assert from "node:assert/strict";
import { runBudgetedTicks, shouldRefreshPresentation } from "../src/tick-budget.js";

test("frame tick budget carries unfinished authoritative ticks forward", () => {
  let elapsed = 0, ticks = 0;
  const result = runBudgetedTicks(4.5, () => { ticks += 1; elapsed += 4; }, { budgetMs: 7, clock: () => elapsed });
  assert.deepEqual(result, { accumulator: 2.5, completed: 2 });
  assert.equal(ticks, 2);
});

test("a due tick runs even when one tick exceeds the frame budget", () => {
  let elapsed = 0;
  const result = runBudgetedTicks(3, () => { elapsed += 20; }, { budgetMs: 7, clock: () => elapsed });
  assert.deepEqual(result, { accumulator: 2, completed: 1 });
});

test("sub-tick accumulator does no simulation work", () => {
  let ran = false;
  const result = runBudgetedTicks(.75, () => { ran = true; });
  assert.deepEqual(result, { accumulator: .75, completed: 0 });
  assert.equal(ran, false);
});

test("budgeting preserves deterministic tick order", () => {
  let elapsed = 0;
  const order = [];
  const run = () => { order.push(order.length + 1); elapsed += 8; };
  const first = runBudgetedTicks(3, run, { budgetMs: 7, clock: () => elapsed });
  const second = runBudgetedTicks(first.accumulator, run, { budgetMs: 7, clock: () => elapsed });
  const third = runBudgetedTicks(second.accumulator, run, { budgetMs: 7, clock: () => elapsed });
  assert.deepEqual(order, [1, 2, 3]);
  assert.equal(third.accumulator, 0);
});

test("presentation refresh follows wall time rather than requested tick multiplier", () => {
  assert.equal(shouldRefreshPresentation(1050, 1000, 10), false);
  assert.equal(shouldRefreshPresentation(1100, 1000, 10), true);
  assert.equal(shouldRefreshPresentation(1000, Number.NaN, 10), true);
});
