const freeze = (value) => Object.freeze(value);
const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, Number(value) || 0));

export const ONTOLOGY_SCHEMA = 1;
export const CONTEXT_DIMENSIONS = freeze(["being", "having", "doing", "interacting"]);
export const SATISFIER_CLASSES = freeze(["synergistic", "singular", "inhibiting", "pseudo", "destructive"]);

const method = (id, label, phases, prerequisites = [], extra = {}) => freeze({ id, label, phases: freeze(phases), prerequisites: freeze(prerequisites), ...extra });
const satisfier = (id, label, supports, impairs, methods, extra = {}) => freeze({ id, label, supports: freeze(supports), impairs: freeze(impairs), methods: freeze(methods), ...extra });
const need = (id, label, category, criticality, satisfiers, extra = {}) => freeze({ id, label, category, criticality, satisfiers: freeze(satisfiers), ...extra });

export const BEHAVIOUR_ONTOLOGY = freeze({
  schema: ONTOLOGY_SCHEMA,
  needs: freeze([
    need("hydration", "Maintain hydration", "survival", 1, ["surface-water", "social-water-travel", "forage-moisture"]),
    need("nutrition", "Maintain nutrition", "survival", .96, ["graze-browse", "scavenge", "hunt-prey", "nursing"]),
    need("safety", "Maintain physical safety", "survival", 1, ["threat-monitoring", "escape", "social-protection", "defence", "emergency-release"]),
    need("thermal", "Maintain thermal safety", "survival", .88, ["thermal-shelter", "surface-water", "reduce-exertion"]),
    need("care", "Maintain care and dependency", "social", .82, ["nursing", "caregiver-contact", "guard-dependent", "social-protection"]),
    need("affiliation", "Maintain affiliation", "social", .56, ["join-group", "social-water-travel", "caregiver-contact"]),
    need("participation", "Participate in collective purpose", "social", .45, ["follow-group-protocol", "share-signal", "social-protection"]),
    need("autonomy", "Preserve behavioural autonomy", "social", .42, ["leave-unsafe-group", "independent-travel"]),
    need("reproduction", "Pursue viable reproduction", "life-history", .34, ["courtship", "pregnancy-support", "guard-dependent"]),
    need("information", "Maintain usable environmental knowledge", "cognitive", .4, ["threat-monitoring", "local-exploration", "share-signal"]),
  ]),
  satisfiers: freeze([
    satisfier("surface-water", "Use accessible surface water", ["hydration", "thermal"], ["safety"], [
      method("drink-confirmed-shoreline", "Drink at confirmed shoreline", ["recover", "locate", "travel", "contact", "acquire"], ["locomotion-capacity", "water-evidence", "reachable-route", "shoreline-contact", "facing-and-stillness"]),
    ]),
    satisfier("social-water-travel", "Travel to water with trusted companions", ["hydration", "safety", "affiliation", "information"], ["autonomy"], [method("follow-water-knowledge", "Follow socially supplied water knowledge", ["coordinate", "travel", "contact", "acquire"], ["trusted-source", "reachable-route"])], { defaultClass: "synergistic" }),
    satisfier("forage-moisture", "Obtain moisture from forage", ["hydration", "nutrition"], [], [method("eat-moist-forage", "Eat moisture-rich forage", ["locate", "travel", "acquire"], ["forage-evidence", "safe-ingestion"])], { defaultClass: "synergistic" }),
    satisfier("graze-browse", "Graze or browse vegetation", ["nutrition"], [], [method("graze-local", "Graze local vegetation", ["locate", "travel", "acquire"], ["reachable-vegetation", "safe-ingestion"])]),
    satisfier("scavenge", "Feed from carrion", ["nutrition", "hydration"], ["safety"], [method("feed-carcass", "Feed from known carcass", ["locate", "travel", "contact", "acquire"], ["carcass-evidence", "feeding-capacity"])]),
    satisfier("hunt-prey", "Hunt prey", ["nutrition"], ["hydration", "safety", "care"], [method("hunt-evidenced-prey", "Hunt evidenced prey", ["evaluate", "stalk", "chase", "strike", "feed", "recover"], ["adequate-hydration", "hunting-endurance", "prey-evidence", "acceptable-injury-risk"])]),
    satisfier("threat-monitoring", "Monitor and interpret threat", ["safety", "information"], ["nutrition"], [method("vigilance", "Focused vigilance", ["orient", "assess"], ["threat-evidence"])]),
    satisfier("escape", "Escape detected danger", ["safety"], ["nutrition", "affiliation"], [method("ordinary-escape", "Flee by viable route", ["orient", "travel", "recover"], ["escape-route", "locomotion-capacity"])]),
    satisfier("emergency-release", "Release emergency reserve", ["safety"], ["health", "recovery"], [
      method("straight-escape-burst", "Straight escape burst", ["release", "burst", "recover"], ["reserve-available", "survival-benefit"]),
      method("burst-to-group", "Burst toward protective group", ["release", "burst", "join", "recover"], ["reserve-available", "ally-evidence"]),
      method("lateral-evasion", "Lateral evasion burst", ["release", "evade", "recover"], ["reserve-available", "close-contact-forecast"]),
      method("offspring-defence-burst", "Offspring defence burst", ["release", "intercept", "defend", "recover"], ["reserve-available", "dependent-threat"]),
      method("last-reserve-water-dash", "Last-reserve water dash", ["release", "travel", "contact", "acquire", "recover"], ["reserve-available", "predicted-dehydration-failure"]),
    ]),
    satisfier("social-protection", "Seek protection from trusted animals", ["safety", "affiliation", "care"], ["autonomy"], [method("reach-allies", "Reach trusted allies", ["signal", "travel", "join"], ["trusted-social-evidence", "reachable-allies"])]),
    satisfier("defence", "Defend self or another", ["safety", "care"], ["health"], [method("physical-defence", "Physical defence", ["orient", "warn", "strike", "recover"], ["physical-capability", "acceptable-risk"])]),
    satisfier("thermal-shelter", "Seek thermal shelter", ["thermal", "safety"], [], [method("seek-thermal-terrain", "Travel to suitable thermal terrain", ["locate", "travel", "rest"], ["thermal-evidence", "safe-route"])]),
    satisfier("reduce-exertion", "Reduce exertion", ["thermal", "recovery"], ["nutrition"], [method("rest-safe", "Rest in a safe place", ["locate", "rest"], ["safe-resting-place"])]),
    satisfier("nursing", "Nurse from mother", ["nutrition", "hydration", "care", "affiliation"], ["maternal-energy", "maternal-hydration", "safety"], [method("breastfeed", "Breastfeed in physical contact", ["call", "approach", "position", "feed", "recover"], ["lactating-mother", "ventral-contact", "safe-nursing-window"])], { defaultClass: "synergistic" }),
    satisfier("caregiver-contact", "Maintain caregiver contact", ["care", "affiliation", "safety"], ["autonomy"], [method("seek-caregiver", "Call and approach caregiver", ["call", "locate", "travel", "join"], ["caregiver-memory"])]),
    satisfier("guard-dependent", "Guard a dependent or vulnerable member", ["care", "safety", "reproduction"], ["nutrition", "autonomy"], [method("guard-close", "Remain close and vigilant", ["approach", "guard", "respond"], ["care-relationship"])]),
    satisfier("join-group", "Join a compatible group", ["affiliation", "safety", "information"], ["autonomy", "nutrition"], [method("join-compatible-group", "Approach and join compatible group", ["evaluate", "signal", "travel", "join"], ["compatible-group", "social-acceptance"])]),
    satisfier("follow-group-protocol", "Follow a group protocol", ["participation", "affiliation", "information"], ["autonomy"], [method("coordinate-group-goal", "Coordinate with group goal", ["receive", "evaluate", "coordinate"], ["group-membership", "known-protocol"])]),
    satisfier("share-signal", "Share evidence socially", ["information", "participation", "affiliation"], [], [method("emit-signal", "Emit a public signal", ["select-message", "call", "observe-response"], ["communicable-evidence"])]),
    satisfier("leave-unsafe-group", "Leave an unsafe or unsuitable group", ["autonomy", "safety"], ["affiliation"], [method("voluntary-departure", "Commit to group departure", ["evaluate", "signal", "depart", "cooldown"], ["departure-pressure"])]),
    satisfier("independent-travel", "Travel independently", ["autonomy"], ["safety", "affiliation"], [method("independent-route", "Choose an independent route", ["locate", "travel"], ["route-evidence"])]),
    satisfier("courtship", "Court a compatible mate", ["reproduction", "affiliation"], ["nutrition", "safety"], [method("court-compatible-mate", "Courtship sequence", ["signal", "court", "accept", "mate", "resolve"], ["maturity", "fertility", "mate-evidence"])]),
    satisfier("pregnancy-support", "Build pregnancy support", ["reproduction", "care", "safety", "affiliation"], ["autonomy"], [method("build-support-network", "Build trusted pregnancy support network", ["identify", "signal", "affiliate", "maintain"], ["pregnancy", "social-evidence"])], { defaultClass: "synergistic" }),
    satisfier("local-exploration", "Explore locally", ["information", "autonomy"], ["safety", "hydration", "nutrition"], [method("bounded-exploration", "Explore reachable nearby terrain", ["select-area", "travel", "observe", "remember"], ["locomotion-capacity"])]),
  ]),
});

