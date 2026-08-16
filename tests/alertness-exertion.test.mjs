import test from "node:test";
import assert from "node:assert/strict";
import { alertPauseDuration, applyExertion, auditoryAttentionThreshold, enduranceSpeedFactor, exertionMode, focusMultipliers, hearingRangeForProfile, lifeStageExertion, migrateExertionState, noticesSound, recoverExertion, sensoryAttention, shouldFreeze } from "../src/alertness-exertion.js";
import { initializeMetabolism } from "../src/metabolic-system.js";

test("focused senses begin after one stationary tick", () => {
  assert.deepEqual(focusMultipliers(0), { vision: 1, hearingRange: 1, hearingAccuracy: 1 });
  assert.ok(focusMultipliers(1).vision > 1); assert.ok(focusMultipliers(1).hearingRange > 1);
  assert.ok(focusMultipliers(3).vision > focusMultipliers(1).vision);
});

test("feeding halves every sense and cannot receive a stillness bonus", () => {
  assert.deepEqual(sensoryAttention({ stationaryTicks: 20, headStillTicks: 20, feeding: true }), { focusTicks: 0, vision: .5, hearingRange: .5, hearingAccuracy: .5, smell: .5 });
});

test("focus requires both the body and head to remain still", () => {
  assert.equal(sensoryAttention({ stationaryTicks: 4, headStillTicks: 0 }).vision, 1);
  assert.equal(sensoryAttention({ stationaryTicks: 0, headStillTicks: 4 }).hearingRange, 1);
  assert.equal(sensoryAttention({ stationaryTicks: 4, headStillTicks: 1 }).focusTicks, 1);
  assert.ok(sensoryAttention({ stationaryTicks: 4, headStillTicks: 1 }).vision > 1);
});

test("herbivore hearing and its stopped ranges are half the former reach", () => {
  assert.equal(hearingRangeForProfile("grazer", 8, 0), 20);
  assert.equal(hearingRangeForProfile("grazer", 8, 1), 26);
  assert.equal(hearingRangeForProfile("grazer", 8, 3), 34);
  assert.equal(hearingRangeForProfile("hunter", 9, 0), 9);
  assert.equal(hearingRangeForProfile("hunter", 9, 3), 15);
});

test("herbivores progressively notice quieter sounds while listening", () => {
  assert.equal(auditoryAttentionThreshold("grazer", 0), 0.30);
  assert.equal(auditoryAttentionThreshold("grazer", 1), 0.20);
  assert.equal(auditoryAttentionThreshold("grazer", 3), 0.10);
  assert.equal(noticesSound("grazer", 0.29, 0), false);
  assert.equal(noticesSound("grazer", 0.30, 0), true);
  assert.equal(noticesSound("grazer", 0.19, 1), false);
  assert.equal(noticesSound("grazer", 0.20, 1), true);
  assert.equal(noticesSound("grazer", 0.09, 3), false);
  assert.equal(noticesSound("grazer", 0.10, 3), true);
});

test("carnivores retain their existing sound attention", () => {
  assert.equal(auditoryAttentionThreshold("hunter", 0), 0);
  assert.equal(noticesSound("hunter", 0.01, 0), true);
});

test("grazer and hunter freezes have distinct bounded durations", () => {
  assert.equal(shouldFreeze("grazer", 80, () => 0), true); assert.equal(shouldFreeze("hunter", 20, () => 0), false);
  assert.equal(alertPauseDuration("grazer", () => 0), 2); assert.equal(alertPauseDuration("hunter", () => .99), 2);
});

test("endurance has half-life speed loss and reaches immobility at zero", () => {
  assert.equal(enduranceSpeedFactor(50), 1); assert.equal(enduranceSpeedFactor(75), .5); assert.equal(enduranceSpeedFactor(100), 0);
});

test("dangerous adrenaline becomes available after ordinary sprint is depleted", () => {
  const animal = migrateExertionState({ speciesId: "grazer", lifeStage: "adult", health: 100, healthCap: 100, fatigue: 20, sprintEnergy: 10, emergencyReserve: 1 });
  const sprint = exertionMode(animal, true); assert.equal(sprint.key, "sprint"); applyExertion(animal, sprint, 5, () => 0); assert.equal(animal.sprintEnergy, 0);
  assert.equal(exertionMode(animal, true).key, "spent");
  animal.fatigue = 100;
  const emergency = exertionMode(animal, true); assert.equal(emergency.key, "adrenaline-overdrive"); applyExertion(animal, emergency, 6, () => 0);
  assert.ok(animal.emergencyReserve > 0); assert.ok(animal.adrenalineRecoveryDebt > 0);
});

