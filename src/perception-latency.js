const clamp = (value, low, high) => Math.max(low, Math.min(high, Number(value) || 0));
export const PERCEPTION_LATENCY_SCHEMA = 2;

function stage(stageName, tick, offsetSeconds, latencySeconds, extra = {}) {
  return Object.freeze({ stage: stageName, tick, offsetSeconds, atEcologicalMinute: Number(tick) + offsetSeconds / 60, latencySeconds, ...extra });
}

export function biologicalLatencyProfile(animal = {}, { temporalResolutionHz = 60, confidence = .5, thermalPerformance = animal.thermalPerformance ?? 1 } = {}) {
  const temporal = Math.max(1, Number(temporalResolutionHz) || 60), certainty = clamp(confidence, 0, 1), thermal = clamp(thermalPerformance, .1, 1);
  const accumulation = clamp((1 / temporal) * (1.25 + (1 - certainty) * 2.4), .012, .42);
  const recognition = clamp(.045 + (1 - certainty) * .31, .04, .48);
  const decision = clamp(.07 + (animal.fatigue || 0) / 520 + (1 - certainty) * .16, .06, .52);
  const motor = clamp((.055 + (animal.fatigue || 0) / 650) / thermal, .05, .68);
  return Object.freeze({ accumulationSeconds: accumulation, recognitionSeconds: recognition, decisionSeconds: decision, motorSeconds: motor, totalSeconds: accumulation + recognition + decision + motor });
}

export function recordPerceptionLatency(animal, observation = {}, tick = 0) {
  const profile = biologicalLatencyProfile(animal, { temporalResolutionHz: observation.temporalResolution?.effectiveHz, confidence: observation.confidence, thermalPerformance: animal.thermalPerformance });
  const key = observation.evidenceId || observation.id || `${observation.channel || "sense"}:${observation.targetId || observation.type || "unknown"}`;
  animal.perceptionLatency ||= { schemaVersion: PERCEPTION_LATENCY_SCHEMA, active: {}, history: [] };
  const existing = animal.perceptionLatency.active[key], record = existing || { evidenceId: key, targetId: observation.targetId || null, channel: observation.channel || null, firstSensedTick: tick, stages: [] };
  if (!existing) record.stages.push(stage("sensory-accumulation", tick, 0, profile.accumulationSeconds));
  record.recognisedTick = tick; record.profile = profile; record.stages = record.stages.filter(item => item.stage !== "recognition"); record.stages.push(stage("recognition", tick, profile.accumulationSeconds, profile.recognitionSeconds));
  animal.perceptionLatency.active[key] = record;
  return record;
}

export function recordDecisionAndMotorLatency(animal, tick = 0, actionKey = "unknown") {
  const active = Object.values(animal.perceptionLatency?.active || {}).sort((a, b) => (b.recognisedTick || 0) - (a.recognisedTick || 0))[0];
  if (!active) return null;
  active.stages = active.stages.filter(stage => !["decision", "motor-command", "physical-response"].includes(stage.stage));
  const recognitionEnd = active.profile.accumulationSeconds + active.profile.recognitionSeconds;
  const decisionEnd = recognitionEnd + active.profile.decisionSeconds;
  const responseOnset = decisionEnd + active.profile.motorSeconds;
  active.stages.push(stage("decision", tick, recognitionEnd, active.profile.decisionSeconds), stage("motor-command", tick, decisionEnd, active.profile.motorSeconds), stage("physical-response", tick, responseOnset, 0, { actionKey }));
  active.responseOnsetSeconds = responseOnset;
  active.completedTick = tick; animal.perceptionLatency.history.push(Object.freeze({ ...active, stages: Object.freeze(active.stages.map(Object.freeze)) }));
  animal.perceptionLatency.history = animal.perceptionLatency.history.slice(-24); delete animal.perceptionLatency.active[active.evidenceId];
  return active;
}

export function latencyDiagnostic(animal = {}) {
  return Object.freeze([...(animal.perceptionLatency?.history || []), ...Object.values(animal.perceptionLatency?.active || {})].slice(-16).map(record => Object.freeze({ evidenceId: record.evidenceId, targetId: record.targetId, channel: record.channel, totalSeconds: record.profile?.totalSeconds || 0, complete: Boolean(record.completedTick), stages: Object.freeze((record.stages || []).map(stage => Object.freeze({ ...stage }))) })));
}
