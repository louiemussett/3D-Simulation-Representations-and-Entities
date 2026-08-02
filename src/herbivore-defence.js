const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const stageDanger = Object.freeze({ dependent: .16, juvenile: .38, subadult: .68, adult: 1, old: .78 });

export function assessHerbivoreDefence(context = {}) {
  const predator = context.predator || {}, herbivore = context.herbivore || {};
  const herdAdults = Math.max(0, context.herdAdults || 0), protectingYoung = Boolean(context.protectingYoung);
  const predatorDanger = (stageDanger[predator.lifeStage] ?? .85) * clamp((predator.health ?? 100) / 100, .2, 1) * clamp((predator.energy ?? 70) / 70, .35, 1) + (context.adultPredatorsNearby || 0) * .55 + (context.rememberedThreat || 0) * .45;
  const condition = clamp(Math.min(herbivore.health ?? 100, herbivore.energy ?? 70) / 75, .15, 1.15);
  const confidence = clamp((herbivore.aggression || 0) * .55 + (herbivore.careAffinity || 0) * (protectingYoung ? .5 : .16) + Math.min(5, herdAdults) * .13, 0, 1.5) * condition;
  const numericalAdvantage = (herdAdults + 1) / Math.max(1, 1 + (context.adultPredatorsNearby || 0));
  const hasIntentEvidence = context.targetLikelihood != null || context.attackImminence != null || context.intentConfidence != null;
  const targetLikelihood = clamp(context.targetLikelihood || 0), imminence = clamp(context.attackImminence || 0), intentConfidence = clamp(context.intentConfidence || 0), thresholds = context.thresholds || { prepare: .35, flee: .62, emergency: .82 };
  let action = "watch";
  if (context.attackInProgress || imminence >= thresholds.emergency || (protectingYoung && context.distance <= 3 && targetLikelihood >= thresholds.prepare)) action = confidence + numericalAdvantage * .08 >= predatorDanger * .72 ? "attack" : "flee";
  else if ((!hasIntentEvidence && (predatorDanger > confidence + .28 || condition < .55)) || (targetLikelihood >= thresholds.flee && intentConfidence >= .32) || (predatorDanger > confidence + .28 && targetLikelihood >= thresholds.prepare) || condition < .55 && targetLikelihood >= thresholds.prepare) action = "flee";
  else if (herdAdults >= 2 && confidence >= predatorDanger * .72) action = (protectingYoung || (herbivore.aggression || 0) >= .62) && numericalAdvantage >= 2.2 ? "attack" : "mob";
  else if (context.distance < 2.2 && confidence < predatorDanger && targetLikelihood >= thresholds.prepare) action = "withdraw";
  const urgency = clamp(20 + predatorDanger * 35 + targetLikelihood * intentConfidence * 90 + imminence * 55 + (protectingYoung ? 25 : 0) + (context.attackInProgress ? 90 : 0), 0, 220);
  return { action, urgency, predatorDanger: clamp(predatorDanger, 0, 2), defensiveConfidence: clamp(confidence, 0, 2), numericalAdvantage, targetLikelihood, attackImminence: imminence, intentConfidence };
}
