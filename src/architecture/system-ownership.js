export const SYSTEM_OWNERSHIP_SCHEMA = 1;

export const SYSTEM_OWNERSHIP = Object.freeze({
  clock: Object.freeze({ owner: "simulation-clock", authoritative: Object.freeze(["tick", "ecologicalMinute", "day", "season"]), derived: Object.freeze([]) }),
  physiology: Object.freeze({ owner: "physiology-systems", authoritative: Object.freeze(["hydration", "stomach", "health", "injuries", "bodyTemperature", "metabolicState"]), derived: Object.freeze(["needStates", "capabilities"] ) }),
  perception: Object.freeze({ owner: "perception-pipeline", authoritative: Object.freeze(["sensoryBuffer", "receivedSignals", "heardEvents"]), derived: Object.freeze(["threatAssessment", "predatorIntentEstimates", "evidenceHypotheses"] ) }),
  commitment: Object.freeze({ owner: "commitment-system", authoritative: Object.freeze(["commitmentState", "commitmentEvents"]), derived: Object.freeze(["priorities", "decisionTrace"] ) }),
  needPlan: Object.freeze({ owner: "need-plan-executor", authoritative: Object.freeze(["needDependencyPlan", "parallelObligations"]), derived: Object.freeze(["goalPlan"] ) }),
  movement: Object.freeze({ owner: "locomotion-system", authoritative: Object.freeze(["movementRequest", "locomotion", "routeState"]), derived: Object.freeze(["visualMove"] ) }),
  environment: Object.freeze({ owner: "environment-systems", authoritative: Object.freeze(["terrain", "vegetation", "hydrology", "weatherSystems", "traceField"]), derived: Object.freeze(["weatherTextureData", "landscapeChunks"] ) }),
  persistence: Object.freeze({ owner: "persistence-layer", authoritative: Object.freeze(["worldSchema", "savedSnapshot"]), derived: Object.freeze([]) }),
  presentation: Object.freeze({ owner: "presentation-systems", authoritative: Object.freeze([]), derived: Object.freeze(["presentationSnapshots", "threeObjects", "domMarkup", "audioNodes"] ) })
});

export function ownerOfField(field) {
  for (const [system, record] of Object.entries(SYSTEM_OWNERSHIP)) if (record.authoritative.includes(field) || record.derived.includes(field)) return Object.freeze({ system, owner: record.owner, authoritative: record.authoritative.includes(field) });
  return null;
}

export function validateSystemOwnership(registry = SYSTEM_OWNERSHIP) {
  const errors = [], fields = new Map();
  for (const [system, record] of Object.entries(registry)) {
    if (!record.owner) errors.push(`${system}: missing owner`);
    for (const field of record.authoritative || []) {
      if (fields.has(field)) errors.push(`${field}: authoritative in both ${fields.get(field)} and ${system}`);
      else fields.set(field, system);
    }
  }
  return Object.freeze(errors);
}
