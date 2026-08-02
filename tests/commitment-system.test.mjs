import test from "node:test";
import assert from "node:assert/strict";
import { commitmentPopulationAudit, createCommitmentRankingReuse, createProtocolRecord, evaluateRiskReward, forecastSocialCommitment, instantiateProtocolPlan, migrateCommitment, migrateProtocolRecord, observeCommitment, protocolRetirementAssessment, rankCommitmentCandidates, recordProtocolOutcome, reviseProtocol, seedStartingCommitment, selectWithCommitment, transmitProtocol } from "../src/commitment-system.js";

const animal = (overrides = {}) => ({ id: "H1", alive: true, hydration: 90, stomach: 80, energy: 80, fatigue: 5, fear: 0, offspringIds: [], actionState: { key: "travel" }, commitmentProfile: { decisiveness: .7, perseverance: .8, commitmentStability: .85, flexibility: .25, evidenceThreshold: .7, socialSusceptibility: .45, confidence: .75 }, ...overrides });

test("commitment retains a viable incumbent against a small score fluctuation", () => {
  const subject = animal(); migrateCommitment(subject, 0); observeCommitment(subject, { drive: "water", score: 70 }, 0);
  const ranked = selectWithCommitment(subject, [{ drive: "water", score: 65 }, { drive: "forage", score: 72 }], 2);
  assert.equal(ranked[0].drive, "water");
});

test("urgent evidence overrides commitment", () => {
  const subject = animal(); migrateCommitment(subject, 0); observeCommitment(subject, { drive: "forage", score: 70 }, 0);
  const ranked = selectWithCommitment(subject, [{ drive: "forage", score: 80 }, { drive: "flee", score: 120, urgent: true }], 2);
  assert.equal(ranked[0].drive, "flee");
});

test("terminal dehydration makes water reward maximum without hiding predator risk", () => {
  const subject = animal({ speciesId: "grazer", hydration: 12 });
  const assessment = evaluateRiskReward(subject, { drive: "water", method: "drink" }, { waterPredatorRisk: 1 });
  assert.equal(assessment.reward, 100);
  assert.equal(assessment.deathIfUnsatisfied, true);
  assert.ok(assessment.risk >= 45);
});

test("comfortable herbivore rejects dangerous low-value drinking opportunity", () => {
  const subject = animal({ speciesId: "grazer", hydration: 94 });
  const assessment = evaluateRiskReward(subject, { drive: "water", method: "drink" }, { waterPredatorRisk: 1 });
  assert.ok(assessment.risk > assessment.reward);
  assert.match(assessment.label, /high risk/);
});

test("protocol v2 separates reusable procedure from contextual plan", () => {
  const protocol = createProtocolRecord({ key: "water:western lake", priority: "water", method: "western lake", methodId: "drink-confirmed-shoreline", phasePolicy: [{ id: "recover" }, { id: "travel" }, { id: "drink", completionCondition: "hydration restored" }], reservePolicy: { hydration: 18 } });
  const plan = instantiateProtocolPlan(protocol, { contextSnapshot: { interacting: { weather: "rain" } } });
  assert.equal(protocol.schema, 2);
  assert.equal(plan.protocolId, protocol.protocolId);
  assert.equal(plan.phase, "recover");
  assert.equal(plan.contextSnapshot.interacting.weather, "rain");
});

test("schema-current protocols migrate by identity while legacy records are normalized once", () => {
  const current = createProtocolRecord({ key: "water:known bank" });
  assert.equal(migrateProtocolRecord(current), current);
  const legacy = { key: "water:old bank", attempts: 2 }, migrated = migrateProtocolRecord(legacy);
  assert.notEqual(migrated, legacy); assert.equal(migrated.schema, 2); assert.equal(migrateProtocolRecord(migrated), migrated);
});

test("schema-current commitment state takes the allocation-free migration fast path", () => {
  const subject = animal({ learnedProtocols: { "water:bank": createProtocolRecord({ key: "water:bank" }) } });
  const first = migrateCommitment(subject, 3), protocols = subject.learnedProtocols;
  const second = migrateCommitment(subject, 4);
  assert.equal(second, first);
  assert.equal(subject.learnedProtocols, protocols);
  assert.equal(subject.commitmentProtocolsSchema, 2);
});

