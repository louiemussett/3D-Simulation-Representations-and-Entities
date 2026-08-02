import test from "node:test";
import assert from "node:assert/strict";
import { ACCESS_MODES, DECISION_TRACE_EVIDENCE_LIMIT, accessProjection, alarmObservation, captureDecisionTrace, evidenceCaption, evidenceRef, memoryEvidence, selectDecisionEvidence, splitCommunicationEvidence, threatAssessment, tracePrimaryEvidence } from "../src/decision-trace.js";

const sight = evidenceRef({ type: "animal", targetId: "prey-1", x: 4, z: 5, confidence: .9, channel: "sight" }, 10);

test("stale prey cannot become the cause of a later rest", () => {
  const trace = captureDecisionTrace({ tick: 11, priority: { key: "rest", score: 80 }, actionState: { key: "rest", intendedOutcome: "recover" }, evidence: [], primaryEvidenceId: sight.evidenceId });
  assert.equal(trace.primaryEvidenceId, null); assert.equal(tracePrimaryEvidence(trace), null);
});

test("memory preserves original provenance without claiming current sight", () => {
  const memory = memoryEvidence(sight, 12);
  assert.equal(memory.channel, "memory"); assert.equal(memory.originalChannel, "sight"); assert.match(evidenceCaption({ ...memory, age: 4 }), /remembered sight, age 4/);
});

test("later contact mutation cannot rewrite a decision", () => {
  const mutable = { ...sight };
  const trace = captureDecisionTrace({ tick: 10, priority: { key: "hunt", score: 90 }, actionState: { key: "chase", target: "prey-1", intendedOutcome: "catch prey" }, evidence: [mutable], primaryEvidenceId: mutable.evidenceId });
  mutable.x = 999; mutable.confidence = 0;
  assert.equal(trace.evidence[0].x, 4); assert.equal(trace.evidence[0].confidence, .9);
});

test("decision evidence is bounded, deeply detached and keeps an out-of-window primary record", () => {
  const evidence = Array.from({ length: DECISION_TRACE_EVIDENCE_LIMIT + 8 }, (_, index) => ({ evidenceId: `e:${index}`, type: "animal", channel: "sight", confidence: .5, bodyCues: { posture: { tags: ["still", "alert"] } } }));
  const primary = evidence.at(-1), trace = captureDecisionTrace({ tick: 9, priority: { key: "watch", score: 4 }, actionState: { key: "observe" }, evidence, primaryEvidenceId: primary.evidenceId });
  primary.bodyCues.posture.tags[0] = "mutated";
  assert.equal(trace.evidence.length, DECISION_TRACE_EVIDENCE_LIMIT);
  assert.equal(trace.evidence.at(-1).evidenceId, primary.evidenceId);
  assert.equal(trace.evidence.at(-1).bodyCues.posture.tags[0], "still");
  assert.equal(Object.isFrozen(trace.evidence), true);
  assert.equal(Object.isFrozen(trace.evidence.at(-1).bodyCues.posture.tags), true);
  assert.throws(() => trace.evidence.push(primary), TypeError);
});

test("unknown movement sound stays unidentified and separate from map reveals", () => {
  const sound = evidenceRef({ type: "unknownSound", x: 2, z: 3, confidence: .3, channel: "hearing", soundIdentity: "unknown" }, 3);
  const split = splitCommunicationEvidence([sound]);
  assert.equal(split.heardEvents[0].soundIdentity, "unknown"); assert.equal(split.mapReveals.length, 0);
});

