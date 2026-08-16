import { createTargetRef } from "./commitment-contracts.js";

export function perceivedThreatTarget(observation = {}, tick = 0) {
  const entityId = observation.targetId || observation.entityId || observation.predatorId;
  return createTargetRef({ ...observation, entityId, targetKey: observation.targetKey || (entityId ? `entity:${entityId}` : observation.evidenceId ? `threat-evidence:${observation.evidenceId}` : null), targetKind: "perceived-threat", sourceEvidenceIds: observation.evidenceIds || (observation.evidenceId ? [observation.evidenceId] : []) }, { needId: "safety", targetKind: "perceived-threat", tick });
}

export function safetyMethodCandidate({ observation, tick = 0, immediate = false, canDefend = false, allies = 0, escapeRoute = null, confidence = .7 } = {}) {
  const targetRef = perceivedThreatTarget(observation, tick), defend = immediate && canDefend && allies >= 2, methodId = immediate ? defend ? "physical-defence" : "ordinary-escape" : "vigilance";
  return Object.freeze({ drive: immediate ? defend ? "defend against immediate threat" : "flee immediate threat" : "monitor possible threat", needId: "safety", satisfierId: immediate ? defend ? "defence" : "escape" : "threat-monitoring", methodId, targetRef, targetKey: targetRef?.targetKey || null, precedenceClass: immediate ? "immediate-lethal" : "high-urgency", urgent: immediate, immediateLethal: immediate, phase: immediate ? "orient" : "assess", completionCondition: immediate ? "safe separation and pursuit confidence below release thresholds" : "threat confidence below vigilance release threshold", confidence, escapeRoute });
}

export function safetyExecutionCompatible(methodId, actionKey, relationshipBand = null) {
  const method = String(methodId || "").toLowerCase(), action = String(actionKey || "").toLowerCase();
  if (relationshipBand === "flight" || /flee|escape|withdraw/.test(method)) return /flee|retreat|escape|withdraw/.test(action);
  if (relationshipBand === "defence" || /defen|attack|mob/.test(method)) return /defend|attack|guard|rally|flee|retreat|escape|withdraw/.test(action);
  if (/vigilance|monitor|orient/.test(method)) return /listen|freeze|orient|guard|communicate/.test(action);
  return true;
}
