const required = (name, value) => { if (value == null) throw new TypeError(`Application context requires ${name}`); return value; };

export function createApplicationContext({ renderer, scene, camera, controls, ui, stores = {}, services = {}, settings = {} } = {}) {
  return Object.freeze({ renderer: required("renderer", renderer), scene: required("scene", scene), camera: required("camera", camera), controls: required("controls", controls), ui: required("ui", ui), stores, services, settings });
}

export function createSimulationContext({ world, clock, random, entityIndex, occupancy, events, environment } = {}) {
  if (typeof random !== "function") throw new TypeError("Simulation context requires random()");
  return Object.freeze({ world: required("world", world), clock: required("clock", clock), random, entityIndex, occupancy, events, environment: required("environment", environment) });
}

export function createAnimalUpdateContext({ tick, ecologicalMinute, environment, nearbyAnimals, nearbyCorpses, speciesProfile, random, eventSink } = {}) {
  for (const [name, callback] of Object.entries({ nearbyAnimals, nearbyCorpses, speciesProfile, random })) if (typeof callback !== "function") throw new TypeError(`Animal update context requires ${name}()`);
  return Object.freeze({ tick: Number(tick) || 0, ecologicalMinute: Number(ecologicalMinute) || 0, environment: required("environment", environment), nearbyAnimals, nearbyCorpses, speciesProfile, random, eventSink });
}