test("adrenaline accumulates continuous stress rather than using a fixed safe tranche", () => {
  const animal = migrateExertionState({ speciesId: "grazer", sex: "F", lifeStage: "adult", bodyMass: 65, leanMass: 50, fatMass: 15, muscleMass: 30, health: 100, healthCap: 100, fatigue: 84, sprintEnergy: 0, emergencyReserve: 1, controlledAdrenalineAuthorised: true, metabolism: { schema: 1, gut: { carbohydrate: 0, fat: 0, protein: 0, fermentation: 0 }, bloodFuel: 50, liverGlycogen: 80, muscleGlycogen: 0, anaerobicDebt: 0, stressLoad: 0, ketoneAdaptation: 0, proteinCatabolisedKg: 0, phase: "post-absorptive", lastFuelMix: { gut: 0, blood: 0, liver: 0, muscle: 0, fat: 0, protein: 0 }, cumulative: { ingested: 0, expended: 0, storedAsFat: 0, proteinLost: 0 } } });
  for (let tick = 0; tick < 12; tick++) {
    const mode = exertionMode(animal, true);
    assert.equal(mode.key, "controlled-adrenaline");
    applyExertion(animal, mode, tick, () => 0);
  }
  assert.ok(animal.emergencyReserve > 0 && animal.emergencyReserve < 1);
  assert.ok(animal.adrenalineRecoveryDebt > 0);
  assert.equal(animal.health, 100);
  assert.equal(animal.healthCap, 100);
});

test("babies have no sprint or emergency reserve to present or use", () => {
  const baby = migrateExertionState({ speciesId: "grazer", lifeStage: "dependent", sprintEnergy: 100, emergencyReserve: 1, fatigue: 100 });
  assert.deepEqual([baby.sprintEnergy, baby.emergencyReserve], [0, 0]);
  assert.equal(lifeStageExertion("dependent").canSprint, false);
  assert.equal(exertionMode(baby, true).key, "spent");
});

test("young emergency exertion causes slow recovery without health damage", () => {
  const juvenile = migrateExertionState({ speciesId: "grazer", lifeStage: "juvenile", health: 100, healthCap: 100, fatigue: 100, sprintEnergy: 0, emergencyReserve: 1 });
  applyExertion(juvenile, exertionMode(juvenile, true), 10, () => .5);
  assert.equal(juvenile.health, 100); assert.equal(juvenile.healthCap, 100);
  assert.equal(juvenile.exertionRecoveryMultiplier, .42);
});

test("old animals accumulate adrenaline damage sooner without an instant damage boundary", () => {
  const old = migrateExertionState({ speciesId: "grazer", lifeStage: "old", health: 30, healthCap: 70, fatigue: 100, sprintEnergy: 0, emergencyReserve: 1 });
  initializeMetabolism(old).muscleGlycogen = 0; old.sprintEnergy = 0;
  for (let tick = 10; tick < 18; tick++) { applyExertion(old, exertionMode(old, true), tick, () => 1); old.metabolism.muscleGlycogen = 0; old.sprintEnergy = 0; }
  assert.ok(old.health < 30); assert.ok(old.healthCap <= 70);
});

test("collapse prevents recovery and rest does not create muscle glycogen", () => {
  const animal = migrateExertionState({ speciesId: "grazer", energy: 100, fatigue: 100, sprintEnergy: 0, emergencyReserve: 0, collapseUntil: 15, sprintRecoveryBlockedUntil: 25 });
  initializeMetabolism(animal).muscleGlycogen = 0; animal.sprintEnergy = 0;
  assert.equal(recoverExertion(animal, true, 14, 8), "collapse");
  assert.deepEqual([animal.emergencyReserve, animal.fatigue, animal.sprintEnergy], [0, 100, 0]);
  for (let tick = 15; tick < 20; tick++) assert.equal(recoverExertion(animal, true, tick, 8), "emergency");
  assert.equal(animal.emergencyReserve, 1); assert.equal(animal.fatigue, 100); assert.equal(animal.sprintEnergy, 0);
  for (let tick = 20; tick < 33; tick++) recoverExertion(animal, true, tick, 8);
  assert.equal(animal.fatigue, 0); assert.equal(animal.sprintEnergy, 0);
  assert.equal(recoverExertion(animal, true, 33, 8), "recovered"); assert.equal(animal.sprintEnergy, 0);
});

test("muscle controls sprint speed while endurance controls sustainable duration", () => {
  const lean = { speciesId: "grazer", sprintEnergy: 100, fatigue: 0, muscleMass: 25, leanMass: 60, enduranceFitness: .2 };
  const trained = { ...lean, muscleMass: 43, enduranceFitness: .9 };
  const leanSprint = exertionMode(lean, true), trainedSprint = exertionMode(trained, true);
  assert.ok(leanSprint.speedMultiplier >= 2 && leanSprint.speedMultiplier <= 5);
  assert.ok(trainedSprint.speedMultiplier > leanSprint.speedMultiplier);
  assert.ok(trainedSprint.drain < leanSprint.drain);
});
