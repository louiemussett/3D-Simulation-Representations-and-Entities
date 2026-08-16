import { createTargetRef } from "./commitment-contracts.js";

export function careMethodCandidate({ actorId, targetId, role = "caregiver", nursing = false, guardRequired = false, separated = false, critical = false, tick = 0, confidence = .8 } = {}) {
  const targetRef = createTargetRef({ entityId: targetId, targetKey: `entity:${targetId}`, targetKind: role === "dependent" ? "caregiver" : "dependent" }, { needId: "care", tick });
  const methodId = nursing ? role === "dependent" ? "breastfeed" : "permit-nursing" : guardRequired ? "guard-close" : "seek-caregiver";
  return Object.freeze({ drive: nursing ? role === "dependent" ? "nurse from caregiver" : "allow dependent to nurse" : guardRequired ? "guard dependent" : separated ? "restore caregiver contact" : "maintain care proximity", needId: "care", satisfierId: nursing ? "nursing" : guardRequired ? "guard-dependent" : "caregiver-contact", methodId, targetRef, targetKey: targetRef.targetKey, precedenceClass: critical ? "dependent-critical" : "ordinary", dependentCritical: critical, urgent: critical, phase: nursing ? "feed" : guardRequired ? "guard" : separated ? "travel" : "join", completionCondition: nursing ? "dependent intake target or nursing window closes" : guardRequired ? "guarding threat passes" : "preferred caregiver relationship band restored", confidence, actorId });
}
