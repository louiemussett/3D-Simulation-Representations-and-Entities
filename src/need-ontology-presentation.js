const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
import { BEHAVIOUR_ONTOLOGY } from "./behaviour-ontology.js";

// Compatibility projection generated from the same registry used by execution.
// `water` and `food` remain aliases while saves and older tests migrate.
export const NEED_ONTOLOGY = Object.freeze(BEHAVIOUR_ONTOLOGY.needs.map((entry) => Object.freeze({
  id: entry.id === "hydration" ? "water" : entry.id === "nutrition" ? "food" : entry.id,
  canonicalId: entry.id,
  label: entry.label,
  category: entry.category,
  criticality: entry.criticality,
  methods: Object.freeze(entry.satisfiers.flatMap((id) => {
    const satisfier = BEHAVIOUR_ONTOLOGY.satisfiers.find((row) => row.id === id);
    return satisfier ? satisfier.methods.map((method) => Object.freeze({ id: method.id, satisfierId: satisfier.id, label: method.label, optional: true, dependencies: method.prerequisites, phases: method.phases, supports: satisfier.supports, impairs: satisfier.impairs })) : [];
  })),
})));

const phaseOrder = ["recover", "locate", "travel", "contact", "acquire"];
const statusFor = (nodePhase, activePhase) => {
  if (nodePhase === activePhase) return "active";
  const nodeIndex = phaseOrder.indexOf(nodePhase), activeIndex = phaseOrder.indexOf(activePhase);
  if (nodeIndex >= 0 && activeIndex >= 0 && nodeIndex < activeIndex) return "satisfied";
  return "waiting";
};

export function liveNeedGraph({ plan, planning = {}, animal = {}, resource = {} } = {}) {
  if (!plan?.need) return { available: false, message: "No dependency plan has been instantiated for this animal yet.", nodes: [], edges: [], whyNot: [] };
  const need = plan.need, water = planning.water || {}, hydration = clamp(Number(animal.hydration) || 0, 0, 100), fatigue = clamp(Number(animal.fatigue) || 0, 0, 100);
  const terminal = { id: "terminal", label: need === "water" ? "Maintain hydration" : "Acquire food", detail: need === "water" ? `${hydration.toFixed(0)}% currently retained` : `${clamp(Number(animal.stomach) || 0, 0, 100).toFixed(0)}% stomach`, status: "terminal" };
  const definitions = need === "water" ? [
    ["recover", "Recover endurance", `fatigue ${fatigue.toFixed(0)}%`],
    ["locate", "Locate usable water", resource.evidence || "memory, perception, terrain clues, or communication"],
    ["travel", "Travel to shoreline", Number.isFinite(water.etaHours) ? `ETA ${water.etaHours.toFixed(1)} h` : "ETA unknown"],
    ["contact", "Establish contact", "touch, face water, and stop"],
    ["acquire", "Drink to target", "target hydration 96%"]
  ] : [
    ["recover", "Prepare physical reserves", `fatigue ${fatigue.toFixed(0)}%; hydration ${hydration.toFixed(0)}%`],
    ["locate", animal.speciesId === "hunter" ? "Locate prey or carrion" : "Locate vegetation", resource.evidence || "no evidence summary available"],
    ["travel", "Reach food safely", "route and arrival reserves required"],
    ["contact", "Establish feeding access", "physical access to resource"],
    ["acquire", plan.method || "Acquire food", "feed until the planned target is met"]
  ];
  const activePhase = plan.phase === "satisfy-water-prerequisite" ? "recover" : plan.phase;
  const nodes = [terminal, ...definitions.map(([id, label, detail]) => ({ id, label, detail, status: statusFor(id, activePhase) }))];
  if (plan.phase === "blocked") nodes.push({ id: "blocked", label: "No executable method", detail: plan.reason, status: "blocked" });
  const edges = nodes.slice(1).map((node, index) => ({ from: index === 0 ? "terminal" : nodes[index].id, to: node.id, kind: node.status === "active" ? "active" : "required" }));
  const arrival = Number.isFinite(water.predictedAmountAtArrival) ? `${water.predictedAmountAtArrival.toFixed(0)}%` : "unknown";
  const reserve = Number.isFinite(water.reserve) ? `${water.reserve.toFixed(0)}%` : "not calculated";
  const whyNot = need === "water" ? [
    fatigue >= 78 ? "Why not travel now? — Endurance is insufficient; recovery is protecting the water plan." : "Why not rest longer? — Travel proceeds once the required endurance margin is available.",
    resource.hasEvidence === false ? "Why not travel directly? — No usable water location is currently known." : "Why this target? — It is the strongest eligible water evidence currently available.",
    resource.atContact ? "Why not keep travelling? — Shoreline contact is already established; acquisition can begin." : "Why not drink? — Drinking requires shoreline contact, correct facing, and a stationary body."
  ] : [
    hydration < (animal.speciesId === "hunter" ? 72 : 58) ? "Why not feed now? — Hydration is a prerequisite and would become unsafe during acquisition." : "Why not satisfy water first? — Current hydration passes this method's prerequisite.",
    animal.speciesId === "hunter" && !resource.hasCarcass ? "Why not scavenge? — No usable carcass is currently known." : "Why this food method? — It has the lowest currently executable total cost.",
    animal.speciesId === "hunter" && fatigue >= 58 ? "Why not hunt? — Hunting endurance is currently inadequate." : "Why not use another method? — Alternatives remain available if evidence, risk, or reserves change."
  ];
  return {
    available: true, need, method: plan.method, phase: plan.phase, reason: plan.reason,
    resumeCondition: activePhase === "recover" ? (need === "water" ? "Fatigue below 78% and sufficient projected arrival reserve" : "Required acquisition endurance restored") : "Re-evaluate after the current phase",
    eta: Number.isFinite(water.etaHours) ? `${water.etaHours.toFixed(1)} h` : "unknown",
    arrivalReserve: arrival, requiredReserve: reserve,
    evidence: resource.evidence || "none recorded", alternatives: resource.alternatives || [], blockers: ["recover", "satisfy-water-prerequisite", "blocked"].includes(plan.phase) ? [...(plan.dependencies || []), plan.reason].filter(Boolean) : [],
    failures: Math.max(0, Number(resource.failures) || 0), interruptions: resource.interruptions || ["target disproved", "ETA increases", "survival reserve becomes unsafe", "threat conditions change"],
    nodes, edges, whyNot
  };
}

