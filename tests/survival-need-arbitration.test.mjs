import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { arbitrateSurvivalNeeds, survivalNeedCheckpointReached } from "../src/survival-need-arbitration.js";

const water = { drive: "water", needId: "hydration", score: 2200, forecastState: "predicted-failure" };
const food = { drive: "emergency food acquisition", needId: "nutrition", score: 2500 };

test("simultaneous water and food failure selects the shortest survival margin", () => {
  const result = arbitrateSurvivalNeeds({ hydration: 14, stomach: 5, energy: 6 }, [water, food], 1);
  assert.equal(result.need, "water");
});

test("an active survival need is retained instead of switching every tick", () => {
  const animal = { hydration: 15, stomach: 4, energy: 5, needDependencyPlan: { need: "water" } };
  for (let tick = 2; tick < 9; tick += 1) assert.equal(arbitrateSurvivalNeeds(animal, [water, food], tick).need, "water");
});

test("a safe handoff checkpoint permits the other failing need to take over", () => {
  const animal = { hydration: 34, stomach: 3, energy: 4, needDependencyPlan: { need: "water" } };
  const result = arbitrateSurvivalNeeds(animal, [water, food], 9);
  assert.equal(survivalNeedCheckpointReached(animal, "water"), true);
  assert.equal(result.need, "food");
  assert.match(result.reason, /handoff checkpoint/);
});

test("a catastrophic challenger may interrupt a non-catastrophic incumbent", () => {
  const animal = { hydration: 24, stomach: 1, energy: 12, needDependencyPlan: { need: "water" } };
  const result = arbitrateSurvivalNeeds(animal, [water, food], 4);
  assert.equal(result.need, "food");
  assert.match(result.reason, /catastrophic/);
});

test("application sends simultaneous physiological failures through one triage path", () => {
  const source = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
  assert.match(source, /const emergencyCandidates = \[\]/);
  assert.match(source, /arbitrateSurvivalNeeds\(a, emergencyCandidates, sim\.tick\)/);
  assert.doesNotMatch(source, /if \(survivalFoodInterrupt\) \{/);
});
