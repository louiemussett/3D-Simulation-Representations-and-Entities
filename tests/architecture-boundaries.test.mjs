import assert from "node:assert/strict";
import test from "node:test";
import { dependencyAllowed, moduleLayer, validateDependencyEdges } from "../src/architecture/dependency-rules.js";
import { ownerOfField, validateSystemOwnership } from "../src/architecture/system-ownership.js";
import { createAnimalUpdateContext, createApplicationContext, createSimulationContext } from "../src/bootstrap/application-context.js";
import { detectRuntimeCapabilities } from "../src/bootstrap/runtime-capabilities.js";
import { runSimulationAnimalPhases, validateSimulationSystems } from "../src/simulation/simulation-controller.js";
import { readJsonList, writeJsonList } from "../src/persistence/settings-store.js";
import { OBSERVER_MIN_DISTANCE, SCENE_GROUP_NAMES } from "../src/bootstrap/render-runtime.js";

test("each authoritative field has one documented owner", () => {
  assert.deepEqual(validateSystemOwnership(), []);
  assert.deepEqual(ownerOfField("commitmentState"), { system: "commitment", owner: "commitment-system", authoritative: true });
  assert.equal(ownerOfField("presentationSnapshots").authoritative, false);
});

test("runtime capability detection is explicit and presentation-only", () => {
  const scope = { Worker() {}, indexedDB: {}, document: { querySelector() {}, createElement: () => ({ getContext: kind => kind === "webgl2" ? {} : null }) } };
  const capabilities = detectRuntimeCapabilities(scope);
  assert.equal(capabilities.dom, true); assert.equal(capabilities.webgl2, true); assert.equal(capabilities.indexedDb, true); assert.equal(Object.isFrozen(capabilities), true);
});

test("render bootstrap publishes stable camera clearance and scene ownership groups", () => {
  assert.equal(OBSERVER_MIN_DISTANCE, .55);
  assert.deepEqual(SCENE_GROUP_NAMES, ["terrain", "plants", "water", "weather", "animals", "intent", "selection", "fog", "overlays", "scent", "corpses"]);
});

test("simulation controller validates and preserves stable phase order", () => {
  const names = ["preSense", "prepareOutwardSignals", "buildSnapshot", "sense", "interpretSignals", "act", "postAction", "afterActions"], log = [], animals = [{ id: "B", alive: true, decisionOrder: 1 }, { id: "A", alive: true, decisionOrder: 0 }];
  const systems = Object.fromEntries(names.map(name => [name, subject => { if (Array.isArray(subject)) log.push(`${name}:all`); else log.push(`${name}:${subject.id}`); }]));
  assert.deepEqual(validateSimulationSystems(systems), []);
  runSimulationAnimalPhases({ animals, systems });
  assert.deepEqual(log.slice(0, 2), ["preSense:A", "preSense:B"]); assert.equal(log.at(-1), "afterActions:all");
});

test("settings store safely preserves list values", () => {
  const values = new Map(), storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  assert.equal(writeJsonList(storage, "items", [1, 2]), true); assert.deepEqual(readJsonList(storage, "items"), [1, 2]);
  values.set("items", "not-json"); assert.deepEqual(readJsonList(storage, "items"), []);
});

test("domain layers cannot import presentation laboratory or UI", () => {
  assert.equal(moduleLayer("src/perception/vision-system.js"), "perception");
  assert.equal(dependencyAllowed("src/perception/vision-system.js", "src/presentation/world-renderer.js"), false);
  assert.equal(dependencyAllowed("src/behaviour/safety-planner.js", "src/ui/ui-controller.js"), false);
  assert.equal(dependencyAllowed("src/bootstrap/browser-bootstrap.js", "src/presentation/world-renderer.js"), true);
  assert.equal(validateDependencyEdges([{ from: "src/movement/locomotion.js", to: "src/ui/menu.js" }]).length, 1);
});

test("application simulation and animal contexts expose progressively narrower authority", () => {
  const application = createApplicationContext({ renderer: {}, scene: {}, camera: {}, controls: {}, ui: {} });
  assert.ok(application.renderer); assert.equal(Object.isFrozen(application), true);
  const simulation = createSimulationContext({ world: {}, clock: {}, random: () => .5, entityIndex: {}, occupancy: new Map(), events: [], environment: {} });
  assert.equal(simulation.random(), .5); assert.equal("renderer" in simulation, false);
  const animal = createAnimalUpdateContext({ tick: 4, ecologicalMinute: 8, environment: {}, nearbyAnimals: () => [], nearbyCorpses: () => [], speciesProfile: () => ({}), random: () => .25, eventSink: null });
  assert.equal(animal.tick, 4); assert.equal("world" in animal, false); assert.equal("ui" in animal, false);
});
