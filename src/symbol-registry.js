import { physiologyLegendEntries } from "./physiology-symbols.js";

const SPECIES = Object.freeze({
  grazer: Object.freeze({ id: "grazer", label: "herbivore", colour: "#e6bc52", mark: "grazer" }),
  hunter: Object.freeze({ id: "hunter", label: "carnivore", colour: "#d96cff", mark: "hunter" })
});

const STAGES = Object.freeze({
  dependent: Object.freeze({ id: "dependent", label: "dependent young", scale: .48, rings: 2 }),
  juvenile: Object.freeze({ id: "juvenile", label: "juvenile", scale: .64, rings: 1 }),
  subadult: Object.freeze({ id: "subadult", label: "subadult", scale: .8, rings: 1 }),
  adult: Object.freeze({ id: "adult", label: "adult", scale: 1, rings: 0 }),
  old: Object.freeze({ id: "old", label: "older adult", scale: .92, rings: 0, old: true })
});

const descriptor = (id, glyph, label, colour, extra = {}) => Object.freeze({ id, glyph, label, colour, ...extra });
const speciesFor = (animal = {}) => SPECIES[animal.speciesId] || SPECIES.grazer;
const stageFor = (animal = {}) => STAGES[animal.lifeStage] || STAGES.adult;
export const reproductivelyMature = (animal = {}) => ["adult", "old"].includes(animal.lifeStage);

const signalContract = (id, label, intent, { trigger = "authoritative-status", requiredEvidence = [], description = "", vocal = true } = {}) => Object.freeze({
  id,
  label,
  intent,
  trigger,
  requiredEvidence: Object.freeze([...requiredEvidence]),
  description,
  vocal,
  privacyBoundary: "May describe only an explicit outward signal and its cited observable or communicated evidence; never a private prediction, confidence value, memory ledger, or uncommitted intention."
});

/**
 * Canonical outward-communication contracts. Status contracts are backed by
 * the simulation's current social-signal producer. Explicit-record contracts
 * are reusable extension points and stay inadmissible until their listed
 * public evidence is supplied on an emitted signal record.
 */
export const PUBLIC_SIGNAL_CONTRACTS = Object.freeze({
  care: signalContract("care", "care request or response", "request", { description: "Dependent need or an observable caregiver response." }),
  lost: signalContract("lost", "separation contact call", "contact", { description: "The sender is observably separated from familiar animals." }),
  contact: signalContract("contact", "social contact call", "contact", { trigger: "explicit-call", description: "An explicit call intended to maintain contact." }),
  "wait-up": signalContract("wait-up", "wait-up call", "request", { description: "The sender is falling behind a moving group." }),
  threat: signalContract("threat", "danger warning", "warning", { description: "The sender has current danger evidence or is directly warning another animal." }),
  alarm: signalContract("alarm", "urgent alarm call", "warning", { description: "A high-urgency public danger warning." }),
  attacked: signalContract("attacked", "strike alert", "alert", { description: "The sender was physically struck in the recent authoritative event window." }),
  distress: signalContract("distress", "urgent distress call", "request", { trigger: "explicit-call", description: "An explicit public request for immediate help." }),
  injury: signalContract("injury", "injury signal", "state", { description: "Observable impaired health or injury." }),
  water: signalContract("water", "critical water need", "state", { description: "Observable or explicitly signalled thirst." }),
  "water-report": signalContract("water-report", "reported water direction", "report", { trigger: "explicit-public-signal-record", requiredEvidence: ["sharesLocation", "x", "z"], description: "Reports the sender's remembered or observed water location; it does not certify that water remains there." }),
  hunger: signalContract("hunger", "critical food need", "state", { description: "Observable or explicitly signalled hunger." }),
  heat: signalContract("heat", "heat-stress signal", "state", { description: "Observable heat stress." }),
  cold: signalContract("cold", "cold-stress signal", "state", { description: "Observable cold stress." }),
  courtship: signalContract("courtship", "courtship call", "courtship", { description: "An explicit outward courtship signal from a mature animal." }),
  "food-report": signalContract("food-report", "reported food direction", "report", { trigger: "explicit-public-signal-record", requiredEvidence: ["sharesLocation", "x", "z"], description: "Reports a perceived or remembered food location without promising that food remains." }),
  "shelter-report": signalContract("shelter-report", "reported shelter direction", "report", { trigger: "explicit-public-signal-record", requiredEvidence: ["sharesLocation", "x", "z"], description: "Reports a perceived or remembered shelter location." }),
  "route-blocked": signalContract("route-blocked", "route-blocked warning", "warning", { trigger: "explicit-public-signal-record", requiredEvidence: ["routeBlocked", "x", "z"], description: "Reports an observed obstruction on the sender's route." }),
  "follow-me": signalContract("follow-me", "follow-me direction", "directive", { trigger: "explicit-public-signal-record", requiredEvidence: ["leaderId"], description: "A group leader explicitly asks listeners to follow." }),
  stop: signalContract("stop", "group stop direction", "directive", { trigger: "explicit-public-signal-record", requiredEvidence: ["leaderId"], description: "A group leader explicitly asks listeners to stop or hold position." }),
  rally: signalContract("rally", "group rally call", "directive", { trigger: "explicit-public-signal-record", requiredEvidence: ["targetId"], description: "Directs group attention toward an observed target or rendezvous point." }),
  "all-clear": signalContract("all-clear", "all-clear signal", "reassurance", { trigger: "explicit-public-signal-record", requiredEvidence: ["clearedThreat", "observedAtTick"], description: "Reports that the sender completed a fresh danger check and is no longer warning; it is not proof of global safety." })
});

