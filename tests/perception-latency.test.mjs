import test from "node:test";
import assert from "node:assert/strict";
import { biologicalLatencyProfile, latencyDiagnostic, recordDecisionAndMotorLatency, recordPerceptionLatency } from "../src/perception-latency.js";

test("latency keeps sensory recognition decision motor and response distinct", () => {
  const animal = { id: "A", fatigue: 10, thermalPerformance: 1 };
  recordPerceptionLatency(animal, { id: "A:B", targetId: "B", channel: "sight", confidence: .8, temporalResolution: { effectiveHz: 70 } }, 12);
  recordDecisionAndMotorLatency(animal, 13, "flee");
  const chain = latencyDiagnostic(animal)[0];
  assert.deepEqual(chain.stages.map(stage => stage.stage), ["sensory-accumulation", "recognition", "decision", "motor-command", "physical-response"]);
  assert.ok(chain.stages.every((stage, index, stages) => index === 0 || stage.offsetSeconds >= stages[index - 1].offsetSeconds));
  assert.ok(chain.stages.at(-1).atEcologicalMinute > chain.stages[0].atEcologicalMinute);
  assert.equal(chain.complete, true);
});

test("low confidence and poor thermal performance increase modelled latency", () => {
  const fast = biologicalLatencyProfile({ fatigue: 0 }, { temporalResolutionHz: 80, confidence: .9, thermalPerformance: 1 });
  const slow = biologicalLatencyProfile({ fatigue: 60 }, { temporalResolutionHz: 25, confidence: .2, thermalPerformance: .3 });
  assert.ok(slow.totalSeconds > fast.totalSeconds);
});
