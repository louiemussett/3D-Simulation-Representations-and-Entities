const freeze = value => Object.freeze(value);

const method = (id, label, phases, dependencies = [], extra = {}) => freeze({ id, label, phases: freeze(phases), dependencies: freeze(dependencies), ...extra });
const satisfier = (id, label, supports, impairs, methods) => freeze({ id, label, supports: freeze(supports), impairs: freeze(impairs), methods: freeze(methods) });
const concern = (id, label, criticality, satisfiers) => freeze({ id, label, criticality, satisfiers: freeze(satisfiers) });

export const AUTHOR_ONTOLOGY_SCHEMA = 1;
export const AUTHOR_CONCERNS = freeze([
  concern("truth_integrity", "Preserve factual and epistemic integrity", 1, ["evidence-bounded-presentation"]),
  concern("production_safety", "Preserve usable and safe camera output", 1, ["safe-continuous-camera"]),
  concern("operator_intent", "Honour explicit documentary policy", 1, ["policy-constrained-selection"]),
  concern("causal_completion", "Complete developing causal stories", .92, ["hold-developing-thread", "return-to-thread"]),
  concern("subject_legibility", "Keep referenced subjects visible and identifiable", .9, ["subject-centred-framing"]),
  concern("event_capture", "Capture rare and irreversible events", .88, ["critical-event-override"]),
  concern("character_continuity", "Maintain character identity through time", .82, ["character-thread-continuity"]),
  concern("audience_comprehension", "Build understanding without overload", .78, ["explain-new-proposition", "editorial-silence"]),
  concern("semantic_novelty", "Communicate materially new information", .7, ["explain-new-proposition", "defer-duplicate"]),
  concern("ecological_context", "Connect local action to causally relevant world processes", .62, ["causal-environment-context"]),
  concern("coverage_diversity", "Represent the wider ecosystem over suitable timescales", .48, ["deferred-world-coverage"]),
  concern("aesthetic_rhythm", "Maintain visual rhythm and breathing room", .42, ["editorial-silence", "measured-transition"])
]);

export const AUTHOR_SATISFIERS = freeze([
  satisfier("evidence-bounded-presentation", "Present only supported propositions", ["truth_integrity"], [], [method("validate-presentation", "Validate evidence and presentation contract", ["collect", "validate", "present"], ["supported-proposition", "epistemic-policy"])]),
  satisfier("safe-continuous-camera", "Use a convergent camera path", ["production_safety", "subject_legibility"], [], [method("execute-convergent-camera", "Execute an absolute bounded camera target", ["forecast", "validate", "move", "hold"], ["camera-feasibility", "terrain-clearance"])]),
  satisfier("policy-constrained-selection", "Apply preset and operator constraints", ["operator_intent"], [], [method("apply-policy-constraints", "Filter plans by active policy", ["read-policy", "filter", "rank"], ["active-preset"])]),
  satisfier("hold-developing-thread", "Remain with a developing causal thread", ["causal_completion", "character_continuity"], ["coverage_diversity"], [
    method("observe-resource-acquisition", "Observe a resource-acquisition dependency plan", ["establish", "cause", "development", "outcome", "consequence", "release"], ["active-plan", "phase-forecast", "subject-visible"]),
    method("observe-social-resolution", "Observe a social dependency plan", ["establish", "relationship", "development", "reaction", "outcome", "consequence"], ["social-roles", "phase-forecast", "subjects-frameable"]),
    method("observe-danger-resolution", "Observe a danger dependency plan", ["threat", "response", "contact-or-escape", "recovery", "consequence"], ["threat-evidence", "danger-forecast", "subject-visible"])
  ]),
  satisfier("return-to-thread", "Return to an interrupted unresolved thread", ["causal_completion", "character_continuity"], ["coverage_diversity"], [method("fulfil-return-obligation", "Resume at the next missing beat", ["re-establish", "resume", "resolve"], ["return-obligation", "thread-valid"])]),
  satisfier("subject-centred-framing", "Frame actual semantic participants", ["subject_legibility", "character_continuity"], [], [method("frame-semantic-roles", "Frame primary and related roles", ["identify", "predict-zone", "compose", "hold"], ["semantic-roles", "camera-feasibility"])]),
  satisfier("critical-event-override", "Interrupt for an irreversible event", ["event_capture"], ["causal_completion"], [method("capture-critical-event", "Capture and record a critical event", ["interrupt", "establish", "event", "consequence"], ["verified-critical-event", "camera-feasibility"])]),
  satisfier("character-thread-continuity", "Prefer established characters", ["character_continuity", "audience_comprehension"], ["coverage_diversity"], [method("continue-character-biography", "Continue a known character thread", ["recognise", "re-establish", "develop", "resolve"], ["character-identity", "active-or-returnable-thread"])]),
  satisfier("explain-new-proposition", "Explain new supported information", ["audience_comprehension", "semantic_novelty"], ["aesthetic_rhythm"], [method("realise-supported-explanation", "Realise a supported explanation", ["select", "order", "realise", "mark-presented"], ["novel-proposition", "visible-support"])]),
  satisfier("editorial-silence", "Allow the image to carry the moment", ["audience_comprehension", "aesthetic_rhythm"], [], [method("hold-silence", "Hold without narration", ["assess-load", "hold", "reconsider"], ["camera-valid"])]),
  satisfier("defer-duplicate", "Defer semantically repeated material", ["semantic_novelty", "aesthetic_rhythm"], [], [method("defer-covered-proposition", "Wait for material change", ["recognise", "defer", "reopen-on-change"], ["audience-memory"])]),
  satisfier("causal-environment-context", "Show environment that explains a focal story", ["ecological_context", "audience_comprehension"], ["character_continuity"], [method("explain-character-environment-dependency", "Connect a world process to a character dependency", ["identify-link", "establish-context", "return-to-character"], ["character-thread", "causal-world-link"])]),
  satisfier("deferred-world-coverage", "Cover a world process when protected stories permit", ["coverage_diversity", "ecological_context"], ["character_continuity"], [method("cover-world-process", "Observe a world process", ["establish", "mechanism", "change", "consequence", "release"], ["world-process", "no-protected-resolution"])]),
  satisfier("measured-transition", "Move between completed story units", ["aesthetic_rhythm", "production_safety"], [], [method("transition-after-release", "Transition after a completed or deferred beat", ["release", "travel-or-cut", "establish"], ["thread-released", "next-plan"])]),
]);

