import test from "node:test";
import assert from "node:assert/strict";
import { feedingAppetite } from "../src/feeding-appetite.js";

test("satiation is not a universal feeding cutoff", () => {
  const appetite = feedingAppetite({ speciesId: "grazer", stomach: 72, energy: 55, foodSkill: 1, fear: 0 }, { foodOpportunity: 1 });
  assert.equal(appetite.willing, true);
  assert.ok(appetite.target > 72);
});

test("reserve needs can justify eating to full capacity", () => {
  const appetite = feedingAppetite({ speciesId: "grazer", stomach: 99, energy: 20, foodSkill: 1.3, fear: 0, pregnant: { progress: .8 }, lactation: 10 }, { fatDeficit: 14, coldStress: 80, foodOpportunity: 1, scarcityExpected: true, reserveGoal: true, dependentNeedsCare: true });
  assert.equal(appetite.target, 100);
  assert.equal(appetite.willing, true);
});

test("full capacity always stops ingestion", () => {
  assert.equal(feedingAppetite({ speciesId: "hunter", stomach: 100, energy: 0, foodSkill: 2 }, { fatDeficit: 20, scarcityExpected: true }).willing, false);
});

test("danger and heat can end a meal earlier", () => {
  const safe = feedingAppetite({ speciesId: "hunter", stomach: 65, energy: 70, foodSkill: 1, fear: 0 }, { foodOpportunity: 1 });
  const unsafe = feedingAppetite({ speciesId: "hunter", stomach: 65, energy: 70, foodSkill: 1, fear: 80 }, { foodOpportunity: 1, heatStress: 70, threat: 90 });
  assert.ok(unsafe.target < safe.target);
  assert.equal(unsafe.willing, false);
});
