const clean = value => String(value || "").toLowerCase().replaceAll("_", "-");
const distance = (left, right) => Math.hypot(Number(left?.x || 0) - Number(right?.x || 0), Number(left?.z || 0) - Number(right?.z || 0));
const unique = values => [...new Set(values.filter(Boolean))];

function predationCompletionEstimateMs(phase, separation, hunter, prey) {
  if (phase === "contact") return 8_000;
  // Editorial time is real viewing time, not simulation time. Even slow-search
  // phases progress through camera beats at a bounded minimum narrative rate.
  const closingSpeed = Math.max(.3, Number(hunter?.speed || 0) + Number(prey?.speed || 0) * .35);
  const travelMs = Math.max(0, Number(separation || 0) - 1.2) / closingSpeed * 1_000;
  const phaseAllowance = { pursuit: 10_000, approach: 18_000, evidence: 32_000, hunt: 35_000 }[phase] || 30_000;
  return Math.round(Math.min(180_000, travelMs + phaseAllowance));
}

function narrativeConclusionProfile(chain) {
  if (chain.kind === "predation") {
    const activePursuit = ["approach", "pursuit", "contact"].includes(chain.phase);
    return {
      eligible: true,
      activePursuit,
      // A committed stalk or pursuit is already the event. Its remaining
      // duration is diagnostic information, never an admission deadline.
      mustFollow: activePursuit,
      completionEstimateMs: predationCompletionEstimateMs(chain.phase, chain.distance, chain.hunter, chain.prey)
    };
  }
  if (chain.kind === "reproduction") return { eligible: ["courtship", "accepted", "rejected", "mating", "mating-complete", "birth"].includes(chain.phase), completionEstimateMs: chain.phase === "birth" ? 55_000 : 45_000 };
  if (chain.kind === "caregiving") return { eligible: ["nursing", "reunion", "protection"].includes(chain.phase), completionEstimateMs: 45_000 };
  if (chain.kind === "pregnancy") return { eligible: chain.phase === "labour", completionEstimateMs: 55_000 };
  return { eligible: false, completionEstimateMs: Infinity };
}

function predationPhase(entity) {
  const action = clean(`${entity.actionKey || ""} ${entity.predationPhase || ""}`);
  if (/attack|strike|grapple|kill|contact/.test(action)) return "contact";
  if (/chase|pursu|intercept|sprint/.test(action)) return "pursuit";
  if (/stalk|approach|corridor|block/.test(action)) return "approach";
  if (/track|trail|scent|search|locate/.test(action)) return "evidence";
  return "hunt";
}

function stageScene(chain, stage, subjectIds, title, detail, extra = {}) {
  const subjects = unique(subjectIds), byId = chain.byId, present = subjects.map(id => byId.get(id)).filter(Boolean);
  const focus = present.length ? { x: present.reduce((sum, item) => sum + item.x, 0) / present.length, z: present.reduce((sum, item) => sum + item.z, 0) / present.length } : { ...chain.focus };
  return {
    id: `interaction:${chain.chainId}:${stage}`,
    kind: "interaction-stage",
    interactionFirst: true,
    interactionKind: chain.kind,
    interactionPhase: chain.phase,
    chainId: chain.chainId,
    chainSignature: chain.signature,
    chainStage: stage,
    ids: subjects,
    semanticRoleIds: subjects,
    focus,
    actionKey: `${chain.phase} ${chain.kind} interaction ${stage}`,
    eventKey: `${chain.signature}:${stage}`,
    eventPriority: chain.priority,
    score: chain.score,
    activePursuit: Boolean(chain.activePursuit),
    mustFollow: Boolean(chain.mustFollow),
    heading: chain.heading ?? chain.hunter?.heading ?? chain.subject?.heading ?? 0,
    speed: Math.max(0, ...present.map(item => Number(item.speed) || 0)),
    title,
    detail,
    ...extra
  };
}

