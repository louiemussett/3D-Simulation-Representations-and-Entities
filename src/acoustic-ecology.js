import { ACOUSTIC_FREQUENCY_BANDS_HZ, acousticProfile, supportedAcousticCall } from "./acoustic-profiles.js";
import { acousticScoreForEvent } from "./acoustic-score.js";
import { binauralEstimate } from "./auditory-localisation.js";

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const round = (value, places = 3) => Number(value.toFixed(places));
const hashString = value => { let hash = 2166136261; for (const character of String(value)) { hash ^= character.charCodeAt(0); hash = Math.imul(hash, 16777619); } return hash >>> 0; };
const stableUnit = value => hashString(value) / 4294967295;

export const ACOUSTIC_PROPAGATION_VERSION = "outdoor-hex-v1";

function bandLevel(centre, bandwidth, sourceLevel, frequency) {
  const octaves = Math.abs(Math.log2(frequency / Math.max(1, centre)));
  return sourceLevel - Math.max(0, octaves - bandwidth * .5) * 18 - octaves * octaves * 1.8;
}

export function createIndividualAcousticTraits(animal, worldSeed = 0) {
  const seed = `${worldSeed}:${animal.id}:${animal.speciesId}:${animal.sex || "?"}`;
  return Object.freeze({
    version: 2,
    voiceSeed: hashString(seed),
    pitchScale: round(.91 + stableUnit(`${seed}:pitch`) * .18),
    tempoScale: round(.9 + stableUnit(`${seed}:tempo`) * .2),
    roughness: round(.15 + stableUnit(`${seed}:rough`) * .55),
    timbre: round(stableUnit(`${seed}:timbre`)),
    resonatorScale: round(.93 + stableUnit(`${seed}:resonator`) * .14),
    contourBias: round(-.06 + stableUnit(`${seed}:contour`) * .12),
    harmonicBalance: round(.82 + stableUnit(`${seed}:harmonics`) * .36),
    breathiness: round(.04 + stableUnit(`${seed}:breath`) * .22),
    intensityScale: round(.88 + stableUnit(`${seed}:intensity`) * .24),
    repetitionSignature: round(stableUnit(`${seed}:repetition`)),
    provenance: "deterministic-identity; presentation and emission parameters only"
  });
}

export function migrateIndividualAcousticTraits(animal, worldSeed = 0) {
  if (!animal.acousticIdentity?.voiceSeed || Number(animal.acousticIdentity.version || 0) < 2) animal.acousticIdentity = Object.freeze({ ...createIndividualAcousticTraits(animal, worldSeed), ...(animal.acousticIdentity || {}), version: 2 });
  animal.acousticObservations ||= [];
  return animal;
}

function anatomicalContact(profile, animal) {
  const clade = profile?.production?.clade;
  if (clade === "bird") return "bird-foot";
  if (clade === "reptile") return animal.speciesId === "sunscale-ambusher" ? "body-drag" : "reptile-foot";
  if (["grazer", "great-plains-grazer", "woodland-browser", "dryland-runner", "highland-grazer", "armoured-browser", "northern-shaggy-grazer", "wild-boar", "african-elephant", "dromedary"].includes(animal.speciesId)) return animal.speciesId === "african-elephant" || animal.speciesId === "armoured-browser" ? "padded-columnar-foot" : animal.speciesId === "wild-boar" ? "cloven-hoof" : "hoof";
  return ["hunter", "brush-fox", "shadow-stalker", "great-omnivore", "pack-breaker", "highland-prowler", "little-opportunist"].includes(animal.speciesId) ? "paw" : "clawed-foot";
}

function substrateClass(cell = {}) {
  cell ||= {};
  if (cell.water || Number(cell.waterDepth || 0) > .04) return "water";
  if (Number(cell.snowPack || 0) > .1) return "snow";
  if (cell.wetland || cell.substrate === "clay" || cell.substrate === "peat") return "mud";
  if (cell.sandy || cell.substrate === "sand") return "sand";
  if (cell.rocky || cell.substrate === "bedrock") return "rock";
  if (cell.woodland) return "leaf-litter";
  if (cell.plantType === "grass" || Number(cell.grassHeight || 0) > .15) return "grass";
  return "soil";
}

