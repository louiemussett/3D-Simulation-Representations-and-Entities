import { performance } from "node:perf_hooks";
import { MultiEntitySpatialIndex } from "../src/spatial-index.js";

const scenarios = [
  { name: "small", animals: 25, corpses: 100 },
  { name: "medium", animals: 100, corpses: 1000 },
  { name: "high", animals: 250, corpses: 5000 }
];

function percentile(values, fraction) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)] || 0;
}

function measure(work, repetitions = 25) {
  const values = [];
  for (let i = 0; i < repetitions; i++) { const start = performance.now(); work(); values.push(performance.now() - start); }
  return { averageMs: values.reduce((sum, value) => sum + value, 0) / values.length, p95Ms: percentile(values, .95), p99Ms: percentile(values, .99), maximumMs: Math.max(...values) };
}

function scenario({ name, animals: animalCount, corpses: corpseCount }) {
  const index = new MultiEntitySpatialIndex({ cellSize: 12, offset: 100000 });
  const animals = Array.from({ length: animalCount }, (_, id) => ({ id: `a-${id}`, x: id % 5, z: Math.floor(id / 5) % 5 }));
  const nearby = Array.from({ length: Math.min(8, corpseCount) }, (_, id) => ({ id: `near-${id}`, x: id % 4, z: Math.floor(id / 4), biomass: 10, initialBiomass: 10, age: 0 }));
  const distant = Array.from({ length: corpseCount - nearby.length }, (_, id) => ({ id: `far-${id}`, x: 1000 + id * 13, z: 1000, biomass: 10, initialBiomass: 10, age: 0 }));
  const corpses = [...nearby, ...distant]; index.rebuildCorpses(corpses);
  let candidates = 0;
  const perception = measure(() => { candidates = 0; for (const animal of animals) candidates += index.queryCorpses(animal, 24).length; });
  const corpseProcessing = measure(() => { let checksum = 0; for (const corpse of corpses) checksum += corpse.age + corpse.biomass; return checksum; });
  return { name, animals: animalCount, corpses: corpseCount, candidatesPerAnimal: candidates / animalCount, "tick.perception": perception, "tick.corpses": corpseProcessing };
}

console.log(JSON.stringify(scenarios.map(scenario), null, 2));
