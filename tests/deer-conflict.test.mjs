import test from "node:test";
import assert from "node:assert/strict";
import { advanceRutContest, deerPredatorResponse, rutEligible } from "../src/deer-conflict.js";

const deer = (extra = {}) => ({ id: "stag-a", speciesId: "valley-grazer-updated", sex: "M", lifeStage: "adult", health: 90, energy: 80, fatigue: 10, aggression: .55, bodyMass: 160, antlers: { stage: "hard", annual: { conditionInvestment: .7 } }, ...extra });

test("updated deer flee a predator whenever a viable escape remains", () => {
  const response = deerPredatorResponse({ action: "attack", numericalAdvantage: 5 }, { viableEscape: true, distance: 1.5 });
  assert.equal(response.action, "flee");
  assert.equal(response.conflictPurpose, "survival-defence");
  assert.equal(response.pursueAfterRelease, false);
  assert.match(response.reason, /escape/);
});

test("updated deer defend only at last resort or for a directly attacked dependent", () => {
  const cornered = deerPredatorResponse({ action: "flee" }, { viableEscape: false, cornered: true });
  assert.equal(cornered.action, "defend");
  assert.equal(cornered.weapon, "front-hoof-or-kick");
  const mother = deerPredatorResponse({}, { viableEscape: true, dependentUnderAttack: true, immediateContact: true, distance: 1 });
  assert.equal(mother.action, "defend");
});

test("rut eligibility requires the updated male deer, autumn, maturity and hard antlers", () => {
  assert.equal(rutEligible(deer(), { season: "Autumn" }), true);
  assert.equal(rutEligible(deer(), { season: "Spring" }), false);
  assert.equal(rutEligible(deer({ antlers: { stage: "velvet" } }), { season: "Autumn" }), false);
  assert.equal(rutEligible(deer({ sex: "F" }), { season: "Autumn" }), false);
});

test("rut contests escalate through assessment before physical antler contact", () => {
  const actor = deer(), rival = deer({ id: "stag-b" });
  let state = advanceRutContest(actor, rival, { tick: 0, observedRivalQuality: .8 });
  assert.equal(state.phase, "notice");
  state = advanceRutContest(actor, rival, { tick: 1, observedRivalQuality: .8 });
  assert.equal(state.phase, "roar-assessment");
  state = advanceRutContest(actor, rival, { tick: 3, observedRivalQuality: .8 });
  assert.equal(state.phase, "approach");
  state = advanceRutContest(actor, rival, { tick: 5, observedRivalQuality: .8 });
  assert.equal(state.phase, "parallel-walk");
  state = advanceRutContest(actor, rival, { tick: 8, observedRivalQuality: .8 });
  assert.equal(state.phase, "antler-lock");
  assert.equal(state.purpose, "mating-status");
});
