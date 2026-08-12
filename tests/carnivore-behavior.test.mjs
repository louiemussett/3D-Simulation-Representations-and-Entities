import test from "node:test";
import assert from "node:assert/strict";
import { carcassCommitmentRequired, claimedCarcassPenalty, clearPredation, closeRangeHuntEligible, contactAttackIntentEligible, createPredationState, detectedPreyResponse, herdCounterattackChance, huntOpportunityBonus, huntRange, huntSuppressed, lastResortHuntAssessment, losePrey, migratePredationState, movementRecoveryRequired, observePrey, opportunisticHuntEligible, ordinaryHuntEligible, predationAbandonReason, predationCommitmentBonus, predatorAttackSuccessChance, predatorBiteDamage, protectiveDefenderEligible, recordFailedStrike, recordSuccessfulKill, shouldInitiateChase, transitionPredation, urgentCarcassTravel } from "../src/carnivore-behavior.js";
import { physicalContact } from "../src/interaction-spacing.js";

test("legacy hunt state migrates once into the authoritative predation schema", () => {
  const animal = { hunt: { stage: "pursuit", targetId: "H11", started: 8, lost: 2, preyAwareness: "likely-aware", lastKnown: { x: 3, z: 4 } } };
  migratePredationState(animal, 20);
  assert.equal(animal.hunt, undefined); assert.equal(animal.predation.phase, "chase"); assert.equal(animal.predation.targetId, "H11"); assert.equal(animal.predation.lostTicks, 2);
});

test("predation transitions are exhaustive and retain stable target state", () => {
  let state = createPredationState(1);
  state = transitionPredation(state, "assess", 2, { targetKind: "prey", targetId: "H1" });
  state = observePrey(state, { targetId: "H1", x: 4, z: 5, heading: 0 }, 3, "likely-aware", { size: 2, heading: 1 });
  assert.equal(state.phase, "assess"); assert.equal(state.noticedTicks, 1); assert.equal(state.lastKnown.groupSize, 2);
  state = losePrey(state); assert.equal(state.lostTicks, 1);
  assert.throws(() => transitionPredation(state, "legacy-pursuit", 4));
});

test("clear transition removes stale target and records why it ended", () => {
  const state = clearPredation({ ...createPredationState(1), targetId: "H1" }, 8, "evidence checked", "recover");
  assert.equal(state.phase, "recover"); assert.equal(state.targetId, null); assert.equal(state.reason, "evidence checked");
});

test("active chase slows through fatigue and abandons only when no safe pace remains", () => {
  const chase = { ...createPredationState(1), phase: "chase", targetKind: "prey", targetId: "H1" };
  assert.equal(predationCommitmentBonus(chase), 220);
  assert.equal(predationAbandonReason(chase, { fatigue: 95, energy: 80, capabilities: { canTravel: true } }), null);
  assert.equal(predationAbandonReason(chase, { fatigue: 95, energy: 80, capabilities: { canTravel: false } }), "no safe travelling pace remains");
  assert.equal(predationAbandonReason(chase, { fatigue: 20, energy: 80 }), null);
});

test("depleted accessible fuel may use real burst reserve for one bounded current-evidence interception", () => {
  const animal = { stomach: 2, energy: 3, health: 82, hydration: 90, sprintEnergy: 58, capabilities: { canTravel: true } };
  const assessment = lastResortHuntAssessment(animal, { currentPreyEvidence: true, compatiblePrey: true, evidenceConfidence: .82, canTravel: true, canSprint: true, burstReserve: 58, journeyViable: true, interceptionForecast: { viable: true, distance: 3, maximumDistance: 6, decision: "continue", confidence: .72 } });
  const chase = { ...createPredationState(1), phase: "chase", targetKind: "prey", targetId: "H1" };
  assert.equal(assessment.allowed, true);
  assert.equal(predationAbandonReason(chase, animal, { lastResortHunt: assessment }), null);
});

test("last-resort hunting refuses stale evidence and each unsafe physiological shortcut", () => {
  const animal = { stomach: 2, energy: 3, health: 82, hydration: 90, sprintEnergy: 58 };
  const base = { currentPreyEvidence: true, compatiblePrey: true, evidenceConfidence: .82, canTravel: true, canSprint: true, burstReserve: 58, journeyViable: true, interceptionForecast: { viable: true, distance: 3, maximumDistance: 6, decision: "continue", confidence: .72 } };
  assert.equal(lastResortHuntAssessment(animal, { ...base, currentPreyEvidence: false }).allowed, false);
  assert.equal(lastResortHuntAssessment(animal, { ...base, compatiblePrey: false }).allowed, false);
  assert.equal(lastResortHuntAssessment(animal, { ...base, canSprint: false, burstReserve: 0 }).allowed, false);
  assert.equal(lastResortHuntAssessment({ ...animal, health: 39 }, base).allowed, false);
  assert.equal(lastResortHuntAssessment({ ...animal, hydration: 71 }, base).allowed, false);
  assert.equal(lastResortHuntAssessment(animal, { ...base, journeyViable: false }).allowed, false);
  assert.equal(lastResortHuntAssessment(animal, { ...base, interceptionForecast: { ...base.interceptionForecast, viable: false } }).allowed, false);
});

