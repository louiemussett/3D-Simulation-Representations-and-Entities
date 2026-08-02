import test from "node:test";
import assert from "node:assert/strict";
import {
  closeKinForMating,
  descendantDepth,
  generationLabel,
  kinshipBetween,
  livingAncestorCandidates,
  registerBirthKinship,
  storeLineage,
} from "../src/kinship.js";

const animal = (id, sex = "F", extra = {}) => ({ id, sex, speciesId: "grazer", alive: true, lifeStage: "adult", ...extra });

test("birth ancestry propagates through grandparents and great-grandparents", () => {
  const elder = animal("G0");
  const parent = registerBirthKinship(animal("G1"), elder);
  const child = registerBirthKinship(animal("G2"), parent);
  const greatGrandchild = registerBirthKinship(animal("G3"), child);

  assert.equal(greatGrandchild.ancestorDepths.G2, 1);
  assert.equal(greatGrandchild.ancestorDepths.G1, 2);
  assert.equal(greatGrandchild.ancestorDepths.G0, 3);
  assert.equal(descendantDepth(elder, greatGrandchild), 3);
  assert.equal(generationLabel(3, "ancestor"), "great-grandparent");
  assert.equal(generationLabel(3, "descendant"), "great-grandchild");
});

test("maternal and paternal ancestry are both retained", () => {
  const maternalGrandmother = animal("MG");
  const paternalGrandfather = animal("PG", "M");
  const mother = registerBirthKinship(animal("M"), maternalGrandmother);
  const father = registerBirthKinship(animal("F", "M"), paternalGrandfather);
  const child = registerBirthKinship(animal("C"), mother, father);

  assert.deepEqual(child.parentIds, ["M", "F"]);
  assert.equal(child.ancestorDepths.MG, 2);
  assert.equal(child.ancestorDepths.PG, 2);
});

test("close relatives are excluded from mating", () => {
  const parent = animal("P");
  const first = registerBirthKinship(animal("C1"), parent);
  const second = registerBirthKinship(animal("C2", "M"), parent);
  const unrelated = animal("U", "M");

  assert.equal(closeKinForMating(parent, first), true);
  assert.equal(kinshipBetween(first, second).kind, "sibling");
  assert.equal(closeKinForMating(first, second), true);
  assert.equal(closeKinForMating(first, unrelated), false);
});

test("orphan-care candidates prefer the nearest living adult generation", () => {
  const grandparent = animal("G");
  const parent = registerBirthKinship(animal("P"), grandparent);
  const child = registerBirthKinship(animal("C", "F", { lifeStage: "dependent" }), parent);
  const greatGrandparent = animal("GG");
  grandparent.ancestorDepths = { GG: 1 };
  child.ancestorDepths.GG = 3;
  parent.alive = false;

  assert.deepEqual(livingAncestorCandidates(child, [greatGrandparent, grandparent, parent]).map((candidate) => candidate.id), ["G", "GG"]);
});

test("lineage records preserve deceased family history", () => {
  const records = {};
  const elder = animal("G", "F", { deathTick: 120, alive: false });
  const child = registerBirthKinship(animal("C"), elder);
  storeLineage(records, elder);
  storeLineage(records, child);

  assert.equal(records.G.deathTick, 120);
  assert.equal(records.C.ancestorDepths.G, 1);
});
