import test from "node:test";
import assert from "node:assert/strict";
import { buildEvidenceHypotheses, selectTrackingRoute, traceFreshness, traceToSensoryEvidence } from "../src/evidence-fusion.js";

test("trace freshness retains uncertainty instead of reporting exact age", () => {
  const fresh = traceFreshness({ ageHours: 1, intensity: .9, substrate: "mud" }, { rain: 0 }), washed = traceFreshness({ ageHours: 1, intensity: .4, substrate: "rock" }, { rain: .8 });
  assert.equal(fresh.band, "fresh"); assert.ok(fresh.maximumHours > fresh.minimumHours); assert.ok(washed.estimatedHours > fresh.estimatedHours);
});

test("trace observations reveal identity only when strong and familiar", () => {
  const record = { kind: "footprint", sourceId: "A", speciesId: "grazer", intensity: 1, ageHours: 0, x: 2, z: 1, substrate: "mud" }, cell = { id: 1, x: 2, z: 1 };
  const unknown = traceToSensoryEvidence({ id: "B" }, record, cell, { visible: true, isPreySpecies: () => true }), familiar = traceToSensoryEvidence({ id: "B" }, record, cell, { visible: true, familiarSourceIds: new Set(["A"]), isPreySpecies: () => true });
  assert.equal(unknown.targetId, undefined); assert.equal(unknown.type, "preyTrail"); assert.equal(familiar.targetId, "A");
});

test("multiple uncertain traces form bounded prey and threat hypotheses", () => {
  const observer = { id: "H", x: 0, z: 0, canHunt: true }, evidence = [{ id: "p1", type: "preyTrail", x: 2, z: 0, confidence: .6, age: 1, heading: 0 }, { id: "p2", type: "movement-trace", x: 3, z: 0, confidence: .4, age: 2, heading: 0 }, { id: "t1", type: "predator", x: -1, z: 0, confidence: .7, age: 0 }];
  const hypotheses = buildEvidenceHypotheses(observer, evidence, 5);
  assert.deepEqual(hypotheses.map(item => item.kind), ["prey", "threat"]); assert.ok(hypotheses[0].confidence > .3); assert.equal(hypotheses[0].informationBoundary, "observer-evidence-fusion-only");
});

test("tracking route refuses unknown cells even when they score best", () => {
  const route = selectTrackingRoute({ x: 0, z: 0 }, { kind: "prey", x: 5, z: 0, confidence: .8 }, [{ id: "hidden", x: 1, z: 0, known: false, evidenceSupport: 1 }, { id: "known", x: 0, z: 1, known: true, evidenceSupport: .2 }]);
  assert.equal(route.destination.id, "known"); assert.equal(route.informationBoundary, "known-candidates-only");
});

test("persistent use sites enrich hypotheses without revealing an unknown individual", () => {
  const record = { kind: "bedding-site", sourceId: "G7", speciesId: "grazer", intensity: .92, ageHours: 1, x: 2, z: 2, substrate: "vegetation" };
  const evidence = traceToSensoryEvidence({ id: "H" }, record, { id: 9, x: 2, z: 2 }, { visible: true, isPreySpecies: () => true });
  assert.equal(evidence.identifiedIndividual, null);
  const [hypothesis] = buildEvidenceHypotheses({ id: "H", x: 0, z: 0, canHunt: true }, [evidence], 8);
  assert.deepEqual(hypothesis.siteKinds, ["bedding-site"]);
  assert.equal(hypothesis.ecologicalUse, "recent-use-area-search");
});