function predationScenes(chain) {
  const hunter = chain.hunter, prey = chain.prey, names = chain.names;
  const evidence = chain.evidenceChannel === "smell" ? "scent evidence" : chain.evidenceChannel === "sound" || chain.evidenceChannel === "hearing" ? "sound evidence" : chain.evidenceChannel === "sight" ? "visual contact" : "current prey evidence";
  const preyAwareness = chain.preyAware
    ? `${names.prey}'s outward behaviour or sensory record now contains evidence of ${names.hunter}.`
    : `The camera checks ${names.prey} for an outward response; absence of one does not prove the hunter is unknown.`;
  const progress = stageScene(chain, "hunter-progress", [hunter.id], `${names.hunter} follows the opportunity`, `${names.hunter} is in the ${chain.phase} phase. The current separation from ${names.prey} is about ${Math.round(chain.distance * 10) / 10} world units.`, { preferredBeat: "action" });
  const response = stageScene(chain, "prey-response", [prey.id], `Has ${names.prey} detected the danger?`, preyAwareness, { preferredBeat: "reaction" });
  const overview = stageScene(chain, "distance-overview", [hunter.id, prey.id, chain.joiner?.id], `The hunt in spatial context`, `${names.hunter} and ${names.prey} are about ${Math.round(chain.distance * 10) / 10} world units apart.${chain.joinerCommitted ? ` ${names.joiner} is also behaviourally committed to this hunt.` : ""}`, { preferredBeat: "establish" });
  const condition = stageScene(chain, "prey-condition", [prey.id], `${names.prey}'s escape capacity`, `A deliberate condition check shows the prey's current health, hydration, accessible energy, burst reserve and recovery burden.`, { preferredBeat: "detail", conditionSubject: "prey" });
  const opening = stageScene(chain, "evidence", [hunter.id], `${names.hunter} has ${evidence}`, `${names.hunter} has obtained ${evidence} linked to ${names.prey}. This begins a connected predation thread rather than an isolated animal profile.`, { preferredBeat: "perception" });

  // A hunt is one editorial story, not a checklist of every available lens.
  // Keep three complementary views and replace them as the phase advances.
  if (chain.phase === "evidence" || chain.phase === "hunt") return [opening, response, overview];
  if (chain.phase === "approach") return [progress, response, overview];
  if (chain.phase === "pursuit") return [overview, progress, condition];
  return [progress, overview, condition];
}

function reproductionPhase(entity) {
  const action = clean(`${entity.actionKey || ""} ${entity.reproductionStage || ""}`);
  if (/birth|labour|labor/.test(action)) return "birth";
  if (/mating-complete|after mating/.test(action)) return "mating-complete";
  if (/mating/.test(action)) return "mating";
  if (/accept/.test(action)) return "accepted";
  if (/reject/.test(action)) return "rejected";
  if (/court|mate/.test(action)) return "courtship";
  return null;
}

function reproductiveScenes(chain) {
  const first = chain.initiator, second = chain.partner, names = chain.names;
  const phaseText = chain.phase.replaceAll("-", " ");
  return [
    stageScene(chain, "partner-response", [second.id], `${names.second}'s part in the interaction`, chain.reciprocal ? `${names.second}'s current reproductive state also links back to ${names.first}.` : `Cinema can show ${names.second}'s observable state without claiming reciprocal acceptance until its own state records it.`, { preferredBeat: "reaction" }),
    stageScene(chain, "relationship-progress", [first.id, second.id], `${names.first} and ${names.second}: ${phaseText}`, `The same pair remains the subject as courtship, acceptance, rejection or mating changes. A phase change updates this thread instead of creating an unrelated animal profile.`, { preferredBeat: "action" }),
    stageScene(chain, "relationship-overview", [first.id, second.id], "The pair in social context", `${names.first} and ${names.second} are about ${Math.round(chain.distance * 10) / 10} world units apart. The wider view restores the spatial and social context of the interaction.`, { preferredBeat: "establish" })
  ];
}

