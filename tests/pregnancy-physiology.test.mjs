import test from "node:test";
import assert from "node:assert/strict";
import { chooseOffspringCount, conceptionProbability, maternalConditionScore, migratePregnancyState, pregnancyDailyLossRisk, pregnancyHormonalCycle, pregnancyPhysiology, pregnancyTermMultiplier, prenatalHealthOutcome } from "../src/pregnancy-physiology.js";

test("reproductive load grows linearly and remains bounded", () => {
  assert.equal(pregnancyTermMultiplier(1), 1);
  assert.equal(pregnancyTermMultiplier(2), 1.18);
  assert.ok(Math.abs(pregnancyTermMultiplier(3) - 1.36) < 1e-12);
  assert.equal(pregnancyTermMultiplier(20), 2);
  assert.equal(pregnancyTermMultiplier(20, "surface-eggs"), 1.6);
});

test("poor maternal condition makes conception unlikely rather than impossible", () => {
  const profile = { criticalFatPercent: 12, idealLow: 17 };
  const poor = { bodyFatPercent: 3, energy: 18, hydration: 40, health: 55, fertilityImpaired: true };
  const healthy = { bodyFatPercent: 21, energy: 90, hydration: 90, health: 100 };
  assert.ok(conceptionProbability(poor, profile) > 0);
  assert.ok(conceptionProbability(poor, profile) < .1);
  assert.ok(conceptionProbability(healthy, profile) > .7);
  assert.ok(maternalConditionScore(poor, profile) < maternalConditionScore(healthy, profile));
});

test("pregnancy loss risk is probabilistic and front-loaded", () => {
  const mother = { bodyFatPercent: 4, energy: 20, hydration: 35, health: 60 };
  const profile = { criticalFatPercent: 12, idealLow: 17 };
  const early = pregnancyDailyLossRisk(mother, { age: 4, viability: .65 }, 60, profile);
  const late = pregnancyDailyLossRisk(mother, { age: 48, viability: .65 }, 60, profile);
  assert.ok(early > late);
  assert.ok(early < 1);
});

test("poor gestational condition rarely yields full newborn health", () => {
  const pregnancy = { conditionAtConception: .12, averageMaternalCondition: .18, viability: .55 };
  const mother = { bodyFatPercent: 4, energy: 25, hydration: 40, health: 60 };
  const profile = { criticalFatPercent: 12, idealLow: 17 };
  assert.equal(prenatalHealthOutcome(pregnancy, mother, profile, .9).fullHealth, false);
  assert.equal(prenatalHealthOutcome(pregnancy, mother, profile, 0).fullHealth, true);
});

test("weight and needs rise gradually rather than jumping at conception", () => {
  const start = pregnancyPhysiology({ age: 0, offspringCount: 2 }, 100);
  const middle = pregnancyPhysiology({ age: 50, offspringCount: 2 }, 100);
  const term = pregnancyPhysiology({ age: 100, offspringCount: 2 }, 100);
  assert.equal(start.weightMultiplier, 1);
  assert.ok(Math.abs(middle.weightMultiplier - 1.09) < 1e-12);
  assert.ok(Math.abs(middle.needMultiplier - 1.09) < 1e-12);
  assert.equal(term.weightMultiplier, 1.18);
  assert.ok(term.bodyLinearScale > 1 && term.bodyLinearScale < term.weightMultiplier);
});

test("egg formation has bounded load and no mammalian hormone cycle", () => {
  const eggs = pregnancyPhysiology({ age: 30, offspringCount: 12 }, 60, "surface-eggs");
  assert.equal(eggs.termMultiplier, 1.6);
  assert.equal(eggs.hormoneCycle, null);
});

test("pregnancy uses its own changing hormonal phases", () => {
  assert.equal(pregnancyHormonalCycle({ age: 5 }, 100).phase, "implantation");
  assert.equal(pregnancyHormonalCycle({ age: 50 }, 100).phase, "mid pregnancy");
  assert.equal(pregnancyHormonalCycle({ age: 95 }, 100).phase, "pre-labour");
  assert.equal(pregnancyHormonalCycle(null, 100), null);
});

test("litter count is selected deterministically at conception", () => {
  assert.equal(chooseOffspringCount([2, 4], 0), 2);
  assert.equal(chooseOffspringCount([2, 4], .5), 3);
  assert.equal(chooseOffspringCount([2, 4], 1), 4);
});

test("older pregnancy saves receive a safe litter count without randomness", () => {
  const animal = { pregnant: { age: 20, viability: 1 } };
  migratePregnancyState(animal, { gestation: 90, litter: [2, 4] });
  assert.equal(animal.pregnant.offspringCount, 2);
  assert.equal(animal.pregnancyHormones.phase, "early pregnancy");
});
