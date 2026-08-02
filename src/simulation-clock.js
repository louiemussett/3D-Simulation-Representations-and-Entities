export const MINUTES_PER_HOUR = 60;
export const HOURS_PER_DAY = 24;
export const MINUTES_PER_DAY = MINUTES_PER_HOUR * HOURS_PER_DAY;
export const HOURS_PER_MINUTE_TICK = 1 / MINUTES_PER_HOUR;
export const DAYS_PER_ECOLOGICAL_MONTH = 30;
export const DAYS_PER_ECOLOGICAL_YEAR = 120;
export const OBSERVATION_YEAR_MINUTES = Object.freeze({ fast: 60, standard: 180, detailed: 360 });
export const TIME_SKIP_MINUTES = Object.freeze({ minute: 1, hour: MINUTES_PER_HOUR, day: MINUTES_PER_DAY, month: DAYS_PER_ECOLOGICAL_MONTH * MINUTES_PER_DAY, year: DAYS_PER_ECOLOGICAL_YEAR * MINUTES_PER_DAY });

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

export function ecologicalClockParts(world = {}) {
  const minuteTick = Math.max(0, Number(world.ecologicalMinute) || 0);
  const absoluteDay = Math.floor(minuteTick / MINUTES_PER_DAY);
  return {
    year: Math.floor(absoluteDay / DAYS_PER_ECOLOGICAL_YEAR) + 1,
    dayOfYear: absoluteDay % DAYS_PER_ECOLOGICAL_YEAR + 1,
    day: absoluteDay + 1,
    hour: Math.floor(minuteTick / MINUTES_PER_HOUR) % HOURS_PER_DAY,
    minute: Math.floor(minuteTick) % MINUTES_PER_HOUR
  };
}

export function formatEcologicalClock(world = {}) {
  const { year, dayOfYear, hour, minute } = ecologicalClockParts(world);
  return `Year ${year} · Day ${dayOfYear} · ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
