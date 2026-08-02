import test from "node:test";
import assert from "node:assert/strict";
import { adaptFemaleMatePreferences, createMaleMatingEpisode, inferredLibido, inferredSocialTemperament, maleMatingStrategy, maleSocialStrategyNetwork, migrateSocialState, observableMateCompatibility, rateFemaleCandidate, relationshipKind, rememberFemaleMateOutcome, rememberMaleFemaleRating, rememberSocialEvent, shareFemaleMateObservation, shareHighRatedFemale, socialEncounterKind } from "../src/social-relationships.js";

test("mate compatibility uses observable cues instead of exact health", () => {
  const female = migrateSocialState({ sex: "F", lifeStage: "adult", mateSkill: 1, aggression: .4 }, { adultMass: 70, matureAge: 100 });
  const cues = { injury: "none", apparentMass: 70, apparentAge: 170, aggressionDisplay: .5, activity: "foraging", headMovement: "listening", movementPace: "calm", emittedSignal: null };
  const result = observableMateCompatibility(female.matePreferences, cues, { courtshipAttempts: 1, events: [{ event: "courtship" }], foragingHours: 5 });
  assert.ok(result.score > .5); assert.equal(result.components.attentive, 1); assert.equal("health" in cues, false);
});

test("female mating-duration preference contributes to mate compatibility", () => {
  const female = migrateSocialState({ sex: "F", lifeStage: "adult", matePreferences: { preferredMatingDuration: 9, matingDurationTolerance: 2 } }, { adultMass: 70, matureAge: 100 });
  const matching = observableMateCompatibility(female.matePreferences, { proposedMatingDuration: 9 }, {});
  const mismatching = observableMateCompatibility(female.matePreferences, { proposedMatingDuration: 2 }, {});
  assert.equal(matching.components.durationFit, 1);
  assert.equal(mismatching.components.durationFit, 0);
  assert.ok(matching.score > mismatching.score);
});

test("male libido episode deterministically changes mating duration and frequency", () => {
  const male = { lifeStage: "adult", mateSkill: 1, aggression: .4, energy: 100, health: 100, fatigue: 5, fear: 0 };
  const low = createMaleMatingEpisode(male, 0), high = createMaleMatingEpisode(male, .99);
  assert.ok(high.libido > low.libido);
  assert.ok(high.duration > low.duration);
  assert.ok(high.cooldown < low.cooldown);
  assert.deepEqual(createMaleMatingEpisode(male, .42), createMaleMatingEpisode(male, .42));
});

test("females retain a bounded graph of firsthand and shared mate alignment", () => {
  const source = { id: "F1", sex: "F" }, receiver = { id: "F2", sex: "F" };
  rememberFemaleMateOutcome(source, "M1", { satisfaction: .9, duration: 9, tick: 10 });
  const shared = shareFemaleMateObservation(receiver, source, 11);
  assert.equal(shared.maleId, "M1"); assert.equal(shared.shared, 1); assert.deepEqual(shared.sources, ["F1"]);
  for (let i = 0; i < 20; i++) rememberFemaleMateOutcome(receiver, `M${i + 2}`, { satisfaction: .5, duration: 7, tick: 20 + i });
  assert.ok(Object.keys(receiver.femaleMateGraph).length <= 12);
});

test("males retain and share only observation-derived female estimates", () => {
  const male = { id: "M1", sex: "M" }, receiver = { id: "M2", sex: "M" };
  const female = { id: "F1", sex: "F", alive: true, age: 180, bodyMass: 70, offspringIds: [], pregnant: null, x: 4, z: 8 };
  const observation = { apparentAge: 175, apparentMass: 68, lifeStage: "adult", reproductiveCue: "available", confidence: .8 };
  const rating = rateFemaleCandidate(male, female, { matureAge: 100, adultMass: 70, ...observation });
  assert.ok(rating >= .7);
  const retained = rememberMaleFemaleRating(male, female, rating, 20, observation);
  assert.equal("age" in retained, false); assert.equal("weight" in retained, false); assert.equal("pregnant" in retained, false);
  assert.equal(retained.observation.apparentAge, 175); assert.equal(retained.observation.provenance, "firsthand");
  const report = shareHighRatedFemale(receiver, male, 21);
  assert.equal(report.femaleId, "F1"); assert.deepEqual(report.lastSeen, { x: 4, z: 8, tick: 20, reportedAt: 21 });
  assert.equal(report.observation.provenance, "reported"); assert.equal(report.observation.sourceId, "M1"); assert.ok(report.observation.confidence < retained.observation.confidence);
  female.pregnant = {}; const pregnantObservation = { ...observation, reproductiveCue: "pregnant" };
  rememberMaleFemaleRating(male, female, rateFemaleCandidate(male, female, { matureAge: 100, adultMass: 70, ...pregnantObservation }), 22, pregnantObservation);
  assert.equal(shareHighRatedFemale({ id: "M3", sex: "M" }, male, 23), null);
});

