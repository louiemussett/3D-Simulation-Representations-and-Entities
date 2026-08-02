import test from "node:test";
import assert from "node:assert/strict";
import { captureGenerationalAudit, compareGenerationalAudit } from "../src/generational-audit.js";

const profiled = (id, overallBand, profile, overallScore, divergenceScore) => ({ id, alive: true, speciesId: "grazer", lifeStage: "adult", health: 90, parentIds: [], offspringIds: [], traitArchitecture: { overallBand, profile, overallScore, divergenceScore, prenatalQuality: .8 }, needPlanAudit: { totals: { started: 2, satisfied: 1, failed: 1 } }, memoryPersistence: 1, waterSkill: 1, foodSkill: 1, injuries: [], timeline: [] });

test("generational audit separates capability and divergence distributions", () => {
  const world = { animals: [profiled("H1", "typical range", "balanced", 0, .3), profiled("H2", "broadly exceptional", "highly divergent", 1.8, 1.7)], corpses: [], births: 2, deaths: 0, day: 10 };
  const audit = captureGenerationalAudit(world, { observationMinutes: 180 });
  assert.equal(audit.traits.allNaturalBorn.sampleSize, 2);
  assert.equal(audit.traits.allNaturalBorn.overall.bands["broadly exceptional"], 1);
  assert.equal(audit.traits.allNaturalBorn.divergence.profiles["highly divergent"], 1);
  assert.equal(audit.observationMinutes, 180);
});

test("comparison warns that small populations cannot establish stable selection", () => {
  const start = captureGenerationalAudit({ animals: [profiled("H1", "typical range", "balanced", 0, .3)], corpses: [], births: 0, deaths: 0 });
  const end = captureGenerationalAudit({ animals: [profiled("H1", "typical range", "balanced", 0, .3)], corpses: [], births: 1, deaths: 0 });
  const report = compareGenerationalAudit(start, end);
  assert.equal(report.changes.births, 1);
  assert.ok(report.interpretationWarnings.some((warning) => warning.includes("demographic drift")));
});
