import test from "node:test";
import assert from "node:assert/strict";
import { createEnvironmentInterface } from "../src/environment-interface.js";
import { createVisionInterface } from "../src/vision-interface.js";
import { updateScentField } from "../src/scent-model.js";
import { classifySensoryContacts } from "../src/perception-orchestrator.js";
import { FOUNDER_VISUAL_BASELINE, phaseZeroDeterministicHash } from "../src/perception-baselines.js";

test("phase zero records a stable deterministic perception and founder baseline", () => {
  assert.equal(phaseZeroDeterministicHash(), "2b49c409");
  assert.deepEqual(FOUNDER_VISUAL_BASELINE.grazer.rightEye, { x: .105, y: .055, z: .145 });
  assert.deepEqual(FOUNDER_VISUAL_BASELINE.hunter.rightEye, { x: .08, y: .07, z: .08 });
});

test("environment and vision interfaces preserve authoritative vision output", () => {
  const environment = createEnvironmentInterface({ cellAt: () => null, surfaceHeight: () => 0, weatherAt: () => ({ rain: 0 }), coverOpacity: () => 0 });
  const vision = createVisionInterface({ environment, rangeFor: () => 8 });
  const result = vision.observe({ speciesId: "grazer", x: 0, z: 0, orientation: 0 }, { id: "target", x: 4, z: 0 });
  assert.equal(result.visible, true); assert.equal(result.reason, "visible");
});

test("scent extraction retains deposition and decay coefficients", () => {
  const cell = { x: 0, z: 0, scent: { grazer: 1, hunter: 0 } }, activeScent = { "0,0": 1 };
  updateScentField({ activeScent, animals: [{ alive: true, speciesId: "hunter", x: 0, z: 0 }], elapsed: 1, wind: 0, cellAt: () => cell, cellKey: () => "0,0", scentGuild: animal => animal.speciesId });
  assert.ok(Math.abs(cell.scent.grazer - Math.pow(.5, 1 / 18)) < 1e-12);
  assert.equal(cell.scent.hunter, .7);
});

test("perception orchestration preserves channel classification", () => {
  const result = classifySensoryContacts({ animal: { speciesId: "grazer" }, attention: { focusTicks: 0 }, tick: 12, noticesSound: () => true, evidenceRef: (contact, tick) => ({ ...contact, tick }), contacts: [
    { channel: "sight", targetId: "a" }, { channel: "hearing", targetId: "b" }, { channel: "hearing", signalKind: "alarm", targetId: "c" }, { channel: "visual-signal", signalKind: "threat", explicitMapReveal: true }
  ] });
  assert.equal(result.sensoryBuffer.length, 4); assert.equal(result.sight.length, 1); assert.equal(result.heardEvents.length, 1); assert.equal(result.receivedSignals.length, 2); assert.equal(result.mapReveals.length, 1);
});
