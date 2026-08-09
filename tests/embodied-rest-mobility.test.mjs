import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");

test("direct movement rises from a grounded posture before creating locomotion", () => {
  const start = app.indexOf("function advanceEmbodiedGameplay");
  const end = app.indexOf("let cinemaPopulationCache", start);
  const gameplay = app.slice(start, end);
  const rise = gameplay.indexOf("isGroundRestPosture(actionPresentation(animal).posture)");
  const travel = gameplay.indexOf('createMovementRequest("embodied-camera-relative"');

  assert.ok(rise >= 0, "ground-rest movement gate exists");
  assert.ok(travel > rise, "standing gate runs before movement is created");
  assert.match(gameplay, /readyAt: now \+ durationMs/);
  assert.match(gameplay, /if \(running && movement && movementReady\)/);
  assert.match(gameplay, /setAction\(animal, "wake"/);
});

test("simulation decisions remain stationary throughout the real-time rise", () => {
  const start = app.indexOf("function applyEmbodiedDecision");
  const end = app.indexOf("function applyAnimalPostAction", start);
  const decision = app.slice(start, end);

  assert.match(decision, /performance\.now\(\) < a\.playerStandTransition\.readyAt/);
  assert.match(decision, /a\.movementRequest = null/);
  assert.match(decision, /a\.locomotion\.vx = a\.locomotion\.vz = 0/);
});
