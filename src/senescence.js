import { lifespanQuality } from "./lifespan-history.js";

const clamp = (value, low = 0, high = 1) => Math.min(high, Math.max(low, Number(value) || 0));
const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

export function managedCareScore(animal = {}) {
  const hydration = clamp(finite(animal.hydration, 100) / 100);
  const nutrition = clamp((finite(animal.energy, 100) + finite(animal.stomach, 65)) / 165);
  const health = clamp(finite(animal.health, 100) / Math.max(1, finite(animal.healthCap, 100)));
  const resting = ["rest", "sleep", "digest", "recover"].includes(animal.actionState?.key) ? 1 : .25;
  const safety = clamp(1 - finite(animal.fear) / 100);
  const social = animal.groupId || (animal.caregiverIds || []).length ? 1 : .35;
  return clamp(hydration * .23 + nutrition * .25 + health * .2 + resting * .12 + safety * .12 + social * .08);
}

export function senescenceOnsetDay(animal = {}, baselineSenescenceDays = 0) {
  // A lifetime with low deprivation, injury, thermal stress and extreme
  // exertion can delay functional decline, but can never abolish it.
  return Math.max(0, finite(baselineSenescenceDays)) * (.88 + lifespanQuality(animal) * .24);
}

function initialReserve(progress, rate) { return clamp(1 - Math.max(0, progress) * rate, .04, 1); }

export function migrateSenescence(animal = {}, profile = {}) {
  const onsetDay = senescenceOnsetDay(animal, profile.senescenceDays);
  const referenceDay = Math.max(onsetDay + 1, finite(profile.longevityReferenceDays, onsetDay + 365));
  const progress = Math.max(0, (finite(animal.age) - onsetDay) / Math.max(1, referenceDay - onsetDay));
  const source = animal.senescence || {};
  animal.senescence = {
    organReserve: clamp(source.organReserve ?? initialReserve(progress, .5), .04, 1),
    immuneReserve: clamp(source.immuneReserve ?? initialReserve(progress, .42), .04, 1),
    dentalFunction: clamp(source.dentalFunction ?? initialReserve(progress, .52), .03, 1),
    diseaseBurden: clamp(source.diseaseBurden ?? 0, 0, 100),
    frailty: clamp(source.frailty ?? 0),
    careProtection: clamp(source.careProtection ?? managedCareScore(animal)),
    stressLoad: clamp(source.stressLoad ?? 0),
    onsetDay,
    longevityReferenceDay: referenceDay,
    active: finite(animal.age) > onsetDay,
    lastHealthDamage: Math.max(0, finite(source.lastHealthDamage)),
    lastCausePressure: source.lastCausePressure || "none"
  };
  return animal.senescence;
}

export function advanceSenescence(animal = {}, profile = {}, elapsedHours = 1) {
  const state = migrateSenescence(animal, profile), hours = Math.max(0, finite(elapsedHours));
  state.onsetDay = senescenceOnsetDay(animal, profile.senescenceDays);
  state.longevityReferenceDay = Math.max(state.onsetDay + 1, finite(profile.longevityReferenceDays, state.onsetDay + 365));
  state.active = finite(animal.age) > state.onsetDay;
  state.careProtection = managedCareScore(animal);
  const injuryLoad = clamp((animal.injuries || []).reduce((sum, injury) => sum + finite(injury.severity), 0) / 1.5);
  const deprivation = clamp(Math.max(30 - finite(animal.energy, 100), 30 - finite(animal.hydration, 100), 12 - finite(animal.stomach, 65), 0) / 30);
  const thermal = clamp(finite(animal.tempStress) / 70), exertion = clamp(Math.max(0, finite(animal.fatigue) - 60) / 40);
  state.stressLoad = clamp(injuryLoad * .34 + deprivation * .32 + thermal * .2 + exertion * .14);
  if (!state.active || !hours) { state.lastHealthDamage = 0; state.lastCausePressure = "none"; return state; }

  const referenceSpanHours = Math.max(365 * 24, (state.longevityReferenceDay - state.onsetDay) * 24);
  const exposure = hours / referenceSpanHours;
  const lossMultiplier = clamp(1.28 - state.careProtection * .72 + state.stressLoad * 1.55, .48, 3.2);
  state.organReserve = clamp(state.organReserve - exposure * .55 * lossMultiplier, .04, 1);
  state.immuneReserve = clamp(state.immuneReserve - exposure * .48 * lossMultiplier, .04, 1);
  state.dentalFunction = clamp(state.dentalFunction - exposure * .6 * (.72 + deprivation * .55), .03, 1);

  const infectionPressure = injuryLoad * (1 - state.immuneReserve) * (1.15 - state.careProtection * .45);
  const diseaseRecovery = state.careProtection * state.immuneReserve * .006 * hours;
  state.diseaseBurden = clamp(state.diseaseBurden + infectionPressure * .018 * hours - diseaseRecovery, 0, 100);
  state.frailty = clamp(1 - (state.organReserve * .46 + state.immuneReserve * .29 + state.dentalFunction * .25));
  const intrinsicDamage = Math.max(0, state.frailty - .24) ** 2 * .018 * hours;
  const stressDamage = state.frailty * state.stressLoad ** 2 * .026 * hours;
  const diseaseDamage = Math.max(0, state.diseaseBurden - 45) / 55 * .025 * hours;
  state.lastHealthDamage = intrinsicDamage + stressDamage + diseaseDamage;
  state.lastCausePressure = diseaseDamage > intrinsicDamage + stressDamage ? "infection" : state.dentalFunction < .12 && deprivation > .45 ? "dental-failure" : "organ-failure";
  return state;
}

export function senescenceModifiers(animal = {}) {
  const state = animal.senescence;
  if (!state?.active) return { mobility: 1, recovery: 1, feeding: 1, perception: 1 };
  return {
    mobility: clamp(1 - state.frailty * .46, .46, 1),
    recovery: clamp(1 - state.frailty * .68, .25, 1),
    feeding: clamp(.58 + state.dentalFunction * .42, .58, 1),
    perception: clamp(1 - state.frailty * .38, .55, 1)
  };
}

export function senescentDeathCause(animal = {}) {
  const state = animal.senescence || {};
  if (state.diseaseBurden >= 65 || state.lastCausePressure === "infection") return "infection following age-related immune decline";
  if (state.dentalFunction <= .1 && (finite(animal.energy, 100) < 18 || finite(animal.stomach, 65) < 10)) return "starvation following dental failure";
  return "organ failure following senescence";
}

export function senescenceSummary(animal = {}, profile = {}) {
  const state = migrateSenescence(animal, profile);
  return {
    ...state,
    mobility: senescenceModifiers(animal).mobility,
    recovery: senescenceModifiers(animal).recovery,
    feeding: senescenceModifiers(animal).feeding,
    yearsBeyondOnset: Math.max(0, finite(animal.age) - state.onsetDay) / 365
  };
}
