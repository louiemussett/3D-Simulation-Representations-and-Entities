import test from "node:test";
import assert from "node:assert/strict";
import { assignContextualGroupRoles } from "../src/group-roles.js";

const member = (id, speciesId, extra = {}) => ({ id, speciesId, alive: true, lifeStage: "adult", fatigue: 15, waterSkill: .4, foodSkill: .4, careAffinity: .4, sensoryBuffer: [], offspringIds: [], groupLeaderId: `${speciesId}-leader`, ...extra });

test("deer alarm and protection roles arise from member-owned observations", () => {
  const members = [
    member("valley-grazer-updated-leader", "valley-grazer-updated"),
    member("watcher", "valley-grazer-updated", { sensoryBuffer: [{ type: "predator", targetId: "wolf", confidence: .9 }] }),
    member("mother", "valley-grazer-updated", { offspringIds: ["fawn"] }),
    member("fawn", "valley-grazer-updated", { lifeStage: "dependent" })
  ];
  const roles = assignContextualGroupRoles(members, { goal: "protection", tick: 10 });
  assert.equal(roles.find(row => row.animalId === "watcher").primary, "alarm-source");
  assert.ok(roles.find(row => row.animalId === "mother").primary === "maternal-protector" || roles.find(row => row.animalId === "mother").secondary.includes("maternal-protector"));
  assert.equal(roles.find(row => row.animalId === "fawn").primary, "dependent");
});

test("wolf hunting roles are deterministic and contextual rather than permanent ranks", () => {
  const members = [
    member("ridge-hunter-updated-leader", "ridge-hunter-updated", { sensoryBuffer: [{ type: "animal", targetId: "deer", confidence: .8 }] }),
    member("fast", "ridge-hunter-updated", { sprintEnergy: 95, aggression: .8 }),
    member("support-a", "ridge-hunter-updated", { sprintEnergy: 75 }),
    member("support-b", "ridge-hunter-updated", { sprintEnergy: 65 })
  ];
  const hunting = assignContextualGroupRoles(members, { goal: "hunting", tick: 20 });
  assert.ok(hunting.some(row => row.primary === "primary-pursuer"));
  assert.ok(hunting.some(row => row.primary === "left-pressure"));
  assert.ok(hunting.some(row => row.primary === "right-pressure"));
  const travelling = assignContextualGroupRoles(members, { goal: "travelling", tick: 21 });
  assert.equal(travelling.some(row => ["primary-pursuer", "left-pressure", "right-pressure"].includes(row.primary)), false);
});
