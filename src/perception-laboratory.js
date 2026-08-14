const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, Number(value) || 0));
import { latencyDiagnostic } from "./perception-latency.js";
import { HUMAN_PERCEPTION_REFERENCE } from "./scientific-evidence.js";
import { TEMPORAL_VISION_PROFILES, TEMPORAL_VISION_RESEARCH_SOURCES } from "./temporal-vision.js";

export function sensorAnatomyDiagnostic(animal = {}, definitions = []) {
  return Object.freeze(definitions.map(sensor => Object.freeze({ id: sensor.id, type: sensor.type, anatomicalParent: sensor.anatomicalParent || "unknown", localPosition: Object.freeze([...(sensor.localPosition || [0, 0, 0])]), orientationDegrees: Number(sensor.yawDegrees || 0) + Number(sensor.currentYawRadians || 0) * 180 / Math.PI, fieldDegrees: Number.isFinite(sensor.fieldDegrees) ? sensor.fieldDegrees : null, mobility: sensor.currentYawRadians == null ? "fixed/unspecified" : "currently oriented", evidenceGrade: sensor.evidenceGrade || "profile-derived", visibleGeometryRequired: sensor.visibleGeometryRequired !== false, informationBoundary: "diagnostic-anatomy-only" })));
}

export function temporalMotionDiagnostic(contacts = []) {
  return Object.freeze(contacts.filter(item => item.channel === "sight" && item.temporalResolution).slice(0, 16).map(item => Object.freeze({ evidenceId: item.evidenceId || item.id || null, subject: item.identifiedIndividual || item.identifiedSpecies || item.coarseClass || item.type || "unidentified", effectiveHz: item.temporalResolution.effectiveHz, referenceHz: item.temporalResolution.referenceHz, sampleIntervalSeconds: item.temporalResolution.sampleIntervalSeconds, motionDetected: Boolean(item.detectedMotion), motionConfidence: clamp(item.motionConfidence || 0), velocityConfidence: clamp(item.velocityConfidence || 0), velocityUncertainty: item.velocityUncertainty ?? null, illuminationFactor: item.temporalResolution.lightFactor, attentionFactor: item.temporalResolution.attentionFactor, fatigueFactor: item.temporalResolution.fatigueFactor, thermalFactor: item.temporalResolution.thermalFactor, evidenceGrade: item.temporalResolution.evidenceGrade || "unknown" })));
}

export function truthPerceptionTraceInspection(truthRecords = [], perceived = []) {
  const observations = perceived.filter(item => item.traceKind);
  return Object.freeze(truthRecords.slice(0, 48).map(record => {
    const match = observations.find(item => item.traceKind === record.kind && Math.hypot(Number(item.x) - Number(record.x), Number(item.z) - Number(record.z)) <= 1.25);
    return Object.freeze({ truth: Object.freeze({ kind: record.kind, sourceId: record.sourceId || null, speciesId: record.speciesId || null, x: record.x, z: record.z, intensity: clamp(record.intensity), ageHours: Number(record.ageHours || 0), substrate: record.substrate || null, overwrittenBy: record.overwrittenBy || null }), perceived: match ? Object.freeze({ detected: true, channel: match.channel, confidence: clamp(match.confidence), freshness: match.freshness || null, identifiedSpecies: match.identifiedSpecies || null, identifiedIndividual: match.identifiedIndividual || null, uncertainty: match.uncertainty ?? null }) : Object.freeze({ detected: false, reason: "No matching trace entered this animal's current sensory evidence." }) });
  }));
}