export function createAnimalSoundEvent(animal, { tick = 0, call = null, movementNoise = animal?.movementNoise || 0, receiverCell = null, gait = null, limb = null } = {}) {
  const profile = acousticProfile(animal);
  if (!profile) return null;
  const callKind = call?.signalKind || call?.kind || null;
  const callProfile = callKind ? supportedAcousticCall(animal, callKind) : null;
  if (callKind && !callProfile) return null;
  if (!callProfile && movementNoise <= .045) return null;
  const identity = animal.acousticIdentity || createIndividualAcousticTraits(animal);
  const base = callProfile || {
    callId: "movement", signalKind: null, sourceLevelDb: 42 + clamp(movementNoise, 0, 1.4) * 30,
    durationSeconds: .12, centreFrequencyHz: profile.mechanicalSounds?.[0]?.centreFrequencyHz || 240,
    bandwidthOctaves: 3.5, synthesis: "modal-contact", mechanism: "footstep"
  };
  const levelScale = animal.lifeStage === "dependent" ? -8 : 0;
  const condition = Object.freeze({ fatigue: clamp(Number(animal.fatigue || 0) / 100, 0, 1), dehydration: clamp((92 - Number(animal.hydration ?? 92)) / 92, 0, 1), stress: clamp(Number(animal.stressResponse?.intensity ?? animal.fear ?? 0) / 100, 0, 1), injury: clamp((animal.injuries || []).reduce((sum, injury) => sum + Number(injury.severity || 0), 0) / 4, 0, 1), aggression: clamp(Number(animal.aggression || 0), 0, 1) });
  const conditionLevelDb = condition.stress * 3 + condition.aggression * 1.5 - condition.fatigue * 4 - condition.dehydration * 3 - condition.injury * 2;
  const centreFrequencyHz = Math.round(base.centreFrequencyHz * identity.pitchScale * (animal.lifeStage === "dependent" ? 1.22 : 1) * (1 + condition.stress * .025 - condition.fatigue * .018));
  const shape = base.synthesisShape ? { ...base.synthesisShape } : {};
  if (base.synthesis === "mammal-laryngeal" && !shape.formantsHz) {
    const bodyMass = clamp(Number(animal.bodyMass || 45), 1, 6000), spacing = clamp(740 / Math.pow(bodyMass, .22), 155, 620);
    shape.formantsHz = [spacing, spacing * 3, spacing * 5, spacing * 7].map(value => Math.round(value));
    shape.formantBandwidthHz = shape.formantsHz.map((value, index) => Math.round(value * (.18 - index * .012)));
  }
  const episodeTick = Number.isFinite(Number(call?.since)) ? Number(call.since) : tick;
  let boutIndex = 0, boutCount = 1;
  if (callProfile) {
    const rules = ({ courtship: [2, 9, 1], alarm: [1, 4, 1], care: [1, 3, 1], separated: [1, 2, 2], contact: [1, 3, 2], threat: [1, 3, 1] })[base.callId] || [1, 1, 1];
    boutCount = animal.speciesId === "hunter" && base.mechanism === "howl" ? 1 : Math.floor(rules[0] + (identity.repetitionSignature ?? stableUnit(`${identity.voiceSeed}:bout`)) * (rules[1] - rules[0] + 1));
    const elapsed = Math.max(0, tick - episodeTick); boutIndex = Math.floor(elapsed / rules[2]);
    if (call?.enforceSchedule && (tick < episodeTick || elapsed % rules[2] !== 0 || boutIndex >= boutCount)) return null;
  }
  const eventId = `${episodeTick}:${animal.id}:${base.callId}:${boutIndex}:${identity.voiceSeed}`;
  const event = {
    schemaVersion: 2, eventId, tick, sourceKind: "animal", sourceId: animal.id, speciesId: animal.speciesId,
    position: Object.freeze({ x: Number(animal.x), y: Number(animal.bodyMass > 100 ? 1.2 : .55), z: Number(animal.z) }),
    soundClass: callProfile ? "vocalisation" : "movement", semanticContract: callKind,
    sourceLevelDb: round(base.sourceLevelDb + levelScale + conditionLevelDb), durationSeconds: round(base.durationSeconds / identity.tempoScale * (1 + condition.fatigue * .07 + condition.injury * .04)),
    centreFrequencyHz, bandwidthOctaves: base.bandwidthOctaves || 2,
    spectrumDb: Object.freeze(ACOUSTIC_FREQUENCY_BANDS_HZ.map(frequencyHz => round(bandLevel(centreFrequencyHz, base.bandwidthOctaves || 2, base.sourceLevelDb + levelScale + conditionLevelDb, frequencyHz), 2))),
    synthesis: Object.freeze({ kind: base.synthesis, mechanism: base.mechanism, callId: base.callId, voiceSeed: identity.voiceSeed, pitchScale: identity.pitchScale, tempoScale: identity.tempoScale, roughness: identity.roughness, timbre: identity.timbre, resonatorScale: identity.resonatorScale, contourBias: identity.contourBias, harmonicBalance: identity.harmonicBalance, breathiness: identity.breathiness, intensityScale: identity.intensityScale, repetitionSignature: identity.repetitionSignature, condition, shape: Object.freeze(shape), contact: callProfile ? null : Object.freeze({ anatomy: anatomicalContact(profile, animal), substrate: substrateClass(receiverCell), bodyMassKg: Number(animal.bodyMass || 20), gait: gait || animal.movementRequest?.mode || animal.locomotion?.activeMode || "walk", limb: limb || "phase-derived", moisture: clamp(Number(receiverCell?.moisture || 0), 0, 1), contactForce: clamp(movementNoise * (animal.bodyMass || 20), .1, 9000) }) }),
    context: Object.freeze({ urgency: call?.urgency || 0, inferredTargetId: call?.inferredTargetId || null, predatorId: call?.predatorId || null, behaviouralTrigger: call?.behaviouralTrigger || callKind || (callProfile ? "authoritative call" : "authoritative foot contact"), movement: gait || animal.movementRequest?.mode || animal.locomotion?.activeMode || "stationary", posture: animal.actionState?.key || "unknown", social: call?.inferredTargetId ? "directed" : callProfile ? "broadcast" : "incidental", lifeStage: animal.lifeStage || "unknown", boutIndex, boutCount, howlFamily: animal.speciesId === "hunter" && base.mechanism === "howl" ? ["flat", "breaking", "continuous-wavy", "breaking-wavy"][identity.voiceSeed % 4] : null }),
    evidence: Object.freeze({ grade: callProfile?.evidenceGrade || "composite-model", sourceIds: callProfile?.sourceIds || [] })
  };
  if (callProfile) event.acousticScore = acousticScoreForEvent(event, animal);
  return Object.freeze(event);
}