test("ranking reuse shares invariant assessments across counterfactual and adjusted scores", () => {
  const subject = animal(), context = { environmentalRisk: .2 }, reuse = createCommitmentRankingReuse();
  const baseline = [{ drive: "water", method: "drink", score: 60 }, { drive: "forage", method: "graze", score: 55 }];
  rankCommitmentCandidates(subject, baseline, 4, context, reuse);
  rankCommitmentCandidates(subject, baseline.map(candidate => ({ ...candidate, score: candidate.score + 7 })), 4, context, reuse);
  assert.equal(reuse.misses, 2); assert.equal(reuse.hits, 2); assert.equal(reuse.assessments.size, 2);
});

test("protocols can be revised and retired from outcomes", () => {
  const protocol = createProtocolRecord({ key: "water:stale target" });
  protocol.attempts = 10; protocol.failures = 9; protocol.confidence = .15;
  assert.equal(protocolRetirementAssessment(protocol, { replacementConfidence: .8 }).retire, true);
  const revised = reviseProtocol(protocol, { changes: { evidencePolicy: { minimumConfidence: .7 } }, tick: 20 });
  assert.equal(revised.version, 2);
  assert.equal(revised.revisions.length, 1);
});

test("hesitancy can reflect anticipated social exclusion rather than low decisiveness", () => {
  const subject = animal({ commitmentProfile: { decisiveness: .9, perseverance: .7, commitmentStability: .6, flexibility: .5, evidenceThreshold: .6, socialSusceptibility: .9, confidence: .7 } });
  const forecast = forecastSocialCommitment(subject, { drive: "leave group" }, { groupGoal: "patrol", groupDependence: .9, leaderOpposition: .9, previousConflict: .8 });
  assert.ok(forecast.rejectionRisk > .5); assert.ok(forecast.exclusionRisk > .4);
});

test("successful protocols gain confidence and can be socially transmitted", () => {
  const teacher = animal(), learner = animal({ id: "H2", commitmentProfile: null });
  for (let index = 0; index < 5; index += 1) recordProtocolOutcome(teacher, { priority: "water", method: "shoreline", success: true, duration: 4 });
  const learned = transmitProtocol(teacher, learner, "water:shoreline");
  assert.equal(learned.source, "social"); assert.equal(learned.teacherId, "H1"); assert.ok(learned.confidence > .5);
});

test("population audit separates commitment styles and protocol outcomes", () => {
  const subject = animal({ groupId: "G1", groupLeaderId: "H1" }); migrateCommitment(subject); recordProtocolOutcome(subject, { priority: "water", method: "shoreline", success: true });
  const audit = commitmentPopulationAudit([subject]);
  assert.equal(audit.sampleSize, 1); assert.equal(audit.totals.successes, 1); assert.equal(Object.values(audit.styles)[0].leaders, 1);
});

test("starting animals receive a priority, ordered horizons and imperfect protocol history", () => {
  const values = [.12, .84, .32, .71, .44, .93, .18, .58, .26, .77], random = () => values.shift() ?? .41;
  const subject = animal({ speciesId: "grazer", lifeStage: "adult", sex: "F", groupId: "G1", groupGoal: "travelling" });
  const seeded = seedStartingCommitment(subject, random, 0);
  assert.equal(subject.goalPlan.currentPriority.key, seeded.selected.priority);
  assert.equal(subject.goalPlan.rankings.immediateConcern.length, 3);
  assert.ok(Object.keys(subject.learnedProtocols).length >= 1);
  assert.equal(subject.commitmentState.status, "pre-observation commitment");
  assert.match(subject.currentAction, /pre-observation/);
});

test("starting commitment is deterministic for the supplied world random stream", () => {
  const sequence = () => { let index = 0; const values = [.22, .61, .42, .73, .15, .81, .35, .55]; return () => values[index++ % values.length]; };
  const left = animal({ speciesId: "hunter", lifeStage: "adult" }), right = animal({ speciesId: "hunter", lifeStage: "adult" });
  seedStartingCommitment(left, sequence(), 0); seedStartingCommitment(right, sequence(), 0);
  assert.equal(left.commitmentState.priority, right.commitmentState.priority);
  assert.deepEqual(left.learnedProtocols, right.learnedProtocols);
});