function pregnancyScenes(chain) {
  const mother = chain.mother, names = chain.names, percent = Math.round(chain.progress * 100), count = chain.offspringCount;
  const development = count > 0 ? `${count} ${count === 1 ? "offspring is" : "offspring are"} recorded` : "offspring count remains unspecified";
  const contextIds = [mother.id, chain.nearbyFamily?.id];
  return [
    stageScene(chain, "maternal-state", [mother.id], `${names.mother}'s ${chain.phase}`, `Authoritative simulation state places ${names.mother} in ${chain.phase}; gestation is approximately ${percent}% complete and ${development}. This is documentary truth, not a public signal emitted by the animal.`, { preferredBeat: "detail" }),
    stageScene(chain, "maternal-condition", [mother.id], `The physical investment of pregnancy`, `A deliberate condition check relates ${names.mother}'s health, hydration, energy reserves and recovery burden to the current gestational phase.`, { preferredBeat: "detail" }),
    stageScene(chain, "pregnancy-context", contextIds, `Pregnancy within the group`, chain.nearbyFamily ? `${names.family} is nearby in the same social group. Proximity provides context but is not described as active support unless behaviour records caregiving.` : `${names.mother}'s immediate social context contains no nearby group member selected for this shot; Cinema does not invent support.`, { preferredBeat: "establish" })
  ];
}

function caregivingScenes(chain) {
  const mother = chain.mother, child = chain.child, names = chain.names;
  const exchange = chain.phase === "nursing"
    ? `${names.child} and ${names.mother} are linked by an active nursing action. Milk provision and dependent intake are shown as one relationship.`
    : chain.phase === "reunion"
      ? `${names.child} and ${names.mother} are separated by about ${Math.round(chain.distance * 10) / 10} world units, while a current action records calling, following or rejoining.`
      : chain.phase === "protection"
        ? `${names.mother}'s current action places protection or defence within this family relationship.`
        : `The authoritative mother–dependent link keeps this family together as a documentary subject; proximity alone is not used to manufacture caregiving.`;
  const dependent = stageScene(chain, "dependent-state", [child.id], `${names.child} within a dependent life`, `${names.child} is authoritatively recorded as ${names.mother}'s dependent. Cinema first establishes the young animal rather than opening with a table of its statistics.`, { preferredBeat: "reaction" });
  const response = stageScene(chain, "caregiver-response", [mother.id], `${names.mother}'s current response`, `${names.mother}'s observable action is ${mother.actionKey || "ordinary family activity"}. The documentary distinguishes that action from assumed private concern.`, { preferredBeat: "action" });
  const exchangeScene = stageScene(chain, "family-exchange", [mother.id, child.id], chain.phase === "nursing" ? "Nursing as a two-animal exchange" : `The family relationship in its ${chain.phase} phase`, exchange, { preferredBeat: "action" });
  const overview = stageScene(chain, "family-overview", [mother.id, ...chain.dependents.map(item => item.id)], `The wider dependent family`, `${names.mother} currently has ${chain.dependents.length} living ${chain.dependents.length === 1 ? "dependent" : "dependents"} in this thread. The wide view restores their spacing and immediate surroundings.`, { preferredBeat: "establish" });
  if (chain.phase === "nursing") return [exchangeScene, dependent, overview];
  if (chain.phase === "protection") return [response, exchangeScene, overview];
  return [dependent, exchangeScene, overview];
}

function buildReproductiveChains(alive, byId) {
  const chains = [], seen = new Set();
  for (const entity of alive) {
    const partnerId = entity.matingPartnerId || entity.courtshipPartnerId, partner = byId.get(partnerId);
    if (!partner || partner.id === entity.id) continue;
    const pair = [entity.id, partner.id].sort(), chainId = `reproduction:${pair.join(":")}`;
    if (seen.has(chainId)) continue;
    const ownPhase = reproductionPhase(entity), partnerPhase = reproductionPhase(partner), phase = ownPhase === "mating" || partnerPhase === "mating" ? "mating" : ownPhase === "accepted" || partnerPhase === "accepted" ? "accepted" : ownPhase === "rejected" || partnerPhase === "rejected" ? "rejected" : ownPhase || partnerPhase;
    if (!phase) continue;
    seen.add(chainId);
    const separation = distance(entity, partner), reciprocal = partner.matingPartnerId === entity.id || partner.courtshipPartnerId === entity.id || partner.actionTargetId === entity.id;
    const score = { mating: 116, accepted: 98, rejected: 90, courtship: 88, "mating-complete": 82, birth: 120 }[phase] || 82;
    const chain = { chainId, signature: `${chainId}:${phase}:${reciprocal ? "reciprocal" : "one-sided"}`, kind: "reproduction", phase, priority: Math.min(100, score), score, distance: separation, reciprocal, initiator: entity, partner, focus: { x: (entity.x + partner.x) / 2, z: (entity.z + partner.z) / 2 }, heading: entity.heading || 0, byId, names: { first: entity.label || entity.id, second: partner.label || partner.id } };
    chain.scenes = reproductiveScenes(chain); chains.push(chain);
  }
  return chains;
}

