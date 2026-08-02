const ALL_CONTEXTS = ["predation", "flight", "reproduction", "care", "water", "social-conflict", "group-travel", "foraging", "quiet-landscape"];

export const DOCUMENTARY_TEMPLATES = Object.freeze([
  { id: "wide-establishing", family: "establishing", scale: "wide", beats: ["establish", "release"], contexts: ALL_CONTEXTS, distances: [28, 38], elevations: [.55, .72], sides: [-.75, .75], fov: 50, minSubjects: 0, weight: 1.2, lookAhead: .8, minDuration: 10, maxDuration: 22, minimumFraction: .3 },
  { id: "locked-observation", family: "still", scale: "medium", beats: ["develop", "detail", "reaction"], contexts: ALL_CONTEXTS, distances: [15, 20], elevations: [.25, .36], sides: [-1, 1], fov: 43, minSubjects: 0, weight: 1, lookAhead: 0, minDuration: 7, maxDuration: 18, minimumFraction: .4 },
  { id: "rear-tracking", family: "tracking", scale: "medium", beats: ["action", "develop"], contexts: ["predation", "flight", "group-travel", "foraging"], distances: [14, 19], elevations: [.3, .42], sides: [-.35, .35], fov: 44, minSpeed: .015, minSubjects: 1, weight: 1.35, lookAhead: 2.5, forward: -1, minDuration: 5, maxDuration: 12, minimumFraction: .28 },
  { id: "profile-tracking", family: "tracking", scale: "medium", beats: ["action", "develop"], contexts: ["predation", "flight", "group-travel", "foraging", "water"], distances: [13, 18], elevations: [.27, .38], sides: [-1, 1], fov: 42, minSpeed: .01, minSubjects: 1, weight: 1.15, lookAhead: 1.8, minDuration: 5, maxDuration: 13, minimumFraction: .3 },
  { id: "predicted-pass", family: "intercept", scale: "medium", beats: ["action", "develop"], contexts: ["predation", "flight", "group-travel"], distances: [13, 18], elevations: [.22, .34], sides: [-1, 1], fov: 40, minSpeed: .018, minSubjects: 1, weight: 1.25, lookAhead: 5.5, intercept: true, minDuration: 4, maxDuration: 9, minimumFraction: .22 },
  { id: "landscape-sweep", family: "sweep", scale: "wide", beats: ["establish", "release"], contexts: ALL_CONTEXTS, distances: [24, 34], elevations: [.44, .62], sides: [-1, 1], fov: 48, minSubjects: 0, weight: 1.05, lookAhead: 1, minDuration: 12, maxDuration: 26, minimumFraction: .35 },
  { id: "group-orbit", family: "orbit", scale: "medium", beats: ["develop", "reaction"], contexts: ["reproduction", "care", "water", "social-conflict", "group-travel", "foraging"], distances: [15, 21], elevations: [.32, .46], sides: [-1, 1], fov: 45, minSubjects: 2, weight: .95, lookAhead: .5, minDuration: 8, maxDuration: 17, minimumFraction: .38 },
  { id: "detail-push", family: "push-in", scale: "close", beats: ["detail", "reaction"], contexts: ["predation", "reproduction", "care", "water", "social-conflict"], distances: [12, 16], elevations: [.24, .34], sides: [-.7, .7], fov: 39, minSubjects: 1, maxSubjects: 5, weight: 1.05, lookAhead: .35, minDuration: 3, maxDuration: 8, minimumFraction: .45 },
  { id: "habitat-reveal", family: "pull-out", scale: "wide", beats: ["release", "establish"], contexts: ALL_CONTEXTS, distances: [24, 34], elevations: [.42, .58], sides: [-.8, .8], fov: 50, minSubjects: 0, weight: 1.05, lookAhead: .7, minDuration: 9, maxDuration: 20, minimumFraction: .34 },
  { id: "aerial-drift", family: "aerial", scale: "wide", beats: ["establish", "release"], contexts: ["water", "group-travel", "foraging", "quiet-landscape"], distances: [30, 42], elevations: [.7, .86], sides: [-.55, .55], fov: 52, minSubjects: 0, weight: .9, lookAhead: 1.2, minDuration: 14, maxDuration: 30, minimumFraction: .38 }
]);

