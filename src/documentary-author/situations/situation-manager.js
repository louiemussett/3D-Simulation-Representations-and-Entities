import { deepFreeze, stableHash } from "../runtime/immutable.js";

export const SITUATION_TYPES = Object.freeze([
  "RESOURCE_ACQUISITION", "RECOVERY", "DANGER_RESPONSE", "PREDATION_SEQUENCE", "SOCIAL_INTERACTION", "REPRODUCTION_STAGE",
  "GROUP_MOVEMENT", "DEATH_CONSEQUENCE", "ENVIRONMENTAL_PROCESS", "LIFECYCLE_TRANSITION", "UNRESOLVED_QUESTION", "CHARACTER_BIOGRAPHY"
]);

const TERMINAL_PHASES = new Set(["complete", "completed", "satisfied", "resolved", "abandoned", "failed", "release"]);
const OUTCOME_PHASES = new Set(["contact", "acquire", "outcome", "reaction", "birth", "death", "escape", "capture", "feed", "resume"]);
const ACTION_TYPES = new Map([
  ["rest", "RECOVERY"], ["recover", "RECOVERY"], ["sleep", "RECOVERY"], ["digest", "RECOVERY"],
  ["flee", "DANGER_RESPONSE"], ["defend", "DANGER_RESPONSE"], ["threat", "DANGER_RESPONSE"],
  ["hunt", "PREDATION_SEQUENCE"], ["stalk", "PREDATION_SEQUENCE"], ["chase", "PREDATION_SEQUENCE"], ["attack", "PREDATION_SEQUENCE"],
  ["court", "REPRODUCTION_STAGE"], ["mate", "REPRODUCTION_STAGE"], ["mating", "REPRODUCTION_STAGE"], ["nurse", "REPRODUCTION_STAGE"], ["birth", "REPRODUCTION_STAGE"],
  ["care", "SOCIAL_INTERACTION"], ["signal", "SOCIAL_INTERACTION"], ["call", "SOCIAL_INTERACTION"], ["join", "SOCIAL_INTERACTION"], ["leave", "SOCIAL_INTERACTION"],
  ["migrate", "GROUP_MOVEMENT"], ["regroup", "GROUP_MOVEMENT"], ["follow", "GROUP_MOVEMENT"],
  ["drink", "RESOURCE_ACQUISITION"], ["graze", "RESOURCE_ACQUISITION"], ["browse", "RESOURCE_ACQUISITION"], ["forage", "RESOURCE_ACQUISITION"], ["feed", "RESOURCE_ACQUISITION"], ["travel", "RESOURCE_ACQUISITION"], ["search", "RESOURCE_ACQUISITION"]
]);

const EVENT_TYPES = Object.freeze({ DEATH: "DEATH_CONSEQUENCE", BIRTH: "LIFECYCLE_TRANSITION", MATURATION: "LIFECYCLE_TRANSITION", CONCEPTION: "REPRODUCTION_STAGE", MATING: "REPRODUCTION_STAGE", ATTACK: "PREDATION_SEQUENCE" });
const BELIEF_SET = Symbol("situationBeliefIds");
const idText = value => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/).filter(Boolean);

function typeFromPlan(entity) {
  const plan = entity?.plan || {}, tokens = new Set([...idText(plan.needId), ...idText(plan.satisfierId), ...idText(plan.methodId)]);
  if (["recover", "recovery", "rest"].some(token => tokens.has(token))) return "RECOVERY";
  if (["danger", "escape", "safety", "flee"].some(token => tokens.has(token))) return "DANGER_RESPONSE";
  if (["hunt", "predation", "prey", "carcass"].some(token => tokens.has(token))) return "PREDATION_SEQUENCE";
  if (["mate", "courtship", "reproduction", "pregnancy", "offspring"].some(token => tokens.has(token))) return "REPRODUCTION_STAGE";
  if (["social", "care", "group", "friendship", "dominance"].some(token => tokens.has(token))) return "SOCIAL_INTERACTION";
  if (plan.methodId || plan.satisfierId || plan.needId) return "RESOURCE_ACQUISITION";
  return ACTION_TYPES.get(String(entity?.action?.key || "").toLowerCase()) || "CHARACTER_BIOGRAPHY";
}

