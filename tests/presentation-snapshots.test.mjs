import test from "node:test";
import assert from "node:assert/strict";
import { PresentationSnapshotCache } from "../src/presentation-snapshots.js";

test("semantic presentation derives at most once per animal and tick", () => { const cache = new PresentationSnapshotCache(), animal = { id: "a" }; let calls = 0; const derive = () => { calls += 1; return {}; }; assert.equal(cache.build(animal, 8, "laboratory", derive), cache.build(animal, 8, "laboratory", derive)); assert.equal(calls, 1); assert.equal(cache.count(8, "a"), 1); cache.build(animal, 9, "laboratory", derive); assert.equal(calls, 2); });
