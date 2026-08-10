import test from "node:test";
import assert from "node:assert/strict";
import { SPECIES_IDS } from "../src/species-registry.js";
import { advanceMetabolism, fillMetabolicReserves, ingestNutrients, initializeMetabolism, metabolicJourneyBudget, metabolicPresentation, predictiveHunger, SPECIES_METABOLIC_TRAITS, spendMetabolicEnergy } from "../src/metabolic-system.js";

const animal = (speciesId = "grazer") => ({ speciesId, sex: "F", lifeStage: "adult", bodyMass: 65, leanMass: 50, fatMass: 15, muscleMass: 30, bodyFatPercent: 23, stomach: 35, health: 100, healthCap: 100, fatigue: 10, pregnant: null, lactation: 0 });

test("all species have explicit metabolic strategies", () => {
  assert.equal(Object.keys(SPECIES_METABOLIC_TRAITS).length, 22);
  for (const id of SPECIES_IDS) assert.ok(SPECIES_METABOLIC_TRAITS[id], id);
});

test("ingestion enters the gut without immediately creating accessible fuel", () => {
  const subject = animal(), metabolism = initializeMetabolism(subject), accessible = metabolism.bloodFuel + metabolism.liverGlycogen;
  ingestNutrients(subject, { calories: 1000, carbohydrate: .2, fat: .1, protein: .1, fermentable: .6 });
  assert.equal(metabolism.bloodFuel + metabolism.liverGlycogen, accessible);
  assert.ok(subject.stomachCalories > 1000);
});

test("dependants begin well fed without adult sprint or adrenaline reserves", () => {
  const baby = { ...animal(), lifeStage: "dependent", bodyMass: 8, leanMass: 6.5, fatMass: 1.5, muscleMass: 3, stomach: 80, emergencyReserve: 0 };
  const metabolism = initializeMetabolism(baby), presentation = metabolicPresentation(baby);
  assert.ok(baby.energy >= 90);
  assert.ok(presentation.gut >= .7);
  assert.equal(metabolism.muscleGlycogen, 0);
  assert.equal(baby.sprintEnergy, 0);
  assert.equal(baby.emergencyReserve, 0);
});

test("juveniles begin with age-appropriate fuel and partial muscle glycogen", () => {
  const juvenile = { ...animal(), lifeStage: "juvenile", stomach: 65 };
  const presentation = metabolicPresentation(juvenile);
  assert.ok(presentation.blood >= .89);
  assert.ok(presentation.liver >= .85);
  assert.ok(presentation.muscle > .7 && presentation.muscle < .75);
});

test("protected founders can begin with full stomach and rapid fuel reserves", () => {
  const subject = animal("hunter"), metabolism = fillMetabolicReserves(subject, { gut: 1, blood: 1, liver: 1 });
  const presentation = metabolicPresentation(subject);
  assert.equal(presentation.gut, 1);
  assert.equal(presentation.blood, 1);
  assert.equal(presentation.liver, 1);
  assert.equal(subject.stomach, 100);
  assert.equal(subject.accessibleFuel, 100);
  assert.ok(metabolism.cumulative.ingested >= 0);
});

test("sprinting preferentially consumes muscle glycogen and creates anaerobic debt", () => {
  const subject = animal("hunter"), metabolism = initializeMetabolism(subject), muscleBefore = metabolism.muscleGlycogen;
  const result = spendMetabolicEnergy(subject, 60, "sprint");
  assert.ok(result.mix.muscle > result.mix.blood);
  assert.ok(metabolism.muscleGlycogen < muscleBefore);
  assert.ok(metabolism.anaerobicDebt > 0);
});

test("fasting progresses through fat and eventually functional protein", () => {
  const subject = animal(), metabolism = initializeMetabolism(subject);
  Object.assign(metabolism, { bloodFuel: 0, liverGlycogen: 0, muscleGlycogen: 0 });
  Object.assign(metabolism.gut, { carbohydrate: 0, fat: 0, protein: 0, fermentation: 0 });
  subject.fatMass = .01;
  spendMetabolicEnergy(subject, 500, "basal");
  assert.ok(metabolism.proteinCatabolisedKg > 0);
  assert.ok(subject.muscleMass < 30);
});

test("prolonged critical fat damages health and persistently impairs female fertility", () => {
  const subject = animal("hunter"); subject.fatMass = .05; subject.leanMass = 39; subject.muscleMass = 25; initializeMetabolism(subject);
  Object.assign(subject.metabolism.gut, { carbohydrate: 0, fat: 0, protein: 0, fermentation: 0 }); subject.metabolism.bloodFuel = subject.metabolism.liverGlycogen = subject.metabolism.muscleGlycogen = 0;
  for (let hour = 0; hour < 110; hour++) advanceMetabolism(subject, { elapsedHours: 1 });
  assert.ok(subject.health < 100);
  assert.equal(subject.fertilityImpaired, true);
  subject.fatMass = 12; advanceMetabolism(subject, { elapsedHours: 1 }); assert.equal(subject.fertilityImpaired, true);
});

test("predictive hunger considers future gut fuel and body reserves", () => {
  const fed = animal(), hungry = animal(); initializeMetabolism(fed); initializeMetabolism(hungry);
  ingestNutrients(fed, { calories: 4000, fermentable: 1, carbohydrate: 0, fat: 0, protein: 0 });
  Object.assign(hungry.metabolism.gut, { carbohydrate: 0, fat: 0, protein: 0, fermentation: 0 }); hungry.metabolism.bloodFuel = 0; hungry.metabolism.liverGlycogen = 0; hungry.fatMass = .2;
  assert.ok(predictiveHunger(hungry) > predictiveHunger(fed));
});

test("journey forecasts distinguish available fuel from distance cost", () => {
  const subject = animal("dryland-runner"); initializeMetabolism(subject);
  assert.equal(metabolicJourneyBudget(subject, { distance: 2, sprint: true }).viable, true);
  subject.metabolism.bloodFuel = subject.metabolism.liverGlycogen = subject.metabolism.muscleGlycogen = 0; subject.fatMass = 0;
  assert.equal(metabolicJourneyBudget(subject, { distance: 20, sprint: true }).viable, false);
});

test("resting metabolism digests food and clears physiological debts", () => {
  const subject = animal(), metabolism = initializeMetabolism(subject); metabolism.anaerobicDebt = 60; metabolism.stressLoad = 50;
  const before = metabolicPresentation(subject);
  advanceMetabolism(subject, { elapsedHours: 1, resting: true });
  const after = metabolicPresentation(subject);
  assert.ok(after.anaerobicDebt < before.anaerobicDebt);
  assert.ok(after.stressLoad < before.stressLoad);
});