export function createEnvironmentalSoundEvent({ id, kind, position, intensity = 0, tick = 0, durationSeconds = .8, centreFrequencyHz = null } = {}) {
  const normalized = clamp(Number(intensity || 0), 0, 1.5);
  if (!id || !position || normalized <= .02) return null;
  const settings = {
    rain: { level: 68, centre: 2600, bandwidth: 5, synthesis: "weather-noise" },
    wind: { level: 62, centre: 220, bandwidth: 5.5, synthesis: "weather-noise" },
    thunder: { level: 112, centre: 90, bandwidth: 5, synthesis: "weather-noise" },
    river: { level: 74, centre: 850, bandwidth: 4.5, synthesis: "water-noise" },
    waterfall: { level: 88, centre: 1200, bandwidth: 5, synthesis: "water-noise" },
    vegetation: { level: 58, centre: 1500, bandwidth: 5, synthesis: "weather-noise" }
  }[kind] || { level: 60, centre: 600, bandwidth: 5, synthesis: "mechanical-impact" };
  const sourceLevelDb = settings.level + 10 * Math.log10(Math.max(.02, normalized)), centre = centreFrequencyHz || settings.centre;
  return Object.freeze({
    schemaVersion: 1, eventId: `${tick}:environment:${id}:${kind}`, tick, sourceKind: "environment", sourceId: id, speciesId: null,
    position: Object.freeze({ x: Number(position.x), y: Number(position.y || 0), z: Number(position.z) }), soundClass: kind === "river" || kind === "waterfall" ? "water" : "weather", semanticContract: null,
    sourceLevelDb: round(sourceLevelDb), durationSeconds, centreFrequencyHz: centre, bandwidthOctaves: settings.bandwidth,
    spectrumDb: Object.freeze(ACOUSTIC_FREQUENCY_BANDS_HZ.map(frequencyHz => round(bandLevel(centre, settings.bandwidth, sourceLevelDb, frequencyHz), 2))),
    synthesis: Object.freeze({ kind: settings.synthesis, mechanism: kind, voiceSeed: hashString(`${id}:${kind}`), pitchScale: 1, tempoScale: 1, roughness: .8, timbre: normalized }),
    context: Object.freeze({ urgency: kind === "thunder" ? normalized : 0, continuous: ["rain", "wind", "river", "waterfall", "vegetation"].includes(kind), inferredTargetId: null, predatorId: null }), evidence: Object.freeze({ grade: "composite-model", sourceIds: ["iso-9613-1"] })
  });
}

