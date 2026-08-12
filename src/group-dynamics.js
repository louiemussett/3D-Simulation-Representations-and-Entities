const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, Number(value) || 0));

export function migrateGroupDisposition(animal = {}, tick = 0) {
  const prior = animal.groupDisposition && typeof animal.groupDisposition === "object" ? animal.groupDisposition : {};
  animal.groupDisposition = {
    affinity: clamp(prior.affinity ?? .62),
    leaderTrust: clamp(prior.leaderTrust ?? .62),
    goalSatisfaction: clamp(prior.goalSatisfaction ?? .58),
    resourceCompetition: clamp(prior.resourceCompetition),
    conflictBurden: clamp(prior.conflictBurden),
    reproductiveDispersal: clamp(prior.reproductiveDispersal),
    departureIntention: clamp(prior.departureIntention),
    departureReason: prior.departureReason || null,
    departureKind: prior.departureKind || null,
    departedGroupId: prior.departedGroupId || null,
    departedAt: Number.isFinite(prior.departedAt) ? prior.departedAt : null,
    rejoinAfter: Number.isFinite(prior.rejoinAfter) ? prior.rejoinAfter : 0,
    avoidMemberIds: Array.isArray(prior.avoidMemberIds) ? [...new Set(prior.avoidMemberIds)].slice(-8) : [],
    active: Boolean(prior.active && (prior.rejoinAfter || 0) > tick),
    lastAssessmentTick: Number.isFinite(prior.lastAssessmentTick) ? prior.lastAssessmentTick : 0
  };
  animal.abandonedByIds = Array.isArray(animal.abandonedByIds) ? [...new Set(animal.abandonedByIds)] : [];
  animal.abandonedDependentIds = Array.isArray(animal.abandonedDependentIds) ? [...new Set(animal.abandonedDependentIds)] : [];
  return animal.groupDisposition;
}

export function assessGroupMembership(animal = {}, context = {}) {
  const state = migrateGroupDisposition(animal, context.tick || 0);
  const groupSize = Math.max(1, context.groupSize || 1), desiredSize = Math.max(2, context.desiredSize || (animal.speciesId === "grazer" ? 8 : 4));
  const crowding = clamp((groupSize - desiredSize) / Math.max(3, desiredSize));
  const scarcity = clamp(context.resourceScarcity);
  const leaderMismatch = context.isLeader ? 0 : clamp(1 - (context.leaderCompatibility ?? state.leaderTrust));
  const goalMismatch = clamp(context.goalMismatch);
  const grievance = clamp(context.grievance);
  const maturityPressure = animal.lifeStage === "subadult" ? .28 : animal.lifeStage === "juvenile" && context.newlyIndependent ? .13 : 0;
  const matePressure = clamp(context.matePressure) * (animal.lifeStage === "subadult" || animal.lifeStage === "adult" ? .42 : .08);
  const personalEmergency = clamp(context.personalEmergency);
  state.resourceCompetition = clamp(state.resourceCompetition * .82 + (scarcity * .7 + crowding * .3) * .18);
  state.goalSatisfaction = clamp(state.goalSatisfaction * .88 + (1 - goalMismatch) * .12);
  state.leaderTrust = clamp(state.leaderTrust * .9 + (1 - leaderMismatch) * .1 - grievance * .045);
  state.conflictBurden = clamp(state.conflictBurden * .97 + grievance * .055);
  state.reproductiveDispersal = clamp(state.reproductiveDispersal * .9 + matePressure * .1);
  const permanentPressure = state.conflictBurden * .54 + (1 - state.affinity) * .27 + (1 - state.leaderTrust) * .31 + state.resourceCompetition * .36 + maturityPressure + state.reproductiveDispersal * .44;
  const temporaryPressure = personalEmergency * .72 + goalMismatch * .22;
  const pressure = Math.max(permanentPressure, temporaryPressure);
  let reason = "personal needs conflict with the group goal", kind = "temporary";
  const reasons = [
    [state.conflictBurden * .54 + grievance * .32, "repeated social conflict"],
    [(1 - state.leaderTrust) * .62, "loss of trust in the leader"],
    [state.resourceCompetition * .58, animal.speciesId === "hunter" ? "competition for territory or food" : "resource-poor or overcrowded group"],
    [maturityPressure + state.reproductiveDispersal * .44, animal.lifeStage === "subadult" ? "dispersal at maturity" : "leaving to seek a mate"]
  ].sort((a, b) => b[0] - a[0]);
  if (permanentPressure >= temporaryPressure && reasons[0][0] > .16) { reason = reasons[0][1]; kind = "permanent"; }
  state.departureIntention = clamp(state.departureIntention * .84 + pressure * .16, 0, 1.5);
  state.departureReason = reason; state.departureKind = kind; state.lastAssessmentTick = context.tick || 0;
  return { pressure: state.departureIntention, reason, kind, eligible: Boolean(animal.groupId) && animal.lifeStage !== "dependent" && state.departureIntention >= (kind === "permanent" ? .62 : .72), components: { crowding, scarcity, leaderMismatch, goalMismatch, grievance, maturityPressure, matePressure, personalEmergency } };
}

