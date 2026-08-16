const bounded = (value, low = 0, high = 1) => Math.max(low, Math.min(high, Number(value) || 0));

export function assessThreatEvidence(animal, contacts = [], { herbivore = true, rememberedThreat = () => 0, vulnerability = () => 0 } = {}) {
  if (!herbivore) return null;
  const contributors = [];
  let sightCount = 0, soundCount = 0, smellCount = 0, unknownCount = 0, sightScore = 0, soundScore = 0, smellScore = 0, unknownScore = 0, identityThreat = 0, confidenceComplement = 1;
  for (const item of contacts) {
    const predatorEvidence = item.type === "predator" || item.signalKind === "alarm" || item.signalKind === "threat";
    if (predatorEvidence) {
      contributors.push(item); confidenceComplement *= 1 - bounded(item.confidence);
      identityThreat = Math.max(identityThreat, rememberedThreat(animal, item.targetId) * 35);
      if (item.channel === "sight" || item.channel === "visual-signal") { sightCount += 1; sightScore += bounded(item.confidence) * 52 * (.75 + .25 * Number(item.motionConfidence ?? 1)); }
      if (item.channel === "hearing") { soundCount += 1; soundScore += bounded(item.confidence) * 31; }
      if (item.channel === "smell") { smellCount += 1; smellScore += bounded(item.confidence) * (item.targetId ? 68 : 20); }
    } else if (item.type === "unknownSound" && item.channel === "hearing" && item.confidence > .28) {
      contributors.push(item); confidenceComplement *= 1 - bounded(item.confidence); unknownCount += 1; unknownScore += bounded(item.confidence) * 12;
    }
  }
  const inferredIntent = Math.max(0, ...(animal.predatorIntentEstimates || []).map(estimate => bounded(estimate.selfTargetLikelihood) * bounded(estimate.confidence)));
  const score = bounded(sightScore + soundScore + smellScore + unknownScore + identityThreat + inferredIntent * 34, 0, 100);
  const parts = [];
  if (sightCount) parts.push(`${sightCount} predator sighting${sightCount > 1 ? "s" : ""}`);
  if (soundCount) parts.push(`${soundCount} alarm call${soundCount > 1 ? "s" : ""}`);
  if (smellCount) parts.push("predator scent");
  if (!parts.length && unknownCount) parts.push("unknown large-animal sound");
  return Object.freeze({ overallConfidence: score / 100, evidenceConfidence: 1 - confidenceComplement, contributors: Object.freeze(contributors), explanation: parts.length ? parts.join(" + ") : "no predator evidence" });
}

export function applyThreatAssessment(animal, assessment, vulnerability = () => 0) {
  animal.threatAssessment = assessment;
  const score = Number(assessment?.overallConfidence || 0) * 100;
  if (score > 0) animal.fear = bounded((animal.fear || 0) + Math.max(3, score * .5) + vulnerability(animal) * 8, 0, 100);
  return assessment;
}
