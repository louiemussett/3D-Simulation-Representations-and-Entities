import test from "node:test";
import assert from "node:assert/strict";
import { advanceAntlerDevelopment, antlerAgeFactor, antlerRenderProfile, antlerStage, migrateAntlerDevelopment } from "../src/antler-development.js";
import { animalStructureKey } from "../src/animal-visual-structure.js";
import { shedAntlerHistoryDeposit } from "../src/environmental-history.js";

const stag = (overrides = {}) => ({ id: "stag-1", speciesId: "valley-grazer-updated", sex: "M", lifeStage: "adult", age: 5 * 365, health: 100, energy: 100, hydration: 100, bodyCondition: 1, alive: true, x: 2, z: 3, ...overrides });

test("antler potential is deterministic and limited to eligible updated stags", () => {
  const first = stag(), second = stag();
  assert.deepEqual(migrateAntlerDevelopment(first, 42).genes, migrateAntlerDevelopment(second, 42).genes);
  assert.equal(migrateAntlerDevelopment(stag({ sex: "F" }), 42), null);
  assert.equal(migrateAntlerDevelopment(stag({ lifeStage: "juvenile" }), 42), null);
});

test("age uses a maturation envelope rather than linear unlimited growth", () => {
  assert.ok(antlerAgeFactor(2 * 365) < antlerAgeFactor(5 * 365));
  assert.equal(antlerAgeFactor(6 * 365), 1);
  assert.ok(antlerAgeFactor(12 * 365) < 1);
});

test("the seasonal cycle grows velvet, hardens it, then casts it", () => {
  assert.equal(antlerStage({ season: "Spring", dayOfSeason: 1, days: 92 }).stage, "cast");
  assert.equal(antlerStage({ season: "Summer", dayOfSeason: 80, days: 92 }).stage, "mineralising");
  assert.equal(antlerStage({ season: "Autumn", dayOfSeason: 20, days: 91 }).stage, "hard");
  assert.equal(antlerStage({ season: "Winter", dayOfSeason: 89, days: 90 }).stage, "cast");
});

test("nutrition affects growth-year phenotype without shrinking hardened antlers", () => {
  const healthy = stag(), poor = stag({ health: 45, energy: 20, hydration: 45, bodyCondition: .55 });
  for (const animal of [healthy, poor]) migrateAntlerDevelopment(animal, 7);
  for (let index = 0; index < 30; index += 1) {
    advanceAntlerDevelopment(healthy, { calendar: { season: "Spring", dayOfSeason: 70, days: 92, year: 1 }, worldSeed: 7, elapsedHours: 24 });
    advanceAntlerDevelopment(poor, { calendar: { season: "Spring", dayOfSeason: 70, days: 92, year: 1 }, worldSeed: 7, elapsedHours: 24 });
  }
  assert.ok(antlerRenderProfile(healthy).size > antlerRenderProfile(poor).size);
  const before = healthy.antlers.annual.conditionInvestment;
  advanceAntlerDevelopment(healthy, { calendar: { season: "Autumn", dayOfSeason: 20, days: 91, year: 1 }, worldSeed: 7, elapsedHours: 500 });
  assert.equal(healthy.antlers.annual.conditionInvestment, before);
});

test("casting creates one evidence-backed trace and changes visual structure", () => {
  const animal = stag(); migrateAntlerDevelopment(animal, 9);
  advanceAntlerDevelopment(animal, { calendar: { season: "Winter", dayOfSeason: 60, days: 90, year: 1 }, worldSeed: 9 });
  const hardKey = animalStructureKey(animal);
  advanceAntlerDevelopment(animal, { calendar: { season: "Winter", dayOfSeason: 89, days: 90, year: 1 }, worldSeed: 9 });
  assert.equal(animal.antlers.justShed, true);
  assert.notEqual(animalStructureKey(animal), hardKey);
  assert.equal(shedAntlerHistoryDeposit(animal, { id: 4, substrate: "soil" }, 100)?.kind, "shed-antler");
});