function atmosphereLossPerMetre(frequencyHz, weather) {
  const temperature = Number(weather?.temp ?? 15), humidity = clamp(Number(weather?.humidity ?? (weather?.rain ? 75 + weather.rain * 20 : 55)), 5, 100), pressure = Number(weather?.pressureHpa ?? 1013);
  const frequencyKhz = frequencyHz / 1000;
  const dryness = 1 + Math.abs(humidity - 55) / 140;
  const temperatureFactor = 1 + Math.abs(15 - temperature) / 90;
  const pressureFactor = clamp(1013 / Math.max(700, pressure), .8, 1.3);
  return .00008 * frequencyKhz * frequencyKhz * dryness * temperatureFactor * pressureFactor;
}

function pathLoss(path = [], bandIndex = 0) {
  let terrain = 0, vegetation = 0, water = 0;
  if (!path.length) return { terrain, vegetation, water };
  const sourceElevation = Number(path[0]?.elevation || 0), receiverElevation = Number(path.at(-1)?.elevation || 0), frequencyHz = ACOUSTIC_FREQUENCY_BANDS_HZ[bandIndex];
  for (let index = 1; index < path.length - 1; index += 1) {
    const cell = path[index] || {}, expected = sourceElevation + (receiverElevation - sourceElevation) * index / Math.max(1, path.length - 1);
    const obstruction = Math.max(0, Number(cell.elevation || 0) - expected - .75);
    if (obstruction > 0) terrain += Math.min(14, 2.4 + obstruction * .85) * (frequencyHz < 250 ? .55 : 1);
    const woody = cell.woodland || cell.plantType === "tree" ? .75 : cell.shrubland || cell.plantType === "shrub" ? .32 : 0;
    const grass = clamp(Number(cell.grassHeight || 0) - .35, 0, .7);
    vegetation += (woody + grass * .24) * (.018 + Math.sqrt(frequencyHz / 1000) * .016);
    if (cell.water || Number(cell.waterDepth || 0) > 0) water += frequencyHz > 4000 ? .012 : .003;
  }
  return { terrain, vegetation, water };
}

export function environmentalMaskSpectrum(weather = {}, receiverCell = null) {
  const rain = clamp(Number(weather.rain || 0), 0, 1), wind = clamp(Number(weather.wind || 0), 0, 1.5), storm = clamp(Number(weather.stormFactor || 0), 0, 1), flow = clamp(Number(receiverCell?.discharge ?? receiverCell?.streamFlow ?? 0), 0, 20), vegetation = receiverCell?.woodland ? 1 : receiverCell?.shrubland ? .55 : .2;
  return Object.freeze(ACOUSTIC_FREQUENCY_BANDS_HZ.map(frequencyHz => {
    const lowWind = wind * (frequencyHz < 500 ? 28 : 12);
    const rainNoise = rain * (frequencyHz >= 500 ? 31 : 16);
    const foliage = wind * vegetation * (frequencyHz >= 1000 ? 18 : 8);
    const waterNoise = Math.log1p(flow) * (frequencyHz >= 125 && frequencyHz <= 4000 ? 9 : 3);
    return round(18 + lowWind + rainNoise + foliage + waterNoise + storm * 8, 2);
  }));
}