const byId = (rows) => freeze(Object.fromEntries(rows.map((row) => [row.id, row])));
export const NEED_DEFINITIONS = byId(BEHAVIOUR_ONTOLOGY.needs);
export const SATISFIER_DEFINITIONS = byId(BEHAVIOUR_ONTOLOGY.satisfiers);
export const METHOD_DEFINITIONS = byId(BEHAVIOUR_ONTOLOGY.satisfiers.flatMap((entry) => entry.methods.map((item) => freeze({ ...item, satisfierId: entry.id }))));

export function ontologyNeedId(value) {
  const text = String(value || "").toLowerCase();
  if (/water|drink|hydrat/.test(text)) return "hydration";
  if (/food|hunger|graze|forage|hunt|scavenge|carcass|prey|nurs/.test(text)) return "nutrition";
  if (/flee|danger|safety|escape|defend|guard|threat/.test(text)) return "safety";
  if (/heat|cold|thermal|shade|warm|cool/.test(text)) return "thermal";
  if (/offspring|caregiver|dependency|care|baby/.test(text)) return "care";
  if (/mate|court|reproduc|pregnan/.test(text)) return "reproduction";
  if (/group|social|affiliate|herd|pack/.test(text)) return "affiliation";
  if (/explore|learn|information|memory|observe/.test(text)) return "information";
  return NEED_DEFINITIONS[text] ? text : "information";
}