export function causalWhyDiagnostic(animal = {}) {
  const trace = animal.decisionTrace || animal.rss?.current || null, priorities = animal.priorities || [], chosen = priorities[0] || { drive: animal.drive || trace?.selectedPriority?.key || "unknown", score: trace?.selectedPriority?.score || 0 }, evidence = trace?.evidence || animal.sensoryBuffer || [], primary = evidence.find(item => item.evidenceId === trace?.primaryEvidenceId) || evidence.slice().sort((a, b) => (b.confidence || 0) - (a.confidence || 0))[0] || null;
  const chain = [primary ? `${primary.channel || primary.provenance || "sensory"} evidence: ${primary.type || "observation"} (${Math.round(clamp(primary.confidence) * 100)}% confidence)` : "No primary external evidence was recorded", `candidate selected: ${chosen.drive} (score ${Math.round(Number(chosen.score || 0))})`, animal.commitmentState?.priority ? `commitment: ${animal.commitmentState.priority}${animal.commitmentState.status ? ` · ${animal.commitmentState.status}` : ""}` : "no retained commitment was recorded", `action: ${animal.actionState?.key || trace?.actionKey || "unknown"}${animal.actionState?.intendedOutcome ? ` → ${animal.actionState.intendedOutcome}` : ""}`];
  const whyNot = priorities.slice(1, 8).map(candidate => Object.freeze({ alternative: candidate.drive, score: Number(candidate.score || 0), reason: Number(candidate.score || 0) < Number(chosen.score || 0) ? `ranked ${Math.round(Number(chosen.score || 0) - Number(candidate.score || 0))} points below the selected candidate` : "not selected under the recorded commitment or feasibility rules" }));
  const flee = priorities.find(item => /flee|escape|safety|defend|predator/.test(item.drive || ""));
  let whyNotFlee;
  if (/flee|escape/.test(animal.actionState?.key || chosen.drive || "")) whyNotFlee = "It is currently fleeing or escaping.";
  else if (!flee) whyNotFlee = (animal.threatAssessment?.score || 0) > 0 ? "Threat evidence exists, but no flee candidate crossed the current eligibility threshold." : "No qualifying immediate-threat evidence produced a flee candidate.";
  else if (Number(flee.score || 0) < Number(chosen.score || 0)) whyNotFlee = `Fleeing scored ${Math.round(flee.score || 0)}, below ${chosen.drive} at ${Math.round(chosen.score || 0)}.`;
  else whyNotFlee = "Fleeing was eligible but was not selected; inspect commitment and feasibility constraints for the unresolved cause.";
  return Object.freeze({ chosen: Object.freeze({ drive: chosen.drive, score: Number(chosen.score || 0), action: animal.actionState?.key || trace?.actionKey || "unknown" }), chain: Object.freeze(chain), whyNot: Object.freeze(whyNot), whyNotFlee, constraints: Object.freeze([...(trace?.constraints || [])]), explanationStatus: trace ? "recorded-causal-evidence" : "current-state-fallback" });
}

export function gazeControlDiagnostic(animal = {}) {
  const state = animal.orientingState || {};
  return Object.freeze({ targetId: state.targetId || null, channel: state.channel || null, confidence: clamp(state.confidence), leftEyeYawDegrees: Number(state.leftEyeYaw || 0) * 180 / Math.PI, rightEyeYawDegrees: Number(state.rightEyeYaw || 0) * 180 / Math.PI, convergenceDegrees: Number(state.convergence || 0) * 180 / Math.PI, stabilization: clamp(state.gazeStabilization), headYawDegrees: Number(animal.headYaw || 0) * 180 / Math.PI, pupilDriver: Object.freeze({ illumination: animal.illumination ?? null, arousal: Math.max(Number(animal.fear || 0) / 100, Number(animal.stressResponse?.intensity || 0)) }), informationBoundary: "observable-control-state; target identity requires animal evidence" });
}

export function perceptionLatencyDiagnostic(animal = {}) { return latencyDiagnostic(animal); }

export function perceptionResearchReadiness() {
  const profiles = Object.values(TEMPORAL_VISION_PROFILES), exact = profiles.filter(profile => ["measured-exact-species", "observed-exact-species", "inferred-exact-species"].includes(profile.evidenceGrade) && profile.sourceIds?.length).length;
  const grades = Object.freeze(Object.fromEntries([...new Set(profiles.map(profile => profile.evidenceGrade))].sort().map(grade => [grade, profiles.filter(profile => profile.evidenceGrade === grade).length])));
  const gaps = Object.freeze(profiles.filter(profile => !["measured-exact-species", "observed-exact-species", "inferred-exact-species"].includes(profile.evidenceGrade) || !profile.sourceIds?.length).map(profile => Object.freeze({ speciesId: profile.speciesId, evidenceGrade: profile.evidenceGrade, plausibleRangeHz: profile.plausibleRangeHz, proxyTaxon: profile.proxyTaxon, knownGap: profile.knownGap })));
  return Object.freeze({ profileCount: profiles.length, exactAndSourced: exact, proxyOrComposite: profiles.length - exact, complete: exact === profiles.length, grades, sourceLedger: TEMPORAL_VISION_RESEARCH_SOURCES, unresolvedProfiles: gaps, humanReference: HUMAN_PERCEPTION_REFERENCE, warning: exact === profiles.length ? null : "Runtime profiles remain usable declared models, but exact-species literature provenance is incomplete." });
}
