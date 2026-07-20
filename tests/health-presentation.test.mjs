import test from "node:test";
import assert from "node:assert/strict";
import { clampAnimalHealth, healthPresentation } from "../src/health-presentation.js";

test("health equal to a reduced cap is not acute critical", () => { const state = healthPresentation(60, 60); assert.equal(state.acuteTier, "stable"); assert.equal(state.permanentlyUnavailable, .4); });
test("health bar dimensions separate current, recoverable and permanent capacity", () => { const state = healthPresentation(40, 60); assert.deepEqual([state.currentFill, state.recoverableEmpty, state.permanentlyUnavailable], [.4, .2, .4]); });
test("health clamps to its valid cap", () => { const animal = clampAnimalHealth({ health: 90, healthCap: 60 }); assert.deepEqual(animal, { health: 60, healthCap: 60 }); });
