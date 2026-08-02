import { biologicalPhenotype } from "./biological-phenotypes.js";
import { metabolicPresentation, spendMetabolicEnergy } from "./metabolic-system.js";
import { movementCapability } from "./performance-state.js";
import { SPECIES } from "./species-registry.js";

const clamp = (value, low = 0, high = 100) => Math.max(low, Math.min(high, Number(value) || 0));
const paceOrder = ["stationary", "slow-walk", "walk", "sustainable-run", "fast-run", "sprint"];
const paceIntensity = Object.freeze({ stationary: 0, "slow-walk": .22, walk: .38, stalk: .34, "sustainable-run": .68, run: .68, "fast-run": .86, sprint: 1, flee: 1, fight: 1.05, climb: .78 });
const emptyDebt = () => ({ exertion: 0, travel: 0, combat: 0, thermal: 0, dehydration: 0, injury: 0, stress: 0 });

export function migrateUtilisationState(animal = {}) {
  if (animal.utilisation?.schema === 1) return animal.utilisation;
  const oldFatigue = clamp(animal.fatigue || 0), debt = emptyDebt(); debt.exertion = oldFatigue * .22; debt.travel = oldFatigue * .18;
  animal.utilisation = { schema: 1, aerobicLoad: oldFatigue * .6, muscularLoad: clamp(100 - (animal.sprintEnergy ?? 100)) * .18, recoveryDebt: debt, currentZone: "sustainable", requestedPace: "walk", affordablePace: "walk", recentWork: [], lastDemand: null, lastEvaluation: null };
  return animal.utilisation;
}

export function createActivityDemand(input = {}) {
  return Object.freeze({ activity: input.activity || "walk", subtype: input.subtype || null, distance: Math.max(0, Number(input.distance) || 0), averageSpeed: Math.max(0, Number(input.averageSpeed) || 0), peakSpeed: Math.max(0, Number(input.peakSpeed) || Number(input.averageSpeed) || 0), acceleration: Math.abs(Number(input.acceleration) || 0), deceleration: Math.abs(Number(input.deceleration) || 0), turningEffort: Math.max(0, Number(input.turningEffort) || 0), elevationGain: Math.max(0, Number(input.elevationGain) || 0), terrainResistance: Math.max(.2, Number(input.terrainResistance) || 1), footingPenalty: Math.max(0, Number(input.footingPenalty) || 0), bodyMass: Math.max(.5, Number(input.bodyMass) || 1), carriedLoad: Math.max(0, Number(input.carriedLoad) || 0), injuryPenalty: clamp(input.injuryPenalty || 0, 0, 1), thermalPenalty: clamp(input.thermalPenalty || 0, 0, 1), dehydrationPenalty: clamp(input.dehydrationPenalty || 0, 0, 1), stressIntensity: clamp(input.stressIntensity || 0, 0, 1), activitySteps: Math.max(.01, Number(input.activitySteps) || 1) });
}

export function sustainablePerformance(animal = {}, context = {}) {
  const phenotype = biologicalPhenotype(animal), species = SPECIES[animal.speciesId] || {}, stage = animal.lifeStage === "dependent" ? .42 : animal.lifeStage === "juvenile" ? .68 : animal.lifeStage === "subadult" ? .86 : animal.lifeStage === "old" ? .72 : 1;
  const fitness = .72 + clamp(animal.enduranceFitness || 0, 0, 1) * .56, hydration = clamp((animal.hydration || 0) / 55, .15, 1), thermal = clamp(1 - (animal.tempStress || 0) / 105, .18, 1), injury = clamp(1 - (context.injuryPenalty || 0), .2, 1), pregnancy = animal.pregnant ? .84 : 1;
  return Math.max(.2, (phenotype?.locomotion?.endurance || species.enduranceMultiplier || 1) * stage * fitness * hydration * thermal * injury * pregnancy);
}