export function publicSignalContract(kind = "") {
  return PUBLIC_SIGNAL_CONTRACTS[kind] || null;
}

const activeSignalContext = (animal = {}, kind = "", context = null) => {
  const candidate = context && typeof context === "object" ? context : animal.socialSignal;
  if (!candidate || typeof candidate !== "object") return Object.freeze({});
  const candidateKind = candidate.kind || candidate.signalKind || "";
  return !candidateKind || candidateKind === kind || (kind === "alarm" && candidateKind === "threat") ? candidate : Object.freeze({});
};

const hasFiniteLocation = signal => Number.isFinite(signal?.x) && Number.isFinite(signal?.z);
const hasRequiredPublicEvidence = (contract, signal) => contract.requiredEvidence.every((field) => {
  if (field === "x" || field === "z" || field === "observedAtTick") return Number.isFinite(signal?.[field]);
  return Boolean(signal?.[field]);
});

export function signalVariant(animal = {}, kind = "", context = null) {
  const signal = activeSignalContext(animal, kind, context);
  if (kind === "care") return animal.lifeStage === "dependent" ? (animal.caregiverVisible === false ? "dependent-separated" : "dependent-care") : "family-care";
  if (kind === "lost") {
    if (animal.lifeStage === "dependent") return "dependent-separated";
    if (["juvenile", "subadult"].includes(animal.lifeStage)) return "juvenile-contact";
    return animal.speciesId === "hunter" ? "adult-pack-contact" : "adult-herd-contact";
  }
  if (kind === "contact") {
    if (animal.lifeStage === "dependent") return "dependent-contact";
    if (["juvenile", "subadult"].includes(animal.lifeStage)) return "juvenile-contact";
    return animal.speciesId === "hunter" ? "adult-pack-contact" : "adult-herd-contact";
  }
  if (kind === "threat" && signal.targetId && !signal.inferredTargetId) return "direct-threat-warning";
  if (kind === "alarm" || (kind === "threat" && Number(signal.urgency) >= 85)) return "alarm";
  if ((kind === "water" && signal.sharesLocation && hasFiniteLocation(signal)) || kind === "water-report") return "water-report";
  if (kind === "food-report") return animal.speciesId === "hunter" ? "prey-report" : "forage-report";
  return kind;
}

export function signalAllowed(animal = {}, kind = "", context = null) {
  const signal = activeSignalContext(animal, kind, context), contract = publicSignalContract(kind);
  if (!contract) return false;
  if (kind === "courtship") return reproductivelyMature(animal);
  if (kind === "care") return animal.lifeStage === "dependent" || (reproductivelyMature(animal) && Boolean(animal.offspringIds?.length));
  if (kind === "lost") return animal.lifeStage !== "dependent";
  if (["food-report", "shelter-report"].includes(kind) && animal.lifeStage === "dependent") return false;
  if (["follow-me", "stop", "rally"].includes(kind) && !["adult", "old"].includes(animal.lifeStage)) return false;
  if (contract.trigger === "explicit-public-signal-record") return hasRequiredPublicEvidence(contract, signal);
  return true;
}

const SIGNALS = Object.freeze({
  "dependent-care": descriptor("dependent-care", "⌒?", "dependent care request", "#f3d990", { contractId: "care", intent: "request", family: true, vocal: true }),
  "dependent-separated": descriptor("dependent-separated", "↛⌒", "dependent caregiver call", "#fff0ad", { contractId: "lost", intent: "request", family: true, separated: true, vocal: true, emergency: true }),
  "family-care": descriptor("family-care", "⌒✓", "caregiver response", "#f2c55c", { contractId: "care", intent: "reassurance", family: true, vocal: true }),
  "dependent-contact": descriptor("dependent-contact", "⌒≋", "dependent contact call", "#9fe8de", { contractId: "contact", intent: "contact", family: true, group: true, vocal: true }),
  "juvenile-contact": descriptor("juvenile-contact", "○≋", "young social contact call", "#76dfd2", { contractId: "contact", intent: "contact", group: true, vocal: true }),
  "adult-herd-contact": descriptor("adult-herd-contact", "●≋●", "herd contact call", "#e6bc52", { contractId: "contact", intent: "contact", group: true, vocal: true }),
  "adult-pack-contact": descriptor("adult-pack-contact", "◆≋◆" , "pair or pack contact call", "#d96cff", { contractId: "contact", intent: "contact", group: true, vocal: true }),
  "wait-up": descriptor("wait-up", "⇠", "wait-up group call", "#8de6dc", { contractId: "wait-up", intent: "request", group: true, vocal: true }),
  threat: descriptor("threat", "⚠", "entity threat warning", "#ffcf4f", { contractId: "threat", intent: "warning", threat: true, vocal: true, emergency: true }),
  alarm: descriptor("alarm", "⚠!", "urgent danger alarm", "#ff9d42", { contractId: "alarm", intent: "warning", threat: true, vocal: true, emergency: true }),
  "direct-threat-warning": descriptor("direct-threat-warning", "⚠→", "direct warning to another animal", "#ffc15a", { contractId: "threat", intent: "warning", threat: true, directed: true, vocal: true, emergency: true }),
  attacked: descriptor("attacked", "✹", "physical strike received", "#ff4854", { contractId: "attacked", intent: "alert", impact: true, emergency: true, vocal: true }),
  distress: descriptor("distress", "!", "distress call", "#ff8754", { contractId: "distress", intent: "request", emergency: true, vocal: true }),
  injury: descriptor("injury", "🩹", "injury signal", "#ff8754", { contractId: "injury", intent: "state", injury: true, vocal: true }),
  water: descriptor("water", "💧", "critical thirst", "#5ab9ff", { contractId: "water", intent: "state", vocal: true }),
  "water-report": descriptor("water-report", "💧↗", "reported water direction", "#48cae4", { contractId: "water-report", intent: "report", report: true, vocal: true }),
  hunger: descriptor("hunger", "food", "critical hunger", "#f3cd52", { contractId: "hunger", intent: "state", food: true, vocal: true }),
  "forage-report": descriptor("forage-report", "🌿↗", "reported plant-food direction", "#a9d35b", { contractId: "food-report", intent: "report", food: true, report: true, vocal: true }),
  "prey-report": descriptor("prey-report", "◆↗", "reported prey direction", "#c774ff", { contractId: "food-report", intent: "report", prey: true, report: true, vocal: true }),
  "shelter-report": descriptor("shelter-report", "⌂↗", "reported shelter direction", "#8fc7aa", { contractId: "shelter-report", intent: "report", report: true, vocal: true }),
  "route-blocked": descriptor("route-blocked", "⛔", "route-blocked warning", "#ffcf67", { contractId: "route-blocked", intent: "warning", report: true, vocal: true }),
  "follow-me": descriptor("follow-me", "→●", "follow-me direction", "#71e4c0", { contractId: "follow-me", intent: "directive", directed: true, audience: "group", vocal: true }),
  stop: descriptor("stop", "Ⅱ", "group stop direction", "#ffd166", { contractId: "stop", intent: "directive", directed: true, audience: "group", vocal: true }),
  rally: descriptor("rally", "●←●", "group rally call", "#ffb84d", { contractId: "rally", intent: "directive", directed: true, audience: "group", vocal: true }),
  "all-clear": descriptor("all-clear", "✓", "all-clear signal", "#79d58b", { contractId: "all-clear", intent: "reassurance", report: true, audience: "group", vocal: true }),
  heat: descriptor("heat", "☀", "heat stress", "#ff765f", { contractId: "heat", intent: "state", vocal: true }),
  cold: descriptor("cold", "❄", "cold stress", "#8cdcff", { contractId: "cold", intent: "state", vocal: true }),
  courtship: descriptor("courtship", "♥", "courtship call", "#ff72ab", { contractId: "courtship", intent: "courtship", courtship: true, vocal: true })
});

