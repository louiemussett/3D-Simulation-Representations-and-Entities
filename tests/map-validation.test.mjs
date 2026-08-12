import test from "node:test";
import assert from "node:assert/strict";
import { connectedComponents, nearestResourceDistance, validateMap } from "../src/map-validation.js";

function cell(id, x, options = {}) { return { id, x, z: 0, elevation: 0, slope: 0, moisture: .5, temperature: 15, biomass: 0, water: false, neighbours: [], ...options }; }
function connect(a, b) { a.neighbours.push(b); b.neighbours.push(a); }

test("map validation proves reciprocal connected topology and spawn resources", () => {
  const a = cell(1, 0, { biomass: .5 }), b = cell(2, 1), c = cell(3, 2, { water: true, drinkable: true, waterDepth: .1 }); connect(a, b); connect(b, c);
  const world = { cells: [a, b, c], animals: [{ id: "g1", alive: true, speciesId: "grazer", sex: "F", x: 0, z: 0 }], hexWorld: { lookup: () => a } };
  const result = validateMap(world, { resourceBudget: 4 });
  assert.equal(result.valid, true);
  assert.equal(result.metrics.traversableComponents, 1);
  assert.equal(result.spawnChecks[0].foodDistance, 0);
  assert.equal(result.spawnChecks[0].waterDistance, 2);
});

test("map validation detects broken neighbours, invalid fields and isolation", () => {
  const a = cell("a", 0), b = cell("b", 1, { temperature: Number.NaN }); a.neighbours.push(b);
  const result = validateMap({ cells: [a, b], animals: [] });
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /not reciprocal/);
  assert.match(result.errors.join("\n"), /invalid temperature/);
  assert.equal(connectedComponents([a, b]).length, 1);
  assert.equal(nearestResourceDistance(a, (item) => item.water, undefined, 2), null);
});
