import { DAYS_PER_ECOLOGICAL_YEAR, MINUTES_PER_DAY, seasonForAbsoluteDay } from "./simulation-clock.js";
import { lifeHistoryFor } from "./life-history-registry.js";

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const wholeDay = (minute) => Math.floor(Math.max(0, Number(minute) || 0) / MINUTES_PER_DAY) + 1;
const reproductionProfile = (profileOrSpecies) => {
  const profile = profileOrSpecies?.reproduction ? profileOrSpecies : lifeHistoryFor(profileOrSpecies);
  return { profile, reproduction: profile.reproduction, development: profile.development };
};

export const REPRODUCTIVE_ENVIRONMENT_THRESHOLDS = Object.freeze({
  resourceBiomass: .4,
  rainfall: .35,
  rainfallBiomass: .3,
  warmTemperature: 18,
  qualifyingDays: 7,
  rollingDays: 30
});

export function migrateReproductiveState(animal = {}) {
  animal.reproductiveState ||= {};
  const state = animal.reproductiveState;
  state.cycleOffsetDays = Math.max(0, Number(state.cycleOffsetDays ?? animal.cycleOffset) || 0);
  state.annualWindowOffsetDays = Math.max(0, Math.floor(Number(state.annualWindowOffsetDays ?? state.cycleOffsetDays) || 0));
  state.broodsByYear = state.broodsByYear && typeof state.broodsByYear === "object" ? state.broodsByYear : {};
  state.environment ||= { samples: [], qualifyingStreak: 0, nonqualifyingStreak: 0, gateOpen: false, lastSampleDay: 0 };
  state.environment.samples = Array.isArray(state.environment.samples) ? state.environment.samples.slice(-REPRODUCTIVE_ENVIRONMENT_THRESHOLDS.rollingDays) : [];
  state.environment.qualifyingStreak = Math.max(0, Math.floor(Number(state.environment.qualifyingStreak) || 0));
  state.environment.nonqualifyingStreak = Math.max(0, Math.floor(Number(state.environment.nonqualifyingStreak) || 0));
  state.environment.gateOpen = Boolean(state.environment.gateOpen);
  state.environment.lastSampleDay = Math.max(0, Math.floor(Number(state.environment.lastSampleDay) || 0));
  return state;
}

const rollingMean = (samples, key) => samples.length ? samples.reduce((sum, sample) => sum + (Number(sample[key]) || 0), 0) / samples.length : 0;

export function environmentalTriggerQualifies(trigger, averages = {}) {
  if (trigger === "none" || trigger === "calendar") return true;
  const resourceReady = Number(averages.biomass) >= REPRODUCTIVE_ENVIRONMENT_THRESHOLDS.resourceBiomass;
  const rainfallReady = Number(averages.rain) >= REPRODUCTIVE_ENVIRONMENT_THRESHOLDS.rainfall
    && Number(averages.biomass) >= REPRODUCTIVE_ENVIRONMENT_THRESHOLDS.rainfallBiomass;
  if (trigger === "resource") return resourceReady;
  if (trigger === "rainfall") return rainfallReady;
  if (trigger === "warm-rainfall") return rainfallReady && Number(averages.temperature) >= REPRODUCTIVE_ENVIRONMENT_THRESHOLDS.warmTemperature;
  return false;
}

export function updateReproductiveEnvironment(previous = {}, sample = {}, absoluteDay = 1, trigger = "none") {
  const lastSampleDay = Math.max(0, Math.floor(Number(previous.lastSampleDay) || 0));
  const day = Math.max(1, Math.floor(Number(absoluteDay) || 1));
  if (lastSampleDay === day) return previous;
  const samples = [...(Array.isArray(previous.samples) ? previous.samples : []), {
    day,
    rain: clamp(Number(sample.rain) || 0, 0, 1),
    biomass: clamp(Number(sample.biomass) || 0, 0, 1),
    temperature: Number(sample.temperature) || 0
  }].slice(-REPRODUCTIVE_ENVIRONMENT_THRESHOLDS.rollingDays);
  const averages = {
    rain: rollingMean(samples, "rain"),
    biomass: rollingMean(samples, "biomass"),
    temperature: rollingMean(samples, "temperature")
  };
  const qualifies = environmentalTriggerQualifies(trigger, averages);
  const qualifyingStreak = qualifies ? Math.max(0, Math.floor(Number(previous.qualifyingStreak) || 0)) + 1 : 0;
  const nonqualifyingStreak = qualifies ? 0 : Math.max(0, Math.floor(Number(previous.nonqualifyingStreak) || 0)) + 1;
  let gateOpen = trigger === "none" || trigger === "calendar" ? true : Boolean(previous.gateOpen);
  if (qualifyingStreak >= REPRODUCTIVE_ENVIRONMENT_THRESHOLDS.qualifyingDays) gateOpen = true;
  if (nonqualifyingStreak >= REPRODUCTIVE_ENVIRONMENT_THRESHOLDS.qualifyingDays) gateOpen = false;
  return { samples, averages, qualifies, qualifyingStreak, nonqualifyingStreak, gateOpen, lastSampleDay: day };
}

