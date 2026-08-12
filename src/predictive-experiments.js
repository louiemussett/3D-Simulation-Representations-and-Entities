export const PREDICTIVE_EXPERIMENT_PROFILES = Object.freeze({
  LEGACY: Object.freeze({ cognitionMode: "LEGACY", cognitionProfile: "LEGACY", disabledModels: Object.freeze([]) }),
  FIXED: Object.freeze({ cognitionMode: "PREDICTIVE_ACTIVE", cognitionProfile: "FIXED", disabledModels: Object.freeze([]) }),
  ADAPTIVE: Object.freeze({ cognitionMode: "PREDICTIVE_ACTIVE", cognitionProfile: "ADAPTIVE", disabledModels: Object.freeze([]) }),
  ABLATE_MOTION: Object.freeze({ cognitionMode: "PREDICTIVE_ACTIVE", cognitionProfile: "ABLATION", disabledModels: Object.freeze(["motion.v1"]) }),
  ABLATE_THREAT: Object.freeze({ cognitionMode: "PREDICTIVE_ACTIVE", cognitionProfile: "ABLATION", disabledModels: Object.freeze(["threat-state.v1"]) })
});

export function predictiveExperimentProfile(id = "LEGACY") { return PREDICTIVE_EXPERIMENT_PROFILES[id] || PREDICTIVE_EXPERIMENT_PROFILES.LEGACY; }

export function applyPredictiveDisruption(state, disruption) {
  const next = structuredClone(state), type = disruption?.type;
  if (type === "DRY_WATER") { const memory = next.memories?.find(item => item.targetId === disruption.targetId || item.type === "water"); if (memory) memory.outcome = "dry"; }
  else if (type === "STALE_MEMORY") for (const memory of next.memories || []) memory.age = Math.max(Number(memory.age || 0), Number(disruption.age || 72));
  else if (type === "BLOCK_ROUTE") next.routeBlocked = true;
  else if (type === "PREY_DIRECTION_CHANGE") { const contact = next.sensoryBuffer?.find(item => item.targetId === disruption.targetId); if (contact) { contact.x += Number(disruption.dx || 0); contact.z += Number(disruption.dz || 0); } }
  else if (type === "UNRELIABLE_ALARM") { for (const contact of next.sensoryBuffer || []) if (/alarm/.test(contact.type || contact.kind || "")) contact.confidence *= .25; }
  else if (type === "EXHAUSTION") next.fatigue = Math.max(90, Number(next.fatigue || 0));
  else if (type === "LOST_VISUAL_CONTACT") next.sensoryBuffer = (next.sensoryBuffer || []).filter(item => !(item.channel === "sight" && (!disruption.targetId || item.targetId === disruption.targetId)));
  return next;
}

export function predictiveExperimentMetrics(animals = []) {
  const states = animals.map(item => item.predictiveCognition).filter(Boolean), sum = key => states.reduce((total, state) => total + Number(state.metrics?.[key] || 0), 0), cycles = sum("cycles");
  return Object.freeze({ animals: states.length, cycles, admitted: sum("admitted"), abstained: sum("abstained"), corrections: sum("corrections"), meanCostPerCycle: cycles ? sum("cost") / cycles : 0, structuralProposals: states.reduce((total, state) => total + (state.structuralProposals?.length || 0), 0) });
}
