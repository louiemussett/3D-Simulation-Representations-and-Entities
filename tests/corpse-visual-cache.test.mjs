import test from "node:test";
import assert from "node:assert/strict";
import { CorpseRenderCache, corpseVisualStage } from "../src/corpse-visual-cache.js";

test("corpse stages cover fresh, decaying, skeleton and removed", () => {
  assert.equal(corpseVisualStage({ age: 1, biomass: 9, initialBiomass: 10 }), "fresh");
  assert.equal(corpseVisualStage({ age: 30, biomass: 5, initialBiomass: 10 }), "decaying");
  assert.equal(corpseVisualStage({ eaten: true, biomass: 0, initialBiomass: 10 }), "skeleton");
  assert.equal(corpseVisualStage({ removed: true }), "removed");
});

test("minor updates retain identity while stage transitions replace visuals", () => {
  const disposed = [], cache = new CorpseRenderCache((visual) => disposed.push(visual));
  const create = (_, stage) => ({ stage, visible: false });
  const update = (visual) => { visual.visible = true; };
  const corpse = { id: "c", age: 1, biomass: 9, initialBiomass: 10 };
  const first = cache.update(corpse, create, update);
  assert.equal(cache.update({ ...corpse, biomass: 8 }, create, update), first);
  const decaying = cache.update({ ...corpse, age: 30, biomass: 7 }, create, update);
  assert.notEqual(decaying, first);
  const skeleton = cache.update({ ...corpse, biomass: 0, eaten: true }, create, update);
  assert.notEqual(skeleton, decaying);
  assert.deepEqual(disposed, [first, decaying]);
  cache.clear(); assert.deepEqual(disposed, [first, decaying, skeleton]);
});

test("hide, retain and removal clean persistent entries", () => {
  const disposed = [], cache = new CorpseRenderCache((visual) => disposed.push(visual));
  const create = () => ({ visible: true });
  const update = (visual) => { visual.visible = true; };
  const a = cache.update({ id: "a", age: 1, biomass: 2, initialBiomass: 2 }, create, update);
  cache.update({ id: "b", age: 1, biomass: 2, initialBiomass: 2 }, create, update);
  cache.hideAll(); assert.equal(a.visible, false);
  cache.retain(new Set(["b"])); assert.equal(cache.entries.has("a"), false); assert.equal(disposed.length, 1);
});
