import test from "node:test";
import assert from "node:assert/strict";
import { disposeOwnedTree, markResource, RESOURCE_OWNERSHIP } from "../src/resource-ownership.js";

const resource = (ownership) => { const value = { disposed: 0, dispose() { this.disposed += 1; } }; return markResource(value, ownership); };
test("removing one entity disposes owned resources without breaking shared resources", () => { const shared = resource(RESOURCE_OWNERSHIP.shared), ownedA = resource(RESOURCE_OWNERSHIP.entity), ownedB = resource(RESOURCE_OWNERSHIP.entity); const rootA = { traverse(fn) { fn({ geometry: shared, material: ownedA }); } }, rootB = { traverse(fn) { fn({ geometry: shared, material: ownedB }); } }; disposeOwnedTree(rootA); assert.equal(ownedA.disposed, 1); assert.equal(shared.disposed, 0); assert.equal(ownedB.disposed, 0); disposeOwnedTree(rootB); assert.equal(ownedB.disposed, 1); assert.equal(shared.disposed, 0); });
test("repeated reset disposal returns owned-resource balance to baseline", () => { let live = 0; for (let cycle = 0; cycle < 20; cycle++) { const owned = markResource({ dispose() { live -= 1; } }, RESOURCE_OWNERSHIP.chunk); live += 1; disposeOwnedTree({ traverse(fn) { fn({ geometry: owned }); } }); assert.equal(live, 0); } });
