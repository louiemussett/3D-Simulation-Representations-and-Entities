import test from "node:test";
import assert from "node:assert/strict";
import { LIFE_HISTORY, LIFE_HISTORY_SPECIES_IDS, legacySpeciesTiming, lifeHistoryFor, validateLifeHistoryRegistry } from "../src/life-history-registry.js";
import { SPECIES, SPECIES_IDS } from "../src/species-registry.js";

test("every registered species has an exhaustive validated life-history profile", () => {
  assert.ok(LIFE_HISTORY_SPECIES_IDS.length >= 2);
  assert.deepEqual([...Object.keys(LIFE_HISTORY)].sort(), [...LIFE_HISTORY_SPECIES_IDS].sort());
  assert.deepEqual([...SPECIES_IDS].sort(), [...LIFE_HISTORY_SPECIES_IDS].sort());
  assert.deepEqual(validateLifeHistoryRegistry(), { valid: true, errors: [] });
  for (const id of SPECIES_IDS) {
    assert.equal(SPECIES[id].lifeHistory, LIFE_HISTORY[id]);
    assert.equal(SPECIES[id].matureAge, LIFE_HISTORY[id].development.maturityDays);
    assert.equal(SPECIES[id].dependency, LIFE_HISTORY[id].development.independenceDays);
    assert.equal(SPECIES[id].longevityReference, LIFE_HISTORY[id].development.longevityReferenceDays);
    assert.ok(!("maximumAgeDays" in LIFE_HISTORY[id].development));
    assert.deepEqual(SPECIES[id].litter, LIFE_HISTORY[id].reproduction.broodRange);
  }
});

test("the catalogue includes all functional reproductive strategies", () => {
  const profiles = Object.values(LIFE_HISTORY), reproduction = profiles.map(profile => profile.reproduction);
  for (const strategy of ["continuous-polyestrous", "seasonal-polyestrous", "annual-monoestrous", "opportunistic-continuous", "opportunistic-polyestrous", "annual-clutch", "seasonal-clutch"]) assert.ok(reproduction.some(value => value.strategy === strategy), strategy);
  assert.ok(reproduction.some(value => value.ovulation === "induced"));
  assert.ok(reproduction.some(value => value.implantationDelayDays > 0));
  assert.equal(reproduction.filter(value => value.mode === "surface-eggs").length, 6);
  assert.deepEqual(new Set(reproduction.filter(value => value.mode === "surface-eggs").map(value => value.nestCare)), new Set(["attended", "obligate", "brooded", "unattended"]));
});

test("literal catalogue values replace compressed generic timing", () => {
  assert.deepEqual(legacySpeciesTiming("grazer"), { longevityReference: 11315, matureAge: 548, oldAge: 3650, gestation: 198, incubation: null, lactationDays: 70, dependency: 365, litter: [1, 2] });
  assert.equal(legacySpeciesTiming("hunter").longevityReference, 6935);
  assert.equal(lifeHistoryFor("great-omnivore").reproduction.implantationDelayDays, 150);
  assert.equal(lifeHistoryFor("armoured-browser").reproduction.gestationDays, 474);
  assert.equal(lifeHistoryFor("cold-country-scavenger").reproduction.incubationDays, 58);
  assert.equal(lifeHistoryFor("woodland-browser").archetype, "moose");
  assert.equal(lifeHistoryFor("carrion-runner").reproduction.broodRange[1], 3);
  assert.throws(() => lifeHistoryFor("missing-species"), /No life-history profile/);
});

test("validation rejects a missing species rather than falling back", () => {
  const incomplete = { ...LIFE_HISTORY };
  delete incomplete.grazer;
  const result = validateLifeHistoryRegistry(incomplete);
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("missing profile: grazer"));
});
