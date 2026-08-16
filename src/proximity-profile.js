const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, Number(value) || 0));

export function proximitySpeciesProfile(observer = {}, relationshipClass = "unknown-animal", context = {}) {
  const bodySpan = Math.max(.35, Number(context.contactSpan || .5));
  const stage = ({ dependent: .72, juvenile: .86, subadult: .94, adult: 1, old: 1.08 })[observer.lifeStage] || 1;
  const temperament = .8 + clamp(observer.personalSpaceTrait ?? .5) * .45;
  const threat = ["known-predator", "suspected-predator", "previous-attacker"].includes(relationshipClass);
  const care = ["caregiver", "dependent", "offspring"].includes(relationshipClass);
  const bonded = care || ["established-mate", "bonded-group-member", "familiar-group-member", "close-kin"].includes(relationshipClass);
  const competitive = ["resource-competitor", "social-rival", "territory-intruder"].includes(relationshipClass);
  return Object.freeze({ bodySpan, stage, temperament, threat, care, bonded, competitive,
    baselineSocialSpacing: bodySpan * (bonded ? 1.25 : competitive ? 2.4 : 1.8) * stage * temperament,
    predatorMonitoringScale: threat ? bodySpan * 18 * stage * temperament : bodySpan * 4,
    flightSensitivity: threat ? 1 : .15, groupCohesion: clamp(observer.herdTendency ?? .5), careAffinity: clamp(observer.careAffinity ?? .5),
    territorialSensitivity: clamp(observer.territoriality ?? observer.aggression ?? .35), vulnerability: clamp((100 - Number(observer.health ?? 100)) / 100 + Number(observer.fear || 0) / 180),
    evidenceGrade: "composite-model", confidence: .55 });
}
