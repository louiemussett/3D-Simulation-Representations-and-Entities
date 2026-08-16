import test from "node:test";
import assert from "node:assert/strict";
import { biologicalHistoryDeposits, boneHistoryDeposit, environmentalHistorySummary } from "../src/environmental-history.js";

test("biological deposits are deterministic and bounded", () => {
  const animal = { id: "A", speciesId: "grazer", alive: true, bodyMass: 120, x: 2, z: 3 }, cell = { id: 4, substrate: "soil" };
  const first = Array.from({ length: 120 }, (_, hour) => biologicalHistoryDeposits(animal, cell, hour)).flat();
  const second = Array.from({ length: 120 }, (_, hour) => biologicalHistoryDeposits(animal, cell, hour)).flat();
  assert.deepEqual(first, second); assert.ok(first.some(record => record.kind === "urine")); assert.ok(first.some(record => record.kind === "dung")); assert.ok(first.some(record => record.kind === "hair"));
});

test("birds shed sparse feathers rather than mammalian hair", () => {
  const records = Array.from({ length: 150 }, (_, hour) => biologicalHistoryDeposits({ id: "B", speciesId: "common-ostrich", alive: true, x: 0, z: 0 }, { id: 1 }, hour)).flat();
  assert.ok(records.some(record => record.kind === "feather")); assert.equal(records.some(record => record.kind === "hair"), false);
});

test("bones are deposited once when a skeleton is exposed", () => {
  const corpse = { id: "C", speciesId: "hunter", eaten: true, x: 1, z: 1 };
  assert.equal(boneHistoryDeposit(corpse, { id: 2 }, 20).kind, "bone"); corpse.historyBoneDeposited = true; assert.equal(boneHistoryDeposit(corpse, { id: 2 }, 21), null);
});

test("history summary separates timescales and hotspots", () => {
  const summary = environmentalHistorySummary({ 1: [{ kind: "dung", intensity: .8, ageHours: 12 }], 2: [{ kind: "bone", intensity: 1, ageHours: 9000 }] });
  assert.equal(summary.periods["last-day"], 1); assert.equal(summary.periods.older, 1); assert.equal(summary.hotspots[0].cellId, "2"); assert.equal(summary.informationBoundary, "laboratory-authoritative-history-only");
});

test("resting and rubbing can leave persistent site evidence", () => {
  const cell = { id: 4, substrate: "soil", surfaceMoisture: .3 };
  let bedding = [], rubbing = [];
  for (let hour = 0; hour < 200 && !bedding.length; hour += 1) bedding = biologicalHistoryDeposits({ id: "resting", alive: true, speciesId: "grazer", bodyMass: 80, actionState: { key: "rest" } }, cell, hour).filter(record => record.kind === "bedding-site");
  for (let hour = 0; hour < 200 && !rubbing.length; hour += 1) rubbing = biologicalHistoryDeposits({ id: "rubbing", alive: true, speciesId: "grazer", bodyMass: 80, actionState: { key: "rub" } }, cell, hour).filter(record => record.kind === "rubbing-site");
  assert.equal(bedding[0].kind, "bedding-site");
  assert.equal(rubbing[0].kind, "rubbing-site");
});
