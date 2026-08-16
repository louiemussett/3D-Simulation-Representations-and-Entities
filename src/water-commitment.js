export const NEED_DEPENDENCY_PLAN_SCHEMA = 3;
export const HYDRATION_ACQUISITION_TARGET = 92;
export const HYDRATION_REENTRY_LEVEL = 85;
export const WATER_TARGET_SWITCH_RATIO = .7;

export function immediateThreatPrecedesWater({ action = null, urgency = 0, attackImminence = 0 } = {}) {
  return ["flee", "withdraw", "attack"].includes(action) && (Number(urgency) >= 80 || Number(attackImminence) >= .72);
}

const finite = value => Number.isFinite(Number(value));
const coordinate = value => finite(value) ? Number(value).toFixed(3) : "unknown";

function stableEvidenceIdentity(value) {
  const text = String(value || "");
  // Observation ticks identify evidence samples, not physical resources.  Keep
  // the modality/resource/location portion stable across refreshed sightings.
  return text.replace(/^(?:water-|resource-)?evidence:\d+:/, "").replace(/^(?:tick-)?\d+:/, "");
}

export function resourceTargetKey(target, resourceKind = "resource") {
  if (!target) return null;
  if (target.targetKey) return String(target.targetKey);
  if (target.resourceId != null) return `${resourceKind}:${target.resourceId}`;
  if (target.cellId != null) return `${resourceKind}-cell:${target.cellId}`;
  if (target.patchId != null) return `${resourceKind}-patch:${target.patchId}`;
  if (target.carcassId != null) return `carcass:${target.carcassId}`;
  if (target.entityId != null) return `entity:${target.entityId}`;
  if (target.memoryId != null) return `${resourceKind}-memory:${target.memoryId}`;
  if (target.evidenceId != null) {
    const stable = stableEvidenceIdentity(target.evidenceId);
    if (stable && stable !== String(target.evidenceId)) return `${resourceKind}-evidence:${stable}`;
  }
  if (target.id != null) return `${resourceKind}-cell:${target.id}`;
  if (finite(target.x) && finite(target.z)) return `${resourceKind}-region:${coordinate(target.x)},${coordinate(target.z)}`;
  return null;
}

export function waterTargetKey(target) {
  return resourceTargetKey(target, "water");
}

export function shouldRetainWaterTarget({ incumbent, candidate, incumbentDistance = Infinity, candidateDistance = Infinity, tick = 0, invalid = false, routeUnavailable = false, stalled = false, etaIncreaseRatio = 0 } = {}) {
  const incumbentKey = waterTargetKey(incumbent), candidateKey = waterTargetKey(candidate);
  if (!incumbentKey) return { retain: false, reason: "no incumbent water target" };
  if (invalid) return { retain: false, reason: "target changed because the previous source became inaccessible" };
  if (routeUnavailable) return { retain: false, reason: "target changed because no viable route remained" };
  if (stalled) return { retain: false, reason: "target changed after progress remained near zero for one ecological hour" };
  if (etaIncreaseRatio >= .35) return { retain: false, reason: "target changed because ETA increased by at least 35%" };
  if (!candidateKey || candidateKey === incumbentKey) return { retain: true, reason: "water target retained; no materially different challenger" };
  if (candidate?.exact && !incumbent?.exact) return { retain: false, reason: "remembered water region resolved to an exact source" };
  const minimumUntilTick = Number(incumbent.minimumUntilTick ?? incumbent.untilTick ?? -Infinity);
  const materiallyNearer = finite(candidateDistance) && finite(incumbentDistance) && candidateDistance <= incumbentDistance * WATER_TARGET_SWITCH_RATIO;
  if (tick >= minimumUntilTick && materiallyNearer) return { retain: false, reason: "target changed because a new source costs at most 70% of the incumbent journey" };
  return { retain: true, reason: tick < minimumUntilTick ? "water target retained through the minimum commitment window" : "water target retained; challenger did not meet the switching threshold" };
}

