const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
import { METHOD_DEFINITIONS, NEED_DEFINITIONS, ontologyNeedId, SATISFIER_DEFINITIONS } from "./behaviour-ontology.js";
import { canHunt, eatsMeat, eatsPlants } from "./species-registry.js";

// Need satisfaction is represented as a small ontology rather than a flat
// priority. A terminal need selects a method; that method exposes prerequisites
// and the first executable phase. Re-evaluating after every phase lets recovery,
// travel and acquisition progress without losing the original goal.
export const NEED_METHODS = Object.freeze({
  water: Object.freeze({ methods: ["drink at reachable surface water"], prerequisites: ["locomotion capacity", "reachable water evidence", "shoreline contact", "facing and stillness"] }),
  "plant food": Object.freeze({ methods: ["graze local vegetation", "travel to remembered forage"], prerequisites: ["safe ingestion", "locomotion capacity", "reachable vegetation"] }),
  "animal food": Object.freeze({ methods: ["feed from carcass", "hunt prey"], prerequisites: ["adequate hydration", "hunting endurance", "prey or carcass evidence", "feeding capacity"] })
});

export function registeredNeedMethods(need) {
  const canonical = ontologyNeedId(need), definition = NEED_DEFINITIONS[canonical];
  return Object.freeze((definition?.satisfiers || []).map((id) => SATISFIER_DEFINITIONS[id]).filter(Boolean).flatMap((entry) => entry.methods.map((method) => Object.freeze({ ...method, satisfierId: entry.id, supports: entry.supports, impairs: entry.impairs }))));
}

export function foodPlanExecutionRoute({ methodId, speciesId, hasCarcass = false } = {}) {
  const huntingSpecies = canHunt(speciesId), scavengingSpecies = eatsMeat(speciesId);
  if (methodId === "graze-local" && eatsPlants(speciesId)) return "FORAGE";
  if (methodId === "feed-carcass" && scavengingSpecies) return "SCAVENGE";
  if (methodId === "hunt-evidenced-prey" && huntingSpecies) return "HUNT";
  if (hasCarcass && scavengingSpecies) return "SCAVENGE";
  if (huntingSpecies) return "HUNT";
  if (scavengingSpecies) return "SCAVENGE";
  return "SEARCH";
}

export function emergencyFoodEvidenceChoice({ energy = 100, hasCarcass = false, hasCarcassMemory = false, carcassMemoryConfidence = 0, carcassMemoryExact = false, carcassMemoryDistance = Infinity, carcassJourneyViable = false, preyInterceptionAllowed = false, preyForecastDistance = Infinity } = {}) {
  const comparisonDistance = Number.isFinite(preyForecastDistance) ? Math.max(2.5, preyForecastDistance * .6) : Infinity;
  const lowCostCarcassMemory = Boolean(hasCarcassMemory && carcassJourneyViable && (carcassMemoryExact || carcassMemoryConfidence >= .75) && carcassMemoryDistance <= comparisonDistance);
  const preferCurrentPrey = Boolean(!hasCarcass && energy < 10 && preyInterceptionAllowed && !lowCostCarcassMemory);
  const retainCarcassMemory = Boolean(hasCarcassMemory && !preferCurrentPrey && (energy >= 10 || carcassJourneyViable));
  return Object.freeze({ preferCurrentPrey, lowCostCarcassMemory, retainCarcassMemory, reason: preferCurrentPrey ? "current observed prey has a viable bounded interception while carrion evidence is not a cheaper high-confidence route" : lowCostCarcassMemory ? "near high-confidence carrion evidence is the lower-cost emergency route" : hasCarcassMemory && !retainCarcassMemory ? "remembered carrion is not metabolically affordable" : "no viable current-prey override is available" });
}

