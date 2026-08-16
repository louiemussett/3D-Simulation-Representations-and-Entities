import { clamp01, deepFreeze } from "../runtime/immutable.js";

const METHOD_BY_SITUATION = Object.freeze({
  RESOURCE_ACQUISITION: { methodId: "observe-resource-acquisition", satisfierId: "hold-developing-thread" },
  RECOVERY: { methodId: "observe-recovery", satisfierId: "hold-developing-thread" },
  DANGER_RESPONSE: { methodId: "observe-danger-resolution", satisfierId: "hold-developing-thread" },
  PREDATION_SEQUENCE: { methodId: "observe-danger-resolution", satisfierId: "hold-developing-thread" },
  SOCIAL_INTERACTION: { methodId: "observe-social-resolution", satisfierId: "hold-developing-thread" },
  REPRODUCTION_STAGE: { methodId: "observe-reproduction-stage", satisfierId: "hold-developing-thread" },
  GROUP_MOVEMENT: { methodId: "observe-social-resolution", satisfierId: "character-thread-continuity" },
  DEATH_CONSEQUENCE: { methodId: "observe-death-consequence", satisfierId: "critical-event-override" },
  ENVIRONMENTAL_PROCESS: { methodId: "cover-world-process", satisfierId: "deferred-world-coverage" },
  LIFECYCLE_TRANSITION: { methodId: "continue-character-biography", satisfierId: "character-thread-continuity" },
  CHARACTER_BIOGRAPHY: { methodId: "continue-character-biography", satisfierId: "character-thread-continuity" }
});

export function eligibleDocumentaryMethods({ situation, policy, claims = [], cameraFeasible = true } = {}) {
  const rejected = [];
  if (!situation) return { eligible: [], rejected: [{ reason: "situation-missing" }] };
  const descriptor = METHOD_BY_SITUATION[situation.type];
  if (!descriptor) return { eligible: [], rejected: [{ situationId: situation.situationId, reason: "no-registered-method", situationType: situation.type }] };
  if (!cameraFeasible) return { eligible: [], rejected: [{ ...descriptor, situationId: situation.situationId, reason: "camera-infeasible" }] };
  if (policy.subjectMode === "characters" && situation.type === "ENVIRONMENTAL_PROCESS" && !situation.participantRoles?.actor?.length) return { eligible: [], rejected: [{ ...descriptor, situationId: situation.situationId, reason: "character-policy-world-root" }] };
  if (policy.subjectMode === "world" && Object.values(situation.participantRoles || {}).flat().some(id => id !== "world" && !String(id).startsWith("cell:"))) return { eligible: [], rejected: [{ ...descriptor, situationId: situation.situationId, reason: "world-policy-entity-root" }] };
  if (!claims.length) rejected.push({ ...descriptor, situationId: situation.situationId, reason: "no-supported-claims" });
  const eligible = claims.length ? [{ ...descriptor, situationId: situation.situationId, situationType: situation.type, evidenceReady: true }] : [];
  return deepFreeze({ eligible, rejected });
}

export function evaluateDocumentaryConcerns({ situation, policy, novelty = .5, cameraRisk = 0, critical = false, activeThread = false, nearResolution = false, explicitConflict = false, audienceUncertainty = 0 } = {}) {
  const component = (criticality, deficit, urgency, observability) => ({ criticality, deficit: clamp01(deficit), urgency: clamp01(urgency), observability: clamp01(observability), pressure: clamp01(criticality * clamp01(deficit) * clamp01(urgency) * clamp01(observability)) });
  const rows = {
    causal_completion: component(.92, activeThread ? .75 : .35, nearResolution ? 1 : .55, 1 - cameraRisk),
    subject_legibility: component(.9, cameraRisk, critical ? .9 : .6, 1),
    event_capture: component(.88, critical ? 1 : .2, critical ? 1 : .25, 1 - cameraRisk),
    character_continuity: component(.82, policy.continuity === "strong" ? .85 : activeThread ? .65 : .25, nearResolution ? .9 : .55, 1 - cameraRisk),
    audience_comprehension: component(.78, .55, .5, 1),
    semantic_novelty: component(.7, novelty, nearResolution ? .75 : .45, 1),
    ecological_context: component(.62, situation?.type === "ENVIRONMENTAL_PROCESS" ? .8 : .35, .45, 1 - cameraRisk),
    coverage_diversity: component(.48, activeThread ? .2 : .6, .35, 1 - cameraRisk),
    aesthetic_rhythm: component(.42, .35, .35, 1),
    operator_intent: component(1, explicitConflict ? 1 : 0, explicitConflict ? 1 : 0, explicitConflict ? 1 : 0),
    audience_alignment: component(.6, audienceUncertainty, .35, 1)
  };
  return deepFreeze(Object.entries(rows).map(([id, values]) => ({ id, ...values })).sort((left, right) => right.pressure - left.pressure));
}

export { METHOD_BY_SITUATION };