export function stabilizeNeedDependencyPlan(previous, next, { tick = 0, targetKey = null, target = null, targetDecision = null, commitmentTicks = 1, resourceLabel = null } = {}) {
  const same = Boolean(previous && previous.need === next.need && previous.method === next.method && previous.targetKey === targetKey);
  const startedTick = same ? Number(previous.startedTick ?? tick) : tick;
  const minimumUntilTick = same ? Number(previous.minimumUntilTick ?? startedTick + commitmentTicks) : tick + Math.max(1, Number(commitmentTicks) || 1);
  const targetSwitches = Number(previous?.targetSwitches || 0) + (!same && previous?.targetKey && targetKey && previous.targetKey !== targetKey ? 1 : 0);
  const planId = same ? previous.planId : `${next.needId || next.need}:${targetKey || "unresolved"}:${tick}`;
  const resumed = same && previous.suspended;
  return {
    ...next,
    schemaVersion: NEED_DEPENDENCY_PLAN_SCHEMA,
    planId,
    startedAt: same ? previous.startedAt : next.startedAt,
    startedTick,
    minimumUntilTick,
    phaseStartedTick: same && previous.phase === next.phase ? Number(previous.phaseStartedTick ?? previous.tick ?? tick) : tick,
    targetKey,
    target: target ? { x: Number(target.x), z: Number(target.z), id: target.id ?? null, entityId: target.entityId ?? target.targetId ?? null, resourceId: target.resourceId ?? null, cellId: target.cellId ?? null, targetKind: target.targetKind || null, memoryId: target.memoryId ?? null, evidenceId: target.evidenceId ?? null, exact: Boolean(target.exact), confidence: Number(target.confidence ?? 1), source: target.source || target.channel || null } : same ? previous.target || null : null,
    targetSwitches,
    targetDecision: targetDecision?.reason || (same ? `${resourceLabel || "resource"} plan retained` : `${resourceLabel || "resource"} target selected`),
    contactReservationKey: same ? previous.contactReservationKey ?? next.contactReservationKey ?? null : next.contactReservationKey ?? null,
    suspended: false,
    suspendedAtTick: resumed ? previous.suspendedAtTick : null,
    suspensionReason: resumed ? previous.suspensionReason : null,
    resumedAtTick: resumed ? tick : previous?.resumedAtTick ?? null,
    resumeReason: resumed ? "Original water target resumed after danger passed" : previous?.resumeReason ?? null,
  };
}

export function suspendNeedDependencyPlan(plan, { tick = 0, reason = "immediate danger" } = {}) {
  if (!plan) return plan;
  return { ...plan, schemaVersion: NEED_DEPENDENCY_PLAN_SCHEMA, suspended: true, suspendedAtTick: tick, suspensionReason: reason, targetDecision: `${plan.needId || plan.need || "need"} plan suspended: ${reason}` };
}

export function migrateNeedDependencyPlan(plan, { tick = 0, fallbackTargetKey = null } = {}) {
  if (!plan) return null;
  if (plan.schemaVersion === NEED_DEPENDENCY_PLAN_SCHEMA && "minimumUntilTick" in plan && "targetSwitches" in plan) return plan;
  const targetKey = plan.targetKey || fallbackTargetKey || waterTargetKey(plan.target || plan.destination || null);
  const startedTick = Number(plan.startedTick ?? plan.tick ?? tick);
  return {
    ...plan,
    schemaVersion: NEED_DEPENDENCY_PLAN_SCHEMA,
    planId: plan.planId || `${plan.needId || plan.need || "need"}:${targetKey || "unresolved"}:${startedTick}`,
    startedTick,
    minimumUntilTick: Number(plan.minimumUntilTick ?? startedTick),
    phaseStartedTick: Number(plan.phaseStartedTick ?? plan.tick ?? startedTick),
    targetKey,
    target: plan.target || null,
    targetSwitches: Number(plan.targetSwitches || 0),
    targetDecision: plan.targetDecision || "legacy plan migrated deterministically",
    contactReservationKey: plan.contactReservationKey || null,
    suspended: Boolean(plan.suspended),
    suspendedAtTick: plan.suspendedAtTick ?? null,
    suspensionReason: plan.suspensionReason ?? null,
    resumedAtTick: plan.resumedAtTick ?? null,
    resumeReason: plan.resumeReason ?? null,
  };
}