test("hunt ranges scale from the participants' collision spans", () => { const hunter = { collisionRadius: .3 }, prey = { collisionRadius: .2 }; assert.equal(huntRange(hunter, prey, "sprint"), 2.5); assert.equal(huntRange(hunter, prey, "chase"), 6); });

test("prey is not counted as its own herd defender", () => {
  const prey = { id: "prey", speciesId: "grazer", lifeStage: "adult", alive: true };
  assert.equal(protectiveDefenderEligible(prey, prey), false);
  assert.equal(protectiveDefenderEligible({ id: "mother", speciesId: "grazer", alive: true, offspringIds: ["prey"] }, prey), true);
  assert.equal(protectiveDefenderEligible({ id: "stranger", speciesId: "grazer", alive: true, offspringIds: [] }, prey), false);
});

test("genuine herd defence is bounded", () => { assert.equal(herdCounterattackChance(0), 0); assert.equal(herdCounterattackChance(1), .1); assert.equal(herdCounterattackChance(20), .45); });
test("predator bites can subdue prey in one or two successful contacts", () => { assert.equal(predatorBiteDamage(0, 0), 42); assert.equal(predatorBiteDamage(1, 1), 80); });
test("close attacks are reliable but fatigue and genuine defenders still matter", () => {
  const clear = predatorAttackSuccessChance({ preyVulnerability: .5, hunterFatigue: 10, hunterSpeed: 1, defenders: 0 });
  const defended = predatorAttackSuccessChance({ preyVulnerability: .5, hunterFatigue: 70, hunterSpeed: .6, defenders: 2 });
  assert.ok(clear > .7); assert.ok(defended < clear); assert.ok(defended >= .10);
});

test("predators commit to chase when close, aggressive, detected, or finished stalking", () => {
  assert.equal(shouldInitiateChase({ distance: 6.9, chaseRange: 7 }), true);
  assert.equal(shouldInitiateChase({ distance: 6.9, chaseRange: 6 }), false);
  assert.equal(shouldInitiateChase({ distance: 12, aggression: .7 }), true);
  assert.equal(shouldInitiateChase({ distance: 12, stalkTicks: 3 }), true);
  assert.equal(shouldInitiateChase({ distance: 12, preyAwareness: "likely-aware" }), true);
  assert.equal(shouldInitiateChase({ distance: 12, aggression: .3, stalkTicks: 2, preyAwareness: "unaware" }), false);
});
test("visible prey and aggression strengthen hunting opportunity without dominating satiation", () => { assert.equal(huntOpportunityBonus(), 0); assert.equal(huntOpportunityBonus({ visiblePrey: true, aggression: .8 }), 83); });
test("detected nearby prey becomes a chase", () => { assert.equal(detectedPreyResponse(1, 6), "assess"); assert.equal(detectedPreyResponse(2, 6), "chase"); assert.equal(detectedPreyResponse(2, 8), "abandon"); });
test("urgent carcass travel uses ordinary sprint reserve only", () => { assert.equal(urgentCarcassTravel({ hunger: 60, canSprint: true }), true); assert.equal(urgentCarcassTravel({ hunger: 20, canSprint: true }), false); });
test("attack reach requires collision-boundary contact", () => { const hunter = { x: 0, z: 0, collisionRadius: .3 }, prey = { x: .58, z: 0, collisionRadius: .27 }; assert.equal(physicalContact(hunter, prey), true); prey.x = .59; assert.equal(physicalContact(hunter, prey), false); prey.x = 4.6; assert.equal(physicalContact(hunter, prey), false); });
test("contact attack intents reject stale evidence, wrong requests and lost contact", () => { const intent = { hunterId: "C1", preyId: "H1", requestId: "chase:H1", observationId: "seen-1", decisionTick: 9 }, hunter = { id: "C1", alive: true, x: 0, z: 0, collisionRadius: .3, locomotion: { completedRequestId: "chase:H1" }, predation: { targetKind: "prey", targetId: "H1" } }, prey = { id: "H1", alive: true, x: .57, z: 0, collisionRadius: .27 }; assert.equal(contactAttackIntentEligible(intent, hunter, prey, 9, "seen-1"), true); assert.equal(contactAttackIntentEligible(intent, hunter, prey, 10, "seen-1"), false); assert.equal(contactAttackIntentEligible(intent, hunter, prey, 9, "seen-2"), false); hunter.locomotion.completedRequestId = "other"; assert.equal(contactAttackIntentEligible(intent, hunter, prey, 9, "seen-1"), false); });
test("immobile exhausted hunters recover before travel", () => { assert.equal(movementRecoveryRequired(0, 100), true); assert.equal(movementRecoveryRequired(.7, 60), false); });

