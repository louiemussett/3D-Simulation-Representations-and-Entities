import test from "node:test";
import assert from "node:assert/strict";
import { carcassHydrationGain, dehydrationState, fluidDeficitPercent, forageHydrationGain, hourlyHydrationDemand, hourlyHydrationDemandBreakdown, HYDRATION_CAPACITY_MULTIPLIER, migrateHydrationCapacity, pregnancyHydrationMultiplier } from "../src/hydration-physiology.js";

const species = { thirstRate: .65, adultMass: 65 };

test("doubled water capacity roughly doubles time to the drinking threshold", () => {
  const hourly = hourlyHydrationDemand({ bodyMass: 65, actionState: { key: "rest", moving: false } }, species, { temp: 18 });
  assert.equal(HYDRATION_CAPACITY_MULTIPLIER, 2);
  assert.ok(18 / hourly >= 48 && 18 / hourly <= 72);
});

test("dehydration stages progressively impair traits before causing damage", () => {
  const hydrated = dehydrationState({ speciesId: "hunter", hydration: 75 }), mild = dehydrationState({ speciesId: "hunter", hydration: 64 });
  const moderate = dehydrationState({ speciesId: "hunter", hydration: 52 }), severe = dehydrationState({ speciesId: "hunter", hydration: 38 }), critical = dehydrationState({ speciesId: "hunter", hydration: 20 });
  assert.deepEqual([hydrated.key, mild.key, moderate.key, severe.key, critical.key], ["hydrated", "mild", "moderate", "severe", "critical"]);
  assert.ok(mild.speed > moderate.speed && moderate.speed > severe.speed && severe.speed > critical.speed);
  assert.equal(moderate.canMate, false); assert.equal(severe.canSprint, false); assert.equal(severe.canHunt, false);
  assert.equal(moderate.healthDamagePerHour, 0); assert.ok(severe.healthDamagePerHour > 0); assert.ok(critical.healthDamagePerHour > severe.healthDamagePerHour);
});

test("water reserve and clinical fluid deficit are separate values", () => {
  assert.equal(fluidDeficitPercent({ speciesId: "hunter", hydration: 50 }), 7);
  assert.ok(fluidDeficitPercent({ speciesId: "grazer", hydration: 50 }) > 7);
  assert.ok(fluidDeficitPercent({ speciesId: "grazer", hydration: 50 }) < 8);
});

test("grazers tolerate a larger clinical deficit than hunters", () => {
  const hunter = dehydrationState({ speciesId: "hunter", hydration: 25 });
  const grazer = dehydrationState({ speciesId: "grazer", hydration: 25 });
  assert.equal(hunter.key, "critical");
  assert.equal(grazer.key, "severe");
  assert.equal(hunter.fatalRisk, false);
  assert.equal(grazer.fatalRisk, false);
  assert.ok(grazer.loss > hunter.loss);
  assert.ok(grazer.speed > hunter.speed);
});

test("older saves preserve their deficit when migrated to doubled capacity", () => {
  const animal = migrateHydrationCapacity({ hydration: 80 });
  assert.equal(animal.hydration, 90); assert.equal(animal.hydrationCapacityMultiplier, 2);
  migrateHydrationCapacity(animal); assert.equal(animal.hydration, 90);
});

test("heat activity pregnancy and lactation increase water demand", () => {
  const ordinary = hourlyHydrationDemand({ bodyMass: 65, actionState: { key: "rest" } }, species, { temp: 18 });
  const demanding = hourlyHydrationDemand({ bodyMass: 65, lactation: 10, actionState: { key: "flee", moving: true } }, species, { temp: 32 }, { pregnancyNeedMultiplier: 1.25 });
  assert.ok(demanding > ordinary * 2);
});

test("pregnancy water demand rises by stage without using total pregnancy mass", () => {
  const early = pregnancyHydrationMultiplier({ speciesId: "grazer", pregnant: { age: 5, offspringCount: 1 } }, 60);
  const middle = pregnancyHydrationMultiplier({ speciesId: "grazer", pregnant: { age: 30, offspringCount: 1 } }, 60);
  const late = pregnancyHydrationMultiplier({ speciesId: "grazer", pregnant: { age: 55, offspringCount: 1 } }, 60);
  assert.deepEqual([early, middle, late], [1.04, 1.1, 1.22]);
});

test("moist forage supplies some but not unlimited hydration", () => {
  const dry = forageHydrationGain(.04 / 60, { plantType: "grass", moisture: .1 });
  const wet = forageHydrationGain(.04 / 60, { plantType: "grass", moisture: .9 });
  assert.ok(wet > dry); assert.ok(wet * 60 < species.thirstRate);
});

test("fresh prey supplies more water than old carrion", () => {
  const fresh = carcassHydrationGain(2, { age: 2 }, { speciesId: "hunter" });
  const old = carcassHydrationGain(2, { age: 90 }, { speciesId: "hunter" });
  assert.ok(fresh > old);
});

test("hydration demand attribution sums to the authoritative total", () => {
  const animal = { speciesId: "hunter", bodyMass: 42, actionState: { key: "chase", moving: true }, pregnant: { age: 70 }, lactation: 1, offspringIds: ["a", "b"] };
  const hunterSpecies = { thirstRate: .65, adultMass: 42 };
  const context = { pregnancyHydrationMultiplier: 1.18 }, weather = { temp: 31 };
  const parts = hourlyHydrationDemandBreakdown(animal, hunterSpecies, weather, context);
  assert.ok(Math.abs(parts.basal + parts.thermal + parts.activity + parts.pregnancy + parts.lactation - parts.total) < 1e-10);
  assert.equal(parts.total, hourlyHydrationDemand(animal, hunterSpecies, weather, context));
  assert.ok(parts.thermal > 0 && parts.activity > 0 && parts.pregnancy > 0 && parts.lactation > 0);
});