test("evidence normalization preserves observed identity and motion without inventing them", () => {
  const observed = evidenceRef({ type: "animal", targetId: "prey-2", x: 3, z: 2, confidence: .84, channel: "sight", identifiedSpecies: "grazer", speciesId: "grazer", coarseClass: "animal", identifiedIndividual: "prey-2", detectedMotion: true, vx: .2, vz: -.1, velocityConfidence: .72, heading: 1.1, headHeading: 1.3, bearing: .4, region: "central", apparentMass: 63 }, 7);
  assert.equal(observed.identifiedSpecies, "grazer"); assert.equal(observed.speciesId, "grazer"); assert.equal(observed.coarseClass, "animal");
  assert.equal(observed.identifiedIndividual, "prey-2"); assert.equal(observed.detectedMotion, true); assert.deepEqual([observed.vx, observed.vz], [.2, -.1]);
  assert.equal(observed.velocityConfidence, .72); assert.equal(observed.heading, 1.1); assert.equal(observed.headHeading, 1.3); assert.equal(observed.bearing, .4); assert.equal(observed.region, "central"); assert.equal(observed.apparentMass, 63);
  const unidentified = evidenceRef({ type: "animal", targetId: "unknown", x: 4, z: 4, confidence: .3, channel: "sight" }, 7);
  assert.equal(unidentified.identifiedSpecies, null); assert.equal(unidentified.speciesId, null); assert.equal(unidentified.coarseClass, null); assert.equal(unidentified.identifiedIndividual, null); assert.equal(unidentified.vx, null); assert.equal(unidentified.apparentMass, null);
});

test("destination is not causal evidence", () => {
  const trace = captureDecisionTrace({ tick: 5, priority: { key: "water", score: 70 }, actionState: { key: "travel", destination: { x: 8, z: 9 }, intendedOutcome: "drink" }, evidence: [] });
  assert.deepEqual(trace.destination, { x: 8, z: 9 }); assert.equal(trace.evidence.length, 0); assert.equal(tracePrimaryEvidence(trace), null);
});

test("location-only food memory is selected without treating destination as evidence", () => {
  const rememberedFood = memoryEvidence({ type: "food", x: 4, z: 2, confidence: .7, channel: "sight" }, 12);
  assert.equal(selectDecisionEvidence([rememberedFood], { target: "4,2", evidenceType: "food" }), rememberedFood);
  assert.equal(selectDecisionEvidence([rememberedFood], { target: "4,2" }), null);
});

test("threat contributors retain their own confidence and uncertainty", () => {
  const assessment = threatAssessment([{ type: "predator", x: 1, z: 1, confidence: .8, uncertainty: .2, channel: "sight" }, { type: "predator", x: 9, z: 9, confidence: .25, uncertainty: .75, channel: "hearing" }]);
  assert.ok(assessment.overallConfidence > .8); assert.equal(assessment.contributors[1].confidence, .25); assert.equal(assessment.contributors[1].uncertainty, .75);
});

test("seeing an alarm exposes sender position, not hidden predator position", () => {
  const alarm = alarmObservation({ id: "grazer-2", x: 2, z: 3 }, { kind: "threat", x: 99, z: 99, tick: 4 }, .7);
  assert.deepEqual([alarm.x, alarm.z], [2, 3]); assert.equal(alarm.communicatedBy, "grazer-2");
});

test("heard events do not alter fog/map reveal collections", () => {
  const split = splitCommunicationEvidence([{ type: "unknownSound", channel: "hearing", x: 4, z: 4 }]);
  assert.equal(split.heardEvents.length, 1); assert.deepEqual(split.mapReveals, []);
});

test("every access mode enforces its information boundary", () => {
  const entity = { id: "a", speciesId: "grazer", sex: "F", x: 1, z: 2, alive: true, health: 80, energy: 12, hydration: 9, fear: 70, priorities: [{ drive: "water" }], memories: [sight], decisionTrace: { intendedOutcome: "find water" }, actionState: { key: "travel", moving: true, destination: { x: 9, z: 9 } }, injuries: [] };
  assert.deepEqual(ACCESS_MODES, ["laboratory", "selected-self", "observable-other", "strategic"]);
  assert.equal(accessProjection(entity, "laboratory").energy, 12); assert.equal(accessProjection(entity, "selected-self").memories.length, 1);
  const other = accessProjection(entity, "observable-other"); assert.equal(other.energy, undefined); assert.equal(other.memories, undefined); assert.equal(other.health, undefined); assert.equal(other.injuries, undefined); assert.equal(other.bodyCues.injury, "minor-injury"); assert.equal(other.visibleAction, "moving");
  assert.deepEqual(Object.keys(accessProjection(entity, "strategic")).sort(), ["alive", "id", "speciesId", "x", "z"]);
});