export function classifySatisfierEffects(effects = {}) {
  const positives = Object.values(effects).filter((value) => value > .05), negatives = Object.values(effects).filter((value) => value < -.05);
  if (!positives.length) return "pseudo";
  if (negatives.some((value) => value <= -.65)) return "destructive";
  if (negatives.length) return "inhibiting";
  if (positives.length > 1) return "synergistic";
  return "singular";
}

export function ontologyIntegrity(registry = BEHAVIOUR_ONTOLOGY) {
  const errors = [], needIds = new Set(registry.needs.map((row) => row.id)), satisfierIds = new Set(registry.satisfiers.map((row) => row.id));
  for (const entry of registry.needs) for (const id of entry.satisfiers) if (!satisfierIds.has(id)) errors.push(`need ${entry.id} references missing satisfier ${id}`);
  for (const entry of registry.satisfiers) {
    for (const id of [...entry.supports, ...entry.impairs]) if (!needIds.has(id) && !["health", "recovery", "maternal-energy", "maternal-hydration"].includes(id)) errors.push(`satisfier ${entry.id} references missing need ${id}`);
    if (!entry.methods.length) errors.push(`satisfier ${entry.id} has no methods`);
    for (const item of entry.methods) if (!item.phases.length) errors.push(`method ${item.id} has no phases`);
  }
  return freeze({ valid: errors.length === 0, errors: freeze(errors), needCount: registry.needs.length, satisfierCount: registry.satisfiers.length, methodCount: registry.satisfiers.reduce((sum, row) => sum + row.methods.length, 0) });
}

