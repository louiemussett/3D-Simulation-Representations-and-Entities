import test from "node:test";
import assert from "node:assert/strict";
import { assignStartingCareFamilies } from "../src/starting-care.js";

const animal = (id, sex, lifeStage, extra = {}) => ({ id, speciesId: "grazer", sex, lifeStage, alive: true, x: 0, z: 0, offspringIds: [], offspringMemory: {}, timeline: [], ...extra });

test("starting dependants and juveniles receive a mother caregiver and family group", () => {
  const pregnant = animal("F1", "F", "adult", { pregnant: {}, careAffinity: .8 });
  const other = animal("F2", "F", "adult", { careAffinity: 1 });
  const baby = animal("B1", "M", "dependent", { age: 2 });
  const juvenile = animal("J1", "F", "juvenile", { age: 12 });
  const animals = [pregnant, other, baby, juvenile];
  const placed = [];
  const assignments = assignStartingCareFamilies(animals, { grazer: { dependency: 10 } }, (child, mother) => { child.x = mother.x + 1; placed.push([child.id, mother.id]); });
  assert.equal(assignments.length, 2);
  assert.equal(baby.motherId, "F1");
  assert.deepEqual(baby.caregiverIds, ["F1"]);
  assert.equal(baby.groupId, pregnant.groupId);
  assert.equal(baby.x, pregnant.x + 1);
  assert.ok(pregnant.lactation > 0);
  assert.equal(pregnant.offspringMemory.B1.dependent, true);
  assert.ok(juvenile.motherId);
  assert.ok(juvenile.caregiverIds.includes(juvenile.motherId));
  assert.equal(placed.length, 2);
});

test("existing starting mothers are retained and offspring links are deduplicated", () => {
  const mother = animal("F1", "F", "adult", { offspringIds: ["B1"] });
  const baby = animal("B1", "M", "dependent", { age: 3, motherId: "F1", caregiverIds: ["F1"] });
  assignStartingCareFamilies([mother, baby], { grazer: { dependency: 10 } });
  assert.deepEqual(mother.offspringIds, ["B1"]);
  assert.deepEqual(baby.parentIds, ["F1"]);
  assert.equal(baby.dependentUntil, 10);
});

test("a population without young is not changed", () => {
  const female = animal("F1", "F", "adult");
  assert.deepEqual(assignStartingCareFamilies([female], { grazer: { dependency: 10 } }), []);
  assert.equal(female.groupId, undefined);
});