test("healthy aggressive hunters exploit visible prey without ignoring physical limits", () => {
  assert.equal(opportunisticHuntEligible({ aggression: .7, energy: 80, fatigue: 20, stomach: 47, health: 90 }, true), true);
  assert.equal(opportunisticHuntEligible({ aggression: .7, energy: 40, fatigue: 20, stomach: 47, health: 90 }, true), false);
  assert.equal(opportunisticHuntEligible({ aggression: .2, energy: 80, fatigue: 20, stomach: 47, health: 90 }, true), false);
});

test("capable hunters exploit prey at body range even when moderately fed", () => {
  assert.equal(closeRangeHuntEligible({ energy: 80, fatigue: 20, stomach: 60, health: 90, predation: createPredationState(0) }, true, 10), true);
  assert.equal(closeRangeHuntEligible({ energy: 80, fatigue: 20, stomach: 90, health: 90, predation: createPredationState(0) }, true, 10), false);
  assert.equal(closeRangeHuntEligible({ energy: 80, fatigue: 20, stomach: 60, health: 90, predation: { huntSuppressedUntil: 20 } }, true, 10), false);
});

test("ordinary hunting requires genuine hunger unless survival or dependants make it urgent", () => {
  const hunter = { stomach: 54, energy: 80, predation: createPredationState(0) };
  assert.equal(ordinaryHuntEligible(hunter, 35, 10), true);
  hunter.stomach = 60; assert.equal(ordinaryHuntEligible(hunter, 50, 10), false);
  hunter.stomach = 10; assert.equal(ordinaryHuntEligible(hunter, 5, 10), true);
  hunter.stomach = 70; assert.equal(ordinaryHuntEligible(hunter, 5, 10, 80), true);
});

test("a kill creates persistent feeding commitment and a full-day hunt suppression", () => {
  const animal = { id: "C1", stomach: 60, energy: 80, predation: recordSuccessfulKill(createPredationState(10), 20) };
  assert.equal(huntSuppressed(animal, 20), true);
  assert.equal(huntSuppressed(animal, 20 + 24 * 60), false);
  assert.equal(carcassCommitmentRequired(animal, { ownerId: "C1", biomass: 20 }, 20, 0), true);
  assert.equal(carcassCommitmentRequired(animal, { ownerId: "C1", biomass: 20 }, 20, 70), false);
  const cleared = clearPredation(animal.predation, 30, "test");
  assert.equal(cleared.lastKillTick, 20); assert.equal(cleared.huntSuppressedUntil, 20 + 24 * 60);
});

test("two consecutive misses impose deterministic recovery", () => {
  let state = recordFailedStrike(createPredationState(0), 10);
  assert.equal(state.consecutiveFailedStrikes, 1); assert.equal(state.huntSuppressedUntil, 0);
  state = recordFailedStrike(state, 11);
  assert.equal(state.consecutiveFailedStrikes, 2); assert.equal(state.huntSuppressedUntil, 41);
});

test("healthy mature herd mates can defend but weak strangers cannot", () => {
  const prey = { id: "H1", groupId: "G", speciesId: "grazer" };
  assert.equal(protectiveDefenderEligible({ id: "H2", groupId: "G", speciesId: "grazer", alive: true, health: 90, energy: 80, aggression: .6 }, prey), true);
  assert.equal(protectiveDefenderEligible({ id: "H3", groupId: "G", speciesId: "grazer", alive: true, health: 40, energy: 80, aggression: .6 }, prey), false);
});

test("a claimed carcass does not pull every adequately fed hunter away from live prey", () => {
  const carcass = { ownerId: "C1" }, hunter = { id: "C2" };
  assert.equal(claimedCarcassPenalty(carcass, hunter, 45, 0), 240);
  assert.equal(claimedCarcassPenalty(carcass, hunter, 80, 0), 0);
  assert.equal(claimedCarcassPenalty(carcass, { id: "C1" }, 45, 0), 0);
});

test("visible live prey outweighs scavenging for a non-owner but not urgent feeding", () => {
  const carcass = { ownerId: "C1" }, hunter = { id: "C2" };
  assert.equal(claimedCarcassPenalty(carcass, hunter, 35, 0, true), 660);
  assert.equal(claimedCarcassPenalty(carcass, hunter, 75, 0, true), 0);
  assert.equal(claimedCarcassPenalty(carcass, hunter, 35, 20, true), 0);
  assert.equal(claimedCarcassPenalty(carcass, { id: "C1" }, 35, 0, true), 0);
});