export function retainGoalPlanCommitment(previous, next, chosenKey) {
  const current = previous?.currentPriority || previous?.shortTerm;
  if (!current || current.key !== chosenKey) return next;
  const retained = { ...next.currentPriority, startedTick: current.startedTick, untilTick: current.untilTick };
  return { ...next, currentPriority: retained, immediateConcern: retained, shortTerm: retained };
}

export function hydrationAcquisitionState({ hydration = 100, atWater = false, activeWaterPlan = false, forecastState = "comfortable" } = {}) {
  const amount = Number(hydration) || 0;
  const forecastRequiresPlan = ["commit-now", "emergency", "predicted-failure"].includes(forecastState);
  return Object.freeze({
    satisfied: amount >= HYDRATION_ACQUISITION_TARGET,
    finishRehydrating: Boolean(atWater && amount < HYDRATION_ACQUISITION_TARGET),
    directReentry: amount < HYDRATION_REENTRY_LEVEL,
    shouldAcquire: amount < HYDRATION_REENTRY_LEVEL || forecastRequiresPlan || Boolean(activeWaterPlan && amount < HYDRATION_ACQUISITION_TARGET),
    forecastRequiresPlan,
  });
}

export function shorelineContactKey(cellId, contact = {}) {
  const quantize = value => Math.round((Number(value) || 0) * 4) / 4;
  return `${cellId}:${quantize(contact.edgeX ?? contact.x)},${quantize(contact.edgeZ ?? contact.z)}`;
}

export class ShorelineReservationBook {
  constructor({ ttlTicks = 12 } = {}) { this.ttlTicks = ttlTicks; this.byContact = new Map(); this.byAnimal = new Map(); }
  clear() { this.byContact.clear(); this.byAnimal.clear(); }
  cleanup(tick, validAnimal = () => true) {
    for (const [key, entry] of this.byContact) if (tick - entry.tick > this.ttlTicks || !validAnimal(entry.animalId)) this.release(entry.animalId, key);
  }
  owner(key, tick = 0) {
    const entry = this.byContact.get(key);
    if (!entry || tick - entry.tick > this.ttlTicks) { if (entry) this.release(entry.animalId, key); return null; }
    return entry.animalId;
  }
  reserve(animalId, key, tick = 0) {
    if (!animalId || !key) return false;
    const existing = this.byContact.get(key);
    if (existing && existing.animalId !== animalId && tick - existing.tick <= this.ttlTicks) {
      if (existing.tick !== tick || String(existing.animalId).localeCompare(String(animalId)) <= 0) return false;
      this.release(existing.animalId, key);
    }
    const oldKey = this.byAnimal.get(animalId);
    if (oldKey && oldKey !== key) this.release(animalId, oldKey);
    this.byContact.set(key, { animalId, tick }); this.byAnimal.set(animalId, key); return true;
  }
  touch(animalId, tick = 0) { const key = this.byAnimal.get(animalId); if (key && this.byContact.get(key)?.animalId === animalId) this.byContact.get(key).tick = tick; return key || null; }
  release(animalId, key = this.byAnimal.get(animalId)) { if (!key) return false; const entry = this.byContact.get(key); if (entry?.animalId !== animalId) return false; this.byContact.delete(key); if (this.byAnimal.get(animalId) === key) this.byAnimal.delete(animalId); return true; }
  reservationFor(animalId) { const key = this.byAnimal.get(animalId); return key ? { key, ...this.byContact.get(key) } : null; }
  rebuild(animals = [], tick = 0) {
    this.clear();
    const reservationKey = animal => animal.drinkingSource?.reservationKey || animal.needDependencyPlan?.contactReservationKey || null;
    for (const animal of [...animals].filter(item => item?.alive && reservationKey(item)).sort((a, b) => String(a.id).localeCompare(String(b.id)))) this.reserve(animal.id, reservationKey(animal), tick);
  }
}