export const PUBLIC_SIGNAL_VARIANTS = Object.freeze(Object.values(SIGNALS).map(symbol => Object.freeze({
  id: symbol.id,
  glyph: symbol.glyph,
  label: symbol.label,
  colour: symbol.colour,
  intent: symbol.intent || publicSignalContract(symbol.contractId)?.intent || "state",
  contract: symbol.contractId,
  availability: publicSignalContract(symbol.contractId)?.trigger === "explicit-public-signal-record" ? "guarded" : "active",
  source: publicSignalContract(symbol.contractId)?.trigger === "authoritative-status" ? "automatic-status" : publicSignalContract(symbol.contractId)?.trigger === "explicit-call" ? "explicit-call" : "explicit-record",
  vocal: Boolean(symbol.vocal),
  emergency: Boolean(symbol.emergency),
  audience: symbol.audience || (symbol.family ? "family" : symbol.group ? "group" : "nearby")
})));

export const PUBLIC_SIGNAL_AVAILABILITY = Object.freeze({
  "automatic-status": Object.freeze({ id: "automatic-status", label: "Active · automatic status", description: "The current simulation can emit this from an authoritative outward body or social status." }),
  "explicit-call": Object.freeze({ id: "explicit-call", label: "Active · explicit call", description: "The call is available only when an authoritative action explicitly emits it; it is not inferred from private state." }),
  "explicit-record": Object.freeze({ id: "explicit-record", label: "Guarded · explicit evidence record", description: "The callout renderer and contract exist, but ordinary automatic cognition does not emit it without a complete explicit public-signal record." })
});

export const PUBLIC_SIGNAL_CONTRACT_LEGEND = Object.freeze(Object.entries(PUBLIC_SIGNAL_CONTRACTS).map(([kind, contract]) => Object.freeze({
  id: kind,
  label: contract.label,
  intent: contract.intent,
  source: contract.trigger === "authoritative-status" ? "automatic-status" : contract.trigger === "explicit-call" ? "explicit-call" : "explicit-record",
  availability: contract.trigger === "explicit-public-signal-record" ? "guarded" : "active",
  requiredEvidence: contract.requiredEvidence,
  description: contract.description,
  privacyBoundary: contract.privacyBoundary
})));

export function emittedSymbol(animal = {}, kind = "", context = null) {
  const variant = signalVariant(animal, kind, context), base = SIGNALS[variant] || descriptor(variant || "unknown", "•", "outward signal", "#ffffff");
  const glyph = variant === "hunger" ? (animal.speciesId === "hunter" ? "🦌" : "🌿") : base.glyph;
  const contract = publicSignalContract(base.contractId || kind);
  return Object.freeze({ ...base, glyph, channel: "public-signal", species: speciesFor(animal), stage: stageFor(animal), variant, contract });
}