test("old male records discard leaked exact measurements during migration", () => {
  const male = { sex: "M", lifeStage: "adult", maleFemaleRatings: { F1: { femaleId: "F1", age: 183.72, weight: 71.18, offspring: 2, pregnant: false, rating: .8, updatedTick: 4 } } };
  migrateSocialState(male);
  const record = male.maleFemaleRatings.F1;
  assert.equal("age" in record, false); assert.equal("weight" in record, false); assert.equal("offspring" in record, false); assert.equal("pregnant" in record, false);
  assert.equal(record.observation.provenance, "legacy-unverified"); assert.equal(record.observation.apparentAge, null); assert.equal(record.observation.apparentMass, null);
});

test("male social lens preserves simultaneous relationship channels", () => {
  const male = { id: "M1", sex: "M", lifeStage: "adult", groupId: "G", energy: 100, health: 100, fatigue: 5, fear: 0, libido: .8, dominanceTrait: .7, aggression: .5, careAffinity: .9, courtshipBreadth: .4, offspringIds: ["F1"], socialMemory: { F1: { partnerId: "F1", affinity: .8, matings: 3, foragingHours: 5, lastInteractionTick: 90, firsthand: 3 } }, maleFemaleRatings: { F1: { femaleId: "F1", rating: .9, firsthand: 1, updatedTick: 90, observation: { confidence: .8, provenance: "firsthand" } } } };
  const female = { id: "F1", sex: "F", lifeStage: "adult", alive: true, groupId: "G", parentIds: ["M1"] };
  const before = structuredClone(male);
  const lens = maleSocialStrategyNetwork(male, [male, female], { tick: 100, organisation: "territorial-pair", breedingContext: 1, observedIds: ["F1"], availableFemales: 1 });
  const node = lens.nodes.find((entry) => entry.id === "F1"), channels = node.channels.map((entry) => entry.channel);
  assert.ok(channels.includes("affiliation")); assert.ok(channels.includes("reproductive")); assert.ok(channels.includes("care")); assert.equal(node.bonded, true);
  assert.ok(lens.edges.filter((edge) => edge.targetId === "F1").length >= 3); assert.deepEqual(male, before);
});

test("male social salience is bounded by current physical affordability", () => {
  const record = { F1: { partnerId: "F1", affinity: .6, matings: 2, lastInteractionTick: 10, firsthand: 1 } };
  const rating = { F1: { femaleId: "F1", rating: .85, firsthand: 1, updatedTick: 10, observation: { confidence: .8 } } };
  const female = { id: "F1", sex: "F", lifeStage: "adult", alive: true };
  const base = { id: "M1", sex: "M", lifeStage: "adult", libido: .9, dominanceTrait: .5, aggression: .4, careAffinity: .5, courtshipBreadth: .6, socialMemory: record, maleFemaleRatings: rating };
  const fit = maleSocialStrategyNetwork({ ...base, energy: 110, health: 100, fatigue: 0, fear: 0 }, [female], { tick: 12, breedingContext: 1, availableFemales: 1 });
  const depleted = maleSocialStrategyNetwork({ ...base, energy: 10, health: 30, fatigue: 95, fear: 90 }, [female], { tick: 12, breedingContext: 1, availableFemales: 1 });
  assert.ok(fit.nodes[0].salience > depleted.nodes[0].salience); assert.equal(fit.focus.targetId, "F1");
});

test("reported male social evidence remains visibly distinct from observation", () => {
  const male = { id: "M1", sex: "M", lifeStage: "adult", energy: 90, health: 90, fatigue: 10, fear: 0, libido: .5, socialMemory: {}, maleFemaleRatings: { F1: { femaleId: "F1", rating: .8, shared: 1, firsthand: 0, sources: ["M2"], updatedTick: 8, observation: { confidence: .4, provenance: "reported" } } } };
  const lens = maleSocialStrategyNetwork(male, [{ id: "F1", sex: "F", lifeStage: "adult", alive: true }], { tick: 10 });
  assert.equal(lens.nodes[0].evidence.kind, "reported"); assert.equal(lens.edges[0].reported, true);
});

test("courtship mating and foraging create bounded partner memories", () => {
  const animal = {};
  rememberSocialEvent(animal, "A2", "courtship", 1, { x: 2, z: 3 });
  rememberSocialEvent(animal, "A2", "mating", 2);
  for (let tick = 3; tick < 7; tick += 1) rememberSocialEvent(animal, "A2", "foraging", tick);
  assert.equal(animal.socialMemory.A2.courtshipAttempts, 1); assert.equal(animal.socialMemory.A2.matings, 1);
  assert.equal(relationshipKind(animal.socialMemory.A2), "mate-bond"); assert.ok(animal.socialMemory.A2.events.length <= 8);
});

