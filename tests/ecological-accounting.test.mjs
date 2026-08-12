import test from "node:test";
import assert from "node:assert/strict";
import { EcologicalAccounting, worldStocks } from "../src/ecological-accounting.js";

test("ecological accounting is bounded and reports attributed balances", () => {
  const ledger = new EcologicalAccounting({ historyLimit: 2, enabled: true });
  for (let tick = 1; tick <= 3; tick++) { ledger.beginTick(tick, { plantBiomass: tick }); ledger.record("plantGrowth", 2); ledger.record("plantConsumed", .5); ledger.endTick({ plantBiomass: tick + 1.5 }); }
  const report = ledger.report();
  assert.equal(report.retainedTicks, 2);
  assert.equal(report.totals.plantGrowth, 6);
  assert.equal(report.derived.plantBiomassNet, 4.5);
  assert.deepEqual(report.recent.map((entry) => entry.tick), [2, 3]);
});

test("accounting rejects unknown flows and ignores invalid negative amounts", () => {
  const ledger = new EcologicalAccounting({ enabled: true });
  assert.throws(() => ledger.record("magicEnergy", 1), /Unknown ecological flow/);
  ledger.record("movementEnergy", -4); ledger.record("movementEnergy", Number.NaN);
  assert.equal(ledger.report().totals.movementEnergy, 0);
});

test("world stocks contain only non-negative finite authoritative quantities", () => {
  assert.deepEqual(worldStocks({ cells: [{ biomass: 2 }, { biomass: -1 }], corpses: [{ biomass: 3 }], animals: [{ alive: true, energy: 7, bodyMass: 4, health: 9, hydration: 6 }, { alive: false, energy: 100, hydration: 100 }] }), { plantBiomass: 2, corpseBiomass: 3, livingEnergy: 7, livingBodyMass: 4, livingHealth: 9, livingHydration: 6 });
});

test("water accounting includes activity pregnancy and lactation outflows", () => {
  const ledger = new EcologicalAccounting({ enabled: true });
  ledger.beginTick(1);
  ledger.record("basalWaterLost", 2); ledger.record("thermalWaterLost", 1); ledger.record("activityWaterLost", 3);
  ledger.record("pregnancyWaterLost", 4); ledger.record("lactationWaterLost", 5);
  ledger.endTick();
  assert.equal(ledger.report().derived.measuredWaterOut, 15);
});
