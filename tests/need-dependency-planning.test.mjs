import test from "node:test";
import assert from "node:assert/strict";
import { emergencyFoodEvidenceChoice, foodPlanExecutionRoute, NEED_METHODS, needDependencyPlan, plannedWaterTravel } from "../src/need-dependency-planning.js";

test("water remains the terminal need while exhaustion inserts recovery", () => {
  const plan = needDependencyPlan({ need: "water", hydration: 54, fatigue: 92, hasResourceEvidence: true });
  assert.equal(plan.need, "water"); assert.equal(plan.phase, "recover"); assert.deepEqual(plan.dependencies, ["minimum departure endurance", "protected arrival reserve"]);
});

test("a hunter satisfies hydration before attempting food acquisition", () => {
  const plan = needDependencyPlan({ need: "food", speciesId: "hunter", hydration: 60, fatigue: 10, energy: 80 });
  assert.equal(plan.phase, "satisfy-water-prerequisite"); assert.ok(NEED_METHODS["animal food"].prerequisites.includes("adequate hydration"));
});

test("a hydrated rested hunter prefers an available carcass", () => {
  const plan = needDependencyPlan({ need: "food", speciesId: "hunter", hydration: 90, fatigue: 20, energy: 40, hasCarcass: true });
  assert.equal(plan.method, "feed from carcass"); assert.equal(plan.phase, "acquire");
});

test("a critically fuel-depleted hunter without carcass evidence gets a bounded live-prey method", () => {
  const plan = needDependencyPlan({ need: "food", speciesId: "hunter", hydration: 90, fatigue: 20, energy: 6, stomach: 2, hasCarcass: false, hasCarcassEvidence: false });
  assert.equal(plan.methodId, "hunt-evidenced-prey");
  assert.equal(plan.phase, "locate");
  assert.deepEqual(plan.dependencies, ["current prey evidence", "viable burst interception", "acceptable injury risk"]);
  assert.match(plan.reason, /bounded last-resort interception/);
});

test("a critically fuel-depleted hunter keeps a genuine carcass evidence path", () => {
  const plan = needDependencyPlan({ need: "food", speciesId: "hunter", hydration: 90, fatigue: 20, energy: 6, stomach: 2, hasCarcassEvidence: true });
  assert.equal(plan.methodId, "feed-carcass");
  assert.equal(plan.phase, "locate");
});

test("a carrion specialist never receives a live-prey hunting method", () => {
  const plan = needDependencyPlan({ need: "food", speciesId: "cold-country-scavenger", hydration: 90, fatigue: 20, energy: 6, stomach: 2 });
  assert.equal(plan.methodId, "feed-carcass");
});

test("food-plan execution sends a carcass-less hunter to predation and a carrion specialist to scavenging", () => {
  assert.equal(foodPlanExecutionRoute({ methodId: "hunt-evidenced-prey", speciesId: "hunter", hasCarcass: false }), "HUNT");
  assert.equal(foodPlanExecutionRoute({ methodId: "feed-carcass", speciesId: "cold-country-scavenger", hasCarcass: false }), "SCAVENGE");
  assert.equal(foodPlanExecutionRoute({ methodId: "graze-local", speciesId: "grazer", hasCarcass: false }), "FORAGE");
  assert.equal(foodPlanExecutionRoute({ methodId: "graze-local", speciesId: "great-omnivore", hasCarcass: false }), "FORAGE");
  assert.equal(foodPlanExecutionRoute({ methodId: "feed-carcass", speciesId: "great-omnivore", hasCarcass: true }), "SCAVENGE");
});

