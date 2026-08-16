const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, Number(value) || 0));

export const EMERGENCY_PROTOCOLS = Object.freeze({
  "straight-escape-burst": Object.freeze({ label: "Straight escape burst", trigger: "direct pursuit with an open route", phases: ["release", "burst", "recover"] }),
  "burst-to-group": Object.freeze({ label: "Burst toward protective group", trigger: "reachable allies improve survival", phases: ["release", "burst", "join", "recover"] }),
  "lateral-evasion": Object.freeze({ label: "Lateral evasion burst", trigger: "contact is imminent and direct flight is failing", phases: ["release", "evade", "recover"] }),
  "offspring-defence-burst": Object.freeze({ label: "Offspring defence burst", trigger: "a dependent is under immediate threat", phases: ["release", "intercept", "defend", "recover"] }),
  "last-reserve-water-dash": Object.freeze({ label: "Last-reserve water dash", trigger: "dehydration failure precedes ordinary arrival", phases: ["release", "travel", "contact", "acquire", "recover"] }),
});

export function emergencyReleaseAssessment(animal = {}, context = {}) {
  const reserve = clamp(animal.emergencyReserve ?? animal.emergencyEnergy ?? 0), dependent = animal.lifeStage === "dependent";
  const available = reserve > .001, physicallyEligible = !dependent && animal.alive !== false && (animal.health ?? 100) > 0;
  const pursuit = Boolean(context.directPursuit || context.targeted || context.pursuerId || animal.threatAssessment?.targeted);
  const contactEta = Number(context.contactEta ?? animal.threatAssessment?.contactEta ?? Infinity);
  const safetyEta = Number(context.safetyEta ?? Infinity), distanceTrend = Number(context.distanceTrend ?? animal.threatAssessment?.distanceTrend ?? 0);
  const ordinaryEndurance = clamp((100 - Number(animal.fatigue || 0)) / 100), sprint = clamp((animal.sprintEnergy || 0) / 100);
  const injury = clamp(1 - Number(animal.health ?? 100) / Math.max(1, Number(animal.healthCap ?? 100)));
  const ordinaryEscapeViability = clamp(sprint * .42 + ordinaryEndurance * .33 + Number(context.routeQuality ?? .6) * .25 - injury * .35 - Number(context.congestion || 0) * .2);
  const imminence = Number.isFinite(contactEta) ? clamp(1 - contactEta / Math.max(.1, Number(context.emergencyHorizon ?? 1.5))) : 0;
  const closure = clamp(Number(context.closurePressure ?? (distanceTrend < 0 ? Math.min(1, -distanceTrend) : 0)));
  const targetLikelihood = clamp(context.targetLikelihood ?? (pursuit ? .9 : animal.threatAssessment?.targetLikelihood || 0));
  const dehydrationFailure = Boolean(context.predictedDehydrationFailure);
  const dependentThreat = clamp(context.dependentThreat || 0);
  const releasePressure = clamp(Math.max(
    pursuit ? targetLikelihood * .35 + imminence * .35 + (1 - ordinaryEscapeViability) * .2 + closure * .1 : 0,
    dehydrationFailure ? .82 : 0,
    dependentThreat * (.55 + Number(animal.careAffinity || 0) * .35)
  ));
  const ageCost = animal.lifeStage === "old" ? .38 : animal.lifeStage === "adult" ? .18 : .08;
  const expectedUseCost = clamp(ageCost + injury * .28 + Number(context.postUseCollapseRisk || 0) * .34);
  const expectedWithholdingCost = clamp(releasePressure + (context.immediateLethalThreat ? .35 : 0));
  const threshold = clamp(.44 + Number(animal.commitmentProfile?.evidenceThreshold || .5) * .2 - Number(animal.commitmentProfile?.decisiveness || .5) * .08);
  const behaviourallyJustified = expectedWithholdingCost > expectedUseCost + threshold * .22;
  const released = available && physicallyEligible && behaviourallyJustified;
  let protocolId = "straight-escape-burst";
  if (dependentThreat > .65) protocolId = "offspring-defence-burst";
  else if (dehydrationFailure) protocolId = "last-reserve-water-dash";
  else if (context.alliesReachable && safetyEta < contactEta * 2.2) protocolId = "burst-to-group";
  else if (imminence > .75 && ordinaryEscapeViability < .4) protocolId = "lateral-evasion";
  const reason = !available ? "no emergency reserve remains" : !physicallyEligible ? dependent ? "dependants cannot release emergency reserve" : "physical state prevents emergency exertion" : released ? `${EMERGENCY_PROTOCOLS[protocolId].label} is justified because withholding has the worse predicted outcome` : !pursuit && !dehydrationFailure && dependentThreat <= 0 ? "no survival-critical trigger is present" : "ordinary action remains safer than paying the emergency cost";
  return Object.freeze({ available, physicallyEligible, behaviourallyJustified, released, reserve, releasePressure, ordinaryEscapeViability, expectedUseCost, expectedWithholdingCost, contactEta, safetyEta, distanceTrend, targetLikelihood, protocolId, decision: released ? "release" : "withhold", reason, confidence: clamp(.45 + Math.abs(expectedWithholdingCost - expectedUseCost) * .5) });
}

export function recordEmergencyAssessment(animal, assessment, tick = 0) {
  animal.emergencyAudit ||= { assessments: 0, releases: 0, withholds: 0, reserveAtDeath: null, episodes: [] };
  animal.emergencyAudit.assessments += 1;
  animal.emergencyAudit[assessment.released ? "releases" : "withholds"] += 1;
  animal.emergencyAudit.last = { ...assessment, tick };
  if (assessment.released) animal.emergencyAudit.episodes.push({ startedTick: tick, protocolId: assessment.protocolId, reserveBefore: assessment.reserve, reason: assessment.reason, status: "active" });
  if (animal.emergencyAudit.episodes.length > 16) animal.emergencyAudit.episodes.splice(0, animal.emergencyAudit.episodes.length - 16);
  return animal.emergencyAudit;
}

