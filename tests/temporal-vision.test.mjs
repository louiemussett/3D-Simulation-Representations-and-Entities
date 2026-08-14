import test from "node:test";
import assert from "node:assert/strict";
import { effectiveTemporalResolution, temporalMotionEstimate, TEMPORAL_VISION_PROFILES, validateTemporalVisionProfiles } from "../src/temporal-vision.js";
import { SPECIES_IDS } from "../src/species-registry.js";
import { gradedObservation } from "../src/perception-observation.js";
import { degradeObservation } from "../src/perception-observation.js";
import { runPredictiveCognition } from "../src/predictive-cognition.js";

test("every species has a graded temporal-vision profile", () => {
  assert.equal(Object.keys(TEMPORAL_VISION_PROFILES).length, SPECIES_IDS.length);
  assert.deepEqual(validateTemporalVisionProfiles(), []);
  assert.ok(Object.values(TEMPORAL_VISION_PROFILES).every(profile => profile.evidenceGrade && profile.confidence > 0));
  assert.ok(Object.values(TEMPORAL_VISION_PROFILES).every(profile => profile.plausibleRangeHz[0] <= profile.referenceResolutionHz && profile.plausibleRangeHz[1] >= profile.referenceResolutionHz));
});

test("effective temporal resolution responds to light attention and fatigue", () => {
  const animal = { speciesId: "grazer", fatigue: 0 };
  const clear = effectiveTemporalResolution(animal, { illumination: 1, attention: 1 });
  const impaired = effectiveTemporalResolution(animal, { illumination: .05, attention: .5, fatigue: 90 });
  assert.ok(clear.effectiveHz > impaired.effectiveHz); assert.ok(impaired.sampleIntervalSeconds > clear.sampleIntervalSeconds);
});

test("reptile temporal resolution follows thermal performance while endotherms remain stable", () => {
  const coldReptile = effectiveTemporalResolution({ speciesId: "sunscale-ambusher" }, { thermalPerformance: .2 }), warmReptile = effectiveTemporalResolution({ speciesId: "sunscale-ambusher" }, { thermalPerformance: 1 });
  const coldGrazer = effectiveTemporalResolution({ speciesId: "grazer" }, { thermalPerformance: .2 }), warmGrazer = effectiveTemporalResolution({ speciesId: "grazer" }, { thermalPerformance: 1 });
  assert.ok(warmReptile.effectiveHz > coldReptile.effectiveHz * 2); assert.equal(warmGrazer.effectiveHz, coldGrazer.effectiveHz);
});

test("temporal sampling produces motion confidence and uncertain velocity", () => {
  const target = { vx: .35, vz: .1 };
  const warm = temporalMotionEstimate({ speciesId: "sunscale-ambusher", thermalPerformance: 1 }, target, .8, { thermalPerformance: 1 });
  const cold = temporalMotionEstimate({ speciesId: "sunscale-ambusher", thermalPerformance: .18 }, target, .8, { thermalPerformance: .18 });
  assert.ok(warm.motionConfidence > cold.motionConfidence); assert.ok(warm.velocityConfidence > cold.velocityConfidence); assert.ok(cold.velocityUncertainty > warm.velocityUncertainty);
});

test("graded sight carries temporal evidence instead of certain velocity", () => {
  const observation = gradedObservation({ id: "R", speciesId: "sunscale-ambusher", x: 0, z: 0, orientation: 0, thermalPerformance: .15, illumination: .2 }, { id: "P", speciesId: "grazer", x: 2, z: 0, vx: .2, vz: 0 }, { visible: true, binocular: true, confidence: .8 });
  assert.ok(observation.temporalResolution.effectiveHz > 0); assert.ok(observation.motionConfidence < observation.confidence); assert.ok(observation.velocityUncertainty > 0);
});

test("remembered motion loses confidence while velocity uncertainty grows", () => {
  const faded = degradeObservation({ confidence: .9, motionConfidence: .8, velocityConfidence: .7, velocityUncertainty: .1, identifiedSpecies: "hunter", vx: .3, vz: 0 }, 4);
  assert.ok(faded.motionConfidence < .8); assert.ok(faded.velocityConfidence < .7); assert.ok(faded.velocityUncertainty > .1);
});

test("predictive motion uses observed velocity confidence and expands uncertainty", () => {
  const animal = { id: "A", hydration: 90, fatigue: 0, energy: 80, fear: 0, memories: [], mediumTermMemory: [], sensoryBuffer: [{ evidenceId: "seen:P", channel: "sight", type: "predator", targetId: "P", x: 5, z: 4, vx: .5, vz: 0, confidence: .9, motionConfidence: .7, velocityConfidence: .7, velocityUncertainty: .4, temporalResolution: { effectiveHz: 42 } }] };
  const cycle = runPredictiveCognition(animal, { tick: 3, modelBudget: 6 }), motion = cycle.predictions.find(item => item.modelId === "motion.v1");
  assert.deepEqual(motion.output.velocity, { x: .5, z: 0 }); assert.equal(motion.output.velocityConfidence, .7); assert.equal(motion.output.temporalResolutionHz, 42); assert.ok(motion.output.radius > 3);
});