const actionBase = (action, animal = {}) => {
  const carnivore = animal.speciesId === "hunter";
  const protectingYoung = action === "protect-offspring" || Boolean(animal.offspringIds?.length && ["guard", "defend"].includes(action));
  const map = {
    blocked: descriptor("blocked", "⛔", "route blocked", "#ffcf67"), listen: descriptor("listen", "≋" , "listening", "#d7ecff", { vocal: false }),
    graze: descriptor("plant-feeding", "🌿", "grazing", "#a9d35b", { food: true }), browse: descriptor("browse", "☘", "browsing", "#a9d35b", { food: true }),
    "evaluate-prey": descriptor("evaluate-prey", "👁", "evaluating prey", "#c774ff", { prey: true }), stalk: descriptor("stalk", "🐾", "stalking prey", "#c774ff", { prey: true }),
    chase: descriptor("chase", "➤", "chasing prey", "#e45cff", { prey: true }), attack: descriptor("attack", "✹", "attacking", "#ff4854", { prey: true, impact: true }),
    "feed-carcass": descriptor("feed-carcass", "🦴", "feeding from carcass", "#d1aa76", { carcass: true }), scavenge: descriptor("scavenge", "🦴", "scavenging", "#d1aa76", { carcass: true }),
    "track-scent": descriptor("track-scent", "🐾", "tracking scent", "#53d9ff", { scent: true }),
    guard: descriptor(protectingYoung ? "guard-young" : "guard", "🛡", protectingYoung ? "guarding young" : "guarding", "#f2c55c", { guard: true, family: protectingYoung }),
    defend: descriptor(protectingYoung ? "defend-young" : "defend", "🛡", protectingYoung ? "defending young" : "defending", "#ff8754", { guard: true, family: protectingYoung }),
    "protect-offspring": descriptor("protect-offspring", "🛡", "protecting offspring", "#f2c55c", { guard: true, family: true }),
    search: descriptor(carnivore ? "hunting-patrol" : "herd-vigilance", carnivore ? "⚑" : "👁", carnivore ? "hunting patrol" : "herd vigilance", carnivore ? "#c774ff" : "#e6bc52", { patrol: true }),
    "coordinate-group": descriptor(carnivore ? "pack-coordinate" : "herd-coordinate", "⇢", carnivore ? "coordinating pair or pack" : "coordinating herd", carnivore ? "#d96cff" : "#e6bc52", { group: true }),
    "join-herd": descriptor("join-group", "→●●", carnivore ? "joining pair or pack" : "joining herd", carnivore ? "#d96cff" : "#e6bc52", { group: true }),
    "leave-group": descriptor("leave-group", "●→", carnivore ? "leaving pair or pack" : "leaving group", carnivore ? "#d96cff" : "#e6bc52", { group: true }),
    "caregiver-dispute": descriptor("caregiver-dispute", "⌒!", "caregiver dispute", "#ff8754", { family: true }),
    "abandon-dependent": descriptor("abandon-dependent", "↛", "abandoning dependent", "#ff4854", { family: true }),
    "social-attack": descriptor("social-fight", "✹!", "fighting over a social dispute", "#ff4854", { impact: true }),
    courtship: descriptor("courtship", "♥", "courting", "#ff72ab", { courtship: true }), mating: descriptor("mating", "♥♥", "mating", "#ff72ab", { courtship: true }),
    rest: descriptor("rest", "Zzz", "resting", "#91a4bd"), collapse: descriptor("collapse", "—", "collapsed", "#ff8754", { emergency: true })
  };
  return map[action] || null;
};

export function actionSymbol(animal = {}, action = animal.actionState?.key || "idle") {
  const base = actionBase(action, animal); if (!base) return null;
  if (["graze", "browse"].includes(action) && animal.speciesId !== "grazer") return null;
  if (["evaluate-prey", "stalk", "chase", "attack", "feed-carcass", "scavenge"].includes(action) && animal.speciesId !== "hunter") return null;
  if (["protect-offspring", "caregiver-dispute", "abandon-dependent"].includes(action) && !reproductivelyMature(animal)) return null;
  if ((base.courtship || ["courtship", "mating", "accept-mate", "reject"].includes(action)) && !reproductivelyMature(animal)) return null;
  return Object.freeze({ ...base, channel: "activity", species: speciesFor(animal), stage: stageFor(animal) });
}

export function thoughtSymbol(animal = {}, priority = "") {
  const value = String(priority).toLowerCase(), carnivore = animal.speciesId === "hunter";
  let base;
  if (/courtship|reproduction|mate|mating/.test(value)) base = reproductivelyMature(animal) ? descriptor("mate-thought", "♥", "seeking a mate", "#ed4f7b", { courtship: true }) : descriptor("social-development", "≋", "social development", "#76dfd2", { group: true });
  else if (/evaluate.*prey/.test(value)) base = descriptor("evaluate-prey", "👁", "evaluating prey", "#8e43bd", { prey: true });
  else if (/stalk/.test(value)) base = descriptor("stalk-prey", "🐾", "stalking prey", "#8e43bd", { prey: true });
  else if (/chase|attack|hunt|prey/.test(value)) base = descriptor("live-prey", "➤", "hunting live prey", "#8e43bd", { prey: true });
  else if (/scavenge|carcass/.test(value)) base = descriptor("carcass", "🦴", "seeking carrion", "#8b6846", { carcass: true });
  else if (/hunger|graze|browse|food|feeding/.test(value)) base = carnivore ? descriptor("meat-food", "🦌", "seeking animal food", "#8e43bd", { prey: true, food: true }) : descriptor("plant-food", "🌿", "seeking plant food", "#2f6d3c", { food: true });
  else if (/abandon|reject caregiving/.test(value)) base = descriptor("family-rejection", "↛", "caregiver rejection", "#b23838", { family: true });
  else if (/offspring|parent|dependency|caregiver|safeguard/.test(value)) base = descriptor("family-care", "⌒", "family care", "#ad7924", { family: true });
  else if (/leave group|dispersal/.test(value)) base = descriptor("leave-group", "●→", "leaving a group", carnivore ? "#8e43bd" : "#ad7924", { group: true });
  else if (/group|social|herd|pack/.test(value)) base = descriptor(carnivore ? "pack" : "herd", "≋", carnivore ? "pair or pack" : "herd", carnivore ? "#8e43bd" : "#ad7924", { group: true });
  else if (/patrol|search/.test(value)) base = descriptor(carnivore ? "hunting-patrol" : "herd-vigilance", carnivore ? "⚑" : "👁", carnivore ? "hunting patrol" : "herd vigilance", carnivore ? "#8e43bd" : "#ad7924", { patrol: true });
  else if (/thirst|water|drink/.test(value)) base = descriptor("water", "💧", "seeking water", "#2675a8");
  else if (/fear|threat|flee|safety/.test(value)) base = descriptor("danger", "⚠", "seeking safety", "#e5484d", { threat: true });
  else if (/fatigue|rest|sleep|recover/.test(value)) base = descriptor("rest", "Zzz", "rest and recovery", "#52657c");
  else if (/shelter|climate|warm|cool/.test(value)) base = descriptor("shelter", "⌂", "seeking shelter", "#526b5a");
  else if (/explore|wander|orient/.test(value)) base = descriptor("explore", "✦", "exploring", "#38765f");
  else base = descriptor("other", "…", "other private priority", "#526b5a");
  return Object.freeze({ ...base, channel: "private-thought", species: speciesFor(animal), stage: stageFor(animal) });
}

