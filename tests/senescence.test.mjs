import test from "node:test";
import assert from "node:assert/strict";
import { advanceSenescence, managedCareScore, migrateSenescence, senescenceModifiers, senescentDeathCause } from "../src/senescence.js";

const profile = { senescenceDays: 3650, longevityReferenceDays: 7300 };
const animal = overrides => ({ age: 4000, health: 100, healthCap: 100, hydration: 90, energy: 85, stomach: 70, fatigue: 5, fear: 5, injuries: [], actionState: { key: "rest" }, groupId: "herd", ...overrides });

test("longevity reference is not a death deadline", () => {
  const elder = animal({ age: 20_000 });
  const state = migrateSenescence(elder, profile);
  assert.equal(state.active, true);
  assert.ok(state.organReserve > 0);
  assert.equal(elder.alive, undefined);
});

test("feeding resting safety and social support slow senescent decline", () => {
  const cared = animal({ age: 6000 }), deprived = animal({ age: 6000, hydration: 15, energy: 10, stomach: 4, fatigue: 90, fear: 90, injuries: [{ severity: .8 }], actionState: { key: "flee" }, groupId: null });
  assert.ok(managedCareScore(cared) > managedCareScore(deprived));
  for (let day = 0; day < 365; day += 1) { advanceSenescence(cared, profile, 24); advanceSenescence(deprived, profile, 24); }
  assert.ok(cared.senescence.organReserve > deprived.senescence.organReserve);
  assert.ok(cared.senescence.lastHealthDamage < deprived.senescence.lastHealthDamage);
});

test("frailty changes capabilities without imposing an age cutoff", () => {
  const elder = animal({ age: 9000, senescence: { organReserve: .25, immuneReserve: .35, dentalFunction: .2, diseaseBurden: 5, frailty: .72 } });
  advanceSenescence(elder, profile, 1);
  const modifiers = senescenceModifiers(elder);
  assert.ok(modifiers.mobility < 1);
  assert.ok(modifiers.recovery < modifiers.mobility);
  assert.ok(modifiers.feeding < 1);
});

test("senescent deaths retain a modeled proximate cause", () => {
  assert.equal(senescentDeathCause(animal({ senescence: { diseaseBurden: 80 } })), "infection following age-related immune decline");
  assert.equal(senescentDeathCause(animal({ energy: 5, stomach: 2, senescence: { diseaseBurden: 0, dentalFunction: .05 } })), "starvation following dental failure");
  assert.equal(senescentDeathCause(animal({ senescence: { diseaseBurden: 0, dentalFunction: .5 } })), "organ failure following senescence");
});