export function activityPerformanceZone(animal, demand) {
  const sustainable = sustainablePerformance(animal, demand), intensity = paceIntensity[demand.activity] ?? .45;
  const massFactor = Math.pow((demand.bodyMass + demand.carriedLoad) / 65, .72), movement = demand.distance * demand.terrainResistance * massFactor, acceleration = (demand.acceleration + demand.deceleration * .6) * massFactor * .18, turning = demand.turningEffort * massFactor * .018, climbing = demand.elevationGain * massFactor * 1.8, workload = (movement + acceleration + turning + climbing + demand.footingPenalty * demand.distance) * (.45 + intensity);
  const aerobicLimit = sustainable * (.75 + demand.activitySteps * .45), burstLimit = aerobicLimit + metabolicPresentation(animal).muscle * (4 + sustainable * 2);
  const stressOverride = (animal.stressResponse?.voluntaryLimitOverride || 0) > .15;
  // Sprinting, flight and combat are mechanically burst activities even when a
  // single simulation step is short. Treating a short step as aerobic let an
  // animal repeat it indefinitely without drawing on muscle substrate.
  const inherentlyBurst = ["sprint", "flee", "fight", "attack", "wrestle"].includes(demand.activity) && workload > .01;
  const zone = inherentlyBurst
    ? workload <= burstLimit ? "burst" : stressOverride ? "emergency" : "unaffordable"
    : workload <= aerobicLimit ? "sustainable" : workload <= burstLimit ? "burst" : stressOverride ? "emergency" : "unaffordable";
  return Object.freeze({ zone, workload, aerobicLimit, burstLimit, excess: Math.max(0, workload - aerobicLimit), intensity });
}

export function selectAffordablePace(animal, requestedPace = "walk", context = {}) {
  migrateUtilisationState(animal); const capability = movementCapability(animal), normalized = requestedPace === "run" ? "sustainable-run" : requestedPace === "flee" ? "sprint" : requestedPace;
  let selected = normalized, reason = "requested pace is affordable";
  if (!capability.canTravel) { selected = "stationary"; reason = "physiological condition prevents safe travel"; }
  else if (normalized === "sprint" && !capability.canSprint) { selected = capability.endurance >= 35 ? "sustainable-run" : capability.endurance >= 15 ? "walk" : "slow-walk"; reason = "burst capacity is unavailable; objective may continue more slowly"; }
  else if (["fast-run", "sustainable-run"].includes(normalized) && capability.endurance < 25) { selected = "walk"; reason = "aerobic headroom requires a slower pace"; }
  const requestedIndex = Math.max(0, paceOrder.indexOf(normalized)), selectedIndex = Math.max(0, paceOrder.indexOf(selected));
  return Object.freeze({ requested: normalized, selected, reason, downgraded: selectedIndex < requestedIndex, canContinueObjective: selected !== "stationary", reserveAtCompletion: capability.endurance / 100 });
}

export function evaluateActivityDemand(animal, demand, options = {}) {
  const utilisation = migrateUtilisationState(animal), zone = activityPerformanceZone(animal, demand), pace = selectAffordablePace(animal, options.requestedPace || demand.activity, options), adjustedZone = pace.selected === "stationary" ? "unaffordable" : zone.zone;
  const energyCost = zone.workload * (adjustedZone === "sustainable" ? .18 : adjustedZone === "burst" ? .34 : adjustedZone === "emergency" ? .52 : 0), aerobicGain = adjustedZone === "sustainable" ? Math.max(0, zone.workload / Math.max(.1, zone.aerobicLimit) - .72) * 1.1 : zone.excess * 1.6, anaerobicGain = adjustedZone === "burst" ? zone.excess * 2.4 : adjustedZone === "emergency" ? zone.excess * 4.2 + 2 : 0;
  const debtKind = ["fight", "attack", "wrestle"].includes(demand.activity) ? "combat" : ["sprint", "flee"].includes(demand.activity) ? "exertion" : "travel";
  return Object.freeze({ demand, zone: adjustedZone, pace, workload: zone.workload, energyCost, aerobicGain, anaerobicGain, muscularGain: adjustedZone === "sustainable" ? 0 : zone.excess * 1.5, debtKind, debtGain: adjustedZone === "sustainable" ? demand.distance * .025 : zone.excess * (adjustedZone === "emergency" ? 1.8 : .8), heatGain: energyCost * (adjustedZone === "emergency" ? .7 : .25), waterCost: energyCost * (adjustedZone === "emergency" ? .08 : .025), affordable: adjustedZone !== "unaffordable", previousZone: utilisation.currentZone });
}

