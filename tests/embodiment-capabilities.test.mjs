import test from "node:test"; import assert from "node:assert/strict";
import { DIFFICULTY_IDS, difficultyProfile, validateDifficultyProfiles } from "../src/embodiment-capabilities.js";
test("all embodied difficulties are ordered and retain ecological role selection", () => { assert.equal(validateDifficultyProfiles().valid, true); assert.equal(DIFFICULTY_IDS.length, 9); DIFFICULTY_IDS.forEach((id, rank) => { const p = difficultyProfile(id); assert.equal(p.rank, rank); assert.equal(p.setup.chooseRole, true); }); });
test("impossible immersion retains indirect influence control", () => { assert.equal(difficultyProfile("impossible-immersion").control, "influence"); });
test("minimap assistance ends before very hard", () => { for (const id of ["creative","easy","standard","challenging","hard"]) assert.equal(difficultyProfile(id).minimap, true); for (const id of ["very-hard","extreme","insane-immersion","impossible-immersion"]) assert.notEqual(difficultyProfile(id).minimap, true); });