const broodCountForYear = (state, year) => Math.max(0, Math.floor(Number(state?.broodsByYear?.[year]) || 0));
const annualLimitReached = (state, reproduction, year) => Number.isFinite(reproduction.maxBroodsPerYear)
  && broodCountForYear(state, year) >= reproduction.maxBroodsPerYear;

const activeWindow = (reproduction, calendar, state, ecologicalMinute) => {
  const seasonActive = reproduction.activeSeasons.includes(calendar.season);
  if (!seasonActive) return { active: false, receptive: false, cycleDay: null, reason: "seasonal-anestrus" };
  const environmentActive = ["none", "calendar"].includes(reproduction.environmentTrigger) || Boolean(state.environment?.gateOpen);
  if (!environmentActive) return { active: false, receptive: false, cycleDay: null, reason: `${reproduction.environmentTrigger}-trigger-closed` };
  if (reproduction.strategy === "annual-monoestrous") {
    const primarySeason = reproduction.activeSeasons[0];
    const windowStart = 1 + Math.max(0, Math.floor(Number(state.annualWindowOffsetDays) || 0));
    const receptive = calendar.season === primarySeason && calendar.dayOfSeason >= windowStart && calendar.dayOfSeason < windowStart + reproduction.receptiveDays;
    return { active: true, receptive, cycleDay: calendar.dayOfSeason - windowStart + 1, reason: receptive ? null : "annual-window-closed" };
  }
  if (reproduction.strategy === "annual-clutch") return { active: true, receptive: true, cycleDay: null, reason: null };
  if (Number.isFinite(reproduction.cycleDays) && reproduction.cycleDays > 0) {
    const elapsedDays = Math.floor(Math.max(0, Number(ecologicalMinute) || 0) / MINUTES_PER_DAY);
    const cycleDay = ((elapsedDays + (Number(state.cycleOffsetDays) || 0)) % reproduction.cycleDays + reproduction.cycleDays) % reproduction.cycleDays + 1;
    const receptive = cycleDay <= (reproduction.receptiveDays || reproduction.cycleDays);
    return { active: true, receptive, cycleDay, reason: receptive ? null : "cycle-not-receptive" };
  }
  return { active: true, receptive: true, cycleDay: null, reason: null };
};

