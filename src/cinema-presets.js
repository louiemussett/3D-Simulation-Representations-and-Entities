export const CINEMA_INFORMATION_CHANNELS = Object.freeze(["thoughts", "expressions", "calls", "actions", "identity", "physiology", "vision", "sound", "smell", "memory", "water", "biomass", "scent", "decisions"]);

export const CINEMA_PRESETS = Object.freeze({
  classic: { lensPreset: "adaptive", subjectMode: "balanced", continuity: "strong", pacing: "balanced", eventPriority: "events", shotLength: "varied", shotTypes: "all", motionTypes: "all", perceptionInserts: "auto", narrationPreset: "brief", contextDepth: 2, narrationLength: "short", narrationRate: .96, voice: true, captions: true, ai: false },
  characters: { lensPreset: "documentary", subjectMode: "characters", continuity: "strong", pacing: "relaxed", eventPriority: "balanced", shotLength: "long", shotTypes: "wildlife", motionTypes: "smooth", perceptionInserts: "auto", narrationPreset: "long", contextDepth: 4, narrationLength: "long", narrationRate: .86, voice: true, captions: true, ai: false },
  ecology: { lensPreset: "ecology", subjectMode: "balanced", continuity: "prefer", pacing: "relaxed", eventPriority: "balanced", shotLength: "long", shotTypes: "all", motionTypes: "smooth", perceptionInserts: "auto", narrationPreset: "deep", contextDepth: 5, narrationLength: "extended", narrationRate: .8, voice: true, captions: true, ai: false },
  world: { lensPreset: "world", subjectMode: "world", continuity: "off", pacing: "relaxed", eventPriority: "quiet", shotLength: "long", shotTypes: "landscape", motionTypes: "smooth", perceptionInserts: "off", narrationPreset: "deep", contextDepth: 5, narrationLength: "extended", narrationRate: .82, voice: true, captions: true, ai: false },
  perception: { lensPreset: "perception", subjectMode: "characters", continuity: "prefer", pacing: "balanced", eventPriority: "balanced", shotLength: "varied", shotTypes: "intimate", motionTypes: "smooth", perceptionInserts: "frequent", narrationPreset: "long", contextDepth: 4, narrationLength: "long", narrationRate: .86, voice: true, captions: true, ai: false },
  complete: { lensPreset: "complete", subjectMode: "balanced", continuity: "strong", pacing: "relaxed", eventPriority: "balanced", shotLength: "long", shotTypes: "all", motionTypes: "all", perceptionInserts: "frequent", narrationPreset: "deep", contextDepth: 5, narrationLength: "extended", narrationRate: .8, voice: true, captions: true, ai: false },
  quiet: { lensPreset: "natural", subjectMode: "balanced", continuity: "off", pacing: "relaxed", eventPriority: "quiet", shotLength: "long", shotTypes: "all", motionTypes: "still", perceptionInserts: "off", narrationPreset: "brief", contextDepth: 1, narrationLength: "short", narrationRate: .9, voice: false, captions: false, ai: false },
  events: { lensPreset: "documentary", subjectMode: "balanced", continuity: "prefer", pacing: "lively", eventPriority: "events", shotLength: "short", shotTypes: "all", motionTypes: "dynamic", perceptionInserts: "auto", narrationPreset: "standard", contextDepth: 3, narrationLength: "standard", narrationRate: .95, voice: true, captions: true, ai: false },
  research: { lensPreset: "research", subjectMode: "balanced", continuity: "prefer", pacing: "relaxed", eventPriority: "balanced", shotLength: "long", shotTypes: "all", motionTypes: "smooth", perceptionInserts: "frequent", narrationPreset: "deep", contextDepth: 5, narrationLength: "extended", narrationRate: .8, voice: true, captions: true, ai: false }
});

const core = { expressions: true, calls: true, actions: true, identity: true };
const perception = { vision: true, sound: true, smell: true, memory: true };
const ecology = { thoughts: true, physiology: true, decisions: true, water: true, biomass: true };
const world = { water: true, biomass: true };

export function resolveCinemaInformationLens({ preset = "documentary", directed = {}, beat = null, overrides = {} } = {}) {
  let lens;
  if (preset === "natural") lens = {};
  else if (preset === "adaptive") lens = { ...directed };
  else if (preset === "documentary") lens = { ...directed, ...core };
  else if (preset === "perception") lens = { ...directed, ...core, ...perception };
  else if (preset === "ecology") lens = { ...directed, ...core, ...ecology };
  else if (preset === "world") lens = { ...world, ...(directed.water ? { water: true } : {}), ...(directed.biomass ? { biomass: true } : {}) };
  else if (preset === "research") lens = { ...directed, ...core, ...perception, ...ecology, scent: true };
  else if (preset === "complete") lens = Object.fromEntries(CINEMA_INFORMATION_CHANNELS.map(channel => [channel, true]));
  else lens = { ...directed, ...core };
  if (beat === "perception" && preset !== "natural" && preset !== "world") Object.assign(lens, { identity: true, ...perception });
  for (const channel of CINEMA_INFORMATION_CHANNELS) {
    const override = overrides[channel] || "auto";
    if (override === "always") lens[channel] = true;
    else if (override === "never") delete lens[channel];
    else if (override === "prefer" && directed[channel]) lens[channel] = true;
  }
  return lens;
}

export const WORLD_SCENE_KINDS = Object.freeze(["landscape", "waterhole", "habitat-landmark", "weather-system", "hydrology", "vegetation-transition", "terrain-transition"]);
export function isWorldSceneCandidate(candidate) { return Boolean(candidate && (WORLD_SCENE_KINDS.includes(candidate.kind) || candidate.worldSubject === true)); }

export function applyCinemaPresetValues(name, current = {}) {
  const preset = CINEMA_PRESETS[name];
  return preset ? { ...current, ...preset, presetName: name } : { ...current, presetName: "custom" };
}