export function dependencyPlanFromRegistry({ need, methodId, phase, reason, dependencies = [], status = "active", target = null, protocolId = null, forecast = null, protectedReserves = null, evidenceSnapshot = null, contextSnapshot = null, startedAt = 0 } = {}) {
  const canonicalNeedId = ontologyNeedId(need), method = METHOD_DEFINITIONS[methodId] || registeredNeedMethods(canonicalNeedId)[0];
  if (!method) return Object.freeze({ schema: 1, need: canonicalNeedId, needId: canonicalNeedId, method: "none", methodId: null, satisfierId: null, phase: "blocked", dependencies: [], reason: reason || "no satisfaction method is registered", status: "blocked" });
  const legacyLabels = { "drink-confirmed-shoreline": "drink at reachable surface water", "graze-local": "graze local vegetation", "feed-carcass": "feed from carcass", "hunt-evidenced-prey": "hunt prey" };
  return Object.freeze({ schema: 1, planId: null, need: canonicalNeedId === "hydration" ? "water" : canonicalNeedId === "nutrition" ? "food" : canonicalNeedId, needId: canonicalNeedId, satisfierId: method.satisfierId, method: legacyLabels[method.id] || method.label.toLowerCase(), methodLabel: method.label, methodId: method.id, protocolId, phase: phase || method.phases[0], dependencies: Object.freeze(dependencies.length ? dependencies : method.prerequisites), reason: reason || "selected from the authoritative behavioural ontology", status, target, startedAt, forecast, protectedReserves, evidenceSnapshot, contextSnapshot, completionCondition: method.phases.at(-1) });
}

export function plannedWaterTravel({ endurance = 100, minimumDepartureEndurance = 22, sprintEnergy = 0, sprintCapacity = 100, emergencyReserve = 0, adrenalineStress = 0, canSprint = false, canUseAdrenaline = false, hasTarget = false, hydration = 100, forecastState = "comfortable" } = {}) {
  const sprintFraction = clamp(sprintEnergy / Math.max(1, sprintCapacity), 0, 1);
  const urgent = forecastState === "predicted-failure" || forecastState === "emergency" || hydration < 70;
  const anticipationMargin = urgent ? 14 : 8;
  const sprintFloor = forecastState === "predicted-failure" ? 3 : Math.max(6, minimumDepartureEndurance - 18 * sprintFraction);
  const sprintViable = Boolean(hasTarget && canSprint && sprintFraction >= .12 && endurance >= sprintFloor);
  const sprintPreferred = sprintViable && (urgent || endurance <= minimumDepartureEndurance + anticipationMargin);
  const adrenalinePreferred = Boolean(!sprintPreferred && hasTarget && canUseAdrenaline && emergencyReserve > .05 && adrenalineStress < 88 && endurance >= 3 && (urgent || endurance < minimumDepartureEndurance));
  return Object.freeze({ mode: sprintPreferred ? "sprint" : adrenalinePreferred ? "adrenaline" : "walk", viable: endurance >= minimumDepartureEndurance || sprintViable || adrenalinePreferred, sprintPreferred, adrenalinePreferred, sprintFraction, adrenalineCapacity: emergencyReserve, adrenalineStress, enduranceFloor: sprintPreferred ? sprintFloor : adrenalinePreferred ? 3 : minimumDepartureEndurance, reason: sprintPreferred ? `using ${Math.round(sprintFraction * 100)}% sprint reserve before ordinary endurance reaches its departure limit` : adrenalinePreferred ? `mobilising stored fuel with adrenaline while physiological stress remains ${Math.round(adrenalineStress)}%` : "ordinary travel preserves sprint and adrenaline capacity" });
}

