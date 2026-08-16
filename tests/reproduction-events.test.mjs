import test from "node:test";
import assert from "node:assert/strict";
import { REPRODUCTION_DURATIONS, birthAttendantEligible, createBirthEvent, createCourtshipEvent, createMatingEvent, migrateReproductionEvents, reproductionStage } from "../src/reproduction-events.js";

test("courtship acceptance mating and birth are separate sustained stages", () => {
  const courtship = { courtship: createCourtshipEvent("b", 10) };
  assert.equal(reproductionStage(courtship, 10), "courtship"); assert.equal(reproductionStage(courtship, 18), "courtship-decision");
  const mating = { mating: createMatingEvent("b", "female", 30, 7) };
  assert.equal(reproductionStage(mating, 30), "accepted"); assert.equal(reproductionStage(mating, 35), "mating");
  const birth = { birthEvent: createBirthEvent(60) }; assert.equal(reproductionStage(birth, 60), "birth");
  assert.equal(REPRODUCTION_DURATIONS.courtship, 8);
  assert.equal(REPRODUCTION_DURATIONS.acceptance, 5);
  assert.equal(REPRODUCTION_DURATIONS.rejection, 3);
  assert.equal(REPRODUCTION_DURATIONS.cooldown, 60);
  assert.equal(REPRODUCTION_DURATIONS.conception, 3);
  assert.equal(REPRODUCTION_DURATIONS.birth, 15);
});

test("mating duration is bounded from two through twelve minutes", () => {
  assert.equal(createMatingEvent("b", "female", 10, -5).completesAt, 17);
  assert.equal(createMatingEvent("b", "female", 10, 12).completesAt, 27);
  assert.equal(createMatingEvent("b", "female", 10, 99).completesAt, 27);
});

test("visible rejection ends before the mate-selection cooldown", () => {
  const animal = { rejectionUntil: 13, mateRejectUntil: 70 };
  assert.equal(reproductionStage(animal, 12), "rejected");
  assert.equal(reproductionStage(animal, 13), "none");
});

test("only a sufficiently aligned father remains as birth attendant", () => {
  const female = { birthEvent: {}, pregnant: { fatherId: "m" }, matePreferences: { minHealth: 70, preferredAggression: .4, aggressionTolerance: .2 } };
  assert.equal(birthAttendantEligible(female, { id: "m", alive: true, health: 80, energy: 60, fear: 5, aggression: .45 }), true);
  assert.equal(birthAttendantEligible(female, { id: "m", alive: true, health: 40, energy: 60, fear: 5, aggression: .45 }), false);
  assert.equal(birthAttendantEligible(female, { id: "other", alive: true, health: 90, energy: 90, fear: 0, aggression: .4 }), false);
});

test("older saves default missing reproduction event state", () => { const animal = migrateReproductionEvents({}); assert.equal(animal.courtship, null); assert.equal(animal.mating, null); assert.equal(animal.birthEvent, null); });
