import test from "node:test";
import assert from "node:assert/strict";
import { AirborneScentField, castingDestination, deterministicIntermittency, localWindVector } from "../src/scent-model.js";

test("local wind is modified by relief and vegetation", () => {
  const open = localWindVector({ x: 0, z: 0, elevation: 0, windExposure: .8, neighbours: [{ x: 1, z: 0, elevation: 0 }, { x: 0, z: 1, elevation: 1 }] }, { baseX: 1, baseZ: 0, speed: 1 });
  const forest = localWindVector({ x: 0, z: 0, elevation: 0, canopyCover: .9, windShelter: .7, neighbours: [{ x: 1, z: 0, elevation: 0 }, { x: 0, z: 1, elevation: 1 }] }, { baseX: 1, baseZ: 0, speed: 1 });
  assert.ok(open.speed > forest.speed); assert.notEqual(open.terrainDeflection, 0); assert.equal(forest.informationBoundary, "local-environment-only");
});

test("airborne scent advects downwind while retaining a bounded source plume", () => {
  const a = { id: 1, x: 0, z: 0 }, b = { id: 2, x: 1, z: 0 }, cells = new Map([[1, a], [2, b]]), field = new AirborneScentField(); a.neighbours = [b]; b.neighbours = [a];
  field.deposit(1, { sourceId: "prey", speciesId: "grazer", guild: "grazer", concentration: 1, ageHours: 0 });
  field.advance({ cellFor: id => cells.get(id), neighboursFor: cell => cell.neighbours, windAt: () => ({ x: 1, z: 0, speed: 1, directionX: 1, directionZ: 0 }), elapsedHours: 1 });
  assert.ok(field.cells.get(2)?.some(item => item.sourceId === "prey")); assert.ok(field.cells.size <= field.maximumCells);
});

test("intermittency is deterministic and produces observer-owned plume evidence", () => {
  const first = deterministicIntermittency({ sourceId: "A", observerId: "B", cellId: 2, tick: 12, concentration: 1, turbulence: .4 });
  assert.deepEqual(first, deterministicIntermittency({ sourceId: "A", observerId: "B", cellId: 2, tick: 12, concentration: 1, turbulence: .4 }));
  const cell = { id: 2, x: 1, z: 0 }, field = new AirborneScentField(); field.deposit(2, { sourceId: "A", speciesId: "grazer", guild: "grazer", concentration: 5, windX: 1, windZ: 0 });
  const observation = field.observe(cell, { id: "B", x: 1, z: 0 }, { tick: 12, guild: "grazer" });
  assert.equal(observation.airborne, true); assert.equal(observation.x, 1); assert.equal(observation.informationBoundary, "airborne-plume-at-observer");
});

test("casting alternates crosswind without using a hidden source position", () => {
  const observer = { id: "hunter", x: 0, z: 0 }, wind = { x: 1, z: 0 };
  const first = castingDestination(observer, wind, { tick: 2, lastDetectionTick: 0 }), second = castingDestination(observer, wind, { tick: 4, lastDetectionTick: 0 });
  assert.equal(first.z, -second.z); assert.equal(first.informationBoundary, "observer-wind-and-scent-history-only");
});