export const DOCUMENTARY_CONTEXT_PRIORITY = Object.freeze({ "quiet-landscape": 0, foraging: 1, "group-travel": 1, water: 2, care: 2, reproduction: 3, "social-conflict": 4, predation: 5, flight: 6 });
const CALM_BEATS = ["establish", "develop", "detail", "release"], ACTIVE_BEATS = ["action", "reaction", "develop", "release"], SOCIAL_BEATS = ["establish", "develop", "reaction", "release"];
export function documentaryBeatSequence(context, noise = .5) {
  const base = ["predation", "flight", "social-conflict"].includes(context) ? ACTIVE_BEATS : ["reproduction", "care"].includes(context) ? SOCIAL_BEATS : CALM_BEATS;
  const beats = [...base]; if (noise > .78 && !["predation", "flight"].includes(context)) beats.splice(2, 0, "develop"); return beats;
}
export function documentaryShotDuration(candidate, input = {}) {
  const pacing = { relaxed: 1.25, balanced: 1, lively: .72 }[input.pacing] || 1, urgency = DOCUMENTARY_CONTEXT_PRIORITY[input.context || candidate.context] || 0, eventFactor = urgency >= 5 ? .72 : urgency >= 3 ? .88 : 1, beatFactor = input.beat === "detail" || input.beat === "reaction" ? .78 : input.beat === "release" ? 1.12 : 1;
  const low = candidate.minDuration ?? 6, high = Math.max(low, candidate.maxDuration ?? 14), variation = Math.max(0, Math.min(1, Number(input.noise) || 0));
  return Math.max(2.5, (low + (high - low) * variation) * pacing * eventFactor * beatFactor);
}

export function resolveDocumentaryContext(story = {}) {
  const key = `${story.actionKey || ""} ${story.kind || ""} ${story.goal || ""}`.toLowerCase();
  if (/attack|hunt|chas|stalk|kill|carcass|predat/.test(key)) return "predation";
  if (/flee|escape|alarm|threat-response/.test(key)) return "flight";
  if (/birth|mate|court|pregnan|reproduc/.test(key)) return "reproduction";
  if (/nurs|care|offspring|dependent|search.*young/.test(key)) return "care";
  if (/drink|water/.test(key)) return "water";
  if (/threat|defend|rally|territ|fight|conflict|mob/.test(key)) return "social-conflict";
  if (/travel|migrat|group/.test(key) || story.subjectCount > 2 && story.speed > .01) return "group-travel";
  if (/forag|graze|feed|eat|search.*food/.test(key)) return "foraging";
  return "quiet-landscape";
}

export function headingDifference(left, right) { return Math.abs(Math.atan2(Math.sin(left - right), Math.cos(left - right))); }

export function editingPenalty(candidate, history = []) {
  let penalty = 0;
  for (let age = 0; age < Math.min(4, history.length); age += 1) {
    const previous = history[history.length - 1 - age], decay = 1 / (age + 1);
    if (previous.family === candidate.family) penalty += 18 * decay;
    if (previous.side === candidate.side) penalty += 5 * decay;
    if (previous.scale === candidate.scale) penalty += 7 * decay;
    if (previous.templateId === candidate.templateId) penalty += 14 * decay;
    const candidateDuration = candidate.plannedDuration ?? ((candidate.minDuration || 6) + (candidate.maxDuration || 14)) * .5;
    if (Number.isFinite(previous.duration) && Math.abs(previous.duration - candidateDuration) < 1.5) penalty += 6 * decay;
    if (headingDifference(previous.heading || 0, candidate.heading || 0) < .24) penalty += 8 * decay;
  }
  return penalty;
}

