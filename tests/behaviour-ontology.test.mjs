import test from "node:test";
import assert from "node:assert/strict";
import { BEHAVIOUR_ONTOLOGY, classifySatisfierEffects, contextSnapshot, needStateSnapshot, ontologyIntegrity } from "../src/behaviour-ontology.js";

test("authoritative ontology has valid many-to-many references", () => {
  const audit = ontologyIntegrity();
  assert.equal(audit.valid, true, audit.errors.join("\n"));
  assert.ok(audit.needCount >= 10);
  assert.ok(BEHAVIOUR_ONTOLOGY.satisfiers.some((entry) => entry.supports.includes("hydration") && entry.supports.includes("thermal")));
});

test("satisfier classification distinguishes synergy and harm", () => {
  assert.equal(classifySatisfierEffects({ hydration: .8, safety: .3 }), "synergistic");
  assert.equal(classifySatisfierEffects({ hydration: .8, safety: -.3 }), "inhibiting");
  assert.equal(classifySatisfierEffects({ hydration: .2, safety: -.8 }), "destructive");
  assert.equal(classifySatisfierEffects({ hydration: 0 }), "pseudo");
});

test("need and context snapshots keep concurrent motivation separate from action", () => {
  const animal = { speciesId: "grazer", sex: "F", lifeStage: "adult", hydration: 20, stomach: 75, energy: 80, fatigue: 30, fear: 70, emergencyReserve: 1, actionState: { key: "rest" }, commitmentState: { priority: "water" } };
  const states = needStateSnapshot(animal, { threatRisk: .8 });
  assert.ok(states.hydration.pressure > states.nutrition.pressure);
  assert.ok(states.safety.pressure > .7);
  const context = contextSnapshot(animal, { threatRisk: .8 });
  assert.equal(context.doing.action, "rest");
  assert.equal(context.doing.priority, "water");
});