const signalVerb = (symbol = {}) => ({
  warning: "WARNS",
  alert: "ALERTS",
  request: "REQUESTS",
  contact: "CALLS",
  report: "REPORTS",
  directive: "DIRECTS",
  reassurance: "REASSURES",
  courtship: "COURTS",
  state: "SIGNALS"
})[symbol.intent || symbol.contract?.intent] || "SIGNALS";
const readableSymbolLabel = (symbol = {}) => {
  const supplied = typeof symbol.label === "string" ? symbol.label.trim() : "";
  if (supplied) return supplied;
  const id = typeof symbol.id === "string" ? symbol.id.trim() : "";
  return id ? id.replace(/[-_]+/g, " ") : "ordinary action";
};
const actionVerb = (symbol) => ({ "plant-feeding": "EATS", browse: "EATS", stalk: "STALKS", chase: "CHASES", attack: "ATTACKS", "feed-carcass": "EATS", scavenge: "SCAVENGES", guard: "GUARDS", "guard-young": "GUARDS", defend: "DEFENDS", "defend-young": "DEFENDS", "protect-offspring": "PROTECTS", "hunting-patrol": "PATROLS", "herd-vigilance": "WATCHES" })[symbol?.id] || readableSymbolLabel(symbol).split(" ")[0].toUpperCase();

export function resolveSymbolPresentation({ animal = {}, channel = "private-thought", priority = "", kind = "", action = "", vocal = false, symbol = null } = {}) {
  const rawResolved = symbol || (channel === "private-thought" ? thoughtSymbol(animal, priority) : channel === "public-signal" ? emittedSymbol(animal, kind) : actionSymbol(animal, action));
  if (!rawResolved) return null;
  const resolved = rawResolved.label ? rawResolved : Object.freeze({ ...rawResolved, label: readableSymbolLabel(rawResolved) });
  const verb = channel === "private-thought" ? "IS" : channel === "public-signal" ? signalVerb(resolved) : actionVerb(resolved);
  const voice = channel === "public-signal" && Boolean(vocal && resolved.vocal);
  const explanation = channel === "private-thought" ? `${resolved.stage.label} ${resolved.species.label} is ${resolved.label}.` : channel === "public-signal" ? `${resolved.stage.label} ${resolved.species.label} ${voice ? "vocalising" : "displaying"} ${resolved.label}.` : `${resolved.stage.label} ${resolved.species.label} ${resolved.label}.`;
  return Object.freeze({ id: resolved.id, channel, frame: channel === "private-thought" ? "thought-cloud" : channel === "public-signal" ? "rounded-square" : "hexagon", subject: Object.freeze({ speciesId: resolved.species.id, speciesLabel: resolved.species.label, colour: resolved.species.colour, stageId: resolved.stage.id, stageLabel: resolved.stage.label }), grammar: Object.freeze({ verb, object: resolved.label.toUpperCase() }), meaning: Object.freeze({ glyph: resolved.glyph, label: resolved.label, colour: resolved.colour }), modifiers: Object.freeze({ vocal: voice, emergency: Boolean(resolved.emergency), family: Boolean(resolved.family), group: Boolean(resolved.group), separated: Boolean(resolved.separated), directed: Boolean(resolved.directed), report: Boolean(resolved.report), intent: resolved.intent || resolved.contract?.intent || "state" }), explanation, symbol: resolved, signature: `${channel}|${resolved.id}|${resolved.species.id}|${resolved.stage.id}|${verb}|${voice ? 1 : 0}|${resolved.hideSpecies ? 1 : 0}` });
}

export const PROHIBITED_HUMAN_SYMBOLS = Object.freeze(["🫶", "🗣", "👥", "👪", "👨", "👩", "👦", "👧", "🧑", "👶", "🖐", "✋"]);

export function presentationContainsHumanSymbol(presentation) {
  const text = JSON.stringify(presentation || {});
  return PROHIBITED_HUMAN_SYMBOLS.some((glyph) => text.includes(glyph));
}

export function dominantWorldCue({ signal = null, action = null, injured = false, attacked = false } = {}) {
  if (attacked) return "attack";
  if (signal?.emergency) return "signal";
  if (injured) return "injury";
  if (signal) return "signal";
  if (action) return "action";
  return "none";
}

