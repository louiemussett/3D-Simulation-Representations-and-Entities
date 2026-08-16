const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, Number(value) || 0));
export const PROXIMITY_BAND_SCHEMA = 1;
export const THREAT_BANDS = Object.freeze(["neutral", "monitoring", "vigilance", "withdrawal", "flight", "defence"]);

export function validateProximityBands(profile = {}) {
  const ordered = profile.monitoringEnter >= profile.vigilanceEnter && profile.vigilanceEnter >= profile.withdrawalEnter && profile.withdrawalEnter >= profile.flightEnter && profile.flightEnter >= profile.defenceEnter && profile.defenceEnter >= profile.contactTolerance;
  const releases = profile.monitoringRelease >= profile.monitoringEnter && profile.vigilanceRelease >= profile.vigilanceEnter && profile.withdrawalRelease >= profile.withdrawalEnter && profile.flightRelease >= profile.flightEnter && profile.defenceRelease >= profile.defenceEnter;
  return ordered && releases && profile.preferredMinimum <= profile.preferredMaximum && Object.values(profile).filter(Number.isFinite).every(value => value >= 0);
}

export function constructProximityBands(observer = {}, other = {}, relationship = {}, observation = {}, profile = {}, context = {}) {
  const contact = Math.max(.2, Number(profile.bodySpan || context.contactSpan || .5));
  const intent = clamp(context.intentPressure), uncertainty = clamp((observation.distanceUncertainty || 0) / Math.max(1, observation.estimatedDistance || 1));
  const trust = clamp(relationship.trust, -1, 1), learnedThreat = clamp(relationship.threatExpectation), vulnerability = clamp(profile.vulnerability);
  const history = Math.min(.4, (relationship.attackCount || 0) * .16 + (relationship.pursuitCount || 0) * .06), threat = Boolean(profile.threat);
  let preferredMinimum = relationship.learnedPreferredMinimum ?? profile.baselineSocialSpacing * (1 - Math.max(0, trust) * .2);
  let preferredMaximum = relationship.learnedPreferredMaximum ?? preferredMinimum * (profile.bonded ? 2.2 : 1.65);
  preferredMinimum = Math.max(contact, preferredMinimum); preferredMaximum = Math.max(preferredMinimum + .1, preferredMaximum);
  const dangerScale = threat ? (1 + intent * .8 + learnedThreat * .35 + vulnerability * .3 + history + uncertainty * .25) * (relationship.learnedMonitoringScale || 1) : 1;
  const monitoringEnter = threat ? Math.max(preferredMaximum, profile.predatorMonitoringScale * dangerScale) : preferredMaximum * (profile.competitive ? 1.6 : 1.25);
  const vigilanceEnter = Math.max(contact * 2.2, monitoringEnter * (threat ? .72 : .7));
  const withdrawalEnter = Math.max(contact * 1.75, monitoringEnter * (threat ? .48 : .5) * (relationship.learnedWithdrawalScale || 1));
  const flightEnter = Math.max(contact * 1.35, monitoringEnter * (threat ? .29 + intent * .08 : .3));
  const defenceEnter = Math.max(contact * 1.08, Math.min(flightEnter * .62, contact * 2));
  const release = (value, ratio = 1.22) => Math.max(value + .12, value * ratio);
  const result = { schemaVersion: PROXIMITY_BAND_SCHEMA, attractionOuter: profile.bonded ? preferredMaximum * (profile.care ? 2.5 : 1.8) : preferredMaximum,
    preferredMinimum, preferredMaximum, contactTolerance: contact, monitoringEnter, monitoringRelease: release(monitoringEnter, 1.12), vigilanceEnter, vigilanceRelease: release(vigilanceEnter),
    withdrawalEnter, withdrawalRelease: release(withdrawalEnter, 1.27), flightEnter, flightRelease: release(flightEnter, 1.32), defenceEnter, defenceRelease: release(defenceEnter, 1.4),
    uncertaintyExpansion: uncertainty, confidence: clamp((observation.individualConfidence || observation.speciesConfidence || .3) * (1 - uncertainty * .35)), evidenceGrade: profile.evidenceGrade || "composite-model", calculationVersion: 1 };
  if (!validateProximityBands(result)) throw new Error("Invalid proximity band ordering");
  return Object.freeze(result);
}

const enterBand = (distance, bands) => distance <= bands.defenceEnter ? "defence" : distance <= bands.flightEnter ? "flight" : distance <= bands.withdrawalEnter ? "withdrawal" : distance <= bands.vigilanceEnter ? "vigilance" : distance <= bands.monitoringEnter ? "monitoring" : "neutral";
export function proximityBandAtDistance(distance, bands, previousBand = "neutral") {
  const d = Math.max(0, Number(distance) || 0), releaseKey = `${previousBand}Release`;
  if (previousBand !== "neutral" && Number.isFinite(bands[releaseKey]) && d < bands[releaseKey]) {
    const entered = enterBand(d, bands), enteredIndex = THREAT_BANDS.indexOf(entered), previousIndex = THREAT_BANDS.indexOf(previousBand);
    return enteredIndex > previousIndex ? entered : previousBand;
  }
  return enterBand(d, bands);
}