export function reproductiveStatus(animal = {}, profileOrSpecies, environment = {}, ecologicalMinute = 0) {
  const { profile, reproduction, development } = reproductionProfile(profileOrSpecies || animal);
  const state = animal.reproductiveState || {};
  const absoluteDay = environment.absoluteDay || wholeDay(ecologicalMinute);
  const season = environment.season
    ? { season: environment.season, name: environment.season, dayOfSeason: environment.dayOfSeason || 1, dayOfYear: environment.dayOfYear || ((absoluteDay - 1) % DAYS_PER_ECOLOGICAL_YEAR + 1), year: environment.year || Math.floor((absoluteDay - 1) / DAYS_PER_ECOLOGICAL_YEAR) + 1 }
    : seasonForAbsoluteDay(absoluteDay, environment.startingSeason || "Spring");
  const base = { profile, mode: reproduction.mode, strategy: reproduction.strategy, ovulation: reproduction.ovulation, year: season.year, season: season.name || season.season, dayOfSeason: season.dayOfSeason };
  if (animal.sex && animal.sex !== "F" && animal.sex !== "M") return { ...base, state: "not-applicable", active: false, receptive: false, fertile: false, canMate: false, canConceive: false, reason: "unknown-sex", nextTransitionMinute: null };
  const mature = ["adult", "old"].includes(animal.lifeStage) || Number(animal.age) >= development.maturityDays;
  if (!mature) return { ...base, state: "immature", active: false, receptive: false, fertile: false, canMate: false, canConceive: false, reason: "immature", nextTransitionMinute: Math.max(0, (development.maturityDays - (Number(animal.age) || 0)) * MINUTES_PER_DAY + ecologicalMinute) };
  if (animal.pregnant) {
    const age = Math.max(0, Number(animal.pregnant.age) || 0);
    const phase = reproduction.mode === "surface-eggs" ? "pre-lay" : reproduction.implantationDelayDays > age ? "preimplantation" : "gestating";
    const duration = reproduction.mode === "surface-eggs" ? reproduction.preLayDays : reproduction.gestationDays;
    return { ...base, state: phase, active: false, receptive: false, fertile: false, canMate: false, canConceive: false, reason: phase, nextTransitionMinute: ecologicalMinute + Math.max(0, duration - age) * MINUTES_PER_DAY };
  }
  const postpartumUntil = Math.max(0, Number(state.postpartumUntilMinute) || 0);
  if (postpartumUntil > ecologicalMinute || Number(animal.postpartum) > 0) return { ...base, state: "postpartum", active: false, receptive: false, fertile: false, canMate: false, canConceive: false, reason: "postpartum", nextTransitionMinute: postpartumUntil || ecologicalMinute + Number(animal.postpartum) * MINUTES_PER_DAY };
  const lastBirthMinute = Number(state.lastBirthMinute);
  const rebreedAt = Number.isFinite(lastBirthMinute) ? lastBirthMinute + reproduction.minimumRebreedDays * MINUTES_PER_DAY : 0;
  if (rebreedAt > ecologicalMinute) return { ...base, state: "rebreeding-interval", active: false, receptive: false, fertile: false, canMate: false, canConceive: false, reason: "minimum-rebreed-interval", nextTransitionMinute: rebreedAt };
  if (annualLimitReached(state, reproduction, season.year)) return { ...base, state: "annual-limit", active: false, receptive: false, fertile: false, canMate: false, canConceive: false, reason: "annual-brood-limit", nextTransitionMinute: season.year * DAYS_PER_ECOLOGICAL_YEAR * MINUTES_PER_DAY };
  const window = activeWindow(reproduction, season, state, ecologicalMinute);
  if (!window.active) return { ...base, ...window, state: "anestrus", fertile: false, canMate: false, canConceive: false, nextTransitionMinute: null };
  if (!window.receptive) return { ...base, ...window, state: "cycling", fertile: false, canMate: false, canConceive: false, nextTransitionMinute: null };
  if (animal.sex === "M") return { ...base, ...window, state: "breeding-ready", fertile: true, canMate: true, canConceive: false, reason: null, nextTransitionMinute: null };
  const inducedUntil = Math.max(0, Number(state.ovulationTriggeredUntilMinute) || 0);
  const canConceive = reproduction.ovulation === "spontaneous" || inducedUntil >= ecologicalMinute;
  return {
    ...base,
    ...window,
    state: reproduction.ovulation === "induced" && !canConceive ? "receptive-induced" : "fertile",
    fertile: canConceive,
    canMate: true,
    canConceive,
    reason: canConceive ? null : "mating-required-for-ovulation",
    nextTransitionMinute: reproduction.ovulation === "induced" && inducedUntil >= ecologicalMinute ? inducedUntil : null
  };
}

export function recordInducedOvulation(animal, ecologicalMinute, durationDays = 2) {
  const state = migrateReproductiveState(animal);
  state.ovulationTriggeredAtMinute = Math.max(0, Number(ecologicalMinute) || 0);
  state.ovulationTriggeredUntilMinute = state.ovulationTriggeredAtMinute + Math.max(1, Number(durationDays) || 2) * MINUTES_PER_DAY;
  return state;
}

export function recordReproductiveOutcome(animal, profileOrSpecies, ecologicalMinute, kind = "birth") {
  const { reproduction } = reproductionProfile(profileOrSpecies || animal);
  const state = migrateReproductiveState(animal), day = wholeDay(ecologicalMinute), year = Math.floor((day - 1) / DAYS_PER_ECOLOGICAL_YEAR) + 1;
  state.broodsByYear[year] = broodCountForYear(state, year) + 1;
  state.lastBirthMinute = Math.max(0, Number(ecologicalMinute) || 0);
  state.lastOutcome = kind;
  state.postpartumUntilMinute = reproduction.mode === "live-birth" ? state.lastBirthMinute + reproduction.postpartumDays * MINUTES_PER_DAY : 0;
  state.ovulationTriggeredAtMinute = null;
  state.ovulationTriggeredUntilMinute = null;
  return state;
}

export function reproductiveLoadMultiplier(offspringCount, mode = "live-birth") {
  const additional = Math.max(0, Math.floor(Number(offspringCount) || 1) - 1);
  return mode === "surface-eggs" ? Math.min(1.6, 1 + additional * .06) : Math.min(2, 1 + additional * .18);
}

export function reproductiveStatusLabel(status = {}) {
  const labels = {
    immature: "not sexually mature", anestrus: "seasonal anestrus", cycling: "cycling — not receptive", "annual-limit": "annual brood limit reached",
    "rebreeding-interval": "rebreeding interval", postpartum: "postpartum anestrus", "receptive-induced": "receptive — ovulation induced by mating",
    fertile: "fertile", "breeding-ready": "breeding ready", preimplantation: "delayed implantation", gestating: "gestating", "pre-lay": "egg formation / pre-lay"
  };
  return labels[status.state] || String(status.state || "reproductive state unavailable").replaceAll("-", " ");
}
