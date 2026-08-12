import test from "node:test";
import assert from "node:assert/strict";
import { experimentRecord, summarizeExperiment } from "../src/experiment-metrics.js";

test("experiment summary reports populations, boundaries, groups, stocks and actions", () => {
  const world = { worldSchema: 2, seed: 7, rngState: 9, tick: 24, day: 2, births: 1, deaths: 0, worldSetup: { size: 20 }, cells: [{ biomass: 2 }], corpses: [{ biomass: 1 }], animals: [
    { id: "a", alive: true, speciesId: "grazer", x: 9, z: 0, age: 10, health: 80, energy: 70, hydration: 60, groupId: "g", groupLeaderId: "a", groupGoal: "water", actionState: { key: "travel" } },
    { id: "b", alive: true, speciesId: "grazer", x: 7, z: 0, age: 12, health: 100, energy: 50, hydration: 80, groupId: "g", groupLeaderId: "a", groupGoal: "water", actionState: { key: "travel" } }
  ] };
  const summary = summarizeExperiment(world, { boundaryDistance: 2 });
  assert.equal(summary.species.grazer.population, 2);
  assert.equal(summary.species.grazer.boundaryResidents, 1);
  assert.equal(summary.groups.count, 1);
  assert.equal(summary.actions.travel, 2);
  assert.equal(summary.stocks.plantBiomass, 2);
  const record = experimentRecord({ world, mapValidation: { valid: true }, accounting: {}, hash: "abc", rendered: false });
  assert.equal(record.format, "rss-ecology-experiment-v1");
  assert.equal(record.authoritativeHash, "abc");
  assert.equal(record.renderingEnabled, false);
});
