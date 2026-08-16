import test from "node:test";
import assert from "node:assert/strict";
import { initialBodyTemperature, migrateTemperatureState, terrainThermalEffect, thermalDrive, updateBodyTemperature, updateThermalExposure } from "../src/thermoregulation.js";

test("grazers and hunters have distinct normal body temperatures", () => { assert.notEqual(initialBodyTemperature("grazer"), initialBodyTemperature("hunter")); assert.equal(thermalDrive("grazer", initialBodyTemperature("grazer")).status, "comfortable"); assert.equal(thermalDrive("hunter", initialBodyTemperature("hunter")).status, "comfortable"); });
test("water woodland wetland and snow cool while hot desert ground warms", () => { assert.ok(terrainThermalEffect({ waterDepth: .2 }) < 0); assert.ok(terrainThermalEffect({ woodland: true }) < 0); assert.ok(terrainThermalEffect({ wetland: true }) < 0); assert.ok(terrainThermalEffect({ terrainClass: "snow" }) < 0); assert.ok(terrainThermalEffect({ sandy: true, temperature: 34 }) > 0); assert.ok(terrainThermalEffect({}, true) < 0); });
test("movement fullness mating and crowding warm while drinking cools", () => { const animal = { speciesId: "grazer", bodyTemperature: 38.6, stomach: 95 }; const warm = updateBodyTemperature(animal, { ambientTemperature: 18, movementIntensity: 1, mating: true, nearbyAnimals: 7 }); const cool = updateBodyTemperature({ ...animal, stomach: 40 }, { ambientTemperature: 18, drinking: true }); assert.ok(warm.bodyTemperature > animal.bodyTemperature); assert.ok(cool.bodyTemperature < animal.bodyTemperature); assert.ok(warm.sources.surrounded > warm.sources.proximity); });
test("older saves receive deterministic temperature defaults", () => { const animal = migrateTemperatureState({ speciesId: "hunter" }); assert.equal(animal.bodyTemperature, initialBodyTemperature("hunter")); assert.equal(animal.thermalStatus, "comfortable"); });
test("dangerous temperature reduces health gradually instead of killing instantly", () => {
  let exposureHours = 0, health = 100;
  for (let hour = 0; hour < 10; hour += 1) { const result = updateThermalExposure("grazer", 32, exposureHours); exposureHours = result.exposureHours; health -= result.healthDamage; }
  assert.equal(exposureHours, 10);
  assert.ok(health > 50, `health after ten extreme-cold hours was ${health}`);
});
test("thermal injury has a three-hour grace period and recovers after warming", () => {
  let state = updateThermalExposure("hunter", 44, 0); assert.equal(state.healthDamage, 0);
  state = updateThermalExposure("hunter", 44, state.exposureHours); assert.equal(state.healthDamage, 0);
  state = updateThermalExposure("hunter", 44, state.exposureHours); assert.equal(state.healthDamage, 0);
  state = updateThermalExposure("hunter", 44, state.exposureHours); assert.ok(state.healthDamage > 0); assert.equal(state.cause, "heat stress");
  const recovered = updateThermalExposure("hunter", 38.2, state.exposureHours); assert.ok(recovered.exposureHours < state.exposureHours); assert.equal(recovered.healthDamage, 0);
});
