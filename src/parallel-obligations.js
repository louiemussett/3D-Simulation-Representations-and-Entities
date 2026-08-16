const ACTIVE = new Set(["active", "paused"]);

export function migrateParallelObligations(animal = {}) {
  animal.parallelObligations = Array.isArray(animal.parallelObligations) ? animal.parallelObligations : [];
  animal.suspendedCommitments = Array.isArray(animal.suspendedCommitments) ? animal.suspendedCommitments : [];
  return animal.parallelObligations;
}

export function upsertParallelObligation(animal, obligation = {}, tick = 0) {
  migrateParallelObligations(animal);
  const key = String(obligation.obligationKey || `${obligation.kind || "obligation"}:${obligation.targetKey || obligation.targetId || "none"}`), index = animal.parallelObligations.findIndex(entry => entry.obligationKey === key && ACTIVE.has(entry.status));
  const next = { schema: 1, obligationKey: key, kind: obligation.kind || "social", needId: obligation.needId || null, satisfierId: obligation.satisfierId || null, methodId: obligation.methodId || null, targetKey: obligation.targetKey || (obligation.targetId ? `entity:${obligation.targetId}` : null), status: obligation.status || "active", startedTick: index >= 0 ? animal.parallelObligations[index].startedTick : tick, lastUpdatedTick: tick, completionCondition: obligation.completionCondition || null, reason: obligation.reason || null };
  if (index >= 0) animal.parallelObligations[index] = { ...animal.parallelObligations[index], ...next }; else animal.parallelObligations.push(next);
  if (animal.parallelObligations.length > 16) animal.parallelObligations.splice(0, animal.parallelObligations.length - 16);
  return next;
}

export function completeParallelObligation(animal, obligationKey, tick = 0, reason = "obligation completed") {
  migrateParallelObligations(animal); const entry = animal.parallelObligations.find(item => item.obligationKey === obligationKey && ACTIVE.has(item.status));
  if (!entry) return null; entry.status = "completed"; entry.completedTick = tick; entry.completionReason = reason; return entry;
}

export function activeParallelObligations(animal = {}) { migrateParallelObligations(animal); return animal.parallelObligations.filter(entry => entry.status === "active"); }