const byId = rows => freeze(Object.fromEntries(rows.map(row => [row.id, row])));
export const AUTHOR_CONCERN_BY_ID = byId(AUTHOR_CONCERNS);
export const AUTHOR_SATISFIER_BY_ID = byId(AUTHOR_SATISFIERS);
export const AUTHOR_METHOD_BY_ID = byId(AUTHOR_SATISFIERS.flatMap(entry => entry.methods.map(item => freeze({ ...item, satisfierId: entry.id }))));

export function authorOntologyIntegrity() {
  const errors = [], concernIds = new Set(AUTHOR_CONCERNS.map(item => item.id)), satisfierIds = new Set(AUTHOR_SATISFIERS.map(item => item.id)), methodIds = new Set();
  for (const item of AUTHOR_CONCERNS) for (const id of item.satisfiers) if (!satisfierIds.has(id)) errors.push(`concern ${item.id} references missing satisfier ${id}`);
  for (const item of AUTHOR_SATISFIERS) {
    for (const id of [...item.supports, ...item.impairs]) if (!concernIds.has(id)) errors.push(`satisfier ${item.id} references missing concern ${id}`);
    if (!item.methods.length) errors.push(`satisfier ${item.id} has no method`);
    for (const candidate of item.methods) { if (methodIds.has(candidate.id)) errors.push(`duplicate method ${candidate.id}`); methodIds.add(candidate.id); if (!candidate.phases.length) errors.push(`method ${candidate.id} has no phases`); }
  }
  return freeze({ valid: !errors.length, errors: freeze(errors), concerns: concernIds.size, satisfiers: satisfierIds.size, methods: methodIds.size });
}

export function concernPressure(id, context = {}) {
  const base = AUTHOR_CONCERN_BY_ID[id]?.criticality || 0;
  const dynamic = {
    truth_integrity: context.unsupportedRisk || 0,
    production_safety: context.cameraRisk || 0,
    operator_intent: context.operatorConstraint ? 1 : 0,
    causal_completion: context.nearResolution ? 1 : context.activeThread ? .72 : .2,
    subject_legibility: context.subjectRisk || 0,
    event_capture: context.criticalEvent ? 1 : context.eventImportance || 0,
    character_continuity: context.characterMode ? .9 : context.activeCharacter ? .65 : .2,
    audience_comprehension: context.audienceLoad || .35,
    semantic_novelty: context.noveltyGap || .4,
    ecological_context: context.worldLink || .25,
    coverage_diversity: context.coverageGap || .2,
    aesthetic_rhythm: context.motionLoad || .25
  }[id] || 0;
  return Math.max(0, Math.min(1, base * (.45 + .55 * dynamic)));
}
