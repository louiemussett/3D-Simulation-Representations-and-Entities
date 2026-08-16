import test from "node:test";
import assert from "node:assert/strict";
import { adaptTrainableCondition, BODY_COMPOSITION_PROFILES, bodyFatPercent, improvableConditionNeeds, MAX_BODY_FAT_PERCENT, metabolicRate, migrateBodyComposition, recordTrainingStimulus, setBodyFatPercent } from "../src/body-composition.js";

test("sex and diet profiles have distinct critical and ideal fat ranges", () => {
  assert.equal(BODY_COMPOSITION_PROFILES.grazer.F.criticalFatPercent, 12);
  assert.equal(BODY_COMPOSITION_PROFILES.hunter.M.criticalFatPercent, 4);
  assert.notEqual(BODY_COMPOSITION_PROFILES.grazer.M.idealLow, BODY_COMPOSITION_PROFILES.hunter.F.idealLow);
});

test("body composition initialises deterministically", () => {
  const first = migrateBodyComposition({ speciesId: "grazer", sex: "F", bodyMass: 60, stomach: 35 });
  const second = migrateBodyComposition({ speciesId: "grazer", sex: "F", bodyMass: 60, stomach: 35 });
  assert.deepEqual(first, second); assert.ok(first.leanMass > first.fatMass); assert.ok(first.stomachCalories > 0);
});

test("body fat setters preserve lean mass and never permit 100 percent fat", () => {
  const animal = migrateBodyComposition({ speciesId: "hunter", sex: "F", bodyMass: 40, leanMass: 30, fatMass: 10, stomach: 50, energy: 80 });
  setBodyFatPercent(animal, 100);
  assert.equal(animal.bodyFatPercent, MAX_BODY_FAT_PERCENT);
  assert.equal(bodyFatPercent(animal), MAX_BODY_FAT_PERCENT);
  assert.ok(animal.leanMass > 0);
  assert.ok(animal.fatMass < animal.bodyMass);
});

test("metabolism depends mostly on lean mass and also on stored fat", () => {
  const lean = migrateBodyComposition({ speciesId: "hunter", sex: "M", bodyMass: 40, leanMass: 36, fatMass: 4, stomach: 0 });
  const heavier = migrateBodyComposition({ speciesId: "hunter", sex: "M", bodyMass: 50, leanMass: 36, fatMass: 14, stomach: 0 });
  assert.ok(metabolicRate(heavier) > metabolicRate(lean));
});

test("repeated physical stimulus gradually increases muscle and endurance", () => {
  const animal = migrateBodyComposition({ speciesId: "grazer", sex: "M", lifeStage: "adult", bodyMass: 70, leanMass: 58, fatMass: 12, stomachCalories: 100000, energy: 100 });
  const before = { muscle: animal.muscleMass, endurance: animal.enduranceFitness };
  for (let tick = 0; tick < 80; tick++) { recordTrainingStimulus(animal, { strength: 5, endurance: 4, thermal: 1 }); adaptTrainableCondition(animal); }
  assert.ok(animal.muscleMass > before.muscle); assert.ok(animal.enduranceFitness > before.endurance);
  assert.ok(improvableConditionNeeds(animal).muscleDeficit >= 0);
});
