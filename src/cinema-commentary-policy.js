const stableIds = values => [...new Set((values || []).filter(Boolean).map(String))].sort();

/**
 * Identifies a narratable development independently of the camera angle used
 * to show it. Interaction stages are visual coverage of one live phase; a
 * changed phase/signature creates a new development and may be narrated.
 */
export function cinemaCommentaryDevelopmentKey(scene = {}, story = {}) {
  const ids = stableIds(scene.semanticRoleIds?.length ? scene.semanticRoleIds : scene.ids || story.subjects?.map(subject => subject.id));
  if (scene.chainId) {
    const development = scene.chainSignature || `${scene.chainId}:${scene.interactionPhase || story.interactionPhase || "active"}`;
    return `thread:${development}`;
  }
  if (scene.kind === "ecosystem-event") {
    const eventIdentity = scene.id || `${scene.ecologicalEventType || scene.eventType || "event"}:${ids.join("|")}:${scene.detectedTick ?? "current"}`;
    return `event:${eventIdentity}`;
  }
  const eventKey = story.eventKey || scene.eventKey || story.actionKey || scene.actionKey || scene.id || "observation";
  return `scene:${scene.kind || "observation"}:${ids.join("|")}:${eventKey}`;
}

/** A multi-angle sequence speaks once; its remaining beats are visual coverage. */
export function planCinemaCommentary(beats = []) {
  return beats.map((beat, index) => ({ beat, commentaryIntent: index === 0 ? "commentary-eligible" : "visual-only" }));
}

/**
 * Varies the amount of visual coverage attached to one narratable development.
 * A one-shot development permits commentary on the very next new scene; longer
 * treatments deliberately create silent angles without imposing a fixed gap.
 */
export function cinemaCoverageShotCount(maximumShots = 1, { variation = .5, urgent = false, preserveMaximum = false } = {}) {
  const maximum = Math.max(1, Math.floor(Number(maximumShots) || 1));
  if (maximum === 1 || preserveMaximum) return maximum;
  const value = Math.max(0, Math.min(.999999, Number(variation) || 0));
  if (urgent) return value < .68 ? 1 : Math.min(2, maximum);
  if (value < .3) return 1;
  if (value < .74) return Math.min(2, maximum);
  return maximum;
}

export function cinemaCommentaryDecision({ narrationAvailable = false, commentaryIntent = "commentary-eligible", alreadyCovered = false, authorAllowsNarration = true, quietScene = false } = {}) {
  if (!narrationAvailable) return { narrate: false, reason: "no-narration" };
  if (commentaryIntent === "visual-only") return { narrate: false, reason: "visual-only-shot" };
  if (alreadyCovered) return { narrate: false, reason: "development-already-narrated" };
  if (!authorAllowsNarration) return { narrate: false, reason: "author-chose-silence" };
  if (quietScene) return { narrate: false, reason: "quiet-cinematic-beat" };
  return { narrate: true, reason: "new-development" };
}