test("current viable prey overrides distant or uncertain carrion memory but not a cheaper confirmed route", () => {
  const distant = emergencyFoodEvidenceChoice({ energy: 4, hasCarcassMemory: true, carcassMemoryConfidence: .8, carcassMemoryDistance: 12, carcassJourneyViable: true, preyInterceptionAllowed: true, preyForecastDistance: 3 });
  assert.equal(distant.preferCurrentPrey, true);
  const uncertain = emergencyFoodEvidenceChoice({ energy: 4, hasCarcassMemory: true, carcassMemoryConfidence: .4, carcassMemoryDistance: 1, carcassJourneyViable: true, preyInterceptionAllowed: true, preyForecastDistance: 3 });
  assert.equal(uncertain.preferCurrentPrey, true);
  const nearExact = emergencyFoodEvidenceChoice({ energy: 4, hasCarcassMemory: true, carcassMemoryConfidence: .9, carcassMemoryExact: true, carcassMemoryDistance: 1.5, carcassJourneyViable: true, preyInterceptionAllowed: true, preyForecastDistance: 4 });
  assert.equal(nearExact.lowCostCarcassMemory, true); assert.equal(nearExact.preferCurrentPrey, false);
  const unsafePrey = emergencyFoodEvidenceChoice({ energy: 4, hasCarcassMemory: true, carcassMemoryConfidence: .4, carcassMemoryDistance: 8, carcassJourneyViable: true, preyInterceptionAllowed: false, preyForecastDistance: 3 });
  assert.equal(unsafePrey.preferCurrentPrey, false); assert.equal(unsafePrey.retainCarcassMemory, true);
  const unaffordable = emergencyFoodEvidenceChoice({ energy: 4, hasCarcassMemory: true, carcassMemoryConfidence: .9, carcassMemoryDistance: 8, carcassJourneyViable: false, preyInterceptionAllowed: false });
  assert.equal(unaffordable.retainCarcassMemory, false); assert.match(unaffordable.reason, /not metabolically affordable/);
});

test("an exhausted herbivore eats available forage before recovering departure endurance", () => {
  const plan = needDependencyPlan({ need: "food", speciesId: "grazer", hydration: 90, fatigue: 99, energy: 2, stomach: 1, atResource: true, minimumDepartureEndurance: 30 });
  assert.equal(plan.method, "graze local vegetation");
  assert.equal(plan.phase, "acquire");
});

test("new carnivore species use animal-food planning", () => {
  const plan = needDependencyPlan({ need: "food", speciesId: "shadow-stalker", hydration: 90, fatigue: 20, energy: 30, hasCarcass: true });
  assert.equal(plan.method, "feed from carcass");
  assert.equal(plan.phase, "acquire");
});

test("an omnivore uses local plants unless an animal-food resource is available", () => {
  const plant = needDependencyPlan({ need: "food", speciesId: "great-omnivore", hydration: 90, fatigue: 20, atResource: true });
  const carcass = needDependencyPlan({ need: "food", speciesId: "great-omnivore", hydration: 90, fatigue: 20, hasCarcass: true });
  assert.equal(plant.method, "graze local vegetation");
  assert.equal(carcass.method, "feed from carcass");
});

test("a water journey spends sprint reserve before blocking on ordinary endurance", () => {
  const strategy = plannedWaterTravel({ endurance: 15, minimumDepartureEndurance: 29, sprintEnergy: 80, sprintCapacity: 100, canSprint: true, hasTarget: true, hydration: 62 });
  const plan = needDependencyPlan({ need: "water", hydration: 62, fatigue: 85, hasResourceEvidence: true, minimumDepartureEndurance: 29, travelStrategy: strategy });
  assert.equal(strategy.mode, "sprint");
  assert.equal(plan.phase, "travel");
  assert.equal(plan.travelMode, "sprint");
  assert.match(plan.reason, /sprint reserve/);
});

test("an exhausted animal still recovers when sprint cannot make departure viable", () => {
  const strategy = plannedWaterTravel({ endurance: 4, minimumDepartureEndurance: 29, sprintEnergy: 5, sprintCapacity: 100, canSprint: true, hasTarget: true, hydration: 62 });
  const plan = needDependencyPlan({ need: "water", hydration: 62, fatigue: 96, hasResourceEvidence: true, minimumDepartureEndurance: 29, travelStrategy: strategy });
  assert.equal(strategy.viable, false);
  assert.equal(plan.phase, "recover");
});

test("adrenaline can rescue a water journey while accumulated stress remains tolerable", () => {
  const strategy = plannedWaterTravel({ endurance: 15, minimumDepartureEndurance: 29, sprintEnergy: 0, sprintCapacity: 100, emergencyReserve: 1, canSprint: false, canUseAdrenaline: true, hasTarget: true, hydration: 58 });
  const plan = needDependencyPlan({ need: "water", hydration: 58, fatigue: 85, hasResourceEvidence: true, minimumDepartureEndurance: 29, travelStrategy: strategy });
  assert.equal(strategy.mode, "adrenaline");
  assert.equal(plan.phase, "travel");
  assert.match(plan.reason, /physiological stress/);
});
