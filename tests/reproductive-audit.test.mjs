import test from "node:test";
import assert from "node:assert/strict";
import { reproductiveIntegrityAudit } from "../src/reproductive-audit.js";
import { MINUTES_PER_DAY } from "../src/simulation-clock.js";

test("reproductive audit accepts traceable births and parent-independent egg nests", () => {
  const world = {
    ecologicalMinute: 730 * MINUTES_PER_DAY,
    animals: [{ id: "H2", speciesId: "grazer", alive: true, birthTick: 4, parentIds: ["H1"], traitArchitecture: {}, timeline: ["born day 200"], reproductiveState: { broodsByYear: {} } }],
    nests: [{ id: "nest-1", speciesId: "carrion-runner", motherId: "C1", motherSnapshot: { id: "C1" }, count: 2, careMode: "attended", laidMinute: 100, hatchMinute: 100 + 40 * MINUTES_PER_DAY, status: "incubating" }]
  };
  const audit = reproductiveIntegrityAudit(world, { initialPopulation: { bySpecies: { grazer: 1, "carrion-runner": 1 } } });
  assert.equal(audit.ok, true);
  assert.equal(audit.naturalOffspring, 1);
  assert.deepEqual(audit.founderSpeciesExtinct, ["carrion-runner"]);
});

test("reproductive audit reports impossible stages, untraceable births, and runaway broods", () => {
  const world = { animals: [{ id: "egg-1", speciesId: "carrion-runner", alive: true, pregnant: { phase: "gestating", age: 25, offspringCount: 20 }, pregnancyHormones: { level: 1 }, lactation: 2, birthTick: 3, parentIds: [], timeline: [], reproductiveState: { broodsByYear: { 1: 2 } } }], nests: [] };
  const audit = reproductiveIntegrityAudit(world);
  assert.equal(audit.ok, false);
  for (const type of ["impossible-stage", "egg-hormones", "runaway-brood", "egg-mammal-care", "invalid-birth-history"]) assert.equal(audit.byType[type], 1, type);
});