test("repeated shared foraging can form a platonic friendship", () => {
  const animal = {}; for (let tick = 0; tick < 4; tick += 1) rememberSocialEvent(animal, "A3", "foraging", tick);
  assert.equal(relationshipKind(animal.socialMemory.A3), "friendship");
});

test("social temperaments permit dominance submission and varied courtship breadth", () => {
  const bold = inferredSocialTemperament({ aggression: .9, sizeTrait: 1.2, mateSkill: 1.4 }), cautious = inferredSocialTemperament({ aggression: .2, sizeTrait: .85, mateSkill: .65 });
  assert.ok(bold.dominance > cautious.dominance); assert.ok(cautious.submission > bold.submission); assert.ok(bold.courtshipBreadth > cautious.courtshipBreadth);
});

test("social encounters are contextual possibilities rather than universal rules", () => {
  const base = { alive: true, speciesId: "grazer", aggression: .5, dominanceTrait: .5, submissionTrait: .5, energy: 100, fatigue: 0, fear: 0, bodyMass: 70, injuries: [] };
  const emerge = (actor, target) => { let result = null; for (let step = 0; step < 40 && !result; step++) result = socialEncounterKind(actor, target); return result; };
  assert.equal(socialEncounterKind({ ...base, id: "A", sex: "F", lifeStage: "adult" }, { ...base, id: "B", sex: "F", lifeStage: "adult" }), null);
  assert.equal(emerge({ ...base, id: "J1", sex: "M", lifeStage: "juvenile" }, { ...base, id: "J2", sex: "F", lifeStage: "juvenile" }).kind, "spar");
  assert.ok(["assess-rival", "dominance"].includes(emerge({ ...base, id: "M1", sex: "M", lifeStage: "adult", dominanceTrait: .8 }, { ...base, id: "M2", sex: "M", lifeStage: "adult" }).kind));
  assert.equal(emerge({ ...base, id: "S", sex: "M", lifeStage: "adult", dominanceTrait: .2, submissionTrait: .8 }, { ...base, id: "D", sex: "M", lifeStage: "adult", dominanceTrait: .8 }).kind, "submit");
});

test("libido and mating disposition do not exist below adulthood", () => {
  for (const lifeStage of ["dependent", "juvenile", "subadult"]) assert.equal(inferredLibido({ lifeStage, mateSkill: 1.2 }), 0);
  const juvenile = migrateSocialState({ sex: "F", lifeStage: "juvenile", libido: .9, matePreferences: { preferredMass: 90 } });
  assert.equal(juvenile.libido, 0); assert.equal(juvenile.matePreferences, null);
  assert.ok(inferredLibido({ lifeStage: "adult", mateSkill: 1.2 }) > 0);
});

test("female preferences adapt gradually to observed males and environmental pressure", () => {
  const female = migrateSocialState({ sex: "F", lifeStage: "adult", mateSkill: 1, aggression: .4 }, { adultMass: 70, matureAge: 100 });
  const before = { ...female.matePreferences };
  adaptFemaleMatePreferences(female, [{ sex: "M", lifeStage: "adult", apparentMass: 90 }], { resourceScarcity: .9, danger: .8 });
  assert.ok(female.matePreferences.preferredMass > before.preferredMass); assert.ok(female.matePreferences.valuesForaging > before.valuesForaging);
  assert.ok(female.matePreferences.preferredMass < 90);
});

test("male mating strategy emerges from condition traits opportunities and relationship history", () => {
  const male = { sex: "M", lifeStage: "adult", energy: 100, health: 100, fatigue: 5, fear: 0, courtshipBreadth: .9, libido: .9, aggression: .6, careAffinity: .4 };
  assert.equal(maleMatingStrategy(male, [], { availableFemales: 3 }).kind, "broad-courtship");
  const bonded = maleMatingStrategy({ ...male, courtshipBreadth: .35, careAffinity: .9 }, [{ partnerId: "F1", affinity: .8, matings: 3, events: [] }], { availableFemales: 3 });
  assert.equal(bonded.kind, "partner-bonded"); assert.equal(bonded.preferredPartnerId, "F1");
  assert.equal(maleMatingStrategy({ ...male, energy: 20, fatigue: 90 }, [], { availableFemales: 3 }).kind, "selective");
});

test("male strategy is deterministic for identical state history and opportunities", () => {
  const male = { sex: "M", lifeStage: "adult", energy: 80, health: 90, fatigue: 20, fear: 10, courtshipBreadth: .7, libido: .8, aggression: .5, careAffinity: .6 };
  const records = [{ partnerId: "F2", affinity: .2, matings: 1, events: [{ event: "mating", tick: 10 }] }];
  assert.deepEqual(maleMatingStrategy(male, records, { availableFemales: 2 }), maleMatingStrategy(male, records, { availableFemales: 2 }));
});
