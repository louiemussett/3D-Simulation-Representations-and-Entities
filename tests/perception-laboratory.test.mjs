import test from "node:test";
import assert from "node:assert/strict";
import { causalWhyDiagnostic, sensorAnatomyDiagnostic, temporalMotionDiagnostic, truthPerceptionTraceInspection } from "../src/perception-laboratory.js";

test("sensor anatomy diagnostic retains invisible-anchor status", () => {
  const rows = sensorAnatomyDiagnostic({ id: "A" }, [{ id: "left-eye", type: "eye", anatomicalParent: "head", localPosition: [-.1, 0, .2], yawDegrees: -20, fieldDegrees: 120, visibleGeometryRequired: false }]);
  assert.equal(rows[0].visibleGeometryRequired, false); assert.equal(rows[0].informationBoundary, "diagnostic-anatomy-only");
});

test("temporal diagnostics report motion confidence separately from resolution", () => {
  const rows = temporalMotionDiagnostic([{ channel: "sight", type: "animal", motionConfidence: .6, velocityConfidence: .4, temporalResolution: { effectiveHz: 55, referenceHz: 62, sampleIntervalSeconds: .018, lightFactor: .9, attentionFactor: 1, fatigueFactor: .8, thermalFactor: 1 } }]);
  assert.equal(rows[0].effectiveHz, 55); assert.equal(rows[0].motionConfidence, .6); assert.equal(rows[0].velocityConfidence, .4);
});

test("truth inspection distinguishes missed traces from perceived traces", () => {
  const rows = truthPerceptionTraceInspection([{ kind: "footprint", sourceId: "A", x: 1, z: 1, intensity: .8 }], []);
  assert.equal(rows[0].truth.sourceId, "A"); assert.equal(rows[0].perceived.detected, false);
});

test("why diagnostics explain ranking without inventing missing flee evidence", () => {
  const diagnostic = causalWhyDiagnostic({ drive: "water", priorities: [{ drive: "water", score: 80 }, { drive: "forage", score: 40 }], actionState: { key: "travel", intendedOutcome: "drink" }, sensoryBuffer: [] });
  assert.match(diagnostic.whyNot[0].reason, /40 points/); assert.match(diagnostic.whyNotFlee, /No qualifying/); assert.equal(diagnostic.explanationStatus, "current-state-fallback");
});

test("why diagnostics distinguish a retained action episode from a one-tick replacement", () => {
  const diagnostic = causalWhyDiagnostic({ drive: "food", priorities: [{ drive: "food", score: 70 }], actionState: { key: "graze", episodeId: "action:A:3", startedTick: 8, continuationTicks: 6 }, sensoryBuffer: [] });
  assert.equal(diagnostic.chosen.actionEpisodeId, "action:A:3");
  assert.equal(diagnostic.chosen.actionStartedTick, 8);
  assert.equal(diagnostic.chosen.actionContinuationTicks, 6);
  assert.match(diagnostic.chain.at(-1), /continued 6 ticks/);
});
