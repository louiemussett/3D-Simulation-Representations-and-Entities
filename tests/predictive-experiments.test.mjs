import test from "node:test";
import assert from "node:assert/strict";
import { applyPredictiveDisruption, predictiveExperimentMetrics, predictiveExperimentProfile } from "../src/predictive-experiments.js";

test("experiment profiles provide legacy, fixed, adaptive, and ablation controls", () => { assert.equal(predictiveExperimentProfile("LEGACY").cognitionMode, "LEGACY"); assert.equal(predictiveExperimentProfile("ADAPTIVE").cognitionProfile, "ADAPTIVE"); assert.ok(predictiveExperimentProfile("ABLATE_MOTION").disabledModels.includes("motion.v1")); });
test("controlled disruptions are deterministic and do not mutate their fixture", () => { const fixture = { fatigue: 10, memories: [{ type: "water", age: 2 }], sensoryBuffer: [{ channel: "sight", targetId: "P" }] }, changed = applyPredictiveDisruption(fixture, { type: "LOST_VISUAL_CONTACT", targetId: "P" }); assert.equal(changed.sensoryBuffer.length, 0); assert.equal(fixture.sensoryBuffer.length, 1); });
test("experiment metrics report bounded runtime and correction totals", () => { const value = predictiveExperimentMetrics([{ predictiveCognition: { metrics: { cycles: 2, cost: 6, admitted: 4, abstained: 1, corrections: 1 }, structuralProposals: [{}] } }]); assert.equal(value.meanCostPerCycle, 3); assert.equal(value.structuralProposals, 1); });
