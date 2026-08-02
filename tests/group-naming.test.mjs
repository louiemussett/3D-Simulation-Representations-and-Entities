import test from "node:test";
import assert from "node:assert/strict";
import { describeGroup, dissolveSingletonGroups, groupDisplayName, updateGroupIdentity } from "../src/group-naming.js";

test("group identities retain stable ids while names evolve with purpose", () => {
  const registry = {}, members = [{ id: "M1", sex: "M", lifeStage: "adult", speciesId: "grazer", x: -30, z: -30 }, { id: "F1", sex: "F", lifeStage: "adult", speciesId: "grazer", x: -28, z: -30 }];
  const first = updateGroupIdentity(registry, "group-1", describeGroup(members, { goal: "travelling", worldHalf: 45 }), 0);
  assert.equal(first.currentName, "NorthWest Pair");
  const court = [...members, { id: "F2", sex: "F", lifeStage: "adult", speciesId: "grazer", x: -29, z: -29 }];
  updateGroupIdentity(registry, "group-1", describeGroup(court, { goal: "mates", worldHalf: 45 }), 30);
  assert.equal(groupDisplayName(registry, "group-1"), "NorthWest Pair");
  updateGroupIdentity(registry, "group-1", describeGroup(court, { goal: "mates", worldHalf: 45 }), 60);
  assert.equal(groupDisplayName(registry, "group-1"), "M1's Court"); assert.equal(registry["group-1"].nameHistory.length, 1);
});

test("three unrelated grazers are a small group rather than a herd", () => {
  const members = ["H1", "H2", "H3"].map((id, index) => ({ id, sex: index ? "F" : "M", lifeStage: "adult", speciesId: "grazer", x: index, z: 0 }));
  const description = describeGroup(members, { goal: "foraging", worldHalf: 45 });
  assert.equal(description.type, "small-group");
  assert.equal(updateGroupIdentity({}, "g", description, 0).currentName, "Central Small Group");
});

test("related small groups are named as families", () => {
  const members = [{ id: "F1", sex: "F", lifeStage: "adult", speciesId: "grazer", x: 0, z: 0, offspringIds: ["H2", "H3"] }, { id: "H2", motherId: "F1", sex: "M", lifeStage: "juvenile", speciesId: "grazer", x: 1, z: 0 }, { id: "H3", motherId: "F1", sex: "F", lifeStage: "dependent", speciesId: "grazer", x: 0, z: 1 }];
  assert.equal(describeGroup(members).type, "family");
});

test("legacy herd names migrate immediately to the size-aware schema", () => {
  const registry = { g: { id: "g", currentName: "NorthEast Herd", type: "herd", namedAt: 100, nameHistory: [] } };
  updateGroupIdentity(registry, "g", { type: "small-group", region: "NorthEast", goal: "foraging" }, 101);
  assert.equal(registry.g.currentName, "NorthEast Small Group");
});

test("rename history remains bounded", () => {
  const registry = {}, base = { region: "Central", goal: "travelling", speciesId: "grazer" };
  updateGroupIdentity(registry, "g", { ...base, type: "herd" }, 0, { renameAfter: 0, historyLimit: 2 });
  updateGroupIdentity(registry, "g", { ...base, type: "family" }, 1, { renameAfter: 0, historyLimit: 2 });
  updateGroupIdentity(registry, "g", { ...base, type: "gathering" }, 2, { renameAfter: 0, historyLimit: 2 });
  updateGroupIdentity(registry, "g", { ...base, type: "hunting-party" }, 3, { renameAfter: 0, historyLimit: 2 });
  assert.equal(registry.g.nameHistory.length, 2);
});

test("a lone survivor retains group history but is no longer presented as a group", () => {
  const animals = [
    { id: "F1", alive: true, groupId: "family-1", groupGoal: "caregiving", groupLeaderId: "F1", groupDisplayName: "SouthWest Family" },
    { id: "F2", alive: false, groupId: "family-1" },
    { id: "A1", alive: true, groupId: "pair-2", groupGoal: "travelling", groupLeaderId: "A1" },
    { id: "A2", alive: true, groupId: "pair-2", groupGoal: "travelling", groupLeaderId: "A1" }
  ];
  assert.deepEqual(dissolveSingletonGroups(animals, 42), ["family-1"]);
  assert.equal(animals[0].groupId, null);
  assert.deepEqual(animals[0].groupHistory, [{ groupId: "family-1", endedAt: 42, reason: "insufficient-living-members" }]);
  assert.equal(animals[2].groupId, "pair-2");
  assert.equal(animals[3].groupId, "pair-2");
});
