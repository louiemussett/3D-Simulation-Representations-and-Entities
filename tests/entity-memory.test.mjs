import test from "node:test";
import assert from "node:assert/strict";
import { ageEntityMemory, migrateEntityMemory, rememberEntityEpisode, rememberedOpportunity, rememberedThreat } from "../src/entity-memory.js";

test("attack and escape episodes become medium and entity-specific long-term memory", () => {
  const animal = {}; migrateEntityMemory(animal);
  rememberEntityEpisode(animal, { kind: "attacked-by", targetId: "C1", speciesId: "hunter", x: 4, z: 2, damage: 30, intensity: .8 }, 10);
  rememberEntityEpisode(animal, { kind: "escaped-from", targetId: "C1", speciesId: "hunter", x: 5, z: 3, intensity: .7 }, 11);
  assert.equal(animal.mediumTermMemory.length, 2); assert.ok(rememberedThreat(animal, "C1") > .7); assert.deepEqual(animal.entityKnowledge.C1.lastKnown.x, 5);
});

test("hunters retain individual prey opportunity and bounded memories decay", () => {
  const animal = {};
  rememberEntityEpisode(animal, { kind: "attacked", targetId: "H1", speciesId: "grazer", x: 1, z: 1, intensity: .8 }, 2);
  assert.ok(rememberedOpportunity(animal, "H1") > 0);
  ageEntityMemory(animal, 3000); assert.equal(animal.mediumTermMemory.length, 0); assert.equal(Object.keys(animal.entityKnowledge).length, 0);
});

test("witnessed and communicated attacks make the identified attacker a remembered threat", () => {
  const witness = {};
  rememberEntityEpisode(witness, { kind: "witnessed-group-attack", targetId: "intruder", speciesId: "grazer", x: 3, z: 4, confidence: 1, intensity: .9 }, 12);
  assert.ok(rememberedThreat(witness, "intruder") > .5);
  rememberEntityEpisode(witness, { kind: "communicated-killer", targetId: "intruder", x: 4, z: 4, confidence: .72, intensity: .8 }, 13);
  assert.ok(rememberedThreat(witness, "intruder") > .8);
});

test("ordinary memory ageing retains collection identity until scheduled compaction", () => {
  const animal = {};
  rememberEntityEpisode(animal, { kind: "spotted-predator", targetId: "C2", confidence: .8 }, 1);
  const medium = animal.mediumTermMemory, knowledge = animal.entityKnowledge;
  ageEntityMemory(animal, 1);
  assert.equal(animal.mediumTermMemory, medium);
  assert.equal(animal.entityKnowledge, knowledge);
  assert.equal(animal.mediumTermMemory[0].age, 1);
});
