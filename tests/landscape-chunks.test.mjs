import test from "node:test";
import assert from "node:assert/strict";
import { chunkKeyAt, LandscapeDirtyState, ReusablePositionBuffer } from "../src/landscape-chunks.js";

test("chunk boundaries map deterministically on both sides of the origin", () => {
  assert.equal(chunkKeyAt(-120, -120, 120, 24), "0,0");
  assert.equal(chunkKeyAt(-96.001, -96.001, 120, 24), "0,0");
  assert.equal(chunkKeyAt(-96, -96, 120, 24), "1,1");
  assert.equal(chunkKeyAt(119.9, 119.9, 120, 24), "9,9");
});

test("observer-only changes do not dirty landscape data", () => {
  const state = new LandscapeDirtyState(); state.register("0,0");
  const before = { ...state.versions };
  const observer = { x: 2, z: 3, orientation: 1, entityFocus: true }; observer.x = 20; observer.orientation = 2; observer.entityFocus = false;
  assert.deepEqual(state.versions, before); assert.deepEqual(state.take("vegetation"), []);
});

test("terrain water and vegetation dirtiness remain independent and bounded", () => {
  const state = new LandscapeDirtyState(); for (const key of ["0,0", "1,0"]) state.register(key);
  state.mark("water", "1,0"); state.mark("vegetation", "0,0");
  assert.deepEqual(state.take("water"), ["1,0"]); assert.deepEqual(state.take("vegetation"), ["0,0"]); assert.deepEqual(state.take("terrain"), []);
  state.markAll("terrain"); assert.deepEqual(state.take("terrain"), ["0,0", "1,0"]);
});

test("fog position storage keeps identity, bounds writes and resets draw count", () => {
  const buffer = new ReusablePositionBuffer(2), identity = buffer.array;
  assert.equal(buffer.push(1, 2, 3), true); assert.equal(buffer.push(4, 5, 6), true); assert.equal(buffer.push(7, 8, 9), false);
  buffer.reset(); assert.equal(buffer.vertices, 0); assert.equal(buffer.array, identity); assert.equal(buffer.push(9, 8, 7), true);
});

test("save/load and reset clear old dirty keys before registering the new world", () => {
  const state = new LandscapeDirtyState(); state.register("old"); state.markAll("terrain"); state.clear(); state.register("new"); state.markAll("vegetation");
  assert.deepEqual([...state.keys], ["new"]); assert.deepEqual(state.take("terrain"), []); assert.deepEqual(state.take("vegetation"), ["new"]);
});

test("a boundary data change dirties only its owning chunk", () => {
  const state = new LandscapeDirtyState(), left = chunkKeyAt(-96.001, 0, 120, 24), right = chunkKeyAt(-96, 0, 120, 24);
  state.mark("vegetation", right);
  assert.notEqual(left, right); assert.deepEqual(state.take("vegetation"), [right]);
});
