import test from "node:test";
import assert from "node:assert/strict";
import { createGoalPlan, migrateGoalPlan, rankCandidatesWithCommitment, reproductionReadiness } from "../src/goal-planning.js";

const species = { reproductionEnergy: 74 };

test("female defers reproduction while starving or caring for a needy dependent", () => {
  const depleted = reproductionReadiness({ sex: "F", energy: 90, stomach: 12, hydration: 80, health: 90, fatigue: 10 }, species);
  assert.equal(depleted.ready, false); assert.deepEqual(depleted.reasons, ["low-food-reserve"]);
  assert.equal(reproductionReadiness({ sex: "F", energy: 90, stomach: 70, hydration: 80, health: 90, fatigue: 10 }, species, { dependentNeedsCare: true }).ready, false);
});

test("lasting low-fat impairment continues to block reproduction after weight recovery", () => {
  const species = { reproductionEnergy: 70, femaleCriticalFat: 10 };
  const result = reproductionReadiness({ sex: "F", energy: 90, stomach: 70, hydration: 80, health: 90, fatigue: 10, bodyFatPercent: 18, fertilityImpaired: true }, species);
  assert.equal(result.ready, false); assert.ok(result.reasons.includes("lasting-low-fat-fertility-impairment"));
});

test("short-term commitment stabilises ordinary priorities but not emergencies", () => {
  const committed = rankCandidatesWithCommitment([{ drive: "hunger", score: 50 }, { drive: "water", score: 62 }], { key: "hunger", untilTick: 12 }, 8);
  assert.equal(committed[0].drive, "hunger");
  const emergency = rankCandidatesWithCommitment([{ drive: "hunger", score: 50 }, { drive: "threat response", score: 55, urgent: true }], { key: "hunger", untilTick: 12 }, 8);
  assert.equal(emergency[0].drive, "threat response");
});

test("goal horizons distinguish current action, reserve recovery and reproduction", () => {
  const plan = createGoalPlan({ sex: "F", pregnant: null }, { drive: "hunger", commitTicks: 8 }, 20, { depleted: true, reproductionReady: false });
  assert.equal(plan.shortTerm.untilTick, 28); assert.equal(plan.mediumTerm.key, "restore-reserves"); assert.equal(plan.longTerm.key, "reproduce-when-resourced");
});

test("information gathering can occupy medium and long goal horizons", () => {
  const hunter = createGoalPlan({ sex: "M", speciesId: "hunter", pregnant: null }, { drive: "listen for prey", commitTicks: 3 }, 20, { informationNeed: true });
  assert.equal(hunter.shortTerm.key, "listen for prey"); assert.equal(hunter.mediumTerm.key, "improve-local-awareness"); assert.equal(hunter.longTerm.key, "maintain-prey-knowledge");
  const grazer = createGoalPlan({ sex: "M", speciesId: "grazer", pregnant: null }, { drive: "scan for danger" }, 20, { informationNeed: true });
  assert.equal(grazer.longTerm.key, "maintain-predator-awareness");
});

test("older saves receive safe empty goal defaults", () => {
  const animal = {}; migrateGoalPlan(animal, 9);
  assert.equal(animal.goalPlan.currentPriority, null); assert.equal(animal.goalPlan.immediateConcern, null); assert.equal(animal.goalPlan.supportingGoal, null); assert.equal(animal.goalPlan.lifeStrategy, null);
  assert.deepEqual(animal.goalPlan.rankings.immediateConcern, []); assert.deepEqual(animal.goalPlan.rankings.supportingGoal, []); assert.deepEqual(animal.goalPlan.rankings.lifeStrategy, []);
  assert.equal(animal.goalPlan.shortTerm, null); assert.equal(animal.goalPlan.mediumTerm, null); assert.equal(animal.goalPlan.longTerm, null);
});

test("all three horizons retain their top three ranked priorities", () => {
  const plan = createGoalPlan({ sex: "F", speciesId: "grazer", pregnant: null }, { drive: "hunger", score: 160, commitTicks: 5 }, 30, { depleted: true, reproductionReady: false, informationNeed: true, rankedCandidates: [{ drive: "hunger", score: 160 }, { drive: "water", score: 120 }, { drive: "rest", score: 80 }, { drive: "explore", score: 10 }] });
  assert.deepEqual(plan.rankings.shortTerm.map((goal) => goal.key), ["hunger", "water", "rest"]);
  assert.equal(plan.rankings.mediumTerm.length, 3); assert.equal(plan.rankings.longTerm.length, 3);
  assert.deepEqual(plan.rankings.shortTerm.map((goal) => goal.rank), [1, 2, 3]);
});

test("legacy singular horizons migrate into ranked lists", () => {
  const animal = { goalPlan: { shortTerm: { key: "water", untilTick: 12 }, mediumTerm: { key: "restore-reserves" }, longTerm: { key: "survive-and-maintain-condition" } } };
  migrateGoalPlan(animal, 9); assert.equal(animal.goalPlan.rankings.shortTerm[0].key, "water"); assert.equal(animal.goalPlan.rankings.mediumTerm[0].rank, 1);
});

test("immature animals never receive mating or reproductive goals", () => {
  for (const lifeStage of ["dependent", "juvenile", "subadult"]) {
    const plan = createGoalPlan({ sex: "F", speciesId: "grazer", lifeStage, pregnant: null }, { drive: "social development", score: 50 }, 10, { reproductionReady: true });
    const goals = Object.values(plan.rankings).flat().map((goal) => goal.key);
    assert.equal(goals.some((goal) => /reproduc|mating|mate/.test(goal)), false);
  }
});
