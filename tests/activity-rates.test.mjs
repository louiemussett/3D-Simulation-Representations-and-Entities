import test from "node:test";
import assert from "node:assert/strict";
import { ACTIVITY_COMMIT_TICKS, carcassMeal, carnivoreActivityMode, digestionRate, forageBite, locomotionFatigueScale, passiveFatigueRecovery, restRecovery, seedChanceForBite } from "../src/activity-rates.js";

test("grazing uses small bites and carcass feeding remains body-mass bounded", () => {
  assert.ok(forageBite("grass") < .16); assert.ok(forageBite("shrub") < .11);
  assert.ok(carcassMeal(42) <= 42 * .05);
  assert.ok(ACTIVITY_COMMIT_TICKS.feeding >= 12); assert.ok(ACTIVITY_COMMIT_TICKS.carcassFeeding >= 12);
});

test("active forage intake scales with herbivore body mass", () => {
  assert.ok(forageBite("grass", 65) > forageBite("grass", 16) * 4 - 1e-9);
  assert.ok(forageBite("grass", 390) > forageBite("grass", 65) * 5);
  assert.ok(forageBite("shrub", 65) < forageBite("grass", 65));
});

test("a Valley Grazer can cover daily maintenance during a normal feeding period", () => {
  const activeFeedingHours = 4;
  const assimilatedCalories = forageBite("grass", 65) * 60 * activeFeedingHours * 4200 * 1.25;
  const approximateDailyMaintenance = 65 * 1.15 * 24;
  assert.ok(assimilatedCalories > approximateDailyMaintenance);
});

test("meaningful fatigue recovery requires sustained rest", () => {
  const sheltered = restRecovery({ sheltered: true, stomach: 60 });
  assert.ok(passiveFatigueRecovery() < sheltered.fatigue);
  assert.ok(sheltered.fatigue <= 2.5); assert.ok(sheltered.energy < .5); assert.ok(sheltered.health < .25);
  assert.ok(40 / sheltered.fatigue > 12);
});

test("ordinary locomotion is sustainable while sprinting retains its full fatigue load", () => {
  assert.equal(locomotionFatigueScale("sprint"), 1);
  assert.ok(locomotionFatigueScale("walk") < locomotionFatigueScale("stalk"));
  assert.ok(locomotionFatigueScale("walk") <= .2);
  assert.ok(locomotionFatigueScale("walk", true) > locomotionFatigueScale("walk"));
});

test("smaller bites preserve seed probability per consumed biomass", () => {
  const small = forageBite("grass"), chance = seedChanceForBite(small);
  assert.ok(chance > 0 && chance < .35);
  assert.ok(Math.abs((1 - Math.pow(1 - chance, .16 / small)) - .35) < 1e-10);
});
test("a medium carnivore takes a substantial bounded carcass meal over an hour", () => { assert.ok(carcassMeal(42) * 60 >= 1.8); assert.ok(carcassMeal(42) * 60 < 2.1); });
test("carnivore digestion is slower than continuous herbivore digestion", () => { assert.ok(digestionRate("hunter", 70) < digestionRate("grazer", 70) * .5); });
test("satiated carnivores alternate purposeful activity and conservation by ecological hour", () => { assert.equal(carnivoreActivityMode(1, 0, 10), "patrol"); assert.equal(carnivoreActivityMode(10, 0, 10), "conserve"); assert.equal(carnivoreActivityMode(10, 0, 60), "hunt"); });
test("a satiated hunter reaches hunting hunger on a multi-day rather than hourly cycle", () => {
  let stomach = 68;
  for (let hour = 0; hour < 96; hour += 1) stomach -= digestionRate("hunter", stomach);
  const fourDayHunger = Math.max(0, (68 - stomach) * 1.65); assert.ok(fourDayHunger < 35);
  for (let hour = 96; hour < 120; hour += 1) stomach -= digestionRate("hunter", stomach);
  const fiveDayHunger = Math.max(0, (68 - stomach) * 1.65); assert.ok(fiveDayHunger >= 35);
});