export const BADGED_BEHAVIOURS = Object.freeze(new Set(["blocked", "listen", "graze", "browse", "evaluate-prey", "stalk", "chase", "attack", "feed-carcass", "scavenge", "track-scent", "guard", "defend", "protect-offspring", "search", "coordinate-group", "join-herd", "leave-group", "caregiver-dispute", "abandon-dependent", "social-attack", "collapse"]));

const LEGEND_SPECIES = Object.freeze(["grazer", "hunter"]);
const LEGEND_STAGES = Object.freeze(["dependent", "juvenile", "subadult", "adult", "old"]);
const LEGEND_SIGNALS = Object.freeze(Object.keys(PUBLIC_SIGNAL_CONTRACTS));
const LEGEND_THOUGHTS = Object.freeze(["seek mate", "evaluate prey", "stalk prey", "chase prey", "scavenge carcass", "hunger", "reject caregiving", "protect offspring", "leave group", "social group", "patrol", "thirst", "fear", "rest", "seek shelter", "explore"]);
const stageMark = (stage) => stage === "dependent" ? "◌◌" : stage === "juvenile" ? "◌" : stage === "subadult" ? "○" : stage === "old" ? "†" : "";

function legendAnimal(speciesId, lifeStage, extra = {}) {
  return { speciesId, lifeStage, offspringIds: ["example-dependent"], caregiverVisible: true, ...extra };
}

function legendSignalRecord(kind, extra = {}) {
  const shared = { kind, sourceId: "example-sender", x: 4, z: 7, urgency: 64 };
  const evidence = {
    "water-report": { sharesLocation: true },
    "food-report": { sharesLocation: true },
    "shelter-report": { sharesLocation: true },
    "route-blocked": { routeBlocked: true },
    "follow-me": { leaderId: "example-sender" },
    stop: { leaderId: "example-sender" },
    rally: { targetId: "example-target" },
    "all-clear": { clearedThreat: true, observedAtTick: 12 }
  }[kind] || {};
  return Object.freeze({ ...shared, ...evidence, ...extra });
}

function legendEntry(symbol, animal, category, meaning = symbol.label) {
  const silhouette = animal.speciesId === "hunter" ? "◆" : "●", age = stageMark(animal.lifeStage);
  const channel = category === "public signal" ? "public-signal" : category === "visible action" ? "activity" : "private-thought";
  const presentation = resolveSymbolPresentation({ animal, channel, symbol, vocal: Boolean(symbol.vocal) });
  return Object.freeze({ glyph: `${silhouette}${age} ${symbol.glyph}`.trim(), colour: symbol.colour, label: `${symbol.species.label} · ${symbol.stage.label} · ${category}: ${meaning}`, search: `${animal.speciesId} ${animal.lifeStage} ${symbol.id} ${category} ${meaning}`, presentation });
}

const publicSignalLegendAnimal = variant => {
  if (variant.id.startsWith("dependent-")) return legendAnimal("grazer", "dependent");
  if (variant.id === "juvenile-contact") return legendAnimal("grazer", "juvenile");
  if (["adult-pack-contact", "prey-report"].includes(variant.id)) return legendAnimal("hunter", "adult");
  return legendAnimal("grazer", "adult");
};

const publicSignalLegendEntry = variant => {
  const animal = publicSignalLegendAnimal(variant), base = SIGNALS[variant.id], contract = PUBLIC_SIGNAL_CONTRACTS[variant.contract], availability = PUBLIC_SIGNAL_AVAILABILITY[variant.source];
  const glyph = variant.id === "hunger" ? (animal.speciesId === "hunter" ? "🦌" : "🌿") : base.glyph;
  const symbol = Object.freeze({ ...base, glyph, channel: "public-signal", species: speciesFor(animal), stage: stageFor(animal), variant: variant.id, contract });
  const presentation = resolveSymbolPresentation({ animal, channel: "public-signal", symbol, vocal: Boolean(variant.vocal) });
  return Object.freeze({
    id: variant.id,
    glyph,
    colour: variant.colour,
    label: `${variant.label} — ${availability.label}. ${contract.description}`,
    search: `${variant.id} ${variant.label} ${variant.intent} ${variant.audience} ${variant.contract} ${availability.label}`.toLowerCase(),
    presentation,
    availability: variant.availability,
    source: variant.source,
    contractId: variant.contract
  });
};

export const PUBLIC_SIGNAL_LEGEND_SECTIONS = Object.freeze(Object.values(PUBLIC_SIGNAL_AVAILABILITY).map(availability => Object.freeze({
  id: availability.id,
  title: availability.label,
  description: availability.description,
  entries: Object.freeze(PUBLIC_SIGNAL_VARIANTS.filter(variant => variant.source === availability.id).map(publicSignalLegendEntry))
})));

