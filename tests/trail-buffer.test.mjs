import test from "node:test";
import assert from "node:assert/strict";
import { FixedTrailBuffer, updateTrailGeometry } from "../src/trail-buffer.js";

test("trail geometry identity and fixed position storage remain stable", () => { const trail = new FixedTrailBuffer(4), geometry = { setDrawRange(start, count) { this.range = [start, count]; } }, attribute = { needsUpdate: false }, positions = trail.positions; trail.sample(1, 2, 3, 0); assert.equal(updateTrailGeometry(geometry, attribute, trail), geometry); trail.sample(2, 2, 3, 1); assert.equal(updateTrailGeometry(geometry, attribute, trail), geometry); assert.equal(trail.positions, positions); assert.deepEqual(geometry.range, [0, 2]); });
test("ordinary trail samples allocate no point or Vector3 arrays and skip stationary duplicates", () => { const trail = new FixedTrailBuffer(3); assert.equal(trail.sample(1, 2, 3, 0), true); assert.equal(trail.sample(1, 9, 3, 1), false); assert.equal(trail.count, 1); assert.ok(trail.positions instanceof Float32Array); });