export function propagateSound(event, receiver, { path = [], sourceWeather = {}, receiverWeather = {}, receiverCell = null, windVector = null } = {}) {
  const dx = Number(receiver.x) - event.position.x, dz = Number(receiver.z) - event.position.z, distance = Math.max(1, Math.hypot(dx, dz));
  const geometricLossDb = 20 * Math.log10(distance);
  const directionLength = Math.max(.001, Math.hypot(dx, dz));
  const tailwind = windVector ? clamp((windVector.x * dx + windVector.z * dz) / directionLength, -1, 1) : 0;
  const weather = { ...sourceWeather, ...receiverWeather };
  const componentLosses = ACOUSTIC_FREQUENCY_BANDS_HZ.map((frequencyHz, bandIndex) => {
    const atmosphereDb = atmosphereLossPerMetre(frequencyHz, weather) * distance;
    const cells = pathLoss(path, bandIndex);
    const windDb = -tailwind * clamp(Number(receiverWeather.wind || 0), 0, 1.5) * Math.min(4, distance / 18);
    const totalDb = geometricLossDb + atmosphereDb + cells.terrain + cells.vegetation + cells.water + windDb;
    return Object.freeze({ frequencyHz, geometricDb: round(geometricLossDb), atmosphereDb: round(atmosphereDb), terrainDb: round(cells.terrain), vegetationDb: round(cells.vegetation), waterDb: round(cells.water), windDb: round(windDb), totalDb: round(totalDb) });
  });
  const receivedSpectrumDb = event.spectrumDb.map((level, index) => round(level - componentLosses[index].totalDb, 2));
  const maskerSpectrumDb = environmentalMaskSpectrum(receiverWeather, receiverCell);
  return Object.freeze({
    version: ACOUSTIC_PROPAGATION_VERSION, eventId: event.eventId, sourceId: event.sourceId, receiverId: receiver.id || null,
    distance: round(distance), bearingRadians: round(Math.atan2(dx, dz), 6), pathCellIds: Object.freeze(path.map(cell => cell?.id).filter(id => id != null).slice(0, 128)),
    componentLosses: Object.freeze(componentLosses), receivedSpectrumDb: Object.freeze(receivedSpectrumDb), maskerSpectrumDb,
    signalToNoiseDb: Object.freeze(receivedSpectrumDb.map((level, index) => round(level - maskerSpectrumDb[index], 2))),
    weather: Object.freeze({ rain: Number(receiverWeather.rain || 0), wind: Number(receiverWeather.wind || 0), temp: Number(receiverWeather.temp ?? 15), pressure: Number(receiverWeather.pressure || 0) })
  });
}

function thresholdAt(profile, frequencyHz) {
  const points = profile.audiogram;
  if (frequencyHz <= points[0].frequencyHz) return points[0].thresholdDb;
  if (frequencyHz >= points.at(-1).frequencyHz) return points.at(-1).thresholdDb;
  const upperIndex = points.findIndex(point => point.frequencyHz >= frequencyHz), lower = points[upperIndex - 1], upper = points[upperIndex];
  const ratio = (Math.log2(frequencyHz) - Math.log2(lower.frequencyHz)) / (Math.log2(upper.frequencyHz) - Math.log2(lower.frequencyHz));
  return lower.thresholdDb + (upper.thresholdDb - lower.thresholdDb) * ratio;
}

