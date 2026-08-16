import { deepFreeze } from "../runtime/immutable.js";

const METHOD_BEATS = Object.freeze({
  "observe-resource-acquisition": ["establish", "cause", "development", "outcome", "consequence", "release"],
  "observe-danger-resolution": ["threat", "response", "contact-or-escape", "recovery", "consequence", "release"],
  "observe-social-resolution": ["establish", "relationship", "development", "reaction", "outcome", "consequence", "release"],
  "observe-reproduction-stage": ["establish", "preference", "development", "outcome", "care", "consequence", "release"],
  "observe-recovery": ["establish", "cause", "recovery-depth", "development", "resume", "consequence", "release"],
  "observe-death-consequence": ["event", "identity", "reaction", "ecological-consequence", "release"],
  "cover-world-process": ["establish", "mechanism", "change", "consequence", "release"],
  "continue-character-biography": ["recognise", "re-establish", "development", "outcome", "release"]
});

const EVIDENCE_PHASES = Object.freeze({
  establish: [], recognise: [], "re-establish": [], threat: ["DEVELOPING", "OUTCOME_PENDING"], event: ["CONSEQUENCE_AVAILABLE", "RESOLVED"],
  cause: ["DEVELOPING", "OUTCOME_PENDING"], relationship: ["DEVELOPING", "OUTCOME_PENDING"], preference: ["DEVELOPING", "OUTCOME_PENDING"], mechanism: ["DEVELOPING", "OUTCOME_PENDING"], identity: ["CONSEQUENCE_AVAILABLE", "RESOLVED"],
  development: ["DEVELOPING", "OUTCOME_PENDING", "RETURN_READY"], response: ["DEVELOPING", "OUTCOME_PENDING"], "recovery-depth": ["DEVELOPING", "OUTCOME_PENDING"], change: ["OUTCOME_PENDING", "RESOLVED", "CONSEQUENCE_AVAILABLE"], reaction: ["OUTCOME_PENDING", "RESOLVED", "CONSEQUENCE_AVAILABLE"],
  outcome: ["OUTCOME_PENDING", "RESOLVED", "CONSEQUENCE_AVAILABLE"], "contact-or-escape": ["OUTCOME_PENDING", "RESOLVED", "CONSEQUENCE_AVAILABLE"], resume: ["OUTCOME_PENDING", "RESOLVED", "CONSEQUENCE_AVAILABLE"], recovery: ["OUTCOME_PENDING", "RESOLVED", "CONSEQUENCE_AVAILABLE"],
  consequence: ["RESOLVED", "CONSEQUENCE_AVAILABLE"], care: ["OUTCOME_PENDING", "RESOLVED", "CONSEQUENCE_AVAILABLE"], "ecological-consequence": ["CONSEQUENCE_AVAILABLE"], release: ["RESOLVED", "CONSEQUENCE_AVAILABLE"]
});

export function buildDependencyPlan(methodId, situation) {
  const ids = METHOD_BEATS[methodId] || METHOD_BEATS["continue-character-biography"];
  return ids.map((id, index) => ({
    beatId: id, order: index, prerequisites: index ? [ids[index - 1]] : [], evidenceStates: EVIDENCE_PHASES[id] || ["DEVELOPING", "OUTCOME_PENDING", "RESOLVED", "CONSEQUENCE_AVAILABLE"],
    evidenceCondition: evidenceCondition(id, situation), presentationCondition: presentationCondition(id), status: index ? "PENDING" : "EVIDENCE_READY", terminalReason: null
  }));
}

function evidenceCondition(beatId, situation) {
  if (["outcome", "contact-or-escape", "resume", "reaction", "change"].includes(beatId)) return { situationStates: ["OUTCOME_PENDING", "RESOLVED", "CONSEQUENCE_AVAILABLE"], predicate: "material-outcome-evidence" };
  if (["consequence", "care", "ecological-consequence", "release"].includes(beatId)) return { situationStates: ["RESOLVED", "CONSEQUENCE_AVAILABLE"], predicate: "resolution-or-consequence-evidence" };
  return { situationStates: EVIDENCE_PHASES[beatId] || [situation?.state || "DEVELOPING"], predicate: "supporting-belief-present" };
}

const presentationCondition = beatId => ["outcome", "consequence", "contact-or-escape", "reaction", "resume", "change", "care", "ecological-consequence"].includes(beatId) ? "VISUALLY_SHOWN_OR_FACTUALLY_NARRATED" : "VISUALLY_ESTABLISHED_OR_FACTUALLY_NARRATED";

export function updateDependencyPlan(plan, situation) {
  const copy = plan.map(beat => ({ ...beat }));
  for (const beat of copy) {
    if (["PRESENTED", "SKIPPED_WITH_REASON"].includes(beat.status)) continue;
    const prerequisitesMet = beat.prerequisites.every(id => copy.find(candidate => candidate.beatId === id)?.status === "PRESENTED");
    if (prerequisitesMet && beat.evidenceStates.includes(situation.state)) beat.status = "EVIDENCE_READY";
  }
  return copy;
}

export function presentBeat(plan, beatId, { shown = false, narratedClaimIds = [], skipReason = null } = {}) {
  const copy = plan.map(beat => ({ ...beat })), beat = copy.find(item => item.beatId === beatId);
  if (!beat) throw new TypeError(`Unknown story beat: ${beatId}`);
  if (skipReason) { beat.status = "SKIPPED_WITH_REASON"; beat.terminalReason = skipReason; return copy; }
  if (beat.status !== "EVIDENCE_READY") return copy;
  if (!shown && !narratedClaimIds.length) return copy;
  beat.status = "PRESENTED"; beat.presentedClaimIds = [...narratedClaimIds]; return copy;
}

export function nextReadyBeat(plan) { return plan.find(beat => beat.status === "EVIDENCE_READY") || plan.find(beat => beat.status === "PENDING") || null; }
export function dependencyPlanComplete(plan) { return plan.every(beat => ["PRESENTED", "SKIPPED_WITH_REASON"].includes(beat.status)); }
export { METHOD_BEATS };
