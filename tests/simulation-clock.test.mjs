import test from "node:test";
import assert from "node:assert/strict";
import { advanceEcologicalClock, advanceMinuteClock, clockParts, DAYS_PER_ECOLOGICAL_YEAR, ecologicalClockParts, ecologicalHoursPerInteractionTick, ecologicalMinutesPerInteractionTick, ecologicalSeasonCalendar, formatClock, formatEcologicalClock, migrateMinuteClock, seasonForAbsoluteDay, TIME_SKIP_MINUTES, wallMinutesForEcologicalDays } from "../src/simulation-clock.js";

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
  assert.deepEqual(TIME_SKIP_MINUTES, { minute: 1, hour: 60, day: 1440, interval: 43200, month: 43200, year: 525600 });
});

test("observation clock fits an ecological year into the selected viewing session", () => {
  const world = {};
  const minutesPerTick = ecologicalMinutesPerInteractionTick(60);
  for (let tick = 0; tick < 60 * 60; tick += 1) advanceEcologicalClock(world, minutesPerTick);
  assert.deepEqual(ecologicalClockParts(world), { year: 2, dayOfYear: 1, day: 366, absoluteDay: 366, season: "Spring", dayOfSeason: 1, hour: 0, minute: 0 });
  assert.equal(formatEcologicalClock(world), "Year 2 · Day 1 · 00:00");
});

test("all observation modes scale ecological physiology while interaction ticks remain one minute", () => {
  const minutes = [60, 180, 360].map(ecologicalMinutesPerInteractionTick);
  const hours = [60, 180, 360].map(ecologicalHoursPerInteractionTick);
  assert.deepEqual(minutes.map(value => Number(value.toFixed(6))), [146, 48.666667, 24.333333]);
  assert.deepEqual(hours.map(value => Number(value.toFixed(6))), [2.433333, .811111, .405556]);
  assert.equal(wallMinutesForEcologicalDays(365, 180), 180);
  assert.equal(wallMinutesForEcologicalDays(182.5, 180), 90);
});

test("the 365-day calendar has stable unequal season boundaries", () => {
  assert.equal(DAYS_PER_ECOLOGICAL_YEAR, 365);
  assert.deepEqual(ecologicalSeasonCalendar().map(({ name, days, firstDay, lastDay }) => ({ name, days, firstDay, lastDay })), [
    { name: "Spring", days: 92, firstDay: 1, lastDay: 92 },
    { name: "Summer", days: 92, firstDay: 93, lastDay: 184 },
    { name: "Autumn", days: 91, firstDay: 185, lastDay: 275 },
    { name: "Winter", days: 90, firstDay: 276, lastDay: 365 }
  ]);
  assert.equal(seasonForAbsoluteDay(92).name, "Spring");
  assert.equal(seasonForAbsoluteDay(93).name, "Summer");
  assert.equal(seasonForAbsoluteDay(365).name, "Winter");
  assert.deepEqual({ ...seasonForAbsoluteDay(366), firstDay: undefined, lastDay: undefined, days: undefined }, { name: "Spring", season: "Spring", dayOfSeason: 1, dayOfYear: 1, year: 2, firstDay: undefined, lastDay: undefined, days: undefined });
});

test("starting season rotates the year while retaining each named duration", () => {
  assert.deepEqual(ecologicalSeasonCalendar("Winter").map(({ name, days }) => ({ name, days })), [
    { name: "Winter", days: 90 }, { name: "Spring", days: 92 }, { name: "Summer", days: 92 }, { name: "Autumn", days: 91 }
  ]);
  assert.equal(seasonForAbsoluteDay(90, "Winter").name, "Winter");
  assert.equal(seasonForAbsoluteDay(91, "Winter").name, "Spring");
  assert.equal(seasonForAbsoluteDay(365, "Winter").name, "Autumn");
});

test("ecological clock reports crossed day boundaries", () => {
  const world = { ecologicalMinute: 1430 };
  assert.deepEqual(advanceEcologicalClock(world, 20), { previousMinute: 1430, minute: 1450, daysCrossed: 1, dayBoundary: true });
});