export function completeSymbolLegendSections() {
  const signals = [], actions = [], thoughts = [];
  for (const speciesId of LEGEND_SPECIES) for (const lifeStage of LEGEND_STAGES) {
    for (const kind of LEGEND_SIGNALS) {
      const variants = kind === "care" && lifeStage === "dependent" ? [true, false] : [true];
      for (const caregiverVisible of variants) {
        const records = kind === "threat" ? [legendSignalRecord(kind), legendSignalRecord(kind, { targetId: "example-target" })] : [legendSignalRecord(kind)];
        for (const socialSignal of records) {
          const animal = legendAnimal(speciesId, lifeStage, { caregiverVisible, socialSignal });
          if (!signalAllowed(animal, kind, socialSignal)) continue;
          const symbol = emittedSymbol(animal, kind, socialSignal);
          signals.push(legendEntry(symbol, animal, "public signal", symbol.label));
        }
      }
    }
    for (const action of BADGED_BEHAVIOURS) {
      const animal = legendAnimal(speciesId, lifeStage, { offspringIds: [] }), symbol = actionSymbol(animal, action);
      if (symbol) actions.push(legendEntry(symbol, animal, "visible action", symbol.label));
      if (["guard", "defend"].includes(action) && ["adult", "old"].includes(lifeStage)) {
        const parent = legendAnimal(speciesId, lifeStage), parentSymbol = actionSymbol(parent, action);
        if (parentSymbol?.id !== symbol?.id) actions.push(legendEntry(parentSymbol, parent, "visible action", parentSymbol.label));
      }
    }
    for (const priority of LEGEND_THOUGHTS) {
      const animal = legendAnimal(speciesId, lifeStage);
      if (["evaluate prey", "stalk prey", "chase prey", "scavenge carcass"].includes(priority) && speciesId !== "hunter") continue;
      if (["seek mate", "reject caregiving", "protect offspring"].includes(priority) && !reproductivelyMature(animal)) continue;
      if (priority === "leave group" && lifeStage === "dependent") continue;
      const symbol = thoughtSymbol(animal, priority);
      thoughts.push(legendEntry(symbol, animal, "private thought", `${symbol.label} (“${priority}”)`));
    }
  }
  const composites = [];
  for (let mask = 0; mask < 16; mask += 1) {
    const attacked = Boolean(mask & 8), emergency = Boolean(mask & 4), injured = Boolean(mask & 2), action = Boolean(mask & 1);
    const shown = dominantWorldCue({ attacked, signal: emergency ? { emergency: true } : null, injured, action: action ? {} : null });
    const present = [attacked && "strike", emergency && "emergency call", injured && "injury", action && "action"].filter(Boolean).join(" + ") || "no cue";
    composites.push(Object.freeze({ glyph: shown === "attack" ? "✹" : shown === "signal" ? "!" : shown === "injury" ? "🩹" : shown === "action" ? "⬡" : "—", colour: shown === "attack" ? "#ff4854" : shown === "signal" ? "#ff8754" : shown === "injury" ? "#ff9a69" : "#d9eee0", label: `${present} → display ${shown}`, search: `composite emergency ${present} ${shown}` }));
  }
  return Object.freeze([
    Object.freeze({ title: `Every valid public signal combination (${signals.length})`, entries: Object.freeze(signals) }),
    Object.freeze({ title: `Every visible action combination (${actions.length})`, entries: Object.freeze(actions) }),
    Object.freeze({ title: `Every private thought combination (${thoughts.length})`, entries: Object.freeze(thoughts) }),
    Object.freeze({ title: "Emergency precedence combinations (16)", entries: Object.freeze(composites) })
  ]);
}

export const SYMBOL_KEY_SECTIONS = Object.freeze([
  Object.freeze({ title: "Identity", example: "identity", entries: Object.freeze([
    Object.freeze({ glyph: "●", colour: "#e6bc52", label: "Rounded gold animal — herbivore." }),
    Object.freeze({ glyph: "◆", colour: "#d96cff", label: "Pointed purple animal — carnivore." }),
    Object.freeze({ glyph: "B · J · YA · A · O", label: "Baby, juvenile, young adult, adult and old." }),
    Object.freeze({ glyph: "♀ / ♂", label: "Female or male." }),
    Object.freeze({ glyph: "P", colour: "#f3d990", label: "Pregnant; added to the permanent identity rail." })
  ]) }),
  Object.freeze({ title: "Internal and visible state", example: "state", entries: Object.freeze([
    Object.freeze({ glyph: "☁", label: "White or grey cloud — selected animal's private priority." }),
    Object.freeze({ glyph: "☁?", colour: "#72d8dc", label: "Dashed pale-cyan FORECAST cloud — a transient private, uncertain prediction; not verified truth or a public warning." }),
    Object.freeze({ glyph: "🙂", label: "Face — externally visible expression, not private thought." }),
    Object.freeze({ glyph: "💧", colour: "#5ab9ff", label: "Water need or thirst." }),
    Object.freeze({ glyph: "🌿", colour: "#a9d35b", label: "Plant food or grazing." }),
    Object.freeze({ glyph: "🦌", colour: "#c774ff", label: "Animal prey or carnivore hunger." }),
    Object.freeze({ glyph: "🐾", colour: "#53d9ff", label: "Footprints or scent tracking." }),
    Object.freeze({ glyph: "🩹", colour: "#ff8754", label: "Visible or communicated injury." }),
    ...physiologyLegendEntries()
  ]) }),
  Object.freeze({ title: "Communication", example: "communication", entries: Object.freeze([
    Object.freeze({ glyph: "▢", label: "Rounded square — public signal or outward display." }),
    Object.freeze({ glyph: "CALLS", colour: "#76dfd2", label: "A public vocal call is identified by the CALLS, WARNS or REQUESTS verb inside its rounded signal frame." }),
    Object.freeze({ glyph: "⚠", colour: "#ffcf4f", label: "Detected danger warning." }),
    Object.freeze({ glyph: "✹", colour: "#ff4854", label: "Physical strike just received." }),
    Object.freeze({ glyph: "!", colour: "#ff8754", label: "Urgent distress call." }),
    Object.freeze({ glyph: "🔗×", colour: "#fff0ad", label: "Separated from caregiver or familiar group." }),
    Object.freeze({ glyph: "⌒", colour: "#f3d990", label: "Adult animal sheltering a dependent; care request or response." })
  ]) }),
  Object.freeze({ title: "Actions", example: "actions", entries: Object.freeze([
    Object.freeze({ glyph: "⬡", label: "Hexagon — notable action; ordinary travel has no badge." }),
    Object.freeze({ glyph: "🌿", colour: "#a9d35b", label: "Grazing or browsing." }),
    Object.freeze({ glyph: "👁", colour: "#e6bc52", label: "Herbivore vigilance." }),
    Object.freeze({ glyph: "⚑", colour: "#c774ff", label: "Carnivore patrol or purposeful route." }),
    Object.freeze({ glyph: "🐾", colour: "#53d9ff", label: "Tracking scent or prey evidence." }),
    Object.freeze({ glyph: "🛡", colour: "#f2c55c", label: "Guarding, defending or protecting offspring." }),
    Object.freeze({ glyph: "🦴", colour: "#d1aa76", label: "Scavenging or carcass feeding." }),
    Object.freeze({ glyph: "♥", colour: "#ff72ab", label: "Courtship or mating only." })
  ]) }),
  Object.freeze({ title: "Emergency precedence", example: "emergency", entries: Object.freeze([
    Object.freeze({ glyph: "1 · ✹", colour: "#ff4854", label: "Current physical strike is shown first." }),
    Object.freeze({ glyph: "2 · ⚠ / !", colour: "#ff8754", label: "Emergency public signal is next." }),
    Object.freeze({ glyph: "3 · 🩹", colour: "#ff9a69", label: "Ongoing injury follows." }),
    Object.freeze({ glyph: "4 · ⬡", label: "Notable action appears only when no urgent cue replaces it." })
  ]) })
]);