export function survivalForecast({ plan, planning = {}, animal = {}, confidence = 1, preparationHours = 0, acquisitionHours = .25 } = {}) {
  const water = planning.water || {}, safeRemaining = Number(water.remainingHours), baseTravel = Number(water.travelHours ?? water.etaHours);
  preparationHours = Math.max(Number(water.preparationHours || 0), preparationHours);
  acquisitionHours = Number(water.acquisitionHours ?? acquisitionHours);
  const uncertaintyHours = Number.isFinite(water.uncertaintyHours) ? water.uncertaintyHours : Number.isFinite(baseTravel) ? baseTravel * (1 - clamp(confidence, 0, 1)) + (confidence < .45 ? .8 : .15) : Infinity;
  const recoveryHours = Math.max(0, Number(water.recoveryHours || 0));
  const safetyHours = Math.max(0, Number(water.safetyHours ?? (animal.pregnant ? 5 : 2)) || 0);
  const adjustedEtaHours = Number.isFinite(baseTravel) ? Math.max(0, preparationHours) + baseTravel + acquisitionHours + recoveryHours + uncertaintyHours : Infinity;
  const marginHours = Number.isFinite(safeRemaining) && Number.isFinite(adjustedEtaHours) ? safeRemaining - adjustedEtaHours - safetyHours : -Infinity;
  let state = "predicted-failure", label = "PREDICTED FAILURE";
  if (marginHours > Math.max(4, safetyHours)) { state = "plan-soon"; label = "PLAN SOON"; }
  else if (marginHours > 0) { state = "commit-now"; label = "VIABLE — COMMIT NOW"; }
  else if (marginHours > -Math.max(2, safetyHours * .5)) { state = "emergency"; label = "EMERGENCY"; }
  return { safeRemainingHours: safeRemaining, preparationHours, travelHours: baseTravel, acquisitionHours, recoveryHours, uncertaintyHours, safetyHours, adjustedEtaHours, marginHours, predictedReserveHours: Math.max(0, marginHours), state, label, viable: marginHours > 0, method: plan?.method || "none" };
}

export function protectedReserves({ animal = {}, planning = {} } = {}) {
  const waterReserve = Number(planning.water?.reserve ?? (animal.pregnant ? 24 : 15));
  const endurance = clamp(100 - Number(animal.fatigue || 0), 0, 100);
  const protectedEndurance = animal.pregnant ? 34 : animal.lifeStage === "old" ? 32 : 24;
  return { waterReserve, protectedEndurance, currentEndurance: endurance, emergencyEnergyProtected: Number(animal.emergencyReserve ?? animal.emergencyEnergy ?? 0) > 0, recoveryHours: Math.max(.25, Number(animal.fatigue || 0) / 24) };
}
