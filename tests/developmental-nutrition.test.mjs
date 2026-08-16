import test from "node:test";
import assert from "node:assert/strict";
import { coatLifeProgress, developmentalFeedingProfile } from "../src/developmental-nutrition.js";

const species = { dependency: 60, lactationDays: 45, oldAge: 300, longevityReference: 400 };
test("dependants move gradually from milk to solid food", () => {
  const newborn = developmentalFeedingProfile({ speciesId: "grazer", lifeStage: "dependent", age: 1 }, species);
  const weaning = developmentalFeedingProfile({ speciesId: "grazer", lifeStage: "dependent", age: 45 }, species);
  assert.ok(newborn.milkReliance > .95 && newborn.solidReadiness < .05);
  assert.ok(weaning.milkReliance < newborn.milkReliance && weaning.solidReadiness > newborn.solidReadiness);
});
test("coat transitions begin white and end grey", () => {
  assert.ok(coatLifeProgress({ lifeStage: "dependent", age: 0 }, species).amount < .01);
  assert.ok(coatLifeProgress({ lifeStage: "old", age: 390 }, species).amount > .9);
});