export const RARE_SYMBOL_KEY_SECTIONS = Object.freeze([
  Object.freeze({ title: "Dependent and caregiver communication", entries: Object.freeze([SIGNALS["dependent-care"], SIGNALS["dependent-separated"], SIGNALS["family-care"]]) }),
  Object.freeze({ title: "Hunting sequence", entries: Object.freeze(["evaluate-prey", "stalk", "chase", "attack", "feed-carcass"].map((key) => actionBase(key, { speciesId: "hunter" }))) }),
  Object.freeze({ title: "Reproductive behaviour", entries: Object.freeze([SIGNALS.courtship, actionBase("courtship", { speciesId: "grazer" }), actionBase("mating", { speciesId: "grazer" })]) }),
  Object.freeze({ title: "Injury and emergencies", entries: Object.freeze([SIGNALS.threat, SIGNALS.attacked, SIGNALS.distress, SIGNALS.injury]) })
]);

export const LEGEND_COMPOSER_MEANINGS = Object.freeze([
  Object.freeze({ id: "threat", label: "danger warning", kind: "threat" }), Object.freeze({ id: "attacked", label: "physical strike", kind: "attacked" }),
  Object.freeze({ id: "distress", label: "distress", kind: "distress" }), Object.freeze({ id: "injury", label: "injury", kind: "injury" }),
  Object.freeze({ id: "water", label: "thirst", kind: "water" }), Object.freeze({ id: "hunger", label: "hunger", kind: "hunger" }),
  Object.freeze({ id: "contact", label: "social contact", kind: "contact" }), Object.freeze({ id: "separation", label: "separation call", kind: "lost" }),
  Object.freeze({ id: "care", label: "care request", kind: "care" }), Object.freeze({ id: "wait-up", label: "wait-up request", kind: "wait-up" }),
  Object.freeze({ id: "alarm", label: "urgent alarm", kind: "alarm" }), Object.freeze({ id: "water-report", label: "reported water direction", kind: "water-report" }),
  Object.freeze({ id: "food-report", label: "reported food direction", kind: "food-report" }), Object.freeze({ id: "shelter-report", label: "reported shelter direction", kind: "shelter-report" }),
  Object.freeze({ id: "route-blocked", label: "route-blocked warning", kind: "route-blocked" }), Object.freeze({ id: "follow-me", label: "follow-me direction", kind: "follow-me" }),
  Object.freeze({ id: "stop", label: "group stop direction", kind: "stop" }), Object.freeze({ id: "rally", label: "group rally call", kind: "rally" }),
  Object.freeze({ id: "all-clear", label: "all-clear signal", kind: "all-clear" }), Object.freeze({ id: "courtship", label: "courtship", kind: "courtship" })
]);

export function composeLegendExample({ speciesId = "grazer", lifeStage = "juvenile", meaning = "threat", vocal = true } = {}) {
  const choice = LEGEND_COMPOSER_MEANINGS.find((entry) => entry.id === meaning) || LEGEND_COMPOSER_MEANINGS[0];
  const socialSignal = legendSignalRecord(choice.kind), animal = legendAnimal(speciesId, lifeStage, { caregiverVisible: meaning !== "care", socialSignal });
  const allowed = signalAllowed(animal, choice.kind, socialSignal), symbol = emittedSymbol(animal, choice.kind, socialSignal);
  const stageCode = ({ dependent: "B", juvenile: "J", subadult: "YA", adult: "A", old: "O" })[lifeStage] || "?";
  const voice = vocal && symbol.vocal ? "vocalising" : "showing";
  const presentation = resolveSymbolPresentation({ animal, channel: "public-signal", symbol, vocal });
  return Object.freeze({ allowed, stageCode, species: speciesFor(animal), stage: stageFor(animal), symbol, presentation, vocal: Boolean(vocal && symbol.vocal), explanation: allowed ? `${stageFor(animal).label} ${speciesFor(animal).label} ${voice} ${symbol.label}.` : `${stageFor(animal).label} ${speciesFor(animal).label} cannot use ${choice.label}.` });
}
