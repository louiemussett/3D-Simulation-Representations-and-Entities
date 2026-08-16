import test from "node:test";
import assert from "node:assert/strict";
import { continuingMotionTarget, traversableNeighbourCells } from "../src/movement-candidates.js";

test("movement uses connected cells and never chooses standing still as a route", () => {
  const origin = { id: 1, x: 0, z: 0, waterDepth: 0, plantType: "grass" };
  const detour = { id: 2, x: -1, z: 0, waterDepth: 0, plantType: "grass" };
  const occupied = { id: 3, x: 1, z: 0, waterDepth: 0, plantType: "grass" };
  const deepWater = { id: 4, x: 0, z: 1, waterDepth: .8, plantType: "grass" };
  const tree = { id: 5, x: 0, z: -1, waterDepth: 0, plantType: "tree" };
  origin.neighbours = [detour, occupied, deepWater, tree];
  const world = { lookup: () => origin };
  assert.deepEqual(traversableNeighbourCells(world, origin, new Map([["3", "other"]]), (cell) => String(cell.id)), [detour]);
});

test("no connected traversable cell remains an explicit blocked result", () => {
  const origin = { id: 1, x: 0, z: 0, neighbours: [{ id: 2, waterDepth: 1, plantType: "grass" }] };
  assert.deepEqual(traversableNeighbourCells({ lookup: () => origin }, origin, new Map(), (cell) => String(cell.id)), []);
});

test("an unfinished valid one-cell move is retained until arrival", () => {
  const cell = { id: 2, x: 1, z: 0, waterDepth: 0, plantType: "grass" };
  const animal = { id: "a", motionTarget: { x: 1, z: 0, actionKey: "travel" } };
  assert.deepEqual(continuingMotionTarget({ lookup: () => cell }, animal, "travel", new Map(), (item) => String(item.id)), { x: 1, z: 0, actionKey: "travel" });
  assert.equal(continuingMotionTarget({ lookup: () => cell }, animal, "flee", new Map(), (item) => String(item.id)), null);
});
