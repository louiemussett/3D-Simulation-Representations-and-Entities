const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, Number(value) || 0));

export const PROXIMITY_RELATIONSHIP_SCHEMA = 2;
export const PROXIMITY_MEMORY_LIMIT = 64;

export function migrateProximityRelationship(record = {}, observerId = null, otherEntityId = null) {
  return {
    schemaVersion: PROXIMITY_RELATIONSHIP_SCHEMA,
    observerId: record.observerId || observerId,
    otherEntityId: record.otherEntityId || record.targetId || otherEntityId,
    targetId: record.otherEntityId || record.targetId || otherEntityId,
    relationshipClass: record.relationshipClass || "unknown-animal",
    relationshipClassConfidence: clamp(record.relationshipClassConfidence ?? .35),
    familiarity: clamp(record.familiarity), trust: clamp(record.trust, -1, 1), threatExpectation: clamp(record.threatExpectation),
    bondStrength: clamp(record.bondStrength), competitionExpectation: clamp(record.competitionExpectation),
    peacefulExposureHours: Math.max(0, Number(record.peacefulExposureHours || 0)), cooperativeExposureHours: Math.max(0, Number(record.cooperativeExposureHours || 0)),
    pursuitCount: Math.max(0, Number(record.pursuitCount || 0)), attackCount: Math.max(0, Number(record.attackCount || 0)), displacementCount: Math.max(0, Number(record.displacementCount || 0)),
    warningIssuedCount: Math.max(0, Number(record.warningIssuedCount || 0)), warningRespectedCount: Math.max(0, Number(record.warningRespectedCount || 0)), warningIgnoredCount: Math.max(0, Number(record.warningIgnoredCount || 0)),
    encounters: Math.max(0, Number(record.encounters || 0)), lastPeacefulTick: record.lastPeacefulTick ?? null, lastPursuitTick: record.lastPursuitTick ?? null,
    lastAttackTick: record.lastAttackTick ?? null, lastDisplacementTick: record.lastDisplacementTick ?? null, lastInteractionTick: Number(record.lastInteractionTick ?? record.lastTick ?? 0), lastTick: Number(record.lastInteractionTick ?? record.lastTick ?? 0),
    learnedPreferredMinimum: Number.isFinite(record.learnedPreferredMinimum) ? Math.max(0, record.learnedPreferredMinimum) : null,
    learnedPreferredMaximum: Number.isFinite(record.learnedPreferredMaximum) ? Math.max(0, record.learnedPreferredMaximum) : null,
    learnedMonitoringScale: Number.isFinite(record.learnedMonitoringScale) ? clamp(record.learnedMonitoringScale, .65, 1.35) : 1,
    learnedWithdrawalScale: Number.isFinite(record.learnedWithdrawalScale) ? clamp(record.learnedWithdrawalScale, .75, 1.4) : 1,
    evidenceGrade: record.evidenceGrade || "individual-experience", confidence: clamp(record.confidence ?? Math.min(.9, .25 + Number(record.encounters || 0) * .025)), lastOutcome: record.lastOutcome || null
  };
}

export function classifyProximityRelationship(observer = {}, other = {}, context = {}) {
  if (context.relationshipClass) return context.relationshipClass;
  if (observer.motherId === other.id || observer.caregiverIds?.includes(other.id)) return "caregiver";
  if (other.motherId === observer.id || observer.offspringIds?.includes(other.id)) return other.lifeStage === "dependent" ? "dependent" : "offspring";
  if (context.establishedMate) return "established-mate";
  if (context.compatibleMate) return "courtship-candidate";
  if (context.related) return "close-kin";
  if (context.predatorRelationship || context.perceivedType === "predator") return context.previousAttacker ? "previous-attacker" : "known-predator";
  if (context.preyRelationship || context.perceivedType === "prey") return "prey";
  if (context.sameGroup) return context.affinity >= .35 ? "bonded-group-member" : "familiar-group-member";
  if (context.resourceCompetitor || context.grievance > .35) return "resource-competitor";
  if (observer.speciesId && other.speciesId && observer.speciesId === other.speciesId) return context.familiarity > .2 ? "familiar-conspecific" : "unfamiliar-conspecific";
  if (context.familiarity > .2) return "familiar-heterospecific";
  return context.perceivedType === "animal" ? "unknown-animal" : "unfamiliar-heterospecific";
}

export function relationshipMemory(animal = {}, otherEntityId) {
  animal.proximityRelationships ||= {};
  const migrated = migrateProximityRelationship(animal.proximityRelationships[otherEntityId], animal.id, otherEntityId);
  animal.proximityRelationships[otherEntityId] = migrated;
  return migrated;
}

export function recordRelationshipOutcome(animal = {}, otherEntityId, outcome, tick = 0, strength = 1) {
  if (!otherEntityId || otherEntityId === animal.id) return null;
  const record = relationshipMemory(animal, otherEntityId), rate = clamp(strength) * .08;
  const friendly = ["affiliate", "courtship", "space-tolerated", "friendly-contact", "resource-shared", "warning-respected"].includes(outcome);
  const hostile = ["warn", "retreat", "flight", "attack", "pursuit", "displacement", "rally-defence", "rally-aggression", "personal-space-warning", "personal-space-retreat"].includes(outcome);
  record.familiarity = clamp(record.familiarity + .025 + rate * .35);
  record.trust = clamp(record.trust + (friendly ? rate : hostile ? -rate * 1.25 : rate * .08), -1, 1);
  record.threatExpectation = clamp(record.threatExpectation + (hostile ? rate * 1.4 : friendly ? -rate * .55 : -rate * .08));
  record.bondStrength = clamp(record.bondStrength + (friendly ? rate * .45 : hostile ? -rate * .25 : 0));
  record.competitionExpectation = clamp(record.competitionExpectation + (["displacement", "resource-monopolised"].includes(outcome) ? rate : friendly ? -rate * .15 : 0));
  if (outcome === "pursuit") { record.pursuitCount += 1; record.lastPursuitTick = tick; }
  if (outcome === "attack") { record.attackCount += 1; record.lastAttackTick = tick; }
  if (outcome === "displacement") { record.displacementCount += 1; record.lastDisplacementTick = tick; }
  if (outcome === "warn" || outcome === "personal-space-warning") record.warningIssuedCount += 1;
  if (outcome === "warning-respected") record.warningRespectedCount += 1;
  if (outcome === "warning-ignored") record.warningIgnoredCount += 1;
  if (!hostile) record.lastPeacefulTick = tick;
  record.encounters += 1; record.lastInteractionTick = tick; record.lastTick = tick; record.lastOutcome = outcome; record.confidence = clamp(.25 + record.encounters * .025);
  animal.proximityRelationships[otherEntityId] = record;
  const retained = Object.values(animal.proximityRelationships).sort((a, b) => b.lastInteractionTick - a.lastInteractionTick || String(a.otherEntityId).localeCompare(String(b.otherEntityId))).slice(0, PROXIMITY_MEMORY_LIMIT);
  animal.proximityRelationships = Object.fromEntries(retained.map((entry) => [entry.otherEntityId, entry]));
  return record;
}
