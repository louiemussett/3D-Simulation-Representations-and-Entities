const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, Number(value) || 0));
const stageDanger = Object.freeze({ dependent: .16, juvenile: .38, subadult: .68, adult: 1, old: .78 });

export function assessHerbivoreDefence(context = {}) {
  // The legacy adapter exists for isolated callers and tests while runtime
  // decisions pass a ThreatHypothesis. It deliberately projects only cues an
  // observer could classify; exact predator health and energy are ignored.
  const legacyThreat = context.predator ? { observedCondition: { apparentLifeStage: context.predator.lifeStage || null, confidence: context.predator.lifeStage ? 1 : 0 }, motion: { distance: { estimate: context.distance, minimum: context.distance, maximum: context.distance } }, multiplicity: { probableCount: 1 + Math.max(0, context.adultPredatorsNearby || 0) }, targeting: { probability: context.targetLikelihood || 0, confidence: context.intentConfidence || 0 }, danger: { approachRisk: context.attackImminence || 0, uncertaintyRisk: context.intentConfidence ? 0 : .4 } } : null;
  const threat = context.threatHypothesis || legacyThreat || {}, apparent = threat.observedCondition || {}, herbivore = context.herbivore || {};
  const herdAdults = Math.max(0, context.herdAdults || 0), protectingYoung = Boolean(context.protectingYoung);
  const perceivedStage = apparent.apparentLifeStage, stageConfidence = clamp(apparent.confidence || 0, 0, 1), stageFactor = stageDanger[perceivedStage] ?? .85;
  const apparentInjuryPenalty = apparent.apparentInjury ? clamp(Number(apparent.apparentInjury.severity ?? apparent.apparentInjury) || 0, 0, 1) * .28 * stageConfidence : 0;
  const apparentFatiguePenalty = apparent.apparentFatigue ? clamp(Number(apparent.apparentFatigue.severity ?? apparent.apparentFatigue) || 0, 0, 1) * .18 * stageConfidence : 0;
  const predatorDanger = Math.max(.2, stageFactor - apparentInjuryPenalty - apparentFatiguePenalty) + Math.max(0, Number(threat.multiplicity?.probableCount || 1) - 1) * .55 + (context.rememberedThreat || 0) * .45 + clamp(threat.danger?.uncertaintyRisk || 0) * .35;
  const condition = clamp(Math.min(herbivore.health ?? 100, herbivore.energy ?? 70) / 75, .15, 1.15);
  const confidence = clamp((herbivore.aggression || 0) * .55 + (herbivore.careAffinity || 0) * (protectingYoung ? .5 : .16) + Math.min(5, herdAdults) * .13, 0, 1.5) * condition;
  const numericalAdvantage = (herdAdults + 1) / Math.max(1, 1 + (context.adultPredatorsNearby || 0));
  const targetLikelihood = clamp(threat.targeting?.probability ?? context.targetLikelihood ?? 0), imminence = clamp(threat.danger?.approachRisk ?? context.attackImminence ?? 0), intentConfidence = clamp(threat.targeting?.confidence ?? context.intentConfidence ?? 0), thresholds = context.thresholds || { prepare: .35, flee: .62, emergency: .82 };
  // Zero-filled estimates are absence of evidence, not reliable evidence of
  // benign intent. Treating them as evidence suppressed the ordinary danger
  // fallback and allowed a predator to approach while prey merely watched it.
  const hasIntentEvidence = intentConfidence >= .12 && (targetLikelihood > .02 || imminence > .02);
  const estimatedDistance = threat.motion?.distance?.estimate ?? context.distance, minimumDistance = threat.motion?.distance?.minimum ?? estimatedDistance;
  const closeDanger = Number.isFinite(minimumDistance) && minimumDistance <= 3.4 && predatorDanger > confidence * .72;
  let action = "watch";
  if (context.attackInProgress || imminence >= thresholds.emergency || (protectingYoung && minimumDistance <= 3 && targetLikelihood >= thresholds.prepare)) action = confidence + numericalAdvantage * .08 >= predatorDanger * .72 ? "attack" : "flee";
  else if (closeDanger || (!hasIntentEvidence && (predatorDanger > confidence + .28 || condition < .55)) || (targetLikelihood >= thresholds.flee && intentConfidence >= .32) || (predatorDanger > confidence + .28 && targetLikelihood >= thresholds.prepare) || condition < .55 && targetLikelihood >= thresholds.prepare) action = "flee";
  else if (herdAdults >= 2 && confidence >= predatorDanger * .72) action = (protectingYoung || (herbivore.aggression || 0) >= .62) && numericalAdvantage >= 2.2 ? "attack" : "mob";
  else if (minimumDistance < 2.2 && confidence < predatorDanger && targetLikelihood >= thresholds.prepare) action = "withdraw";
  const urgency = clamp(20 + predatorDanger * 35 + targetLikelihood * intentConfidence * 90 + imminence * 55 + (protectingYoung ? 25 : 0) + (context.attackInProgress ? 90 : 0), 0, 220);
  return { action, urgency, predatorDanger: clamp(predatorDanger, 0, 2), defensiveConfidence: clamp(confidence, 0, 2), numericalAdvantage, targetLikelihood, attackImminence: imminence, intentConfidence, estimatedDistance, informationBoundary: "observer-owned-threat-hypothesis" };
}
