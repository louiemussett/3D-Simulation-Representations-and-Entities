const clone = value => value == null ? value : structuredClone(value);
const stable = value => { const visit = item => Array.isArray(item) ? item.map(visit) : item && typeof item === "object" ? Object.fromEntries(Object.keys(item).sort().map(key => [key, visit(item[key])])) : item; return JSON.stringify(visit(value)); };

export class BeliefStore {
  constructor({ maximum = 10000 } = {}) { this.maximum = maximum; this.items = new Map(); this.sequence = 0; this.contradictions = []; }
  key(input) { return `${input.predicate}:${[...(input.subjectIds || [])].sort().join("|")}`; }
  revise(input) {
    const key = this.key(input), previous = this.items.get(key), changed = previous ? stable(previous.arguments) !== stable(input.arguments) : true, item = Object.freeze({ beliefId: `belief-${String(++this.sequence).padStart(8, "0")}`, semanticKey: key, predicate: input.predicate, subjectIds: Object.freeze([...(input.subjectIds || [])]), arguments: Object.freeze(clone(input.arguments || {})), confidence: Math.max(0, Math.min(1, Number(input.confidence ?? 1))), epistemicClass: input.epistemicClass || "AUTHORITATIVE_STATE", evidenceIds: Object.freeze([...(input.evidenceIds || [])]), validFromTick: Number(input.tick || 0), validUntilTick: input.validUntilTick ?? null, changed, revision: (previous?.revision || 0) + 1 });
    if (previous && input.contradicts) this.contradictions.push({ previous: previous.beliefId, next: item.beliefId, reason: input.contradicts });
    this.items.set(key, item); while (this.items.size > this.maximum) this.items.delete(this.items.keys().next().value); return item;
  }
  get(predicate, subjectIds = []) { return this.items.get(`${predicate}:${[...subjectIds].sort().join("|")}`) || null; }
  active(tick) { return [...this.items.values()].filter(item => item.validUntilTick == null || tick <= item.validUntilTick); }
}

const roleIds = scene => [...new Set(scene?.semanticRoleIds || scene?.ids || [])].filter(Boolean);
export class SituationGraph {
  constructor() { this.items = new Map(); this.sequence = 0; }
  key(scene) { const ids = roleIds(scene).sort(), identity = ids.join("+") || scene?.worldRegionId || scene?.id || "world", subtype = scene?.eventType || scene?.ecologicalEventType || "observation"; return `${scene?.kind || "observation"}:${subtype}:${identity}`; }
  observe(scene, beliefs, tick) {
    const key = this.key(scene), previous = this.items.get(key), situation = previous || { situationId: `acss-situation-${++this.sequence}`, key, type: scene?.kind || "observation", subjectIds: roleIds(scene), openedAtTick: tick, phase: "DISCOVERY", state: "DEVELOPING", beliefIds: [], importance: 0, lastChangedAtTick: tick };
    situation.subjectIds = roleIds(scene); situation.beliefIds = [...new Set([...situation.beliefIds, ...beliefs.map(item => item.beliefId)])].slice(-128); situation.importance = Math.max(situation.importance, Math.min(1, Number(scene?.importance || scene?.score || 0) / 100)); situation.lastObservedAtTick = tick;
    if (beliefs.some(item => item.changed)) situation.lastChangedAtTick = tick;
    if (previous) situation.state = "ACTIVE";
    this.items.set(key, situation); return situation;
  }
  update(tick) { for (const item of this.items.values()) { const age = tick - (item.lastObservedAtTick || item.lastChangedAtTick); if (age > 600) item.state = "ARCHIVED"; else if (age > 45 && item.state === "ACTIVE") item.state = "DORMANT"; } }
  active() { return [...this.items.values()].filter(item => ["DEVELOPING", "ACTIVE", "RETURN_READY"].includes(item.state)); }
}

export function beliefsFromScene(scene = {}, context = {}, tick = 0) {
  const ids = roleIds(scene), records = [
    { predicate: `scene_${scene.kind || "observation"}`, subjectIds: ids, arguments: { title: scene.title || "", detail: scene.detail || "", actionKey: scene.actionKey || context.actionKey || "", eventKey: scene.eventKey || context.eventKind || "" }, confidence: 1, tick, evidenceIds: [`scene:${scene.id || scene.kind || "unknown"}:${tick}`] }
  ];
  for (const entity of context.subjects || []) {
    records.push({ predicate: "entity_current_action", subjectIds: [entity.id], arguments: { actionKey: entity.actionState?.key || entity.actionKey || null, label: entity.actionState?.label || entity.actionLabel || null, priority: entity.commitmentState?.priority || entity.priority || null, methodId: entity.needDependencyPlan?.methodId || null, phase: entity.needDependencyPlan?.phase || entity.planPhase || null }, confidence: 1, tick, evidenceIds: [`entity:${entity.id}:action:${tick}`] });
    records.push({ predicate: "entity_current_condition", subjectIds: [entity.id], arguments: { health: entity.health, hydration: entity.hydration, energy: entity.energy, fatigue: entity.fatigue, fear: entity.fear }, confidence: 1, tick, evidenceIds: [`entity:${entity.id}:condition:${tick}`] });
  }
  if (context.landscape) records.push({ predicate: "environment_current", subjectIds: [], arguments: context.landscape, confidence: 1, tick, evidenceIds: [`environment:${scene.id || "world"}:${tick}`] });
  return records;
}
