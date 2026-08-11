export const MINUTES_PER_HOUR = 60;
export const HOURS_PER_DAY = 24;
export const MINUTES_PER_DAY = MINUTES_PER_HOUR * HOURS_PER_DAY;
export const HOURS_PER_MINUTE_TICK = 1 / MINUTES_PER_HOUR;
export const DAYS_PER_OBSERVATION_INTERVAL = 30;
// Compatibility for callers that have not yet adopted the neutral interval name.
export const DAYS_PER_ECOLOGICAL_MONTH = DAYS_PER_OBSERVATION_INTERVAL;
export const DAYS_PER_ECOLOGICAL_YEAR = 365;
export const ECOLOGICAL_SEASONS = Object.freeze([
  Object.freeze({ name: "Spring", days: 92 }),
  Object.freeze({ name: "Summer", days: 92 }),
  Object.freeze({ name: "Autumn", days: 91 }),
  Object.freeze({ name: "Winter", days: 90 })
]);
export const OBSERVATION_YEAR_MINUTES = Object.freeze({ fast: 60, standard: 180, detailed: 360 });
export const TIME_SKIP_MINUTES = Object.freeze({
  minute: 1,
  hour: MINUTES_PER_HOUR,
  day: MINUTES_PER_DAY,
  interval: DAYS_PER_OBSERVATION_INTERVAL * MINUTES_PER_DAY,
  // Compatibility for existing saved control preferences and DOM values.
  month: DAYS_PER_OBSERVATION_INTERVAL * MINUTES_PER_DAY,
  year: DAYS_PER_ECOLOGICAL_YEAR * MINUTES_PER_DAY
});

const normalizedStartingSeasonIndex = (startingSeason) => {
  const index = ECOLOGICAL_SEASONS.findIndex(({ name }) => name === startingSeason);
  return index < 0 ? 0 : index;
};

export function ecologicalSeasonCalendar(startingSeason = "Spring") {
  const start = normalizedStartingSeasonIndex(startingSeason);
  let firstDay = 1;
  return Object.freeze(ECOLOGICAL_SEASONS.map((_, offset) => {
    const season = ECOLOGICAL_SEASONS[(start + offset) % ECOLOGICAL_SEASONS.length];
    const entry = Object.freeze({ ...season, firstDay, lastDay: firstDay + season.days - 1 });
    firstDay = entry.lastDay + 1;
    return entry;
  }));
}

export function seasonForAbsoluteDay(absoluteDay, startingSeason = "Spring") {
  const day = Math.max(1, Math.floor(Number(absoluteDay) || 1));
  const dayOfYear = (day - 1) % DAYS_PER_ECOLOGICAL_YEAR + 1;
  const calendar = ecologicalSeasonCalendar(startingSeason);
  const season = calendar.find((entry) => dayOfYear >= entry.firstDay && dayOfYear <= entry.lastDay) || calendar[0];
  return Object.freeze({
    name: season.name,
    season: season.name,
    dayOfSeason: dayOfYear - season.firstDay + 1,
    dayOfYear,
    year: Math.floor((day - 1) / DAYS_PER_ECOLOGICAL_YEAR) + 1,
    firstDay: season.firstDay,
    lastDay: season.lastDay,
    days: season.days
  });
}

export function migrateMinuteClock(world = {}) {
  if (!Number.isFinite(world.clockTick)) world.clockTick = Math.max(0, Math.floor(Number(world.tick) || 0)) * MINUTES_PER_HOUR;
  world.clockTick = Math.max(0, Math.floor(world.clockTick));
  world.tick = world.clockTick;
  world.clockUnit = "minute-v2";
  return world;
}

export function advanceMinuteClock(world) {
  migrateMinuteClock(world);
  world.clockTick += 1;
  world.tick = world.clockTick;
  return { minuteTick: world.clockTick, hourBoundary: world.clockTick % MINUTES_PER_HOUR === 0 };
}

export function clockParts(world = {}) {
  const minuteTick = Math.max(0, Math.floor(Number(world.clockTick) || 0));
  return { day: Math.floor(minuteTick / MINUTES_PER_DAY) + 1, hour: Math.floor(minuteTick / MINUTES_PER_HOUR) % HOURS_PER_DAY, minute: minuteTick % MINUTES_PER_HOUR };
}

export function formatClock(world = {}) {
  const { day, hour, minute } = clockParts(world);
  return `Day ${day} · ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function ecologicalMinutesPerInteractionTick(observationMinutes = OBSERVATION_YEAR_MINUTES.standard) {
  const wallMinutes = Math.max(1, Number(observationMinutes) || OBSERVATION_YEAR_MINUTES.standard);
  return DAYS_PER_ECOLOGICAL_YEAR * MINUTES_PER_DAY / (wallMinutes * MINUTES_PER_HOUR);
}

export function ecologicalHoursPerInteractionTick(observationMinutes = OBSERVATION_YEAR_MINUTES.standard) {
  return ecologicalMinutesPerInteractionTick(observationMinutes) / MINUTES_PER_HOUR;
}

export function wallMinutesForEcologicalDays(days, observationMinutes = OBSERVATION_YEAR_MINUTES.standard) {
  const duration = Math.max(0, Number(days) || 0);
  const wallMinutes = Math.max(1, Number(observationMinutes) || OBSERVATION_YEAR_MINUTES.standard);
  return duration / DAYS_PER_ECOLOGICAL_YEAR * wallMinutes;
}

export function migrateEcologicalClock(world = {}) {
  if (!Number.isFinite(world.ecologicalMinute)) world.ecologicalMinute = Math.max(0, Number(world.clockTick) || 0);
  world.ecologicalMinute = Math.max(0, Number(world.ecologicalMinute) || 0);
  return world;
}

export function advanceEcologicalClock(world, elapsedMinutes) {
  migrateEcologicalClock(world);
  const previousMinute = world.ecologicalMinute;
  world.ecologicalMinute += Math.max(0, Number(elapsedMinutes) || 0);
  const previousDay = Math.floor(previousMinute / MINUTES_PER_DAY);
  const currentDay = Math.floor(world.ecologicalMinute / MINUTES_PER_DAY);
  return { previousMinute, minute: world.ecologicalMinute, daysCrossed: currentDay - previousDay, dayBoundary: currentDay !== previousDay };
}

export function ecologicalClockParts(world = {}, startingSeason = world.startSeason || world.worldSetup?.startSeason || "Spring") {
  const minuteTick = Math.max(0, Number(world.ecologicalMinute) || 0);
  const absoluteDay = Math.floor(minuteTick / MINUTES_PER_DAY);
  const season = seasonForAbsoluteDay(absoluteDay + 1, startingSeason);
  return {
    year: Math.floor(absoluteDay / DAYS_PER_ECOLOGICAL_YEAR) + 1,
    dayOfYear: absoluteDay % DAYS_PER_ECOLOGICAL_YEAR + 1,
    day: absoluteDay + 1,
    absoluteDay: absoluteDay + 1,
    season: season.name,
    dayOfSeason: season.dayOfSeason,
    hour: Math.floor(minuteTick / MINUTES_PER_HOUR) % HOURS_PER_DAY,
    minute: Math.floor(minuteTick) % MINUTES_PER_HOUR
  };
}

export function formatEcologicalClock(world = {}) {
  const { year, dayOfYear, hour, minute } = ecologicalClockParts(world);
  return `Year ${year} · Day ${dayOfYear} · ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