function participantRoles(entity, snapshot) {
  const targetId = entity?.plan?.targetId || entity?.action?.targetId || null;
  const target = targetId && (snapshot.entities.has(targetId) || snapshot.entityByIdentityId?.has?.(targetId) || snapshot.corpses.has(targetId) || snapshot.corpseByIdentityId?.has?.(targetId)) ? [targetId] : [];
  return deepFreeze({
    actor: entity?.identityId ? [entity.identityId] : [],
    target,
    dependants: [...(entity?.lineage?.offspringIds || [])].sort(),
    threats: entity?.predation?.targetId && entity.predation.targetId !== targetId ? [String(entity.predation.targetId)] : []
  });
}

const rolesKey = roles => Object.keys(roles).sort().map(role => `${role}:${[...(roles[role] || [])].sort().join("+")}`).join("|");

export class SituationManager {
  constructor({ dormantAfterTicks = 45, archiveAfterTicks = 600 } = {}) { this.dormantAfterTicks = dormantAfterTicks; this.archiveAfterTicks = archiveAfterTicks; this.items = new Map(); this.byId = new Map(); this.byScene = new Map(); this.byEventId = new Map(); this.byType = new Map(); this.byActor = new Map(); this.bySubject = new Map(); this.activeIds = new Set(); this.sequence = 0; this.transitionSequence = 0; this.revision = 0; this.sceneRevision = 0; this.sceneFingerprint = ""; this.transitions = []; this.cycleTransitions = []; this.snapshotCache = null; }
  observe({ snapshot, beliefs, scenes = [] }) {
    const tick = snapshot.simulationTick, observedKeys = new Set(), changed = [];
    this.cycleTransitions = [];
    this.byScene.clear();
    for (const event of snapshot.verifiedEvents) {
      const roles = deepFreeze({ actor: [...event.subjectIds], target: [], dependants: [], threats: [] }), type = EVENT_TYPES[event.eventType] || "LIFECYCLE_TRANSITION", methodId = `verified-event:${event.eventType.toLowerCase()}`;
      const situation = this.#upsert({ type, roles, methodId, phase: "verified", tick, beliefIds: beliefs.match({ subjectIds: event.subjectIds }).map(item => item.beliefId), importance: event.importance / 100, resolution: event, materialFingerprint: stableHash(event), eventId: event.eventId }); observedKeys.add(situation.identityKey); changed.push(situation);
    }
    for (const entity of snapshot.entities.values()) {
      const type = typeFromPlan(entity), roles = participantRoles(entity, snapshot), methodId = entity.plan.methodId || `action:${entity.action.key || "observe"}`, phase = entity.plan.phase || entity.action.key || "observe", subjectBeliefs = beliefs.forSubject(entity.identityId);
      const situation = this.#upsert({ type, roles, methodId, phase, tick, beliefIds: subjectBeliefs.map(item => item.beliefId), importance: importanceFor(entity, type), resolution: null, materialFingerprint: stableHash({ action: entity.action, plan: entity.plan, physiology: entity.physiology, target: roles.target }) }); observedKeys.add(situation.identityKey); changed.push(situation);
    }
    const worldBelief = beliefs.get("world.current", []);
    if (worldBelief) { const roles = deepFreeze({ region: ["world"], actor: [], target: [], dependants: [], threats: [] }), situation = this.#upsert({ type: "ENVIRONMENTAL_PROCESS", roles, methodId: "observe-world-process", phase: "developing", tick, beliefIds: [worldBelief.beliefId], importance: .35, resolution: null, materialFingerprint: worldBelief.valueHash }); observedKeys.add(situation.identityKey); changed.push(situation); }
    for (const situationId of [...this.activeIds]) {
      const situation = this.byId.get(situationId); if (!situation) continue;
      if (observedKeys.has(situation.identityKey) || ["RESOLVED", "CONSEQUENCE_AVAILABLE", "ARCHIVED", "INVALIDATED"].includes(situation.state)) continue;
      const age = tick - situation.lastObservedTick;
      if (age > this.archiveAfterTicks) this.#transition(situation, "ARCHIVED", tick, "observation-expired");
      else if (age > this.dormantAfterTicks && situation.state !== "DORMANT") this.#transition(situation, "DORMANT", tick, "temporarily-unobserved");
    }
    for (const scene of scenes) {
      const situation = this.#matchScene(scene, snapshot);
      if (situation) this.byScene.set(scene.id, situation);
    }
    const sceneFingerprint = [...this.byScene].map(([sceneId, situation]) => `${sceneId}:${situation.situationId}`).join("|");
    if (sceneFingerprint !== this.sceneFingerprint) { this.sceneFingerprint = sceneFingerprint; this.sceneRevision += 1; }
    if (changed.length || this.cycleTransitions.length) this.revision += 1;
    this.snapshotCache = null;
    const publicSnapshot = this.snapshot(), byScene = new Map([...this.byScene].map(([sceneId, situation]) => [sceneId, publicSnapshot.get(situation.situationId)]));
    return Object.freeze({ revision: this.revision, changed: Object.freeze([...new Map(changed.map(item => [item.situationId, item])).values()].map(item => publicSnapshot.get(item.situationId))), transitions: Object.freeze([...this.cycleTransitions]), snapshot: publicSnapshot, byScene });
  }
  #upsert({ type, roles, methodId, phase, tick, beliefIds, importance, resolution, materialFingerprint, eventId = null }) {
    const identityKey = `${type}|${rolesKey(roles)}|method:${methodId || "none"}${eventId ? `|event:${eventId}` : ""}`;
    let situation = this.items.get(identityKey);
    if (!situation) {
      situation = { situationId: `situation-${String(++this.sequence).padStart(8, "0")}`, type, participantRoles: roles, identityKey, state: "DISCOVERED", methodId, methodPhase: phase, beliefIds: [], openedAtTick: tick, lastMaterialChangeTick: tick, lastObservedTick: tick, resolvedAtTick: null, resolution: null, importanceComponents: { rarity: type === "LIFECYCLE_TRANSITION" || type === "DEATH_CONSEQUENCE" ? .9 : .2, survival: ["DANGER_RESPONSE", "PREDATION_SEQUENCE", "RESOURCE_ACQUISITION"].includes(type) ? .75 : .3, causalDepth: methodId ? .75 : .35, characterContinuity: roles.actor?.length ? .65 : .1 }, materialFingerprint, eventId };
      Object.defineProperty(situation, BELIEF_SET, { value: new Set(), enumerable: false });
      this.items.set(identityKey, situation); this.byId.set(situation.situationId, situation); this.activeIds.add(situation.situationId); addIndex(this.byType, type, situation.situationId); if (eventId) this.byEventId.set(eventId, situation.situationId); for (const id of participants(roles)) addIndex(this.bySubject, id, situation.situationId); for (const id of roles.actor || []) addIndex(this.byActor, String(id), situation.situationId); this.#transition(situation, "DEVELOPING", tick, "authoritative-situation-opened");
    } else {
      if (situation.state === "DORMANT") this.#transition(situation, "RETURN_READY", tick, "situation-observed-again");
      if (situation.materialFingerprint !== materialFingerprint) { situation.lastMaterialChangeTick = tick; situation.materialFingerprint = materialFingerprint; }
      if (situation.methodPhase !== phase) situation.methodPhase = phase;
    }
    situation.lastObservedTick = tick; const beliefSet = situation[BELIEF_SET] || new Set(situation.beliefIds); for (const id of beliefIds) beliefSet.add(id); if (beliefSet.size > 256) for (let count = beliefSet.size - 256; count > 0; count -= 1) beliefSet.delete(beliefSet.values().next().value); situation.beliefIds = [...beliefSet]; situation.importance = Math.max(Number(situation.importance || 0), Number(importance || 0));
    if (resolution) { situation.resolution = resolution; situation.resolvedAtTick = tick; this.#transition(situation, "CONSEQUENCE_AVAILABLE", tick, "verified-event"); }
    else if (TERMINAL_PHASES.has(String(phase).toLowerCase())) { situation.resolvedAtTick = tick; situation.resolution = { phase }; this.#transition(situation, "RESOLVED", tick, "authoritative-terminal-phase"); }
    else if (OUTCOME_PHASES.has(String(phase).toLowerCase()) && !["OUTCOME_PENDING", "RETURN_READY"].includes(situation.state)) this.#transition(situation, "OUTCOME_PENDING", tick, "authoritative-outcome-phase");
    return situation;
  }
  #transition(situation, next, tick, reason) { if (situation.state === next) return; const transition = deepFreeze({ transitionId: `situation-transition-${++this.transitionSequence}`, situationId: situation.situationId, from: situation.state, to: next, tick, reason }); situation.state = next; if (["ARCHIVED", "INVALIDATED"].includes(next)) this.activeIds.delete(situation.situationId); else this.activeIds.add(situation.situationId); this.transitions.push(transition); this.cycleTransitions.push(transition); if (this.transitions.length > 5000) this.transitions.splice(0, this.transitions.length - 5000); this.snapshotCache = null; }
  #matchScene(scene, snapshot) {
    if (scene.sceneKind === "VERIFIED_EVENT" || scene.kind === "ecosystem-event") { const eventType = String(scene.eventType || scene.ecologicalEventType || "").toUpperCase(), direct = this.byId.get(this.byEventId.get(scene.eventId)); if (direct) return direct; const required = (scene.semanticRoleIds || scene.ids || []).map(String); for (const id of this.byType.get(EVENT_TYPES[eventType]) || []) { const item = this.byId.get(id); if (item && required.every(subjectId => participants(item.participantRoles).includes(subjectId))) return item; } return null; }
    const ids = [...new Set(scene.semanticRoleIds || scene.ids || [])].map(String);
    if (!ids.length || scene.worldSubject) { for (const id of this.byType.get("ENVIRONMENTAL_PROCESS") || []) if (this.activeIds.has(id)) return this.byId.get(id) || null; return null; }
    const primary = ids[0], entity = snapshot.entities.get(primary), preferredType = typeFromPlan(entity);
    let best = null; for (const id of this.byActor.get(primary) || []) { const item = this.byId.get(id); if (!item || !this.activeIds.has(id)) continue; if (!best || Number(item.type === preferredType) > Number(best.type === preferredType) || Number(item.type === preferredType) === Number(best.type === preferredType) && item.lastMaterialChangeTick > best.lastMaterialChangeTick) best = item; } return best;
  }
  situationForScene(sceneId) { return this.byScene.get(sceneId) || null; }
  active() { return [...this.activeIds].map(id => this.byId.get(id)).filter(Boolean); }
  snapshot() {
    const cacheKey = `${this.revision}|${this.sceneRevision}`; if (this.snapshotCache?.key === cacheKey) return this.snapshotCache.value;
    const values = this.active().map(item => deepFreeze({ ...item, participantRoles: { ...item.participantRoles }, beliefIds: [...item.beliefIds] }));
    const byId = new Map(values.map(item => [item.situationId, item]));
    const bySceneId = new Map([...this.byScene].map(([sceneId, situation]) => [sceneId, byId.get(situation.situationId) || null]));
    const bySubjectId = new Map(); for (const [subjectId, ids] of this.bySubject) bySubjectId.set(subjectId, Object.freeze([...ids].map(id => byId.get(id)).filter(Boolean)));
    const value = Object.freeze({
      revision: this.revision,
      situations: Object.freeze(values),
      get: id => byId.get(id) || null,
      forScene: sceneId => bySceneId.get(sceneId) || null,
      forSubject: id => bySubjectId.get(String(id)) || []
    });
    this.snapshotCache = { key: cacheKey, value }; return value;
  }
}

const participants = roles => [...new Set(Object.values(roles || {}).flat().map(String))];
function addIndex(index, key, value) { let values = index.get(key); if (!values) { values = new Set(); index.set(key, values); } values.add(value); }

function importanceFor(entity, type) {
  const physiology = entity.physiology || {}, survival = Math.max(0, (35 - Number(physiology.hydration || 100)) / 35, (35 - Number(physiology.energy || 100)) / 35, Number(physiology.fear || 0) / 100);
  return Math.max(.2, survival, ["DANGER_RESPONSE", "PREDATION_SEQUENCE", "REPRODUCTION_STAGE"].includes(type) ? .65 : .3);
}

export { typeFromPlan as situationTypeFromEntity };