function buildPregnancyChains(alive, byId) {
  return alive.filter(entity => entity.pregnant).map(mother => {
    const progress = Math.max(0, Math.min(1, Number(mother.pregnancyProgress) || 0)), phase = mother.birthActive ? "labour" : progress >= .75 ? "late pregnancy" : progress >= .4 ? "mid pregnancy" : "early pregnancy";
    const nearbyFamily = alive.filter(entity => entity.id !== mother.id && entity.groupId && entity.groupId === mother.groupId && distance(entity, mother) <= 14).sort((left, right) => distance(left, mother) - distance(right, mother))[0] || null;
    const chainId = `pregnancy:${mother.id}`, score = mother.birthActive ? 122 : 62 + Math.round(progress * 24);
    const chain = { chainId, signature: `${chainId}:${phase}:${nearbyFamily?.id || "alone"}`, kind: "pregnancy", phase, priority: Math.min(100, score), score, progress, offspringCount: Math.max(0, Math.floor(Number(mother.pregnancyOffspringCount) || 0)), mother, nearbyFamily, subject: mother, focus: { x: mother.x, z: mother.z }, heading: mother.heading || 0, byId, names: { mother: mother.label || mother.id, family: nearbyFamily?.label || nearbyFamily?.id || "a group member" } };
    chain.scenes = pregnancyScenes(chain); return chain;
  });
}

function buildCaregivingChains(alive, byId) {
  const mothers = new Map();
  for (const child of alive) if (child.motherId && child.lifeStage === "dependent" && byId.has(child.motherId)) {
    const row = mothers.get(child.motherId) || [];
    row.push(child); mothers.set(child.motherId, row);
  }
  const chains = [];
  for (const [motherId, dependents] of mothers) {
    const mother = byId.get(motherId), action = clean(`${mother.actionKey || ""} ${dependents.map(item => item.actionKey || "").join(" ")}`);
    const nursingChild = dependents.find(child => /nurs|suckle/.test(clean(child.actionKey)) && child.actionTargetId === mother.id) || (/allow-nursing/.test(action) ? dependents.find(child => mother.actionTargetId === child.id) : null);
    const reunionChild = dependents.filter(child => /call|follow|rejoin|wait-up|separat/.test(clean(child.actionKey)) || /call|follow|rejoin|wait-up|separat/.test(clean(mother.actionKey))).sort((left, right) => distance(right, mother) - distance(left, mother))[0];
    const child = nursingChild || reunionChild || [...dependents].sort((left, right) => distance(left, mother) - distance(right, mother))[0];
    const phase = nursingChild ? "nursing" : reunionChild ? "reunion" : /guard|defend|protect/.test(action) ? "protection" : "care";
    const separation = distance(mother, child), chainId = `care:${mother.id}`, score = { nursing: 104, reunion: 102, protection: 108, care: 72 }[phase];
    const chain = { chainId, signature: `${chainId}:${phase}:${dependents.map(item => item.id).sort().join("|")}`, kind: "caregiving", phase, priority: Math.min(100, score), score, distance: separation, mother, child, dependents, focus: { x: (mother.x + child.x) / 2, z: (mother.z + child.z) / 2 }, heading: mother.heading || 0, byId, names: { mother: mother.label || mother.id, child: child.label || child.id } };
    chain.scenes = caregivingScenes(chain); chains.push(chain);
  }
  return chains;
}