export function generateDocumentaryCandidates(story, options = {}) {
  const half = options.worldHalf ?? 45, noise = options.noise || (() => .5), validate = options.validate || (() => ({ valid: true, composition: .5, visibility: 1, landscape: .5, risk: 0 })), history = options.history || [], context = story.context || resolveDocumentaryContext(story), candidates = [];
  const heading = Number.isFinite(story.heading) ? story.heading : 0, fx = Math.sin(heading), fz = Math.cos(heading), rx = Math.cos(heading), rz = -Math.sin(heading), count = story.subjectCount || story.subjects?.length || 0;
  for (const template of DOCUMENTARY_TEMPLATES) {
    if (!template.contexts.includes(context) || count < (template.minSubjects || 0) || Number.isFinite(template.maxSubjects) && count > template.maxSubjects || story.speed < (template.minSpeed || 0)) continue;
    for (const side of template.sides) for (const distance of template.distances) for (const elevation of template.elevations) {
      const horizontal = distance * Math.cos(elevation), forward = (template.forward ?? .15) * horizontal, lateral = side * horizontal, lookAhead = (template.lookAhead || 0) * Math.min(3, story.speed * 12 + 1), target = { x: story.focus.x + fx * lookAhead, y: story.focus.y || 0, z: story.focus.z + fz * lookAhead }, position = { x: target.x + fx * forward + rx * lateral, y: target.y + Math.sin(elevation) * distance, z: target.z + fz * forward + rz * lateral };
      if (Math.abs(position.x) > half - 1 || Math.abs(position.z) > half - 1) continue;
      const candidate = { id: `${template.id}:${side}:${distance}:${elevation}`, templateId: template.id, family: template.family, scale: template.scale, beats: template.beats, side: Math.sign(side), distance, elevation, fov: template.fov, position, target, heading, context, lookAhead, intercept: Boolean(template.intercept), weight: template.weight, minDuration: template.minDuration, maxDuration: template.maxDuration, minimumFraction: template.minimumFraction };
      const metrics = validate(candidate, story) || { valid: false, reason: "validation-failed" }; candidate.metrics = metrics;
      if (!metrics.valid) continue;
      const variation = noise(candidates.length + template.id.length) * 5, quality = (metrics.composition || 0) * 34 + (metrics.visibility || 0) * 30 + (metrics.landscape || 0) * 10 - (metrics.risk || 0) * 32;
      const beatAffinity = !options.beat || template.beats?.includes(options.beat) ? 14 : -18;
      candidate.score = (story.importance || 0) + quality + template.weight * 8 + beatAffinity + variation - editingPenalty(candidate, history); candidates.push(candidate);
    }
  }
  return candidates.sort((left, right) => right.score - left.score);
}

export function selectDocumentaryCandidate(candidates, noise = .5) {
  if (!candidates.length) return null; const pool = candidates.slice(0, Math.min(4, candidates.length)), temperature = Math.max(.05, Math.min(.95, Number(noise) || .5)), rank = Math.min(pool.length - 1, Math.floor(Math.pow(temperature, 2.2) * pool.length)); return pool[rank];
}

export function chooseDocumentaryTransition(previous, next, worldSpan = 90) {
  if (!previous) return { type: "dip", duration: 1.15, reason: "entering-movie-mode", colour: "black" };
  const locationDistance = Math.hypot((previous.target?.x || 0) - next.target.x, (previous.target?.z || 0) - next.target.z), angle = headingDifference(previous.heading || 0, next.heading || 0);
  const subjectChanged = Boolean(previous.subjectKey && next.subjectKey && previous.subjectKey !== next.subjectKey);
  if (locationDistance > worldSpan * .34) return { type: "dip", duration: 1.45, reason: "new-ecosystem-region", colour: "black" };
  if (locationDistance > worldSpan * .11) return { type: "travel", duration: Math.min(4.8, 1.8 + locationDistance / Math.max(1, worldSpan) * 5), reason: "camera-travels-between-scenes", arc: Math.min(18, 3 + locationDistance * .16) };
  if (subjectChanged && previous.context !== next.context) return { type: "dip", duration: .9, reason: "new-subject-and-context", colour: "black" };
  if (previous.family !== next.family && angle > .5) return { type: "cut", duration: 0, reason: "decisive-editorial-angle-change" };
  return { type: "blend", duration: subjectChanged ? 1.25 : .85, reason: angle < .18 ? "matched-composition-blend" : "related-camera-rigs" };
}

export function evaluateDocumentaryShotHealth(input = {}) {
  const minimumSatisfied = input.elapsed >= (input.minimumDuration || 2.5);
  if (input.subjectsRequired && input.subjectsAlive === 0) return { end: true, hard: true, reason: "subjects-lost" };
  if (input.cameraClearance != null && input.cameraClearance < .55) return { end: true, hard: true, reason: "camera-collision" };
  if (input.contextStillValid === false && minimumSatisfied) return { end: true, hard: false, reason: "context-changed" };
  if ((input.occlusionSeconds || 0) > (input.maximumOcclusion || .8)) return { end: true, hard: true, reason: "sustained-occlusion" };
  if (minimumSatisfied && input.composition != null && input.composition < .18) return { end: true, hard: false, reason: "composition-failed" };
  if (input.elapsed >= input.duration) return { end: true, hard: false, reason: "planned-duration" };
  return { end: false, hard: false, reason: null };
}
