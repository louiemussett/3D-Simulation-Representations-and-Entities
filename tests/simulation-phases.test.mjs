import test from "node:test";
import assert from "node:assert/strict";
import { MultiEntitySpatialIndex } from "../src/spatial-index.js";
import { assignDecisionOrder, rebuildOccupancy, runStableAnimalPhases } from "../src/simulation-phases.js";

function run(items) {
  const animals = items.map((item) => ({ ...item, seen: [] }));
  assignDecisionOrder(animals);
  const index = new MultiEntitySpatialIndex({ cellSize: 10, offset: 100 });
  let occupied;
  runStableAnimalPhases({
    animals,
    preSense: () => {}, prepareOutwardSignals: () => {},
    buildSnapshot: () => { index.rebuildAnimals(animals); occupied = rebuildOccupancy(animals, (a) => `${a.x},${a.z}`); },
    sense: (animal) => { animal.seen = index.queryAnimals(animal, 12).filter((other) => other.id !== animal.id).map((other) => `${other.id}@${other.x},${other.z}`).sort(); },
    interpretSignals: () => {},
    act: (animal) => { const destination = animal.moveTo; if (!destination || occupied.has(`${destination.x},${destination.z}`)) return; occupied.delete(`${animal.x},${animal.z}`); animal.x = destination.x; animal.z = destination.z; occupied.set(`${animal.x},${animal.z}`, animal.id); },
    postAction: () => {}, afterActions: () => {}
  });
  return { animals: Object.fromEntries(animals.map((a) => [a.id, a])), occupied };
}

test("sensing is independent of backing animal array order", () => {
  const input = [{ id: "a", alive: true, decisionOrder: 0, x: 9, z: 0 }, { id: "b", alive: true, decisionOrder: 1, x: 11, z: 0 }];
  const forward = run(input).animals, reversed = run([...input].reverse()).animals;
  assert.deepEqual(forward.a.seen, reversed.a.seen); assert.deepEqual(forward.b.seen, reversed.b.seen);
});

test("bucket crossings occur only after every animal used the stable snapshot", () => {
  const result = run([{ id: "a", alive: true, decisionOrder: 0, x: 9, z: 0, moveTo: { x: 30, z: 0 } }, { id: "b", alive: true, decisionOrder: 1, x: 11, z: 0 }]);
  assert.deepEqual(result.animals.b.seen, ["a@9,0"]); assert.equal(result.animals.a.x, 30);
});

test("sequential action occupancy remains valid", () => {
  const result = run([{ id: "a", alive: true, decisionOrder: 0, x: 0, z: 0, moveTo: { x: 1, z: 0 } }, { id: "b", alive: true, decisionOrder: 1, x: 2, z: 0, moveTo: { x: 1, z: 0 } }]);
  assert.equal(result.occupied.size, 2); assert.equal(result.occupied.get("1,0"), "a"); assert.equal(result.animals.b.x, 2);
});

test("fixed phase order is repeatable across long runs", () => {
  const simulate = () => { const animals = [{ id: "a", alive: true, decisionOrder: 0, x: 0, z: 0 }, { id: "b", alive: true, decisionOrder: 1, x: 2, z: 0 }]; for (let tick = 0; tick < 10000; tick++) { const result = run(animals); for (const animal of animals) { animal.x = result.animals[animal.id].x; animal.z = result.animals[animal.id].z; } } return animals; };
  assert.deepEqual(simulate(), simulate());
});

test("legacy animals receive persistent scheduling order without replacing existing order", () => {
  const animals = [{ id: "legacy-a", alive: true }, { id: "saved", alive: true, decisionOrder: 7 }, { id: "legacy-b", alive: true }];
  assert.equal(assignDecisionOrder(animals), 10);
  assert.deepEqual(animals.map((animal) => animal.decisionOrder), [8, 7, 9]);
});

test("seeded decisions are repeatable even if storage array order changes", () => {
  const execute = (reverse) => {
    let state = 12345;
    const random = () => { state = Math.imul(state ^ state >>> 15, 1 | state); state ^= state + Math.imul(state ^ state >>> 7, 61 | state); return ((state ^ state >>> 14) >>> 0) / 4294967296; };
    const animals = [{ id: "a", alive: true, decisionOrder: 0, x: 0, z: 0 }, { id: "b", alive: true, decisionOrder: 1, x: 4, z: 0 }];
    if (reverse) animals.reverse();
    for (let tick = 0; tick < 500; tick++) runStableAnimalPhases({ animals, preSense: () => {}, prepareOutwardSignals: () => {}, buildSnapshot: () => {}, sense: () => {}, interpretSignals: () => {}, act: (animal) => { animal.x += random() < .5 ? -1 : 1; }, postAction: () => {}, afterActions: () => {} });
    return Object.fromEntries(animals.map((animal) => [animal.id, animal.x]));
  };
  assert.deepEqual(execute(false), execute(true));
});
