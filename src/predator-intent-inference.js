const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, value));
const angleDifference = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
const alignment = (heading, bearing) => heading == null ? null : clamp(1 - angleDifference(heading, bearing) / Math.PI);

// This model consumes only evidence available to the observer. In particular it
// never accepts a predator's private target or decision state.
export function inferPredatorIntent(evidence = {}, previous = null) {
  const distance = Math.max(.01, evidence.distance ?? 20);
  const body = alignment(evidence.bodyHeading, evidence.bearingToObserver);
  const head = alignment(evidence.headHeading, evidence.bearingToObserver);
  const closingKnown = Number.isFinite(evidence.closingSpeed), accelerationKnown = Number.isFinite(evidence.closingAcceleration), directnessKnown = Number.isFinite(evidence.routeDirectness);
  const closing = closingKnown ? clamp(evidence.closingSpeed / .16) : null;
  const acceleration = accelerationKnown ? clamp(evidence.closingAcceleration / .06) : null;
  const directness = directnessKnown ? clamp(evidence.routeDirectness) : null;
  const persistence = clamp((evidence.trackingDuration || 0) / 8);
  const posture = ({ patrol: .08, evaluate: .28, stalk: .72, chase: .94, attack: 1 })[evidence.observablePosture] || 0;
  const proximity = clamp(1 - distance / 18);
  const alternatives = clamp((evidence.alternativePrey || 0) / 5);
  const cover = clamp(evidence.cover || 0);
  const history = clamp(evidence.rememberedThreat || 0);
  const warning = clamp(evidence.companionWarning || 0);
  const motionConfidence = clamp(evidence.motionConfidence || 0), velocityConfidence = clamp(evidence.velocityConfidence || 0), uncertainty = clamp((evidence.velocityUncertainty || 0) / .5), directionUncertainty = clamp((evidence.directionUncertainty || 0) / Math.PI), agePenalty = clamp((evidence.observationAge || 0) / 10), clutter = clamp(evidence.environmentalClutter || 0), motionUnknown = evidence.motionState === "unknown" || !closingKnown;
  const observableCount = [body, head, closingKnown ? evidence.closingSpeed : null, directnessKnown ? evidence.routeDirectness : null, evidence.observablePosture].filter(value => value != null).length;
  const confidence = clamp((evidence.observationConfidence || 0) * (.35 + observableCount * .08) + persistence * .1 + motionConfidence * .08 + velocityConfidence * .12 - cover * .18 - uncertainty * .12 - directionUncertainty * .1 - agePenalty * .16 - clutter * .12);
  const presenceConfidence = clamp((evidence.observationConfidence || 0) * .86 + history * .09 + warning * .12);
  const detectionLikelihood = clamp((body ?? .35) * .28 + (head ?? body ?? .3) * .32 + proximity * .2 + persistence * .1 + posture * .1);
  const cautiousUnknownPrior = motionUnknown ? proximity * .16 + posture * .12 + history * .08 : 0;
  let selfTargetLikelihood = clamp((body ?? .25) * .17 + (head ?? body ?? .25) * .23 + (closing ?? 0) * .2 + (directness ?? 0) * .16 + persistence * .1 + posture * .19 + history * .07 + warning * .05 + cautiousUnknownPrior - alternatives * .08 - cover * .08);
  let attackImminence = clamp(selfTargetLikelihood * .45 + proximity * .22 + (closing ?? 0) * .13 + (acceleration ?? 0) * .08 + posture * .22 + (motionUnknown ? proximity * .08 : 0));
  if (previous) {
    const hysteresis = selfTargetLikelihood > previous.selfTargetLikelihood ? .42 : .24;
    selfTargetLikelihood = previous.selfTargetLikelihood + (selfTargetLikelihood - previous.selfTargetLikelihood) * hysteresis;
    attackImminence = previous.attackImminence + (attackImminence - previous.attackImminence) * hysteresis;
  }
  const level = attackImminence >= .78 ? "very-high" : selfTargetLikelihood >= .62 ? "high" : selfTargetLikelihood >= .34 ? "moderate" : "low";
  const unknownFeatures = [!closingKnown && "closing-speed", !directnessKnown && "route-directness", !accelerationKnown && "acceleration"].filter(Boolean), evidenceFor = [posture >= .7 && "pursuit-posture", (closing ?? 0) >= .45 && "observed-closing", persistence >= .4 && "persistent-tracking", (head ?? 0) >= .65 && "head-alignment"].filter(Boolean), evidenceAgainst = [alternatives >= .4 && "alternative-prey-visible", cover >= .5 && "observer-cover"].filter(Boolean);
  return { presenceConfidence, detectionLikelihood, selfTargetLikelihood, attackImminence, confidence, level, motionUnknown, unknownFeatures, evidenceFor, evidenceAgainst, evidence: { bodyAlignment: body, headAlignment: head, closing, acceleration, directness, persistence, posture, proximity, alternatives, cover, history, warning, motionConfidence, velocityConfidence, uncertainty, directionUncertainty, agePenalty, clutter } };
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
  return Math.abs((previous.distance || 0) - (evidence.distance || 0)) > .65 || angleDifference(previous.bodyHeading || 0, evidence.bodyHeading || 0) > .18 || previous.observablePosture !== evidence.observablePosture || previous.motionObservation?.motionState !== evidence.motionState || Math.abs((previous.motionObservation?.velocity?.confidence || 0) - (evidence.velocityConfidence || 0)) > .12;
}