export function applyActivityDemand(animal, evaluation) {
  const state = migrateUtilisationState(animal), demand = evaluation.demand;
  if (evaluation.energyCost > 0) spendMetabolicEnergy(animal, evaluation.energyCost, evaluation.zone === "sustainable" ? "ordinary" : evaluation.zone === "burst" ? "sprint" : "adrenaline");
  state.aerobicLoad = clamp(state.aerobicLoad + evaluation.aerobicGain - (evaluation.zone === "sustainable" && evaluation.demand.averageSpeed < .35 ? .4 : .08));
  state.muscularLoad = clamp(state.muscularLoad + evaluation.muscularGain - (evaluation.zone === "sustainable" ? .18 : 0));
  state.recoveryDebt[evaluation.debtKind] = clamp((state.recoveryDebt[evaluation.debtKind] || 0) + evaluation.debtGain);
  state.recoveryDebt.thermal = clamp((state.recoveryDebt.thermal || 0) + evaluation.heatGain * .18);
  state.recoveryDebt.dehydration = clamp((state.recoveryDebt.dehydration || 0) + evaluation.waterCost * .4);
  if (evaluation.zone === "emergency") state.recoveryDebt.stress = clamp((state.recoveryDebt.stress || 0) + evaluation.debtGain * .9);
  animal.hydration = clamp((animal.hydration || 0) - evaluation.waterCost, 0, 100); animal.metabolism.thermalLoad = clamp((animal.metabolism.thermalLoad || 0) + evaluation.heatGain);
  state.currentZone = evaluation.zone; state.requestedPace = evaluation.pace.requested; state.affordablePace = evaluation.pace.selected; state.lastDemand = demand; state.lastEvaluation = { zone: evaluation.zone, workload: evaluation.workload, energyCost: evaluation.energyCost, debtKind: evaluation.debtKind, pace: evaluation.pace };
  state.recentWork.push({ activity: demand.activity, zone: evaluation.zone, workload: evaluation.workload, distance: demand.distance }); state.recentWork = state.recentWork.slice(-24);
  const capability = movementCapability(animal); animal.fatigue = clamp(100 - capability.endurance); animal.sprintEnergy = capability.burst;
  return evaluation;
}

export function assessObjectiveContinuation({ affordablePace = "walk", targetDistance = 0, targetConfidence = 1, arrivalReserve = 1, injury = 0, thermalRisk = 0, competingUrgency = 0 } = {}) {
  if (affordablePace === "stationary") return Object.freeze({ decision: "recover-and-resume", reason: "no safe travelling pace is currently available" });
  if (targetConfidence < .2) return Object.freeze({ decision: "abandon-objective", reason: "target evidence is no longer reliable" });
  if (arrivalReserve < .08 || injury > .9 || thermalRisk > .9) return Object.freeze({ decision: "abandon-objective", reason: "continuation would cross a protected physiological reserve" });
  if (competingUrgency > .9) return Object.freeze({ decision: "change-method", reason: "a more urgent survival requirement intervened" });
  if (["slow-walk", "walk"].includes(affordablePace) && targetDistance > 12) return Object.freeze({ decision: "pause-and-observe", reason: "a slower pace requires renewed evidence before commitment" });
  return Object.freeze({ decision: affordablePace === "sprint" ? "continue" : "continue-slower", reason: "the objective remains viable at the affordable pace" });
}
