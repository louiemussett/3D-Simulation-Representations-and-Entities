import test from "node:test";
import assert from "node:assert/strict";
import { advanceEcologicalClock, advanceMinuteClock, clockParts, ecologicalClockParts, ecologicalHoursPerInteractionTick, ecologicalMinutesPerInteractionTick, formatClock, formatEcologicalClock, migrateMinuteClock, TIME_SKIP_MINUTES } from "../src/simulation-clock.js";

test("one clock tick advances one simulated minute", () => {
  const world = { tick: 0 };
  assert.deepEqual(advanceMinuteClock(world), { minuteTick: 1, hourBoundary: false });
  for (let i = 1; i < 60; i += 1) advanceMinuteClock(world);
  assert.equal(world.clockTick, 60);
  assert.deepEqual(clockParts(world), { day: 1, hour: 1, minute: 0 });
});

test("twenty-four hours advance the displayed day", () => {
  assert.equal(formatClock({ clockTick: 1439 }), "Day 1 · 23:59");
  assert.equal(formatClock({ clockTick: 1440 }), "Day 2 · 00:00");
});

test("hourly saves migrate without changing their simulated date", () => {
  const world = migrateMinuteClock({ tick: 49, day: 3 });
  assert.equal(world.clockTick, 49 * 60);
  assert.equal(world.clockUnit, "minute-v2");
  assert.equal(world.tick, 49 * 60);
});

test("time skips use exact minute counts for the ecological calendar", () => {
  assert.deepEqual(TIME_SKIP_MINUTES, { minute: 1, hour: 60, day: 1440, month: 43200, year: 172800 });
});

test("observation clock fits an ecological year into the selected viewing session", () => {
  const world = {};
  const minutesPerTick = ecologicalMinutesPerInteractionTick(60);
  for (let tick = 0; tick < 60 * 60; tick += 1) advanceEcologicalClock(world, minutesPerTick);
  assert.deepEqual(ecologicalClockParts(world), { year: 2, dayOfYear: 1, day: 121, hour: 0, minute: 0 });
  assert.equal(formatEcologicalClock(world), "Year 2 · Day 1 · 00:00");
});

test("all observation modes scale ecological physiology while interaction ticks remain one minute", () => {
  assert.deepEqual([60, 180, 360].map(ecologicalMinutesPerInteractionTick), [48, 16, 8]);
  assert.deepEqual([60, 180, 360].map(ecologicalHoursPerInteractionTick), [.8, 16 / 60, 8 / 60]);
});

test("ecological clock reports crossed day boundaries", () => {
  const world = { ecologicalMinute: 1430 };
  assert.deepEqual(advanceEcologicalClock(world, 20), { previousMinute: 1430, minute: 1450, daysCrossed: 1, dayBoundary: true });
});
