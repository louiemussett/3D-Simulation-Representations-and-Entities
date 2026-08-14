import test from "node:test";
import assert from "node:assert/strict";
import { assessPersonalSpace, learnProximityRelationship, migratePersonalSpace, personalSpaceRadius, proximityCurves, proximityRelationship } from "../src/personal-space.js";

const animal = (id, extra = {}) => ({ id, alive: true, speciesId: "grazer", lifeStage: "adult", aggression: .5, health: 100, fear: 0, ...extra });

test("personal space extends beyond physical collision and varies by condition", () => {
  const calm = personalSpaceRadius(animal("a"), .5);
  const fearfulOld = personalSpaceRadius(animal("b", { lifeStage: "old", fear: 90, health: 55, aggression: .8 }), .5);
  assert.ok(calm > .5);
  assert.ok(fearfulOld > calm);
});

test("individual space preference and tolerance persist and span behavioural extremes", () => {
  const tolerant = migratePersonalSpace(animal("t", { personalSpaceTrait: .02, intrusionTolerance: .98, aggression: .05 }));
  const reactive = migratePersonalSpace(animal("r", { personalSpaceTrait: .98, intrusionTolerance: .02, aggression: .98 }));
  assert.ok(personalSpaceRadius(reactive, .5) > personalSpaceRadius(tolerant, .5) * 1.5);
  assert.equal(migratePersonalSpace({ ...tolerant }).personalSpaceTrait, .02);
  const closeTarget = animal("x");
  assert.equal(assessPersonalSpace(tolerant, closeTarget, { distance: .51, contactSpan: .5, roll: .1 }).kind, "ignore");
  assert.ok(["warn", "attack"].includes(assessPersonalSpace(reactive, closeTarget, { distance: .51, contactSpan: .5, roll: .9 }).kind));
});

test("animals outside personal space do not trigger an encounter", () => {
  assert.equal(assessPersonalSpace(animal("a"), animal("b"), { distance: 5, contactSpan: .5 }), null);
});

test("familiar kin permit affiliation or deliberate tolerance", () => {
  const result = assessPersonalSpace(animal("a"), animal("b"), { distance: .55, contactSpan: .5, related: true, affinity: .5, roll: .2 });
  assert.equal(result.kind, "affiliate");
});

test("reproductively compatible adults can turn close contact into courtship", () => {
  const result = assessPersonalSpace(animal("a", { sex: "F", libido: .8 }), animal("b", { sex: "M" }), { distance: .55, contactSpan: .5, compatibleMate: true });
  assert.equal(result.kind, "courtship");
});

test("social hostility can escalate alone or rally nearby allies", () => {
  const actor = animal("a", { aggression: 1 });
  const target = animal("b");
  assert.equal(assessPersonalSpace(actor, target, { distance: .51, contactSpan: .5, grievance: 1, allies: 0 }).kind, "attack");
  assert.equal(assessPersonalSpace(actor, target, { distance: .51, contactSpan: .5, grievance: 1, allies: 3 }).kind, "rally-aggression");
});

test("herbivores may rally against a predator but isolated animals withdraw", () => {
  const grazer = animal("g", { aggression: .65, careAffinity: .7 });
  const hunter = animal("h", { speciesId: "hunter" });
  assert.equal(assessPersonalSpace(grazer, hunter, { distance: .51, contactSpan: .5, allies: 3 }).kind, "rally-defence");
  assert.equal(assessPersonalSpace({ ...grazer, fear: 80 }, hunter, { distance: .51, contactSpan: .5, allies: 0 }).kind, "retreat");
});

test("relationship pressure is asymmetric across the same pair", () => {
  const cautious = animal("c", { fear: 70, personalSpaceTrait: .9, intrusionTolerance: .1 }), familiar = animal("f", { fear: 0, personalSpaceTrait: .1, intrusionTolerance: .9 });
  familiar.proximityRelationships = { c: { targetId: "c", familiarity: .9, trust: .8, threatExpectation: 0 } };
  const cautiousView = proximityCurves(cautious, familiar, { distance: .6, contactSpan: .5 });
  const familiarView = proximityCurves(familiar, cautious, { distance: .6, contactSpan: .5 });
  assert.ok(cautiousView.avoidance > familiarView.avoidance); assert.ok(familiarView.tolerance > cautiousView.tolerance);
});

test("attraction tolerance and avoidance vary continuously with distance", () => {
  const actor = animal("a", { intrusionTolerance: .7 }), target = animal("b");
  actor.proximityRelationships = { b: { targetId: "b", familiarity: .8, trust: .7 } };
  const near = proximityCurves(actor, target, { distance: .51, contactSpan: .5, affinity: .6, sameGroup: true }), edge = proximityCurves(actor, target, { distance: personalSpaceRadius(actor, .5), contactSpan: .5, affinity: .6, sameGroup: true });
  assert.ok(near.attraction > edge.attraction); assert.ok(near.avoidance > edge.avoidance); assert.ok(near.tolerance > .5);
});

test("observed predator intent increases avoidance without exposing private targets", () => {
  const grazer = animal("g", { fear: 10 }), hunter = animal("h", { speciesId: "hunter" });
  const uncertain = proximityCurves(grazer, hunter, { distance: .7, contactSpan: .5, predatorRelationship: true, predatorIntent: { selfTargetLikelihood: .2, confidence: .3 } });
  const imminent = proximityCurves(grazer, hunter, { distance: .7, contactSpan: .5, predatorRelationship: true, predatorIntent: { selfTargetLikelihood: .9, confidence: .9 } });
  assert.ok(imminent.avoidance > uncertain.avoidance); assert.ok(imminent.predatorIntentPressure > uncertain.predatorIntentPressure);
});

test("repeated outcomes create bounded individual familiarity and learned trust", () => {
  const actor = animal("a");
  for (let tick = 1; tick <= 20; tick += 1) learnProximityRelationship(actor, "b", "affiliate", tick, .8);
  const friendly = proximityRelationship(actor, "b"); assert.ok(friendly.familiarity > .5); assert.ok(friendly.trust > .5); assert.equal(friendly.encounters, 20);
  for (let tick = 21; tick <= 35; tick += 1) learnProximityRelationship(actor, "b", "attack", tick, 1);
  const hostile = proximityRelationship(actor, "b"); assert.ok(hostile.trust < friendly.trust); assert.ok(hostile.threatExpectation > 0); assert.ok(hostile.familiarity <= 1);
});
