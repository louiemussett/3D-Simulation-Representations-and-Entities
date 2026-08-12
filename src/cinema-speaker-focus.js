import { activeEmittedSignal, visibleExpression } from "./visual-language.js";

const uniqueIds = values => [...new Set((values || []).map(value => String(value || "")).filter(Boolean))];

export function cinemaPanelAuthority(shot = {}) {
  const sources = [
    ["acss-camera", shot?.acssContract?.camera, "primarySubjects"],
    ["author-camera", shot?.authorCameraIntention, "primarySubjects"],
    ["semantic-roles", shot, "semanticRoleIds"],
    ["scene-subjects", shot, "ids"]
  ];
  for (const [source, owner, key] of sources) {
    if (owner && Object.prototype.hasOwnProperty.call(owner, key)) {
      return Object.freeze({ source, subjectIds: Object.freeze(uniqueIds(owner[key])) });
    }
  }
  return Object.freeze({ source: "none", subjectIds: Object.freeze([]) });
}

export function cinemaObservableSpeakerCues(animal = {}, tick = 0) {
  const expression = visibleExpression(animal, tick);
  const signal = activeEmittedSignal(animal, tick);
  return Object.freeze({
    expression: expression ? Object.freeze({ kind: expression.key, label: expression.label || null, role: expression.role || null, observable: true }) : null,
    call: signal ? Object.freeze({
      kind: String(signal.kind),
      urgency: Number.isFinite(Number(signal.urgency)) ? Number(signal.urgency) : null,
      targetId: signal.targetId == null ? null : String(signal.targetId),
      inferredTargetId: signal.inferredTargetId == null && signal.predatorId == null ? null : String(signal.inferredTargetId || signal.predatorId),
      vocal: Number(animal.vocalUntil || 0) > Number(tick || 0),
      observable: true
    }) : null,
    privateThought: null
  });
}

export function cinemaNarrationHighlightSubjectIds({ speakerFocus = null, narrationSubjectIds = [], contractSubjectIds = [], sceneSubjectIds = [] } = {}) {
  const fallback = uniqueIds(narrationSubjectIds.length ? narrationSubjectIds : contractSubjectIds.length ? contractSubjectIds : sceneSubjectIds);
  const focusId = speakerFocus?.subjectId == null ? null : String(speakerFocus.subjectId);
  const observableBasis = ["OBSERVABLE_CALL", "OBSERVABLE_EXPRESSION"].includes(speakerFocus?.basis);
  const observableCue = speakerFocus?.call?.observable === true || speakerFocus?.expression?.observable === true;
  const licensed = Boolean(focusId && uniqueIds([...fallback, ...contractSubjectIds]).includes(focusId));
  return focusId && observableBasis && observableCue && licensed ? [focusId] : fallback;
}

export function cinemaObservableFocusStatus({ speakerFocus = null, highlightSubjectIds = [], activeNarrationSubjectIds = [], currentCues = null } = {}) {
  const highlights = uniqueIds(highlightSubjectIds), active = uniqueIds(activeNarrationSubjectIds), focusId = speakerFocus?.subjectId == null ? null : String(speakerFocus.subjectId);
  const activeFocusCompatible = !active.length || active.length === 1 && active[0] === focusId;
  const evidenceBoundedFocus = Boolean(focusId && highlights.length === 1 && highlights[0] === focusId && activeFocusCompatible && ["OBSERVABLE_CALL", "OBSERVABLE_EXPRESSION"].includes(speakerFocus?.basis) && (speakerFocus?.call?.observable === true || speakerFocus?.expression?.observable === true));
  const subjectId = evidenceBoundedFocus ? focusId : active.length === 1 ? active[0] : highlights.length === 1 ? highlights[0] : null;
  const authoredCall = evidenceBoundedFocus ? speakerFocus?.call || null : null, currentCall = currentCues?.call || null, authoredExpression = evidenceBoundedFocus ? speakerFocus?.expression || null : null, currentExpression = currentCues?.expression || null;
  const callMatches = Boolean(authoredCall && currentCall && authoredCall.kind === currentCall.kind
    && (authoredCall.urgency == null || Number(authoredCall.urgency) === Number(currentCall.urgency))
    && (authoredCall.channel == null || authoredCall.channel === currentCall.channel));
  const callState = authoredCall ? callMatches ? currentCall.vocal ? "CURRENT_VOCAL" : "CURRENT_NONVOCAL" : "EXPIRED_OR_CHANGED" : currentCall ? "CURRENT_UNLICENSED" : "NONE";
  const expressionState = authoredExpression ? currentExpression?.kind === authoredExpression.kind ? "CURRENT" : currentExpression ? "CHANGED" : "UNAVAILABLE" : currentExpression ? "CURRENT_UNLICENSED" : "NONE";
  return Object.freeze({ subjectId, basis: evidenceBoundedFocus ? speakerFocus.basis : "MULTI_SUBJECT_FALLBACK", evidenceBoundedFocus, playbackState: active.length ? "ACTIVE" : "PLANNED", callState, expressionState, authoredCall, currentCall, authoredExpression, currentExpression, highlightedSubjectIds: Object.freeze(active.length ? active : highlights) });
}