/**
 * Builds bounded, evidence-linked editorial threads from presentation snapshots.
 * Input rows are deliberately plain data so documentary planning cannot mutate
 * simulation entities or animal-owned cognition.
 */
export function buildCinemaInteractionChains(entities = [], { maximumJoinDistance = 14 } = {}) {
  const alive = entities.filter(entity => entity?.alive !== false && entity?.id), byId = new Map(alive.map(entity => [entity.id, entity])), chains = [];
  for (const hunter of alive) {
    if (!hunter.canHunt) continue;
    const preyId = hunter.targetId || hunter.evidenceTargetId;
    const prey = byId.get(preyId);
    if (!prey || prey.id === hunter.id || prey.canHunt && !hunter.allowsHunterPrey) continue;
    const phase = predationPhase(hunter), separation = distance(hunter, prey), evidenceChannel = hunter.evidenceChannel || (phase === "evidence" ? "smell" : "unknown");
    const possibleJoiners = alive.filter(entity => entity.id !== hunter.id && entity.canHunt && distance(entity, prey) <= maximumJoinDistance).sort((left, right) => {
      const leftCommitted = Number(left.targetId === prey.id || left.evidenceTargetId === prey.id), rightCommitted = Number(right.targetId === prey.id || right.evidenceTargetId === prey.id);
      return rightCommitted - leftCommitted || distance(left, prey) - distance(right, prey) || String(left.id).localeCompare(String(right.id));
    });
    const joiner = possibleJoiners[0] || null, joinerCommitted = Boolean(joiner && (joiner.targetId === prey.id || joiner.evidenceTargetId === prey.id));
    const preyAware = Boolean(prey.awareOfIds?.includes(hunter.id) || /flee|escape|alarm|defend|threat/.test(clean(prey.actionKey)));
    const phaseWeight = { evidence: 7, approach: 8, pursuit: 10, contact: 12, hunt: 6 }[phase] || 6, priority = Math.min(100, 58 + phaseWeight * 3 + (preyAware ? 5 : 0) + (joinerCommitted ? 4 : 0)), chainId = `predation:${hunter.id}:${prey.id}`;
    const chain = {
      chainId,
      signature: `${chainId}:${phase}:${preyAware ? "aware" : "uncertain"}:${joinerCommitted ? joiner.id : "solo"}`,
      kind: "predation",
      phase,
      priority,
      score: 80 + phaseWeight * 5 - Math.min(25, separation),
      distance: separation,
      evidenceChannel,
      preyAware,
      joiner,
      joinerCommitted,
      hunter,
      prey,
      focus: { x: (hunter.x + prey.x) / 2, z: (hunter.z + prey.z) / 2 },
      byId,
      names: { hunter: hunter.label || hunter.id, prey: prey.label || prey.id, joiner: joiner?.label || joiner?.id || "another hunter" }
    };
    Object.assign(chain, narrativeConclusionProfile(chain));
    chain.scenes = predationScenes(chain);
    chains.push(chain);
  }
  chains.push(...buildReproductiveChains(alive, byId), ...buildPregnancyChains(alive, byId), ...buildCaregivingChains(alive, byId));
  for (const chain of chains) if (chain.completionEstimateMs == null) Object.assign(chain, narrativeConclusionProfile(chain));
  return chains.sort((left, right) => Number(right.mustFollow) - Number(left.mustFollow) || right.score - left.score || left.chainId.localeCompare(right.chainId));
}

