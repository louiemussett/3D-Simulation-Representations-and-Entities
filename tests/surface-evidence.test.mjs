import test from "node:test";
import assert from "node:assert/strict";
import { advanceSurfaceMoisture, applyVegetationDisturbance, bleedingRate, migrateSurfaceState, movementEvidence, substrateContact, surfaceSubstrate } from "../src/surface-evidence.js";
import { CompactTraceField } from "../src/multimodal-communication.js";

test("surface moisture persists after rain and dries according to exposure", () => {
  const cell = migrateSurfaceState({ moisture: .2, substrate: "loam", slope: .05 });
  const initial = cell.surfaceMoisture;
  advanceSurfaceMoisture(cell, { rain: .8, temp: 12, wind: .2 }, 1); const wet = cell.surfaceMoisture;
  advanceSurfaceMoisture(cell, { rain: 0, temp: 31, wind: 1.1 }, 1);
  assert.ok(wet > initial); assert.ok(cell.surfaceMoisture < wet); assert.ok(cell.surfaceMoisture > 0);
});

test("substrate contacts distinguish mud from rock", () => {
  const animal = { speciesId: "grazer", bodyMass: 180 };
  const mud = substrateContact(animal, { wetland: true, surfaceMoisture: .9 }, { distance: 1, gait: "walk" });
  const rock = substrateContact(animal, { rocky: true, surfaceMoisture: .1 }, { distance: 1, gait: "walk" });
  assert.equal(mud.anatomy, "hoof"); assert.equal(surfaceSubstrate({ rocky: true }), "rock"); assert.ok(mud.footprintStrength > rock.footprintStrength);
});

test("movement generates path-consistent footprints scent and disturbance", () => {
  const cells = [{ id: 1, x: 0, surfaceMoisture: .82, wetland: true }, { id: 2, x: 1, surfaceMoisture: .82, wetland: true }];
  const evidence = movementEvidence({ id: "A", speciesId: "grazer", bodyMass: 120 }, { x: 0, z: 0 }, { x: 1.2, z: 0 }, x => cells[x < .6 ? 0 : 1], { gait: "walk", speed: .8 });
  assert.ok(evidence.some(item => item.kind === "footprint")); assert.ok(evidence.some(item => item.kind === "ground-scent"));
  assert.ok(evidence.every(item => item.sourceId === "A" && Number.isFinite(item.x) && Number.isFinite(item.z)));
});

test("stationary animals do not manufacture movement evidence", () => {
  assert.deepEqual(movementEvidence({ id: "A" }, { x: 1, z: 1 }, { x: 1, z: 1 }, () => ({ id: 1 })), []);
});

test("trace weathering uses local rain and substrate retention", () => {
  const field = new CompactTraceField();
  field.deposit(1, { kind: "footprint", sourceId: "A", x: 0, z: 0, substrate: "mud", intensity: 1 });
  field.deposit(2, { kind: "footprint", sourceId: "A", x: 10, z: 0, substrate: "rock", intensity: 1 });
  field.advance({ elapsedHours: 1, weatherAt: record => ({ rain: record.x === 0 ? .8 : 0, wind: 0 }) });
  assert.ok(field.recordsAt(1)[0].intensity < 1); assert.ok(field.recordsAt(2)[0].intensity < 1);
  assert.notEqual(field.recordsAt(1)[0].intensity, field.recordsAt(2)[0].intensity);
});

test("vegetation disturbance persists and gradually recovers", () => {
  const cell = { grassHeight: .8, surfaceMoisture: .4, substrate: "loam" };
  applyVegetationDisturbance(cell, { kind: "disturbance", intensity: .9, tick: 12 }); const disturbed = cell.vegetationDisturbance;
  advanceSurfaceMoisture(cell, { rain: 0, temp: 18, wind: .2 }, 4);
  assert.ok(disturbed > .4); assert.ok(cell.vegetationDisturbance < disturbed); assert.equal(cell.lastDisturbedTick, 12);
});

test("new tracks physically overwrite older tracks in the same cell", () => {
  const field = new CompactTraceField();
  field.deposit(1, { kind: "footprint", sourceId: "old", intensity: .8 });
  field.deposit(1, { kind: "footprint", sourceId: "new", intensity: .9 });
  const old = field.recordsAt(1).find(item => item.sourceId === "old");
  assert.ok(old.intensity < .8); assert.equal(old.overwrittenBy, "new");
});

test("injured moving animals leave blood trails", () => {
  const animal = { id: "A", speciesId: "grazer", bodyMass: 120, health: 55, injuries: [{ severity: .8, bleeding: .35 }] };
  const evidence = movementEvidence(animal, { x: 0, z: 0 }, { x: 1, z: 0 }, () => ({ id: 1, wetland: true, surfaceMoisture: .9 }), { gait: "walk" });
  assert.ok(bleedingRate(animal) > 0); assert.ok(evidence.some(item => item.kind === "blood"));
});

test("water crossings create entry exit and wake evidence while washing scent", () => {
  const land = { id: 1, substrate: "loam", surfaceMoisture: .4 }, water = { id: 2, water: true, waterDepth: .5 };
  const cellAt = x => x < .5 ? land : water, animal = { id: "A", speciesId: "hunter", bodyMass: 45 };
  const entry = movementEvidence(animal, { x: 0, z: 0 }, { x: 1, z: 0 }, cellAt, { speed: 1 });
  const wake = movementEvidence(animal, { x: .6, z: 0 }, { x: 1, z: 0 }, () => water, { speed: 1 });
  const exit = movementEvidence(animal, { x: 1, z: 0 }, { x: 0, z: 0 }, cellAt, { speed: 1, carriedWater: 1 });
  assert.ok(entry.some(item => item.kind === "water-entry")); assert.ok(wake.some(item => item.kind === "water-wake")); assert.ok(exit.some(item => item.kind === "water-exit"));
  assert.equal(wake.some(item => item.kind === "ground-scent"), false); assert.ok(exit.some(item => item.kind === "footprint" && item.wetTransfer === 1));
});