export function beginGroupDeparture(animal, assessment, tick, options = {}) {
  const state = migrateGroupDisposition(animal, tick), oldGroupId = animal.groupId;
  const dayTicks = Math.max(1, options.dayTicks || 1440), permanent = assessment.kind === "permanent";
  state.active = true; state.departedGroupId = oldGroupId; state.departedAt = tick;
  state.departureReason = assessment.reason; state.departureKind = assessment.kind;
  state.rejoinAfter = tick + (permanent ? dayTicks * (5 + Math.round(state.conflictBurden * 9)) : Math.max(30, Math.round(dayTicks * .35)));
  state.departureIntention = .12;
  if (options.avoidMemberId) state.avoidMemberIds = [...new Set([...state.avoidMemberIds, options.avoidMemberId])].slice(-8);
  animal.groupId = null; animal.groupGoal = null; animal.groupLeaderId = null; animal.groupAlert = null;
  return { oldGroupId, rejoinAfter: state.rejoinAfter, reason: state.departureReason, kind: state.departureKind };
}

export function canJoinGroup(animal, groupId, tick) {
  const state = migrateGroupDisposition(animal, tick);
  if (state.active && state.departedGroupId === groupId && tick < state.rejoinAfter) return false;
  if (tick >= state.rejoinAfter) state.active = false;
  return true;
}

export function recordGroupConflict(animal, otherId, severity = .2, leaderInvolved = false, tick = 0) {
  const state = migrateGroupDisposition(animal, tick), amount = clamp(severity);
  state.conflictBurden = clamp(state.conflictBurden + amount * .32);
  state.affinity = clamp(state.affinity - amount * .2);
  if (leaderInvolved) state.leaderTrust = clamp(state.leaderTrust - amount * .3);
  if (otherId) state.avoidMemberIds = [...new Set([...state.avoidMemberIds, otherId])].slice(-8);
  return state;
}

export function caregiverConflict(actor = {}, target = {}, dependent = {}, context = {}) {
  const sharedCare = dependent.lifeStage === "dependent" && (dependent.caregiverIds || []).includes(actor.id) && (dependent.caregiverIds || []).includes(target.id);
  if (!sharedCare) return null;
  const grievance = clamp(actor.socialMemory?.[target.id]?.grievance), scarcity = clamp(context.resourceScarcity), stress = clamp(((actor.fear || 0) + (actor.fatigue || 0) + Math.max(0, 55 - (actor.energy || 0))) / 210);
  const pressure = (actor.aggression || 0) * .32 + grievance * .38 + scarcity * .2 + stress * .2 - (actor.careAffinity || .5) * .12;
  return pressure >= .58 ? { kind: pressure >= .9 ? "social-attack" : "dominance", pressure, dependentId: dependent.id, dispute: "caregiving" } : null;
}

export function dependentMistreatment(caregiver = {}, dependent = {}, context = {}) {
  if ((caregiver.abandonedDependentIds || []).includes(dependent.id) || (dependent.abandonedByIds || []).includes(caregiver.id)) return null;
  if (dependent.lifeStage !== "dependent" || (!(dependent.caregiverIds || []).includes(caregiver.id) && dependent.motherId !== caregiver.id)) return null;
  const stress = clamp(((caregiver.fear || 0) + (caregiver.fatigue || 0) + Math.max(0, 65 - (caregiver.energy || 0)) + Math.max(0, 65 - (caregiver.health || 0))) / 260);
  const grievance = clamp(caregiver.socialMemory?.[dependent.id]?.grievance), scarcity = clamp(context.resourceScarcity);
  const rejection = (caregiver.aggression || 0) * .32 + (1 - (caregiver.careAffinity || .5)) * .38 + stress * .3 + scarcity * .18 + grievance * .3;
  if (rejection < .7) return null;
  return { kind: rejection >= 1.03 && (caregiver.aggression || 0) >= .82 ? "attack-and-abandon" : "abandon", pressure: rejection, dependentId: dependent.id };
}

export function abandonDependent(caregiver, dependent, tick, reason = "caregiver conflict") {
  migrateGroupDisposition(caregiver, tick); migrateGroupDisposition(dependent, tick);
  caregiver.abandonedDependentIds = [...new Set([...(caregiver.abandonedDependentIds || []), dependent.id])];
  dependent.abandonedByIds = [...new Set([...(dependent.abandonedByIds || []), caregiver.id])];
  dependent.caregiverIds = (dependent.caregiverIds || []).filter((id) => id !== caregiver.id);
  caregiver.groupDisposition.conflictBurden = clamp(caregiver.groupDisposition.conflictBurden + .18);
  dependent.abandonmentMemory = { caregiverId: caregiver.id, reason, tick };
  return dependent.abandonmentMemory;
}
