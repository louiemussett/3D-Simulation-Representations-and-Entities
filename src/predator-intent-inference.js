const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, value));
const angleDifference = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
const alignment = (heading, bearing) => heading == null ? null : clamp(1 - angleDifference(heading, bearing) / Math.PI);

// This model consumes only evidence available to the observer. In particular it
// never accepts a predator's private target or decision state.
export function inferPredatorIntent(evidence = {}, previous = null) {
  const distance = Math.max(.01, evidence.distance ?? 20);
  const body = alignment(evidence.bodyHeading, evidence.bearingToObserver);
  const head = alignment(evidence.headHeading, evidence.bearingToObserver);
  const closing = clamp((evidence.closingSpeed || 0) / .16);
  const acceleration = clamp((evidence.closingAcceleration || 0) / .06);
  const directness = clamp(evidence.routeDirectness ?? closing);
  const persistence = clamp((evidence.trackingDuration || 0) / 8);
  const posture = ({ patrol: .08, evaluate: .28, stalk: .72, chase: .94, attack: 1 })[evidence.observablePosture] || 0;
  const proximity = clamp(1 - distance / 18);
  const alternatives = clamp((evidence.alternativePrey || 0) / 5);
  const cover = clamp(evidence.cover || 0);
  const history = clamp(evidence.rememberedThreat || 0);
  const warning = clamp(evidence.companionWarning || 0);
  const observableCount = [body, head, evidence.closingSpeed, evidence.routeDirectness, evidence.observablePosture].filter(value => value != null).length;
  const confidence = clamp((evidence.observationConfidence || 0) * (.42 + observableCount * .1) + persistence * .12 - cover * .18);
  const presenceConfidence = clamp((evidence.observationConfidence || 0) * .86 + history * .09 + warning * .12);
  const detectionLikelihood = clamp((body ?? .35) * .28 + (head ?? body ?? .3) * .32 + proximity * .2 + persistence * .1 + posture * .1);
  let selfTargetLikelihood = clamp((body ?? .25) * .17 + (head ?? body ?? .25) * .23 + closing * .2 + directness * .16 + persistence * .1 + posture * .19 + history * .07 + warning * .05 - alternatives * .08 - cover * .08);
  let attackImminence = clamp(selfTargetLikelihood * .45 + proximity * .22 + closing * .13 + acceleration * .08 + posture * .22);
  if (previous) {
    const hysteresis = selfTargetLikelihood > previous.selfTargetLikelihood ? .42 : .24;
    selfTargetLikelihood = previous.selfTargetLikelihood + (selfTargetLikelihood - previous.selfTargetLikelihood) * hysteresis;
    attackImminence = previous.attackImminence + (attackImminence - previous.attackImminence) * hysteresis;
  }
  const level = attackImminence >= .78 ? "very-high" : selfTargetLikelihood >= .62 ? "high" : selfTargetLikelihood >= .34 ? "moderate" : "low";
  return { presenceConfidence, detectionLikelihood, selfTargetLikelihood, attackImminence, confidence, level, evidence: { bodyAlignment: body, headAlignment: head, closing, acceleration, directness, persistence, posture, proximity, alternatives, cover, history, warning } };
}

export function predatorIntentResponseThresholds(animal = {}) {
  const vigilance = clamp(animal.vigilanceSkill ?? .5), aggression = clamp(animal.aggression ?? .3), confidence = clamp(animal.confidence ?? .5);
  return {
    prepare: clamp(.39 - vigilance * .1 + confidence * .05, .24, .48),
    flee: clamp(.67 - vigilance * .08 + aggression * .06 + confidence * .05, .48, .78),
    emergency: clamp(.84 - vigilance * .05 + aggression * .04, .68, .92)
  };
}

export function shouldRecomputePredatorIntent(previous, evidence, tick) {
  if (!previous || tick - (previous.tick || 0) >= 3) return true;
  return Math.abs((previous.distance || 0) - (evidence.distance || 0)) > .65 || angleDifference(previous.bodyHeading || 0, evidence.bodyHeading || 0) > .18 || previous.observablePosture !== evidence.observablePosture;
}
