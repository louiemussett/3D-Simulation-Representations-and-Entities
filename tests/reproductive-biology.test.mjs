import test from "node:test";
import assert from "node:assert/strict";
import { MINUTES_PER_DAY } from "../src/simulation-clock.js";
import { lifeHistoryFor } from "../src/life-history-registry.js";
import { migrateReproductiveState, recordInducedOvulation, recordReproductiveOutcome, reproductiveLoadMultiplier, reproductiveStatus, updateReproductiveEnvironment } from "../src/reproductive-biology.js";

const female = (speciesId, overrides = {}) => ({ speciesId, sex: "F", age: 4000, lifeStage: "adult", postpartum: 0, pregnant: null, reproductiveState: { cycleOffsetDays: 0, broodsByYear: {}, environment: { gateOpen: true } }, ...overrides });
const atDay = (day) => (day - 1) * MINUTES_PER_DAY;

test("seasonal and annual profiles enter anestrus outside their windows", () => {
  const grazer = female("grazer", { reproductiveState: { cycleOffsetDays: 12, broodsByYear: {}, environment: { gateOpen: true } } });
  assert.equal(reproductiveStatus(grazer, lifeHistoryFor("grazer"), { absoluteDay: 1, season: "Spring", dayOfSeason: 1, year: 1 }, atDay(1)).state, "anestrus");
  const autumn = reproductiveStatus(grazer, lifeHistoryFor("grazer"), { absoluteDay: 185, season: "Autumn", dayOfSeason: 1, year: 1 }, atDay(185));
  assert.equal(autumn.canMate, true);
  assert.equal(autumn.canConceive, true);

  const hunter = female("hunter");
  assert.equal(reproductiveStatus(hunter, lifeHistoryFor("hunter"), { absoluteDay: 276, season: "Winter", dayOfSeason: 1, year: 1 }, atDay(276)).canMate, true);
  assert.equal(reproductiveStatus(hunter, lifeHistoryFor("hunter"), { absoluteDay: 287, season: "Winter", dayOfSeason: 12, year: 1 }, atDay(287)).state, "cycling");
});

test("induced ovulators can mate before mating unlocks conception", () => {
  const rabbit = female("meadow-nibbler");
  const before = reproductiveStatus(rabbit, lifeHistoryFor("meadow-nibbler"), { absoluteDay: 20, season: "Spring", dayOfSeason: 20, year: 1 }, atDay(20));
  assert.equal(before.canMate, true);
  assert.equal(before.canConceive, false);
  recordInducedOvulation(rabbit, atDay(20));
  const after = reproductiveStatus(rabbit, lifeHistoryFor("meadow-nibbler"), { absoluteDay: 20, season: "Spring", dayOfSeason: 20, year: 1 }, atDay(20));
  assert.equal(after.canConceive, true);
});

test("delayed implantation is distinct from active gestation", () => {
  const bear = female("great-omnivore", { pregnant: { age: 100, offspringCount: 2 } });
  assert.equal(reproductiveStatus(bear, lifeHistoryFor("great-omnivore"), {}, atDay(200)).state, "preimplantation");
  bear.pregnant.age = 160;
  assert.equal(reproductiveStatus(bear, lifeHistoryFor("great-omnivore"), {}, atDay(200)).state, "gestating");
});

test("rolling environmental triggers use seven-day hysteresis", () => {
  let state = {};
  for (let day = 1; day <= 6; day += 1) state = updateReproductiveEnvironment(state, { rain: .5, biomass: .5, temperature: 22 }, day, "warm-rainfall");
  assert.equal(state.gateOpen, false);
  state = updateReproductiveEnvironment(state, { rain: .5, biomass: .5, temperature: 22 }, 7, "warm-rainfall");
  assert.equal(state.gateOpen, true);
  for (let day = 8; day <= 16; day += 1) state = updateReproductiveEnvironment(state, { rain: .1, biomass: .1, temperature: 10 }, day, "warm-rainfall");
  assert.equal(state.gateOpen, true);
  state = updateReproductiveEnvironment(state, { rain: .1, biomass: .1, temperature: 10 }, 17, "warm-rainfall");
  assert.equal(state.gateOpen, false);
  assert.equal(state.samples.length, 17);
});

test("brood outcomes enforce postpartum and annual limits", () => {
  const hunter = female("hunter");
  migrateReproductiveState(hunter);
  recordReproductiveOutcome(hunter, lifeHistoryFor("hunter"), atDay(300), "birth");
  const status = reproductiveStatus(hunter, lifeHistoryFor("hunter"), { absoluteDay: 300, season: "Winter", dayOfSeason: 25, year: 1 }, atDay(300));
  assert.equal(status.state, "postpartum");
  hunter.postpartum = 0;
  hunter.reproductiveState.postpartumUntilMinute = 0;
  assert.equal(reproductiveStatus(hunter, lifeHistoryFor("hunter"), { absoluteDay: 330, season: "Winter", dayOfSeason: 55, year: 1 }, atDay(330)).state, "annual-limit");
});

test("reproductive load is bounded and egg load is lighter", () => {
  assert.equal(reproductiveLoadMultiplier(1, "live-birth"), 1);
  assert.equal(reproductiveLoadMultiplier(20, "live-birth"), 2);
  assert.equal(reproductiveLoadMultiplier(20, "surface-eggs"), 1.6);
  assert.ok(reproductiveLoadMultiplier(6, "surface-eggs") < reproductiveLoadMultiplier(6, "live-birth"));
});
