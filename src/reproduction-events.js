// One simulation tick is one minute. Keep the visible interaction brief while
// giving a rejected pair enough time to separate and consider other partners.
export const REPRODUCTION_DURATIONS = Object.freeze({ courtship: 8, acceptance: 5, rejection: 3, cooldown: 60, matingMin: 2, matingMax: 12, conception: 3, birth: 15 });

export function createCourtshipEvent(partnerId, tick) {
  return { partnerId, startedAt: tick, decisionAt: tick + REPRODUCTION_DURATIONS.courtship };
}

export function createMatingEvent(partnerId, role, tick, duration = REPRODUCTION_DURATIONS.matingMin) {
  const startsAt = tick + REPRODUCTION_DURATIONS.acceptance;
  const boundedDuration = Math.max(REPRODUCTION_DURATIONS.matingMin, Math.min(REPRODUCTION_DURATIONS.matingMax, Math.floor(duration)));
  return { partnerId, role, acceptedAt: tick, startsAt, completesAt: startsAt + boundedDuration };
}

export function createBirthEvent(tick) { return { startedAt: tick, completesAt: tick + REPRODUCTION_DURATIONS.birth }; }

export function reproductionStage(animal, tick) {
  if (animal.birthEvent) return tick < animal.birthEvent.completesAt ? "birth" : "birth-complete";
  if (animal.mating) return tick < animal.mating.startsAt ? "accepted" : tick < animal.mating.completesAt ? "mating" : "mating-complete";
  if (animal.courtship) return tick < animal.courtship.decisionAt ? "courtship" : "courtship-decision";
  if ((animal.rejectionUntil || 0) > tick) return "rejected";
  return "none";
}

export function birthAttendantEligible(female, candidate) {
  if (!female?.birthEvent || !female.pregnant || female.pregnant.fatherId !== candidate?.id || !candidate.alive) return false;
  const preference = female.matePreferences;
  if (!preference) return candidate.health >= 55 && candidate.energy >= 35 && candidate.fear < 45;
  const healthFloor = Math.max(55, preference.minHealth * .85);
  const aggressionDifference = Math.abs((candidate.aggression ?? .5) - preference.preferredAggression);
  return candidate.health >= healthFloor && candidate.energy >= 35 && candidate.fear < 45 && aggressionDifference <= preference.aggressionTolerance * 1.5;
}

export function migrateReproductionEvents(animal, tick = 0) {
  if (animal.courtship?.partnerId && !Number.isFinite(animal.courtship.decisionAt)) animal.courtship = { ...animal.courtship, startedAt: tick, decisionAt: Math.max(tick + 1, Number(animal.courtshipUntil) || tick + REPRODUCTION_DURATIONS.courtship) };
  else animal.courtship ||= null;
  animal.mating ||= null; animal.birthEvent ||= null; animal.acceptedUntil ||= 0; return animal;
}
