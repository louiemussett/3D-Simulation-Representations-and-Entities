export const CINEMA_PERSPECTIVES = Object.freeze(["wide", "medium", "close"]);

const WIDE_STAGES = new Set([
  "distance-overview",
  "relationship-overview",
  "pregnancy-context",
  "family-overview"
]);
const CLOSE_STAGES = new Set([
  "prey-response",
  "prey-condition",
  "hunter-condition",
  "partner-response",
  "reproductive-condition",
  "maternal-state",
  "maternal-condition",
  "reproductive-outlook",
  "dependent-state",
  "dependent-condition",
  "caregiver-condition"
]);
const MEDIUM_STAGES = new Set([
  "evidence",
  "hunter-progress",
  "nearby-participant",
  "relationship-open",
  "relationship-progress",
  "caregiver-response",
  "family-exchange"
]);
const WORLD_CONTEXT_KINDS = new Set([
  "world-overview",
  "population-overview",
  "landscape",
  "terrain-transition",
  "vegetation-transition",
  "hydrology",
  "weather-system"
]);

export function cinemaWideContext(scene = {}, beat = null, sequence = 0) {
  const stage = scene.chainStage || "", kind = scene.kind || "", subjectCount = Number(scene.subjectCount ?? scene.ids?.length ?? 0), radius = Math.max(0, Number(scene.radius || 0));
  if (WIDE_STAGES.has(stage)) return { requested: true, reason: `authored-stage:${stage}` };
  if (WORLD_CONTEXT_KINDS.has(kind) || scene.worldSubject === true || scene.populationOverview === true) return { requested: true, reason: `world-context:${kind || "world-subject"}` };
  if (kind === "meta-group") return { requested: beat === "establish" || beat === "context" || beat === "overview", reason: "meta-group-spatial-structure" };
  const spatialBeat = beat === "establish" || beat === "context" || beat === "overview";
  if (spatialBeat && (kind === "group" || subjectCount >= 4 || radius >= 6)) return { requested: true, reason: "dispersed-multi-subject-context" };
  if (sequence === 0 && spatialBeat && (scene.authoredLocation === true || subjectCount === 0 || subjectCount >= 2)) return { requested: true, reason: "contextual-opening-establish" };
  return { requested: false, reason: "no-spatial-context-need" };
}

/**
 * Returns the editorial scale requested by the adaptive Cinema preset.
 * This is deliberately independent of camera geometry: camera validation may
 * still fall back to another safe scale, but wide context is no longer left to
 * chance or a global random shot picker.
 */
export function adaptiveCinemaPerspective({ scene = {}, beat = null, sequence = 0 } = {}) {
  const stage = scene.chainStage || "";
  if (cinemaWideContext(scene, beat, sequence).requested) return "wide";
  if (CLOSE_STAGES.has(stage)) return "close";
  if (MEDIUM_STAGES.has(stage)) return "medium";
  if (beat === "detail" || beat === "reaction" || beat === "perception") return "close";
  return "medium";
}

export function adaptiveCinemaPerspectivePlan(scene = {}, beats = [], { sequence = 0 } = {}) {
  if (!beats.length) return [];
  return beats.map((beat, index) => adaptiveCinemaPerspective({ scene, beat, sequence: sequence + index }));
}

export function preferredPerspectiveCandidates(candidates = [], perspective = null) {
  if (!perspective) return candidates;
  const exact = candidates.filter(candidate => candidate.scale === perspective);
  return exact.length ? exact : candidates;
}

/**
 * Adaptive Cinema starts as an unannotated observation, adds only public
 * animal channels at medium distance, and reserves private/diagnostic channels
 * for deliberate close detail. Operator overrides are applied later.
 */
export function adaptiveCinemaLens({ directed = {}, scale = "wide", beat = null, chainStage = null } = {}) {
  if (scale === "wide") return {};
  const publicAnimal = { expressions: true, calls: true, actions: true, identity: true };
  if (scale === "medium") return publicAnimal;
  const deliberateCondition = beat === "detail" || /condition|maternal-state|reproductive-outlook/.test(chainStage || "");
  const lens = { ...publicAnimal, ...directed };
  if (!deliberateCondition) {
    delete lens.physiology;
    delete lens.thoughts;
    delete lens.decisions;
  }
  return lens;
}