export function needStateSnapshot(animal = {}, context = {}) {
  const amount = (value, fallback = 100) => clamp((Number(value ?? fallback)) / 100);
  const threat = clamp(Math.max((animal.fear || 0) / 100, context.threatRisk || 0));
  const thermal = clamp(Math.abs(Number(animal.tempStress || 0)) / 100);
  const dependency = animal.lifeStage === "dependent" ? clamp(context.dependencyPressure ?? .7) : clamp(context.dependentRisk || Number(Boolean(animal.pregnant)) * .35);
  const states = {
    hydration: { amount: amount(animal.hydration), urgency: 1 - amount(animal.hydration), trend: Number(context.hydrationTrend || 0), timeToFailure: context.waterFailureHours ?? Infinity },
    nutrition: { amount: Math.min(amount(animal.stomach), amount(animal.energy)), urgency: Math.max(1 - amount(animal.stomach), 1 - amount(animal.energy)), trend: Number(context.nutritionTrend || 0), timeToFailure: context.foodFailureHours ?? Infinity },
    safety: { amount: 1 - threat, urgency: threat, trend: Number(context.threatTrend || 0), timeToFailure: context.contactEta ?? Infinity },
    thermal: { amount: 1 - thermal, urgency: thermal, trend: Number(context.thermalTrend || 0), timeToFailure: context.thermalFailureHours ?? Infinity },
    care: { amount: 1 - dependency, urgency: dependency, trend: 0, timeToFailure: Infinity },
    affiliation: { amount: clamp(context.affiliation ?? Number(Boolean(animal.groupId)) * .75), urgency: clamp(1 - (context.affiliation ?? Number(Boolean(animal.groupId)) * .75)), trend: 0, timeToFailure: Infinity },
    participation: { amount: clamp(context.participation ?? Number(Boolean(animal.groupId)) * .65), urgency: clamp(1 - (context.participation ?? Number(Boolean(animal.groupId)) * .65)) * .4, trend: 0, timeToFailure: Infinity },
    autonomy: { amount: clamp(context.autonomy ?? (animal.groupId ? .55 : .9)), urgency: clamp(1 - (context.autonomy ?? (animal.groupId ? .55 : .9))) * .35, trend: 0, timeToFailure: Infinity },
    reproduction: { amount: clamp(context.reproductiveCondition ?? (animal.pregnant ? .85 : .5)), urgency: clamp(context.reproductivePressure || 0), trend: 0, timeToFailure: Infinity },
    information: { amount: clamp(context.informationConfidence ?? .5), urgency: clamp(1 - (context.informationConfidence ?? .5)) * .45, trend: 0, timeToFailure: Infinity },
  };
  return freeze(Object.fromEntries(Object.entries(states).map(([id, state]) => [id, freeze({ needId: id, ...state, importance: NEED_DEFINITIONS[id]?.criticality || .5, pressure: clamp(state.urgency * (NEED_DEFINITIONS[id]?.criticality || .5)), confidence: clamp(context[`${id}Confidence`] ?? .7) })])));
}

export function contextSnapshot(animal = {}, context = {}) {
  return freeze({
    being: freeze({ species: animal.speciesId, sex: animal.sex, lifeStage: animal.lifeStage, pregnant: Boolean(animal.pregnant), health: animal.health, aggression: animal.aggression, careAffinity: animal.careAffinity, decisiveness: animal.commitmentProfile?.decisiveness, flexibility: animal.commitmentProfile?.flexibility }),
    having: freeze({ hydration: animal.hydration, stomach: animal.stomach, energy: animal.energy, endurance: 100 - Number(animal.fatigue || 0), sprintReserve: animal.sprintEnergy, emergencyReserve: animal.emergencyReserve, groupId: animal.groupId || null, leaderId: animal.groupLeaderId || null, knownProtocols: Object.keys(animal.learnedProtocols || {}).length }),
    doing: freeze({ action: animal.actionState?.key || animal.currentAction || "unknown", priority: animal.commitmentState?.priority || animal.drive || null, planPhase: animal.activePlan?.phase || animal.needDependencyPlan?.phase || null }),
    interacting: freeze({ weather: context.weather, terrain: context.terrain, threatId: context.threatId || animal.threatAssessment?.threatId || null, threatRisk: context.threatRisk || 0, groupGoal: animal.groupGoal || null, congestion: context.congestion || 0, socialOpposition: context.leaderOpposition || 0 }),
  });
}