export function observeSound(listener, event, propagation, modifiers = {}) {
  const profile = acousticProfile(listener);
  if (!profile) return null;
  const hearingScale = clamp(Number(modifiers.hearingScale ?? 1), .1, 3), attention = clamp(Number(modifiers.attention ?? 1), .2, 5), conditionPenalty = Math.max(0, Number(modifiers.conditionPenaltyDb || 0));
  const marginsDb = ACOUSTIC_FREQUENCY_BANDS_HZ.map((frequencyHz, index) => {
    const biologicalThreshold = thresholdAt(profile, frequencyHz) + conditionPenalty - 10 * Math.log10(hearingScale * attention);
    const effectiveFloor = Math.max(biologicalThreshold, propagation.maskerSpectrumDb[index] + 3 * profile.localisation.maskingSusceptibility);
    return round(propagation.receivedSpectrumDb[index] - effectiveFloor, 2);
  });
  const detectionMarginDb = Math.max(...marginsDb), detected = detectionMarginDb >= 0;
  const confidence = detected ? clamp(.18 + detectionMarginDb / 24, .12, 1) : 0;
  const binaural = binauralEstimate(listener, propagation.bearingRadians, propagation.receivedSpectrumDb);
  const binauralGain = binaural.available ? .82 + binaural.bearingConfidence * .18 : 1;
  const angleErrorDegrees = detected ? clamp(profile.localisation.baseAngularErrorDegrees * binauralGain / Math.max(.25, confidence * attention), 2, 140) : 180;
  const recognitionConfidence = event.semanticContract && detected ? clamp(confidence * (listener.speciesId === event.speciesId ? .94 : profile.recognition.heterospecificAlarm && ["alarm", "threat"].includes(event.semanticContract) ? .42 : .12), 0, 1) : 0;
  const identifiesSpecies = detected && confidence >= .55;
  const identifiesIndividual = identifiesSpecies && listener.speciesId === event.speciesId && profile.recognition.individualVoice && confidence >= .72;
  const jitter = (stableUnit(`${event.eventId}:${listener.id}:bearing`) - .5) * angleErrorDegrees * Math.PI / 180;
  return Object.freeze({
    schemaVersion: 1, eventId: event.eventId, sourceId: event.sourceId, receiverId: listener.id, detected,
    detectionMarginDb: round(detectionMarginDb), bandMarginsDb: Object.freeze(marginsDb), confidence: round(confidence),
    bearingRadians: round(propagation.bearingRadians + jitter, 6), bearingUncertaintyDegrees: round(angleErrorDegrees, 1), binaural,
    distanceEstimate: detected ? round(propagation.distance * (1 + (stableUnit(`${event.eventId}:${listener.id}:distance`) - .5) * (1 - confidence))) : null,
    distanceUncertainty: detected ? round(propagation.distance * (1 - confidence)) : null,
    classification: detected ? event.soundClass : null, acousticScoreId: event.acousticScore?.scoreId || null, identifiedSpecies: identifiesSpecies ? event.speciesId : null,
    identifiedIndividual: identifiesIndividual ? event.sourceId : null,
    recognisedSignalKind: recognitionConfidence >= .35 ? event.semanticContract : null,
    recognitionConfidence: round(recognitionConfidence), maskerSpectrumDb: propagation.maskerSpectrumDb,
    receivedSpectrumDb: propagation.receivedSpectrumDb, propagationVersion: propagation.version,
    explanation: Object.freeze({ detected, strongestBandHz: ACOUSTIC_FREQUENCY_BANDS_HZ[marginsDb.indexOf(detectionMarginDb)], detectionMarginDb: round(detectionMarginDb), distance: propagation.distance, losses: propagation.componentLosses, weather: propagation.weather, evidenceGrade: profile.evidence.grade })
  });
}

export function acousticObservationContact(listener, event, observation, bounds = Infinity) {
  if (!observation?.detected) return null;
  const distance = observation.distanceEstimate ?? 0, bearing = observation.bearingRadians;
  const x = clamp(Math.round(listener.x + Math.sin(bearing) * distance), -bounds, bounds - 1);
  const z = clamp(Math.round(listener.z + Math.cos(bearing) * distance), -bounds, bounds - 1);
  const understood = Boolean(observation.recognisedSignalKind && listener.speciesId === event.speciesId);
  return {
    type: understood ? (["threat", "alarm"].includes(observation.recognisedSignalKind) ? "predator" : observation.recognisedSignalKind) : "unknownSound",
    targetId: observation.identifiedIndividual || undefined, speciesId: observation.identifiedSpecies || undefined,
    soundIdentity: observation.identifiedSpecies || "unknown", x, z, confidence: understood ? observation.recognitionConfidence : observation.confidence * .65,
    uncertainty: observation.distanceUncertainty, bearing: observation.bearingRadians, age: 0, channel: "hearing",
    ...(understood ? { communicatedBy: event.sourceId, signalKind: observation.recognisedSignalKind, urgency: event.context.urgency, inferredTargetId: event.context.inferredTargetId || undefined, predatorId: event.context.predatorId || undefined } : {}),
    acoustic: observation
  };
}

export function lineSamplePath(source, receiver, cellAt, maximumSamples = 64) {
  const distance = Math.hypot(receiver.x - source.x, receiver.z - source.z), samples = Math.min(maximumSamples, Math.max(2, Math.ceil(distance)));
  const path = [], seen = new Set();
  for (let index = 0; index <= samples; index += 1) {
    const ratio = index / samples, cell = cellAt(source.x + (receiver.x - source.x) * ratio, source.z + (receiver.z - source.z) * ratio);
    if (cell && !seen.has(cell.id)) { path.push(cell); seen.add(cell.id); }
  }
  return path;
}