/** Returns one live beat and a serialisable continuation state. */
export function chooseCinemaInteractionBeat(chains = [], state = {}, sequence = 0, { nowMs = 0, kind = null } = {}) {
  const completed = { ...(state.completed || {}) };
  for (const [signature, at] of Object.entries(completed)) if (sequence - at > 10) delete completed[signature];
  let chain = chains.find(item => item.chainId === state.chainId), cursor = Math.max(0, Number(state.cursor) || 0);
  if (!chain && state.chainId && !state.resolutionShown) {
    const ids = unique(state.ids || []), kind = state.kind || "interaction";
    const scene = { id: `interaction:${state.chainId}:resolution`, kind: "interaction-stage", interactionFirst: true, interactionKind: kind, interactionPhase: "resolved", chainId: state.chainId, chainSignature: state.signature, chainStage: "resolution", ids, semanticRoleIds: ids, focus: state.focus || { x: 0, z: 0 }, actionKey: `${kind} interaction resolution`, eventKey: `${state.signature}:resolution`, eventPriority: 100, score: 130, heading: state.heading || 0, speed: 0, title: `The ${kind} thread reaches an outcome`, detail: "The participants no longer sustain the interaction recorded in the preceding shots. Cinema closes the thread without inventing which private belief caused the outcome.", preferredBeat: "outcome" };
    completed[state.signature] = sequence;
    return { scene, state: { chainId: null, signature: null, kind: null, phase: null, cursor: 0, completed, resolutionShown: true } };
  }
  if (chain && chain.signature !== state.signature) {
    // Awareness, distance and pursuit phase can change while the camera is
    // following the same participants. Continue after the last narrated beat
    // instead of treating that development as an unrelated new story.
    const urgentPredationStage = chain.kind === "predation" && chain.phase !== state.phase && ["approach", "pursuit", "contact"].includes(chain.phase) ? "hunter-progress" : null;
    const urgentIndex = urgentPredationStage ? chain.scenes.findIndex(scene => scene.chainStage === urgentPredationStage) : -1;
    const previousStage = chain.scenes.findIndex(scene => scene.chainStage === state.stage);
    cursor = urgentIndex >= 0 ? urgentIndex : previousStage >= 0 ? previousStage + 1 : Math.min(cursor, chain.scenes.length);
  }
  if (!chain || cursor >= chain.scenes.length) {
    if (chain && cursor >= chain.scenes.length) completed[chain.signature] = sequence;
    chain = chains.find(item => item.eligible && (!kind || item.kind === kind) && sequence - Number(completed[item.signature] ?? -Infinity) > 10) || null;
    cursor = 0;
  }
  if (!chain) return { scene: null, state: { chainId: null, signature: null, kind: null, phase: null, cursor: 0, completed } };
  const scene = chain.scenes[cursor], nextCursor = cursor + 1;
  return { scene, state: { chainId: chain.chainId, signature: chain.signature, kind: chain.kind, phase: chain.phase, cursor: nextCursor, completed, stage: scene.chainStage, length: chain.scenes.length, startedAtMs: state.chainId === chain.chainId ? state.startedAtMs : nowMs, completionEstimateMs: chain.completionEstimateMs, ids: unique(chain.scenes.flatMap(item => item.ids || [])), focus: { ...chain.focus }, heading: chain.heading || 0, resolutionShown: false } };
}

export function cinemaInteractionLens(stage) {
  const common = { expressions: true, calls: true, actions: true, identity: true };
  if (stage === "evidence") return { ...common, vision: true, sound: true, smell: true, scent: true, memory: true, decisions: true };
  if (stage === "prey-response") return { ...common, vision: true, sound: true };
  if (stage === "hunter-progress" || stage === "nearby-participant") return { ...common, vision: true, smell: true, actions: true };
  if (stage === "distance-overview") return common;
  if (stage === "prey-condition" || stage === "hunter-condition") return { ...common, physiology: true, decisions: true };
  if (stage === "relationship-open" || stage === "partner-response" || stage === "relationship-progress") return { ...common, thoughts: true, decisions: true };
  if (stage === "relationship-overview") return common;
  if (stage === "reproductive-condition" || stage === "maternal-condition" || stage === "dependent-condition" || stage === "caregiver-condition") return { ...common, physiology: true, decisions: true };
  if (stage === "maternal-state" || stage === "reproductive-outlook") return { ...common, thoughts: true, decisions: true };
  if (stage === "pregnancy-context" || stage === "family-overview") return common;
  if (stage === "dependent-state" || stage === "caregiver-response" || stage === "family-exchange") return { ...common, thoughts: true, decisions: true };
  return common;
}
