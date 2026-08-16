import { runStableAnimalPhases } from "../simulation-phases.js";

const REQUIRED_PHASES = Object.freeze(["preSense", "prepareOutwardSignals", "buildSnapshot", "sense", "interpretSignals", "act", "postAction", "afterActions"]);
export function validateSimulationSystems(systems = {}) { return Object.freeze(REQUIRED_PHASES.filter(name => typeof systems[name] !== "function").map(name => `missing ${name}()`)); }
export function runSimulationAnimalPhases({ animals, livingList = null, systems } = {}) {
  if (!Array.isArray(animals)) throw new TypeError("Simulation controller requires animals");
  const errors = validateSimulationSystems(systems); if (errors.length) throw new TypeError(`Invalid simulation systems: ${errors.join(", ")}`);
  return runStableAnimalPhases({ animals, livingList, ...systems });
}
