import test from "node:test";
import assert from "node:assert/strict";
import { BADGED_ACTIONS, StructuralRootCache } from "../src/animal-visual-structure.js";

test("transient state changes retain the same animal root", () => { const cache = new StructuralRootCache(), create = () => ({}), update = () => {}; const animal = { id: "a", speciesId: "grazer", lifeStage: "adult", emotion: "calm" }; const root = cache.reconcile(animal, create, update); for (const patch of [{ emotion: "fear" }, { attacking: true }, { pregnant: true }, { healthTier: "critical" }, { socialSignal: "alarm" }]) { Object.assign(animal, patch); assert.equal(cache.reconcile(animal, create, update), root); } assert.equal(cache.created, 1); });
test("only structurally distinct stages replace roots", () => { const cache = new StructuralRootCache(), animal = { id: "a", speciesId: "grazer", lifeStage: "juvenile" }; const first = cache.reconcile(animal, () => ({}), () => {}); animal.lifeStage = "adult"; assert.notEqual(cache.reconcile(animal, () => ({}), () => {}), first); });
test("badges are limited to visually ambiguous actions", () => { assert.deepEqual([...BADGED_ACTIONS], ["blocked", "listen"]); });
