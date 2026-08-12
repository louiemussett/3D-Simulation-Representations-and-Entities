import test from "node:test";
import assert from "node:assert/strict";
import { MultiEntitySpatialIndex, packSpatialCell } from "../src/spatial-index.js";

test("packed spatial keys are numeric and collision-free across signed local cells", () => {
  const keys = new Set();
  for (let z = -64; z <= 64; z += 1) for (let x = -64; x <= 64; x += 1) keys.add(packSpatialCell(x, z));
  assert.equal(keys.size, 129 * 129); assert.equal(typeof packSpatialCell(-3, 8), "number");
  const index = new MultiEntitySpatialIndex({ cellSize: 10 }); index.rebuildAnimals([{ id: "a", alive: true, x: -11, z: 22 }]);
  assert.ok([...index.animals.keys()].every(key => typeof key === "number"));
});

test("corpse query work depends on nearby rather than total corpses", () => {
  for (const farCount of [10, 100, 1000]) {
    const index = new MultiEntitySpatialIndex({ cellSize: 10, offset: 5000 });
    const nearby = [{ id: "a", x: 2, z: 0 }, { id: "b", x: -2, z: 0 }, { id: "c", x: 3, z: 3 }];
    const far = Array.from({ length: farCount }, (_, i) => ({ id: `far-${i}`, x: 1000 + i * 11, z: 1000 }));
    index.rebuildCorpses([...nearby, ...far]);
    assert.deepEqual(index.queryCorpses({ x: 0, z: 0 }, 8).map((x) => x.id), ["a", "b", "c"]);
  }
});

test("corpse membership updates on insert and removal", () => {
  const index = new MultiEntitySpatialIndex({ cellSize: 10 });
  index.rebuildCorpses([]); index.insertCorpse({ id: "new", x: 1, z: 1 });
  assert.equal(index.queryCorpses({ x: 0, z: 0 }, 3).length, 1);
  assert.equal(index.removeCorpse("new"), true);
  assert.equal(index.queryCorpses({ x: 0, z: 0 }, 3).length, 0);
});

test("ordinary animal and corpse queries safely reuse their result buffers", () => {
  const index = new MultiEntitySpatialIndex({ cellSize: 10 });
  index.rebuildAnimals([{ id: "animal", alive: true, x: 0, z: 0 }]);
  index.rebuildCorpses([{ id: "corpse", x: 0, z: 0 }]);
  const animals = index.queryAnimals({ x: 0, z: 0 }, 2), corpses = index.queryCorpses({ x: 0, z: 0 }, 2);
  assert.equal(index.queryAnimals({ x: 1, z: 1 }, 2), animals);
  assert.equal(index.queryCorpses({ x: 1, z: 1 }, 2), corpses);
});

test("queries exclude bucket neighbours outside the requested circle", () => {
  const index = new MultiEntitySpatialIndex({ cellSize: 10 });
  index.rebuildAnimals([{ id: "inside", alive: true, x: 3, z: 4 }, { id: "corner", alive: true, x: 6, z: 6 }]);
  assert.deepEqual(index.queryAnimals({ x: 0, z: 0 }, 5).map((item) => item.id), ["inside"]);
});
