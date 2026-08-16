export function acousticCausalChain(event, propagation, observation, interpretation = null, action = null) {
  if (!event) return Object.freeze({ status: "unexplained", message: "No authoritative sound event was recorded." });
  const stages = [
    { stage: "world-event", passed: true, detail: `${event.soundClass} emitted by ${event.sourceId}` },
    { stage: "canonical-score", passed: Boolean(event.acousticScore), detail: event.acousticScore ? `${event.acousticScore.scoreId}; ${event.acousticScore.productionMechanism}; ${event.acousticScore.evidence.grade}` : "Non-vocal physical sound; no animal acoustic score" },
    { stage: "emission", passed: true, detail: `${event.sourceLevelDb.toFixed(1)} dB SPL at 1 m; centre ${event.centreFrequencyHz} Hz; ${event.context?.movement || "unknown movement"}; ${event.context?.posture || "unknown posture"}` },
    { stage: "propagation", passed: Boolean(propagation), detail: propagation ? `${propagation.distance.toFixed(1)} m; best received SNR ${Math.max(...propagation.signalToNoiseDb).toFixed(1)} dB` : "No propagation record" },
    { stage: "receiver-sensors", passed: Boolean(observation), detail: observation ? `Detection margin ${observation.detectionMarginDb.toFixed(1)} dB` : "No receiver observation" },
    { stage: "detection", passed: Boolean(observation?.detected), detail: observation?.detected ? `Detected at ${Math.round(observation.confidence * 100)}% confidence` : "Below biological or masking threshold" },
    { stage: "interpretation", passed: Boolean(interpretation?.interpretedSignalKind || observation?.recognisedSignalKind), detail: interpretation?.interpretedSignalKind || observation?.recognisedSignalKind || "Detected sound was not assigned a meaning" },
    { stage: "selected-action", passed: Boolean(action), detail: action || "No action was selected from this evidence alone" }
  ];
  return Object.freeze({ status: observation?.detected ? "detected" : "not-detected", stages: Object.freeze(stages.map(stage => Object.freeze(stage))), why: observation?.explanation || null });
}

export function acousticLaboratoryRecord(event, propagation = null, observation = null, rendererLanguage = null) {
  if (!event) return Object.freeze({ status: "unavailable", message: "No authoritative sound event is selected." });
  const score = event.acousticScore || null;
  return Object.freeze({
    status: "available",
    eventId: event.eventId,
    entityId: event.sourceId,
    speciesId: event.speciesId,
    scientificName: score?.scientificName || null,
    modelBasis: score?.modelBasis || null,
    callType: score?.callId || event.synthesis?.mechanism || event.soundClass,
    behaviouralTrigger: event.context?.behaviouralTrigger || "unknown",
    movement: event.context?.movement || "unknown",
    posture: event.context?.posture || "unknown",
    socialContext: event.context?.social || "unknown",
    scoreId: score?.scoreId || null,
    evidenceGrade: score?.evidence?.grade || event.evidence?.grade || "unknown",
    sourceIds: Object.freeze([...(score?.evidence?.sourceIds || event.evidence?.sourceIds || [])]),
    extractionMethod: score?.evidence?.extractionMethod || "physical procedural model",
    contour: score?.frequencyContour || null,
    amplitudeEnvelope: score?.amplitudeEnvelope || null,
    formants: score?.formants || null,
    rhythm: score?.rhythm || null,
    individualTransformations: score?.individual || event.synthesis || null,
    emphasizedFeatures: score?.distinctiveness?.emphasized || [],
    permittedRange: score?.distinctiveness?.boundedBy || null,
    propagationLosses: propagation?.componentLosses || null,
    receiverDetection: observation ? Object.freeze({ detected: observation.detected, marginDb: observation.detectionMarginDb, confidence: observation.confidence, interpretation: observation.recognisedSignalKind }) : null,
    rendererLanguage: rendererLanguage || "not rendered",
    literalReconstruction: rendererLanguage === "natural-reconstruction",
    referenceRecordingPlayedAtRuntime: false
  });
}

export function explainLatestAcousticObservation(animal) {
  const observation = animal?.acousticObservations?.at(-1);
  if (!observation) return "No acoustic observation has been recorded for this organism.";
  if (!observation.detected) return `The signal was missed: its strongest band remained ${Math.abs(observation.detectionMarginDb).toFixed(1)} dB below the effective hearing and masking threshold.`;
  const recognition = observation.recognisedSignalKind ? ` It was interpreted as ${observation.recognisedSignalKind} at ${Math.round(observation.recognitionConfidence * 100)}% confidence.` : " It was detected but not assigned a reliable meaning.";
  const score = observation.acousticScoreId ? ` Canonical score: ${observation.acousticScoreId}; renderer choice does not affect this detection.` : "";
  return `The signal was heard with a ${observation.detectionMarginDb.toFixed(1)} dB detection margin; bearing uncertainty was ±${observation.bearingUncertaintyDegrees.toFixed(1)}°.${recognition}${score}`;
}
