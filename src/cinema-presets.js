export const CINEMA_INFORMATION_CHANNELS = Object.freeze(["thoughts", "expressions", "calls", "actions", "identity", "physiology", "vision", "sound", "smell", "memory", "water", "biomass", "scent", "decisions"]);

export const CINEMA_PRESETS = Object.freeze({
  classic: { lensPreset: "natural", subjectMode: "balanced", continuity: "strong", pacing: "relaxed", eventPriority: "balanced", shotLength: "long", shotTypes: "wildlife", motionTypes: "smooth", perceptionInserts: "off", narrationPreset: "brief", contextDepth: 2, narrationLength: "short", narrationRate: .92, voice: true, captions: true, ai: false },
  follow: { lensPreset: "natural", subjectMode: "characters", continuity: "strong", pacing: "balanced", eventPriority: "events", shotLength: "long", shotTypes: "intimate", motionTypes: "smooth", perceptionInserts: "off", narrationPreset: "brief", contextDepth: 2, narrationLength: "short", narrationRate: .96, voice: true, captions: true, ai: false },
  carnivore: { lensPreset: "natural", subjectMode: "characters", continuity: "strong", pacing: "relaxed", eventPriority: "events", shotLength: "long", shotTypes: "wildlife", motionTypes: "smooth", perceptionInserts: "off", narrationPreset: "brief", contextDepth: 2, narrationLength: "short", narrationRate: .92, voice: true, captions: true, ai: false },
  overview: { lensPreset: "natural", subjectMode: "world", continuity: "prefer", pacing: "relaxed", eventPriority: "quiet", shotLength: "long", shotTypes: "landscape", motionTypes: "smooth", perceptionInserts: "off", narrationPreset: "brief", contextDepth: 2, narrationLength: "short", narrationRate: .9, voice: true, captions: true, ai: false }
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