export function needDependencyPlan({ need, speciesId, hydration = 100, fatigue = 0, energy = 100, stomach = 50, atResource = false, hasResourceEvidence = false, hasCarcass = false, hasCarcassEvidence = hasCarcass, minimumDepartureEndurance = 22, forecastState = "comfortable", travelStrategy = null, target = null, targetReached = false, immediateDanger = false, canDefend = false, groupAvailable = false, context = {} } = {}) {
  const state = { hydration: clamp(hydration, 0, 100), fatigue: clamp(fatigue, 0, 100), energy: Math.max(0, energy), stomach: clamp(stomach, 0, 100) };
  const endurance = 100 - state.fatigue;
  if (need === "water") {
    if (atResource) return dependencyPlanFromRegistry({ need, methodId: "drink-confirmed-shoreline", phase: "acquire", dependencies: [], reason: "shoreline contact is ready" });
    const emergencyDepartureEndurance = forecastState === "predicted-failure" ? 3 : forecastState === "emergency" ? 14 : minimumDepartureEndurance;
    if (endurance < emergencyDepartureEndurance && !travelStrategy?.viable) return dependencyPlanFromRegistry({ need, methodId: "drink-confirmed-shoreline", phase: "recover", dependencies: ["minimum departure endurance", "protected arrival reserve"], reason: `${forecastState === "predicted-failure" ? "only enough emergency recovery to restore locomotion is safe now; " : ""}endurance ${endurance.toFixed(0)} is below the planned departure reserve ${emergencyDepartureEndurance.toFixed(0)}` });
    const plan = dependencyPlanFromRegistry({ need, methodId: "drink-confirmed-shoreline", phase: hasResourceEvidence ? "travel" : "locate", dependencies: hasResourceEvidence ? ["reachable water evidence"] : ["terrain clues, memory, or communication"], reason: travelStrategy?.sprintPreferred || travelStrategy?.adrenalinePreferred ? travelStrategy.reason : hasResourceEvidence ? "water evidence is available" : "no usable water location is known" });
    return travelStrategy ? Object.freeze({ ...plan, travelMode: travelStrategy.mode, travelStrategy }) : plan;
  }
  if (need === "food") {
    const huntingSpecies = canHunt(speciesId), animalFood = eatsMeat(speciesId) && (!eatsPlants(speciesId) || hasCarcass || hasCarcassEvidence || (!huntingSpecies && state.energy < 10));
    const foodMethod = animalFood ? (hasCarcass || hasCarcassEvidence || !huntingSpecies ? "feed-carcass" : "hunt-evidenced-prey") : "graze-local";
    if (state.hydration < (animalFood ? 72 : 58)) return dependencyPlanFromRegistry({ need, methodId: foodMethod, phase: "satisfy-water-prerequisite", dependencies: ["adequate hydration"], reason: "food acquisition would fail or become unsafe while dehydrated" });
    // Eating in place does not require a departure reserve.  This must precede
    // the locomotion gate or an exhausted animal can starve while standing on
    // food that would let it recover.
    if (atResource || (animalFood && hasCarcass)) return dependencyPlanFromRegistry({ need, methodId: animalFood && hasCarcass ? "feed-carcass" : foodMethod, phase: "acquire", dependencies: [], reason: "the resource method can execute without travel" });
    const foodDepartureEndurance = forecastState === "predicted-failure" ? 3 : Math.max(minimumDepartureEndurance, animalFood ? 42 : 22);
    if (endurance < foodDepartureEndurance) return dependencyPlanFromRegistry({ need, methodId: foodMethod, phase: "recover", dependencies: [animalFood ? "hunting endurance" : "locomotion capacity"], reason: forecastState === "predicted-failure" ? "only enough emergency recovery to restore food-seeking locomotion is safe now" : "planned departure and arrival endurance are not yet available" });
    if (animalFood && state.energy < 10) return dependencyPlanFromRegistry({ need, methodId: foodMethod, phase: "locate", dependencies: foodMethod === "hunt-evidenced-prey" ? ["current prey evidence", "viable burst interception", "acceptable injury risk"] : ["low-cost carcass evidence"], reason: foodMethod === "hunt-evidenced-prey" ? "ordinary hunting fuel is depleted; only a bounded last-resort interception from current evidence is admissible" : "energy is too low for travel without low-cost carcass evidence" });
    return dependencyPlanFromRegistry({ need, methodId: foodMethod, phase: hasResourceEvidence ? "travel" : "locate", dependencies: [animalFood ? "prey or carcass evidence" : "reachable vegetation"], reason: "food acquisition requires a reachable target" });
  }
  const canonical = ontologyNeedId(need);
  if (canonical === "safety") {
    const methodId = immediateDanger ? canDefend ? "physical-defence" : "ordinary-escape" : "vigilance";
    const phase = immediateDanger ? targetReached ? "recover" : "orient" : "assess";
    return dependencyPlanFromRegistry({ need: canonical, methodId, phase, target, dependencies: immediateDanger ? canDefend ? ["physical capability", "acceptable risk"] : ["perceived escape route", "locomotion capacity"] : ["threat evidence"], reason: immediateDanger ? canDefend ? "immediate perceived danger requires bounded defence" : "immediate perceived danger requires increased separation" : "threat evidence requires focused assessment", contextSnapshot: context });
  }
  if (canonical === "care") {
    const methodId = context.guardRequired ? "guard-close" : context.nursing ? "breastfeed" : "seek-caregiver";
    return dependencyPlanFromRegistry({ need: canonical, methodId, phase: targetReached ? (context.nursing ? "feed" : "join") : target ? "travel" : "locate", target, dependencies: target ? [] : ["care relationship evidence"], reason: targetReached ? "care relationship is in physical range" : target ? "retaining the selected caregiver or dependent" : "no currently perceived care target", contextSnapshot: context });
  }
  if (canonical === "thermal") return dependencyPlanFromRegistry({ need: canonical, methodId: context.reduceExertion ? "rest-safe" : "seek-thermal-terrain", phase: targetReached ? "rest" : target ? "travel" : "locate", target, dependencies: target ? ["safe route"] : ["thermal terrain evidence"], reason: context.reduceExertion ? "reduced exertion is the safest thermal method" : "moving toward terrain expected to restore thermal balance", contextSnapshot: context });
  if (canonical === "affiliation") return dependencyPlanFromRegistry({ need: canonical, methodId: "join-compatible-group", phase: targetReached ? "join" : target ? "travel" : "evaluate", target, dependencies: target ? ["social acceptance"] : ["compatible group evidence"], reason: targetReached ? "preferred relationship band reached" : "restoring compatible social proximity", contextSnapshot: context });
  if (canonical === "participation") return dependencyPlanFromRegistry({ need: canonical, methodId: "coordinate-group-goal", phase: groupAvailable ? "coordinate" : "receive", target, dependencies: ["group membership", "known protocol"], reason: groupAvailable ? "executing a bounded group protocol" : "no usable group protocol is currently available", contextSnapshot: context });
  if (canonical === "autonomy") return dependencyPlanFromRegistry({ need: canonical, methodId: context.unsafeGroup ? "voluntary-departure" : "independent-route", phase: target ? "travel" : "locate", target, dependencies: [context.unsafeGroup ? "departure pressure" : "route evidence"], reason: context.unsafeGroup ? "leaving an unsafe or unsuitable group" : "selecting an independent route", contextSnapshot: context });
  if (canonical === "reproduction") return dependencyPlanFromRegistry({ need: canonical, methodId: context.pregnancy ? "build-support-network" : context.guardRequired ? "guard-close" : "court-compatible-mate", phase: targetReached ? context.pregnancy ? "maintain" : "court" : target ? "travel" : "signal", target, dependencies: context.pregnancy ? ["pregnancy", "social evidence"] : ["maturity", "fertility", "mate evidence"], reason: context.pregnancy ? "maintaining a pregnancy support relationship" : "pursuing a perceived compatible mate", contextSnapshot: context });
  if (canonical === "information") return dependencyPlanFromRegistry({ need: canonical, methodId: context.communicableEvidence ? "emit-signal" : "bounded-exploration", phase: context.communicableEvidence ? "select-message" : target ? "travel" : "select-area", target, dependencies: context.communicableEvidence ? ["communicable evidence"] : ["locomotion capacity"], reason: context.communicableEvidence ? "sharing bounded public evidence" : "resolving a bounded environmental question", contextSnapshot: context });
  if (canonical === "recovery") return Object.freeze({ schema: 1, need: "recovery", needId: "recovery", satisfierId: "reduce-exertion", method: "rest in a safe place", methodId: "rest-safe", phase: "rest", dependencies: Object.freeze(["safe resting place"]), reason: "restoring locomotion and physiological reserves", status: "active", target, contextSnapshot: context, completionCondition: "required reserves recover" });
  return dependencyPlanFromRegistry({ need, reason: "no currently executable legacy satisfaction path is registered", status: "blocked" });
}
