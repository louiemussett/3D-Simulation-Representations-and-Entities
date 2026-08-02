import { CINEMA_INFORMATION_CHANNELS, CINEMA_PRESETS, isWorldSceneCandidate, resolveCinemaInformationLens } from "../../cinema-presets.js";
import { deepFreeze, stableHash } from "../runtime/immutable.js";

const CHARACTER_KINDS = new Set(["activity", "group", "ecosystem-event", "character", "predation", "reproduction", "care", "social"]);
const PRIVATE_PREDICATE_PREFIXES = ["entity.physiology", "entity.plan", "entity.memory", "entity.perception", "entity.relationships", "entity.reproduction", "entity.archive"];
const FAMILY_GROUPS = Object.freeze({
  all: ["establishing", "still", "tracking", "intercept", "sweep", "orbit", "push-in", "pull-out", "aerial"],
  wildlife: ["still", "tracking", "intercept", "orbit", "push-in"],
  landscape: ["establishing", "sweep", "pull-out", "aerial", "still"],
  intimate: ["still", "tracking", "push-in", "orbit"]
});
const MOTION_GROUPS = Object.freeze({ all: FAMILY_GROUPS.all, still: ["still", "establishing"], smooth: ["still", "tracking", "sweep", "push-in", "pull-out", "aerial"], dynamic: ["tracking", "intercept", "orbit", "push-in", "pull-out", "sweep"] });

export function compileDocumentaryPolicy(input = {}) {
  const preset = CINEMA_PRESETS[input.presetName] || {}, resolved = { ...preset, ...input }, subjectMode = ["balanced", "characters", "world"].includes(resolved.subjectMode) ? resolved.subjectMode : "balanced", continuity = ["off", "prefer", "strong"].includes(resolved.continuity) ? resolved.continuity : "prefer", lensPreset = resolved.lensPreset || "documentary", overrides = Object.fromEntries(CINEMA_INFORMATION_CHANNELS.map(channel => [channel, resolved.overrides?.[channel] || "auto"]));
  const lens = resolveCinemaInformationLens({ preset: lensPreset, directed: resolved.directedLens || {}, beat: resolved.beat || null, overrides });
  const requestedFamilies = FAMILY_GROUPS[resolved.shotTypes] || FAMILY_GROUPS.all, motionFamilies = new Set(MOTION_GROUPS[resolved.motionTypes] || MOTION_GROUPS.smooth), allowedCameraFamilies = requestedFamilies.filter(family => motionFamilies.has(family));
  const policy = {
    schemaVersion: 1, presetName: resolved.presetName || "classic", subjectMode, continuity, pacing: resolved.pacing || "balanced", eventPriority: resolved.eventPriority || "balanced",
    shotLength: resolved.shotLength || "varied", shotTypes: resolved.shotTypes || "all", motionTypes: resolved.motionTypes || "smooth", perceptionInserts: resolved.perceptionInserts || "auto",
    narrationLength: resolved.narrationLength || "standard", narrationEnabled: resolved.narrationEnabled !== false, voiceEnabled: resolved.voiceEnabled !== false, captionsEnabled: resolved.captionsEnabled !== false,
    lensPreset, contextDepth: Math.max(1, Math.min(5, Number(resolved.contextDepth || 3))), overrides, enabledChannels: Object.freeze(Object.keys(lens).filter(channel => lens[channel])),
    allowedCameraFamilies: Object.freeze(allowedCameraFamilies.length ? allowedCameraFamilies : [subjectMode === "world" ? "establishing" : "still"]),
    eventThreshold: ({ quiet: 92, balanced: 80, events: 65 })[resolved.eventPriority] || 80,
    continuityMargin: continuity === "strong" ? .22 : continuity === "off" ? 0 : .14,
    allowElectiveReturns: continuity !== "off", allowPrivateEntityClaims: subjectMode !== "world" && lensPreset !== "natural",
    // Character stories may use world context only after scene eligibility proves
    // a causal connection to the selected character. This flag does not relax that gate.
    allowWorldContextForCharacters: true,
    maximumAudienceUtility: .12, maximumPolicyAdjustment: .2
  };
  policy.policyId = `policy-${stableHash(policy).slice(-12)}`;
  return deepFreeze(policy);
}

export function policyAllowsScene(scene, policy) {
  if (!scene) return { allowed: false, reason: "scene-missing" };
  const participants = [...new Set(scene.semanticRoleIds || (CHARACTER_KINDS.has(scene.kind) ? scene.ids || [] : []))].filter(Boolean), world = scene.worldSubject === true || isWorldSceneCandidate(scene);
  if (policy.subjectMode === "characters" && (!participants.length || world && scene.kind !== "ecosystem-event")) return { allowed: false, reason: "character-root-required" };
  if (policy.subjectMode === "world" && (!world || participants.length)) return { allowed: false, reason: "world-root-required" };
  if (policy.subjectMode === "characters" && world && !scene.causalCharacterIds?.length) return { allowed: false, reason: "unrelated-world-root" };
  return { allowed: true, reason: null };
}

export function policyAllowsClaim(claim, policy) {
  if (!claim) return { allowed: false, reason: "claim-missing" };
  if (policy.subjectMode === "world" && claim.subjectIds?.length) return { allowed: false, reason: "world-mode-private-subject" };
  if (!policy.allowPrivateEntityClaims && PRIVATE_PREDICATE_PREFIXES.some(prefix => claim.predicate.startsWith(prefix))) return { allowed: false, reason: "private-channel-disabled" };
  const channel = channelForPredicate(claim.predicate);
  if (channel && !policy.enabledChannels.includes(channel) && !["entity.identity.current", "entity.identity"].includes(claim.predicate)) return { allowed: false, reason: `channel-disabled:${channel}` };
  return { allowed: true, reason: null };
}

export function channelForPredicate(predicate = "") {
  if (/expression|posture/.test(predicate)) return "expressions";
  if (/communication|call/.test(predicate)) return "calls";
  if (/action/.test(predicate)) return "actions";
  if (/identity|lineage|remains/.test(predicate)) return "identity";
  if (/physiology/.test(predicate)) return "physiology";
  if (/perception/.test(predicate)) return "vision";
  if (/memory/.test(predicate)) return "memory";
  if (/plan/.test(predicate)) return "decisions";
  if (/world|environment/.test(predicate)) return "water";
  return null;
}

export function policySummary(policy) { return { policyId: policy.policyId, subjectMode: policy.subjectMode, lensPreset: policy.lensPreset, channels: policy.enabledChannels, cameraFamilies: policy.allowedCameraFamilies, narration: { enabled: policy.narrationEnabled, voice: policy.voiceEnabled, captions: policy.captionsEnabled }, eventThreshold: policy.eventThreshold }; }
