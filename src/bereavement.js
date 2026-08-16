const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

export function migrateBereavement(animal = {}) {
  animal.bereavementEpisodes = Array.isArray(animal.bereavementEpisodes) ? animal.bereavementEpisodes : [];
  animal.deathSiteMemories = Array.isArray(animal.deathSiteMemories) ? animal.deathSiteMemories : [];
  return animal;
}

export function createBereavementEpisode(observer, deceased, context = {}) {
  const kin = context.kinship?.related ? (context.kinship.direct ? 1 : .72) : 0;
  const parentChild = deceased?.id === observer?.motherId || deceased?.id === observer?.fatherId || observer?.offspringIds?.includes(deceased?.id);
  const affinity = clamp(Number(context.affinity) || 0, -1, 1);
  const groupBond = context.sameGroup ? Math.max(.18, 1 / Math.sqrt(Math.max(1, context.groupSize || 1))) : 0;
  const care = clamp(Number(observer?.careAffinity) || .5, 0, 1.25);
  const attachment = clamp((parentChild ? .68 : 0) + kin * .28 + Math.max(0, affinity) * .42 + groupBond * .35 + care * .12, 0, 1);
  if (attachment < .16) return null;
  const witnessed = Boolean(context.witnessedDeath), attackerConfidence = context.witnessedAttacker ? clamp(context.attackerConfidence ?? 1, 0, 1) : 0;
  const danger = clamp((context.violent ? .52 : .08) + attackerConfidence * .42 + (Number(observer?.fear) || 0) / 260, 0, 1);
  const grief = clamp(attachment * (.62 + care * .28) + (witnessed ? .12 : 0), 0, 1);
  const aggression = clamp(Number(observer?.aggression) || 0, 0, 1), condition = clamp(((observer?.health || 0) / 100 + (observer?.energy || 0) / 100 + (100 - (observer?.fatigue || 0)) / 100) / 3, 0, 1);
  const retaliation = clamp(attackerConfidence * attachment * aggression * condition * (observer?.pregnant ? .3 : 1), 0, 1);
  return {
    deceasedId: deceased.id, corpseId: context.corpseId || `corpse-${deceased.id}`, relationship: parentChild ? "parent-offspring" : context.kinship?.kind || (context.sameGroup ? "group member" : "social bond"),
    attachment, griefIntensity: grief, dangerIntensity: danger, witnessedDeath: witnessed, bodyDiscovered: witnessed, confirmed: witnessed,
    attackerId: attackerConfidence > 0 ? context.attackerId : null, attackerConfidence, lastKnown: context.attackerLastKnown || null,
    ageHours: 0, recovery: 0, phase: witnessed ? "immediate-response" : "search", attendanceHours: 0, repeatedAttempts: 0,
    retaliationIntention: retaliation, maximumPursuitHours: 6 + aggression * 18, maximumPursuitDistance: 5 + aggression * 12 + (observer?.scentSkill || 1) * 3,
    createdTick: context.tick || 0, completed: false, outcome: null,
  };
}

export function recordBereavement(animal, episode) {
  if (!animal || !episode) return null;
  migrateBereavement(animal);
  if (animal.bereavementEpisodes.some((item) => item.deceasedId === episode.deceasedId)) return null;
  animal.bereavementEpisodes.unshift(episode); animal.bereavementEpisodes = animal.bereavementEpisodes.slice(0, 12);
  animal.deathSiteMemories.unshift({ deceasedId: episode.deceasedId, x: episode.x, z: episode.z, danger: episode.dangerIntensity, confidence: episode.witnessedDeath ? 1 : .55, ageHours: 0 });
  animal.deathSiteMemories = animal.deathSiteMemories.slice(0, 16);
  return episode;
}

export function ageBereavement(animal, elapsedHours = 1) {
  migrateBereavement(animal); const hours = Math.max(0, Number(elapsedHours) || 0), persistence = clamp(Number(animal.memoryPersistence) || 1, .45, 1.8);
  for (const episode of animal.bereavementEpisodes) {
    episode.ageHours = (episode.ageHours || 0) + hours; episode.recovery = clamp((episode.recovery || 0) + hours / (72 * persistence * (.5 + episode.griefIntensity)), 0, 1);
    episode.griefIntensity *= Math.pow(.996, hours / persistence); episode.attackerConfidence *= Math.pow(.997, hours / Math.max(.6, (animal.scentSkill || 1) * persistence));
    if (episode.recovery >= 1 || episode.griefIntensity < .08) { episode.completed = true; episode.outcome ||= "adapted to loss"; }
  }
  for (const site of animal.deathSiteMemories) { site.ageHours += hours; site.confidence *= Math.pow(.998, hours / persistence); }
  animal.deathSiteMemories = animal.deathSiteMemories.filter((site) => site.ageHours < 120 * 24 && site.confidence > .08);
  animal.bereavementEpisodes = animal.bereavementEpisodes.filter((episode) => episode.ageHours < 180 * 24).slice(0, 12);
}

export function activeBereavement(animal) { return (animal?.bereavementEpisodes || []).find((episode) => !episode.completed) || null; }

export function bereavementDisposition(animal, episode, context = {}) {
  if (!episode || episode.completed) return null;
  if (context.survivalEmergency || context.immediateThreat) return { kind: "defer", score: 0, reason: "survival need overrides bereavement" };
  const corpseAge = Number(context.corpseAgeHours) || 0, atBody = Boolean(context.atBody), bodyAvailable = Boolean(context.bodyAvailable);
  const care = clamp(Number(animal?.careAffinity) || .5, 0, 1.25), aggression = clamp(Number(animal?.aggression) || 0, 0, 1), fear = clamp(Number(animal?.fear) || 0, 0, 100) / 100;
  if (!episode.confirmed && bodyAvailable) return { kind: "investigate", score: 170 + episode.griefIntensity * 180 };
  if (episode.dangerIntensity > .72 && fear > aggression && animal?.speciesId === "grazer") return { kind: "avoid-site", score: 210 + fear * 130 };
  if (episode.attackerId && episode.attackerConfidence >= .68 && episode.retaliationIntention >= .38 && episode.ageHours <= episode.maximumPursuitHours) {
    if (context.attackerVisible && context.combatAdvantage >= .72) return { kind: context.allies >= 2 ? "rally-retaliation" : "confront-killer", score: 250 + episode.retaliationIntention * 260 };
    if (context.distanceFromDeath <= episode.maximumPursuitDistance && context.lastKnown) return { kind: "track-killer", score: 150 + episode.retaliationIntention * 210 };
  }
  if (atBody && corpseAge < 36 && episode.attendanceHours < 4 + care * 12) return { kind: care > .72 ? "guard-body" : "attend-body", score: 120 + episode.griefIntensity * 175 };
  if (bodyAvailable && corpseAge < 48 && episode.griefIntensity > .3) return { kind: "return-to-body", score: 95 + episode.griefIntensity * 130 };
  return { kind: "seek-social-support", score: 55 + episode.griefIntensity * 90 };
}
