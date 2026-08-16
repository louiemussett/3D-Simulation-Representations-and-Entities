const freeze = value => Object.freeze(value);
const info = (hud, overrides = {}) => freeze({ hud, entityBars: "inhabited-only", expressions: true, warnings: true, labels: true, thoughts: false, privateOtherState: false, overlays: "selected-permitted", ...overrides });
const setup = full => freeze({ chooseRole: true, chooseSpecies: full, chooseSex: full, chooseAge: full, chooseCondition: full, choosePregnancy: full });
const profile = (id, rank, values) => freeze({ id, rank, creativeOverrides: false, instinctAssistance: "optional", ...values });

export const DIFFICULTY_IDS = freeze(["creative", "easy", "standard", "challenging", "hard", "very-hard", "extreme", "insane-immersion", "impossible-immersion"]);
export const DIFFICULTY_PROFILES = freeze({
  creative: profile("creative", 0, { entitySetup: "full", laboratory: "full", mapKnowledge: "full", abstractMap: true, minimap: true, information: info("everything", { entityBars: "all", thoughts: true, privateOtherState: true, overlays: "all" }), control: "direct", setup: setup(true), creativeOverrides: true, instinctAssistance: "optional" }),
  easy: profile("easy", 1, { entitySetup: "full", laboratory: "full", mapKnowledge: "unknown-shaded", abstractMap: true, minimap: true, information: info("full-guided"), control: "direct", setup: setup(true) }),
  standard: profile("standard", 2, { entitySetup: "full", laboratory: "mini", mapKnowledge: "unknown-shaded", abstractMap: true, minimap: true, information: info("full"), control: "direct", setup: setup(true) }),
  challenging: profile("challenging", 3, { entitySetup: "full", laboratory: "mini", mapKnowledge: "unknown-black", abstractMap: true, minimap: true, information: info("standard"), control: "direct", setup: setup(true) }),
  hard: profile("hard", 4, { entitySetup: "full", laboratory: "mini", mapKnowledge: "unknown-black", abstractMap: true, minimap: true, information: info("standard"), control: "direct", setup: setup(true) }),
  "very-hard": profile("very-hard", 5, { entitySetup: "full", laboratory: "none", mapKnowledge: "unknown-black", abstractMap: true, minimap: false, information: info("standard"), control: "direct", setup: setup(true) }),
  extreme: profile("extreme", 6, { entitySetup: "role-only", laboratory: "none", mapKnowledge: "unknown-black", abstractMap: true, minimap: false, information: info("reduced", { expressions: false, warnings: false, labels: false, overlays: "none" }), control: "direct", setup: setup(false), instinctAssistance: "fallback" }),
  "insane-immersion": profile("insane-immersion", 7, { entitySetup: "role-only", laboratory: "none", mapKnowledge: "embodied-only", abstractMap: false, information: info("natural-only", { entityBars: "none", expressions: false, warnings: false, labels: false, overlays: "none" }), control: "direct", setup: setup(false), instinctAssistance: "idle" }),
  "impossible-immersion": profile("impossible-immersion", 8, { entitySetup: "role-only", laboratory: "influence-only", mapKnowledge: "embodied-only", abstractMap: false, information: info("natural-only", { entityBars: "none", expressions: false, warnings: false, labels: false, overlays: "none" }), control: "influence", setup: setup(false), instinctAssistance: "autonomous" })
});

export function difficultyProfile(id = "standard") { return DIFFICULTY_PROFILES[id] || DIFFICULTY_PROFILES.standard; }
export function resolveEmbodimentCapabilities(session = {}) { return session.experience === "embodied" ? difficultyProfile(session.difficulty) : null; }
export function canAccess(capabilities, path) { if (!capabilities) return true; return path.split(".").reduce((value, key) => value?.[key], capabilities) !== false && path.split(".").reduce((value, key) => value?.[key], capabilities) !== "none"; }
export function compareDifficultyProfiles(lower, higher) {
  const errors = [], a = difficultyProfile(lower), b = difficultyProfile(higher);
  if (b.rank <= a.rank) errors.push("rank must increase");
  const lab = { none: 0, "influence-only": 1, mini: 2, full: 3 };
  if (lab[b.laboratory] > lab[a.laboratory] && b.control !== "influence") errors.push("laboratory access increased");
  return errors;
}
export function validateDifficultyProfiles() {
  const errors = [];
  DIFFICULTY_IDS.forEach((id, index) => { const p = DIFFICULTY_PROFILES[id]; if (!p || p.rank !== index) errors.push(`${id}: invalid rank`); if (!p?.setup?.chooseRole) errors.push(`${id}: role selection missing`); });
  return { valid: errors.length === 0, errors };
}
