import test from "node:test";
import assert from "node:assert/strict";
import { abandonDependent, assessGroupMembership, beginGroupDeparture, canJoinGroup, caregiverConflict, dependentMistreatment, migrateGroupDisposition, recordGroupConflict } from "../src/group-dynamics.js";

const adult = (overrides = {}) => ({ id: "A", speciesId: "grazer", lifeStage: "adult", groupId: "g1", groupLeaderId: "L", aggression: .4, careAffinity: .65, energy: 80, health: 100, fatigue: 10, fear: 5, socialMemory: {}, ...overrides });

test("sustained conflict and leader distrust produce a deliberate permanent departure", () => {
  const animal = adult({ groupDisposition: { affinity: .15, leaderTrust: .08, conflictBurden: .95, resourceCompetition: .7, departureIntention: .9 } });
  const assessment = assessGroupMembership(animal, { tick: 20, groupSize: 12, desiredSize: 6, leaderCompatibility: .05, grievance: .9, resourceScarcity: .9 });
  assert.equal(assessment.eligible, true); assert.equal(assessment.kind, "permanent");
  const departure = beginGroupDeparture(animal, assessment, 20, { dayTicks: 100 });
  assert.equal(animal.groupId, null); assert.equal(departure.oldGroupId, "g1");
  assert.equal(canJoinGroup(animal, "g1", departure.rejoinAfter - 1), false);
  assert.equal(canJoinGroup(animal, "g1", departure.rejoinAfter), true);
});

test("group conflict changes affinity, trust, and future avoidance", () => {
  const animal = adult(); migrateGroupDisposition(animal, 0); recordGroupConflict(animal, "L", .8, true, 5);
  assert.ok(animal.groupDisposition.affinity < .62); assert.ok(animal.groupDisposition.leaderTrust < .62); assert.ok(animal.groupDisposition.conflictBurden > 0); assert.deepEqual(animal.groupDisposition.avoidMemberIds, ["L"]);
});

test("caregivers can dispute shared care under grievance and scarcity", () => {
  const actor = adult({ id: "C1", aggression: .9, careAffinity: .6, socialMemory: { C2: { grievance: .9 } } }), target = adult({ id: "C2" }), child = { id: "Y", lifeStage: "dependent", caregiverIds: ["C1", "C2"] };
  const result = caregiverConflict(actor, target, child, { resourceScarcity: 1 });
  assert.ok(result); assert.equal(result.dispute, "caregiving"); assert.equal(result.dependentId, "Y");
});

test("dependent attack is exceptional while abandonment remains possible", () => {
  const child = { id: "Y", lifeStage: "dependent", motherId: "C", caregiverIds: ["C"] };
  assert.equal(dependentMistreatment(adult({ id: "C", aggression: .3, careAffinity: .8 }), child, { resourceScarcity: .2 }), null);
  const stressed = adult({ id: "C", aggression: .98, careAffinity: .02, energy: 5, health: 45, fatigue: 95, fear: 80, socialMemory: { Y: { grievance: 1 } } });
  assert.equal(dependentMistreatment(stressed, child, { resourceScarcity: 1 }).kind, "attack-and-abandon");
  abandonDependent(stressed, child, 44, "care conflict");
  assert.deepEqual(child.caregiverIds, []); assert.deepEqual(child.abandonedByIds, ["C"]); assert.equal(dependentMistreatment(stressed, child, { resourceScarcity: 1 }), null);
});
