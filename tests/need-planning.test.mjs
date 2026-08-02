import test from "node:test";
import assert from "node:assert/strict";
import { completionForecast, estimateAcquisitionEta, estimateNeedWindow, needPlan, planReconsideration, prospectiveUrgency, protectedActivityAssessment } from "../src/need-planning.js";

test("need windows and acquisition ETA use the ecological clock", () => {
  assert.equal(estimateNeedWindow({ amount: 100, reserve: 15, depletionPerHour: 3.4 }), 25);
  assert.ok(Math.abs(estimateAcquisitionEta({ distance: 12, worldUnitsPerTick: 2, ecologicalHoursPerTick: .8, acquisitionHours: .2 }) - 5) < 1e-9);
});

test("distant resources become urgent before the reserve is depleted", () => {
  const near = needPlan({ amount: 100, reserve: 15, depletionPerHour: 3.4, distance: 2, worldUnitsPerTick: 1, ecologicalHoursPerTick: .8, safetyHours: 2 });
  const far = needPlan({ amount: 100, reserve: 15, depletionPerHour: 3.4, distance: 22, worldUnitsPerTick: 1, ecologicalHoursPerTick: .8, safetyHours: 2 });
  assert.ok(far.urgency > near.urgency);
  assert.ok(far.urgency > 50);
  assert.equal(prospectiveUrgency({ remainingHours: 5, acquisitionEtaHours: 5, safetyHours: 2 }), 100);
});

test("unknown resource location creates planning pressure without claiming an ETA", () => {
  const plan = needPlan({ amount: 90, reserve: 15, depletionPerHour: 3, distance: Infinity, worldUnitsPerTick: 1, ecologicalHoursPerTick: .8, currentDeficit: 10 });
  assert.equal(plan.etaHours, Infinity);
  assert.ok(plan.urgency >= 28);
});

test("complete-cycle forecast includes preparation, recovery, uncertainty, and safety", () => {
  const forecast = completionForecast({ remainingHours: 10, preparationHours: 1, travelHours: 3, acquisitionHours: .5, recoveryHours: 1, uncertaintyHours: 1, safetyHours: 2 });
  assert.equal(forecast.requiredHours, 8.5);
  assert.equal(forecast.state, "commit-now");
  assert.equal(forecast.viable, true);
});

test("optional activity is rejected when it consumes the protected water plan", () => {
  const result = protectedActivityAssessment({ planning: { water: { amount: 42, remainingHours: 5, etaHours: 3, acquisitionHours: .25, safetyHours: 2, depletionPerHour: 2 } }, durationHours: 2, recoveryHours: 1, protectedWater: 20 });
  assert.equal(result.allowed, false);
  assert.match(result.reason, /water acquisition|protected hydration/);
});

test("plan reconsideration distinguishes persistence from a stalled plan", () => {
  assert.equal(planReconsideration({ progressPerHour: 1, stalledHours: 2 }).reconsider, false);
  assert.equal(planReconsideration({ progressPerHour: .01, stalledHours: 2 }).reason, "progress remained near zero for too long");
});
