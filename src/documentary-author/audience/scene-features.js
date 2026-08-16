const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const clamp01 = value => Math.max(0, Math.min(1, finite(value)));
const clean = value => String(value || "unknown").toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
const one = (vector, key, value = 1) => { if (value) vector[key] = Math.max(-1, Math.min(1, finite(value))); };

export function extractSceneFeatures({ shot = {}, contract = null, narration = null, metrics = {}, favouriteIds = new Set() } = {}) {
  const subjectIds = contract?.subjectIds || shot.narrationSubjectIds || shot.semanticRoleIds || shot.ids || [], speciesIds = [...new Set((shot.story?.subjects || []).map(item => item.speciesId).filter(Boolean))], count = subjectIds.length, world = Boolean(shot.worldSubject || !count), camera = contract?.camera || {}, words = String(narration?.text || shot.narration || "").trim().split(/\s+/).filter(Boolean).length;
  return Object.freeze({
    subject: Object.freeze({ mode: world ? "WORLD" : shot.worldSubject === false || count ? "CHARACTER" : "MIXED", entityIds: Object.freeze([...subjectIds]), speciesIds: Object.freeze(speciesIds), entityCountBand: count === 0 ? "NONE" : count === 1 ? "ONE" : count === 2 ? "PAIR" : count <= 6 ? "SMALL_GROUP" : "LARGE_GROUP", favouritePresent: subjectIds.some(id => favouriteIds.has(id)), protagonistContinuity: clamp01(shot.story?.continuity || shot.protagonistContinuity || 0), remainsPresent: Boolean(shot.remainsPresent) }),
    content: Object.freeze({ situationType: clean(shot.context || shot.kind), eventType: clean(shot.eventType || shot.ecologicalEventType || "none"), topicIds: Object.freeze([...new Set([shot.context, shot.actionKey, ...(shot.topicIds || [])].filter(Boolean).map(clean))]), rarityBand: finite(shot.importance || shot.eventPriority) >= 80 ? "RARE" : finite(shot.importance || shot.eventPriority) >= 50 ? "NOTABLE" : "ORDINARY", causalDepth: clamp01(shot.causalDepth || 0), perceptionDepth: clamp01(shot.perceptionDepth || 0), laboratoryChannelIds: Object.freeze([...(shot.laboratoryChannelIds || [])].map(clean)) }),
    camera: Object.freeze({ family: clean(shot.family || shot.type), shotSize: clean(shot.scale || camera.preferredShotSizes?.[0] || "medium"), elevationBand: clean(shot.elevationBand || "level"), motionBand: clean(shot.motionBand || (["still", "establishing"].includes(shot.family) ? "stable" : "moving")), holdSeconds: Math.max(0, finite(shot.duration)), subjectScreenAreaMean: clamp01(metrics.subjectScreenAreaMean || metrics.containment || 0), containmentMean: clamp01(metrics.containmentMean || metrics.containment || 0), occlusionFraction: clamp01(metrics.occlusionFraction || 0), maximumJerk: Math.max(0, finite(metrics.maximumJerk)) }),
    narration: Object.freeze({ enabled: Boolean(narration?.text || shot.narration), sentenceCount: Math.max(0, finite(narration?.sentenceCount || (String(narration?.text || shot.narration || "").match(/[.!?]+/g) || []).length)), wordCount: words, depth: clean(narration?.depth || shot.narrationContext?.contextDepth || "standard"), questionCount: Math.max(0, finite(narration?.questionCount)), recapFraction: clamp01(narration?.recapFraction || 0), noveltyMean: clamp01(narration?.noveltyMean ?? .5) }),
    story: Object.freeze({ beat: clean(contract?.beat || shot.beat), threadAge: Math.max(0, finite(shot.threadAge)), returningThread: Boolean(shot.returningThread), outcomeShown: Boolean(shot.outcomeShown || ["outcome", "consequence", "resolution"].includes(contract?.beat || shot.beat)), interrupted: Boolean(shot.interrupted) })
  });
}

