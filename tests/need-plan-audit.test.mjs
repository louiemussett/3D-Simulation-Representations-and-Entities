import test from "node:test";
import assert from "node:assert/strict";
import { migrateNeedPlanAudit, observeNeedPlan, populationPlanAudit, recordNeedAcquisition, recordNeedTargetFailure } from "../src/need-plan-audit.js";
import { protectedReserves, survivalForecast } from "../src/need-ontology-presentation.js";

test("an acquisition episode retains phases, failures, gain, and completion", () => {
  const animal = { id: "H1", speciesId: "grazer", lifeStage: "adult", hydration: 44, stomach: 50 };
  observeNeedPlan(animal, { need: "water", method: "travel to remembered water", phase: "recover" }, { tick: 10, ecologicalMinute: 100, amount: 44, distance: 8, etaHours: 3, confidence: .7 });
  observeNeedPlan(animal, { need: "water", method: "travel to remembered water", phase: "travel" }, { tick: 11, ecologicalMinute: 160, amount: 42, distance: 5, etaHours: 2, confidence: .75 });
  recordNeedTargetFailure(animal, { need: "water", tick: 12, ecologicalMinute: 180, target: "lake-a" });
  recordNeedAcquisition(animal, { need: "water", before: 42, after: 96, tick: 13, ecologicalMinute: 220, target: "lake-b", satisfactionTarget: 92 });
  const audit = migrateNeedPlanAudit(animal);
  assert.equal(audit.current, null);
  assert.equal(audit.completed.length, 1);
  assert.equal(audit.completed[0].outcome, "satisfied");
  assert.equal(audit.completed[0].failedTargets, 1);
  assert.equal(audit.completed[0].resourceGained, 54);
  assert.equal(audit.completed[0].distanceClosed, 3);
  assert.deepEqual(audit.completed[0].phases.map((phase) => phase.name), ["recover", "travel"]);
});

test("population audit reports success and stalled phases", () => {
  const one = { id: "H1", speciesId: "grazer", lifeStage: "adult" }, two = { id: "C1", speciesId: "hunter", lifeStage: "adult" };
  one.needPlanAudit = { current: null, completed: [{ outcome: "satisfied", etaErrorHours: 1, phase: "acquire", observationMinutes: 180 }], totals: {} };
  two.needPlanAudit = { current: null, completed: [{ outcome: "failed", etaErrorHours: -2, phase: "travel", observationMinutes: 60, groupConflict: true }], totals: {} };
  const report = populationPlanAudit([one, two]);
  assert.equal(report.completed, 2);
  assert.equal(report.successRate, .5);
  assert.equal(report.averageEtaErrorHours, 1.5);
  assert.equal(report.phaseStalls.travel, 1);
  assert.equal(report.byObservationMode[180].successRate, 1);
  assert.equal(report.byObservationMode[60].successRate, 0);
  assert.equal(report.groupConflictEpisodes, 1);
});

test("forecast distinguishes viable and failed plans and protects pregnancy reserves", () => {
  const viable = survivalForecast({ planning: { water: { remainingHours: 12, etaHours: 3, safetyHours: 2 } }, animal: {}, confidence: .9, preparationHours: 1 });
  const failed = survivalForecast({ planning: { water: { remainingHours: 3, etaHours: 4, safetyHours: 2 } }, animal: {}, confidence: .4, preparationHours: 1 });
  assert.equal(viable.viable, true);
  assert.equal(failed.state, "predicted-failure");
  assert.equal(protectedReserves({ animal: { pregnant: {}, fatigue: 20 }, planning: { water: {} } }).waterReserve, 24);
});