export function sceneFeatureVector(features, { tags = null } = {}) {
  const v = {}, s = features.subject, c = features.content, camera = features.camera, narration = features.narration, story = features.story;
  one(v, `subject:${clean(s.mode)}`); one(v, `count:${clean(s.entityCountBand)}`); one(v, "subject:favourite", Number(s.favouritePresent)); one(v, "subject:continuity", s.protagonistContinuity); one(v, "subject:remains", Number(s.remainsPresent));
  for (const id of s.entityIds.slice(0, 8)) one(v, `entity:${clean(id)}`); for (const id of s.speciesIds.slice(0, 8)) one(v, `species:${clean(id)}`);
  one(v, `situation:${clean(c.situationType)}`); one(v, `event:${clean(c.eventType)}`); one(v, `rarity:${clean(c.rarityBand)}`); one(v, "content:causal-depth", c.causalDepth); one(v, "content:perception-depth", c.perceptionDepth);
  for (const topic of c.topicIds.slice(0, 12)) one(v, `topic:${clean(topic)}`); for (const channel of c.laboratoryChannelIds.slice(0, 12)) one(v, `channel:${clean(channel)}`);
  one(v, `camera:family:${clean(camera.family)}`); one(v, `camera:size:${clean(camera.shotSize)}`); one(v, `camera:elevation:${clean(camera.elevationBand)}`); one(v, `camera:motion:${clean(camera.motionBand)}`); one(v, "camera:hold", Math.min(1, camera.holdSeconds / 20)); one(v, "camera:containment", camera.containmentMean); one(v, "camera:occlusion", -camera.occlusionFraction);
  one(v, "narration:enabled", Number(narration.enabled)); one(v, `narration:depth:${clean(narration.depth)}`); one(v, "narration:density", Math.min(1, narration.wordCount / 100)); one(v, "narration:questions", Math.min(1, narration.questionCount / 3)); one(v, "narration:novelty", narration.noveltyMean);
  one(v, `story:beat:${clean(story.beat)}`); one(v, "story:return", Number(story.returningThread)); one(v, "story:outcome", Number(story.outcomeShown));
  if (tags?.length) return targetVectorForTags(v, tags);
  return Object.freeze(v);
}

function targetVectorForTags(vector, tags) {
  const prefixes = new Set(), exact = new Set();
  for (const tag of tags) {
    if (["GOOD_SUBJECT", "NOT_INTERESTED_SUBJECT", "PREFER_DIFFERENT_ENTITY", "FOLLOW_ENTITY"].includes(tag)) { prefixes.add("subject:"); prefixes.add("entity:"); prefixes.add("species:"); }
    else if (["GOOD_CAMERA_ANGLE", "GOOD_DISTANCE", "CAMERA_TOO_DISTANT", "CAMERA_TOO_CLOSE", "CAMERA_TOO_ACTIVE", "CAMERA_TOO_STATIC"].includes(tag)) prefixes.add("camera:");
    else if (["GOOD_PACING", "SHOT_TOO_LONG", "SHOT_TOO_SHORT", "TOO_MANY_CUTS"].includes(tag)) { exact.add("camera:hold"); prefixes.add("story:"); }
    else if (["GOOD_EXPLANATION", "TOO_MUCH_NARRATION", "NOT_ENOUGH_EXPLANATION"].includes(tag)) prefixes.add("narration:");
    else if (["USEFUL_LABORATORY_DETAIL", "MORE_TOPIC", "LESS_TOPIC"].includes(tag) || tag.startsWith("MORE_TOPIC:") || tag.startsWith("LESS_TOPIC:")) { prefixes.add("topic:"); prefixes.add("channel:"); }
    else if (["GOOD_STORY_CONTINUATION"].includes(tag)) prefixes.add("story:");
    else if (tag === "MORE_WORLD_CONTEXT") exact.add("subject:world"); else if (tag === "MORE_CHARACTER_FOCUS") exact.add("subject:character");
  }
  if (!prefixes.size && !exact.size) return Object.freeze(vector);
  return Object.freeze(Object.fromEntries(Object.entries(vector).filter(([key]) => exact.has(key) || [...prefixes].some(prefix => key.startsWith(prefix)))));
}

export function planningFeatureVector(scene = {}, policy = {}) {
  const semanticIds = scene.semanticRoleIds || scene.ids || [], world = Boolean(scene.worldSubject || !semanticIds.length), vector = {};
  one(vector, `subject:${world ? "world" : "character"}`); for (const id of semanticIds.slice(0, 8)) one(vector, `entity:${clean(id)}`);
  one(vector, `situation:${clean(scene.kind)}`); one(vector, `event:${clean(scene.eventType || "none")}`); one(vector, `topic:${clean(scene.actionKey || scene.kind)}`); one(vector, `rarity:${Number(scene.importance || scene.eventPriority || 0) >= 80 ? "rare" : "ordinary"}`);
  if (policy.continuity === "strong") one(vector, "subject:continuity", 1); return Object.freeze(vector);
}
