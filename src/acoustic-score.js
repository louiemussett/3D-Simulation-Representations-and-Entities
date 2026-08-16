import { acousticProfile } from "./acoustic-profiles.js";

const freeze = value => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) freeze(child);
  }
  return value;
};
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

export const ACOUSTIC_SCORE_SCHEMA = 1;
export const ACOUSTIC_SCORE_UNITS = freeze({ frequency: "Hz", time: "seconds", level: "dB SPL at 1 m", contourTime: "normalized 0..1", contourFrequency: "ratio of F0" });

// These are species identity scores, not claims that every repertoire entry is
// exact-species research. Founders use digitised/measured source material; the
// remaining entries remain visibly graded composite models until reviewed.
const SIGNATURES = {
  grazer: [132, 1.43, "glottal-source-filter", [1.06, 1.04, 1.01, .97, .93], [245, 735, 1225, 1715, 2205], 1, .1, "low-brass"],
  hunter: [430, 5.5, "additive-howl", [.78, .86, .98, .91, 1.08], [860, 1290, 2150], 1, .055, "reed-choir"],
  "valley-grazer-updated": [128, 1.5, "glottal-source-filter", [1.08, 1.04, .99, .94, .9], [240, 720, 1200, 1680, 2160], 1, .11, "low-brass"],
  "ridge-hunter-updated": [420, 5.8, "additive-howl", [.76, .87, 1, .9, 1.1], [840, 1260, 2100], 1, .06, "reed-choir"],
  "meadow-nibbler": [1180, .34, "glottal-source-filter", [1.18, 1.02, .83, 1.1], [1420, 2840, 4260], 3, .2, "piccolo-reed"],
  "great-plains-grazer": [118, .72, "glottal-source-filter", [.96, .88, .8], [340, 890, 1480], 2, .19, "bass-drum-reed"],
  "woodland-browser": [178, 1.12, "glottal-source-filter", [.72, .9, 1.08, .96], [520, 1120, 1810], 1, .12, "bassoon"],
  "brush-fox": [910, 1.36, "glottal-source-filter", [.72, 1.25, 1.06, 1.42, .84], [1850, 3100, 4750], 2, .22, "oboe-string"],
  "shadow-stalker": [510, 1.48, "glottal-source-filter", [.86, 1.04, .91, 1.18, .76], [1040, 2080, 3350], 2, .26, "muted-horn"],
  "great-omnivore": [104, 1.18, "nonlinear-glottal", [.91, .77, .7], [310, 720, 1260], 1, .34, "contrabass"],
  "dryland-runner": [690, .28, "glottal-source-filter", [1.25, 1.08, .76], [1350, 2650, 4100], 2, .15, "woodblock-reed"],
  "highland-grazer": [355, .64, "glottal-source-filter", [.82, 1.16, .92, 1.08], [780, 1560, 2640], 2, .11, "english-horn"],
  "armoured-browser": [82, 1.55, "nonlinear-glottal", [.7, .88, .74, 1.03], [260, 620, 1030], 1, .3, "sub-bass-brass"],
  "pack-breaker": [545, 2.2, "nonlinear-glottal", [.63, .79, 1.02, 1.27, 1.14], [940, 1920, 3060], 1, .24, "trombone-reed"],
  "carrion-runner": [92, 1.8, "dual-syrinx", [.94, 1.01, .96], [310, 590, 880], 2, .06, "bass-ocarina"],
  "waterline-grazer": [1560, .31, "glottal-source-filter", [.82, 1.31, 1.06], [2050, 3650, 5480], 3, .08, "whistle-marimba"],
  "brush-nibbler": [1320, .42, "glottal-source-filter", [1.25, 1.08, .74, 1.18], [1680, 3250, 4800], 2, .24, "piccolo-string"],
  "waterline-ambusher": [48, 1.9, "pulsed-resonator", [.88, 1.03, .91], [150, 310, 620], 5, .22, "bass-drum-brass"],
  "northern-shaggy-grazer": [96, .68, "glottal-source-filter", [.98, .82, .9], [320, 760, 1280], 2, .2, "contrabassoon"],
  "highland-prowler": [465, 1.82, "nonlinear-glottal", [.77, .96, 1.13, .89, 1.04], [1010, 2020, 3180], 2, .2, "horn-string"],
  "little-opportunist": [1270, .78, "glottal-source-filter", [.82, 1.21, .94, 1.34, .76], [1740, 3320, 5100], 5, .19, "clarinet-pluck"],
  "cold-country-scavenger": [1720, .72, "dual-syrinx", [1.12, .86, 1.28, .79], [2300, 4100, 6200], 3, .04, "trumpet-drum"],
  "sunscale-ambusher": [2300, 1.35, "turbulent-hiss", [1, .93, 1.06], [], 9, .96, "shaker-filter"],
  "shieldback-colony": [330, .46, "pulsed-resonator", [.84, 1.18, .9], [680, 1340, 2250], 2, .18, "guiro-reed"],
  "wild-boar": [185, .5, "nonlinear-glottal", [.87, .72, .96], [470, 980, 1690], 3, .3, "bass-clarinet"],
  "african-elephant": [22, 3.2, "glottal-source-filter", [.86, .94, 1.03, .91], [90, 180, 360], 1, .08, "sub-bass-organ"],
  dromedary: [145, 1.65, "nonlinear-glottal", [.72, 1.08, .83, 1.2, .76], [430, 970, 1610], 2, .32, "bassoon-brass"],
  "common-ostrich": [72, 1.45, "dual-syrinx", [.9, 1.06, .94], [220, 460, 890], 3, .09, "bass-drum-flute"]
};

const callTransform = {
  alarm: { duration: .52, pitch: 1.32, pulses: 2, roughness: .12, contour: [1.22, 1.04, .77] },
  threat: { duration: .72, pitch: .82, pulses: 1, roughness: .28, contour: [1.08, .9, .71] },
  care: { duration: .68, pitch: 1.16, pulses: 3, roughness: -.08, contour: [.92, 1.08, .97] },
  separated: { duration: 1.1, pitch: 1.06, pulses: 2, roughness: .03, contour: [.76, 1.1, .92, 1.24] },
  courtship: { duration: 1, pitch: 1, pulses: 1, roughness: .03 },
  contact: { duration: 1, pitch: 1, pulses: 1, roughness: 0 }
};

function curve(values, kind) {
  return freeze(values.map((value, index) => ({ time: values.length === 1 ? 0 : index / (values.length - 1), [kind]: value })));
}

function amplitudeEnvelope(pulses, attack = .08, release = .18) {
  const points = [{ time: 0, amplitude: 0 }];
  for (let pulse = 0; pulse < pulses; pulse += 1) {
    const start = pulse / pulses, end = (pulse + .82) / pulses;
    points.push({ time: clamp(start + attack / Math.max(1, pulses), 0, 1), amplitude: 1 });
    points.push({ time: clamp(end - release / Math.max(1, pulses), 0, 1), amplitude: .82 });
    points.push({ time: clamp(end, 0, 1), amplitude: 0 });
  }
  if (points.at(-1).time < 1) points.push({ time: 1, amplitude: 0 });
  return freeze(points);
}

function founderOverride(event, signature) {
  const mechanism = event?.synthesis?.mechanism;
  if (event?.speciesId === "grazer" && mechanism === "harsh-roar") return { ...signature, duration: .65, mechanism: "nonlinear-glottal", contour: [1.04, .96, .82], pulses: 1, roughness: .52 };
  if (event?.speciesId === "grazer" && mechanism === "bark") return { ...signature, f0: event.centreFrequencyHz, duration: .23, mechanism: "nonlinear-glottal", contour: [1.12, .91, .72], formants: [520, 1220, 2260], pulses: 1, roughness: .42 };
  if (event?.speciesId === "hunter" && mechanism === "howl") {
    const families = { flat: [.94, .96, .95, .97], breaking: [.78, .83, 1.12, 1.08], "continuous-wavy": [.86, 1.08, .91, 1.13, .94], "breaking-wavy": [.74, .96, .82, 1.18, .91, 1.22] };
    return { ...signature, duration: event.durationSeconds, contour: families[event.context?.howlFamily] || families["breaking-wavy"] };
  }
  if (event?.speciesId === "hunter" && ["bark", "growl", "whine", "yelp"].includes(mechanism)) return { ...signature, f0: event.centreFrequencyHz, duration: event.durationSeconds, mechanism: mechanism === "growl" ? "nonlinear-glottal" : "glottal-source-filter", contour: event.synthesis?.shape ? [event.synthesis.shape.pitchStart || 1, 1, event.synthesis.shape.pitchEnd || 1] : signature.contour, formants: event.synthesis?.shape?.formantsHz || signature.formants, pulses: event.synthesis?.shape?.syllables || 1, roughness: mechanism === "growl" ? .64 : mechanism === "bark" ? .4 : .14 };
  return signature;
}

export function acousticScoreForEvent(event, subject = null) {
  if (!event) return null;
  const row = SIGNATURES[event.speciesId];
  if (!row) return null;
  const profile = acousticProfile(event.speciesId), callId = event.synthesis?.callId || event.semanticContract || "contact";
  const [f0, duration, mechanism, contour, formants, pulses, turbulence, instrument] = row;
  let signature = founderOverride(event, { f0, duration, mechanism, contour, formants, pulses, roughness: event.synthesis?.roughness || .2 });
  const transform = callTransform[callId] || callTransform.contact;
  const juvenile = (subject?.lifeStage || event.context?.lifeStage) === "dependent";
  const scoreDuration = clamp(Number(event.durationSeconds || signature.duration) * (callId === "contact" ? 1 : transform.duration), .08, 14);
  const scoreF0 = clamp(Number(event.centreFrequencyHz || signature.f0) * transform.pitch, 12, 32000);
  const scoreContour = transform.contour || signature.contour, contourBias = Number(event.synthesis?.contourBias || 0);
  const individualContour = scoreContour.map(ratio => ratio + contourBias);
  const juvenileContour = juvenile ? individualContour.map((ratio, index) => ratio * (index % 2 ? .94 : 1.08)) : individualContour;
  const scorePulses = juvenile ? Math.max(2, signature.pulses + 1) : Math.max(signature.pulses, transform.pulses);
  const evidenceGrade = event.evidence?.grade || profile?.evidence?.grade || "unknown";
  return freeze({
    schemaVersion: ACOUSTIC_SCORE_SCHEMA,
    scoreId: `${event.speciesId}:${callId}:${juvenile ? "juvenile" : "adult"}:v1`,
    speciesId: event.speciesId,
    scientificName: profile?.scientificName || null,
    modelBasis: profile?.modelBasis || null,
    callId,
    lifeStageClass: juvenile ? "juvenile-composite-score" : "adult",
    productionMechanism: signature.mechanism,
    durationSeconds: scoreDuration,
    sourceLevelDb: event.sourceLevelDb,
    fundamentalHz: scoreF0,
    frequencyContour: curve(juvenileContour, "ratio"),
    amplitudeEnvelope: amplitudeEnvelope(scorePulses, event.synthesis?.shape?.attack, event.synthesis?.shape?.release),
    harmonics: freeze({ count: signature.mechanism === "turbulent-hiss" ? 0 : 18, rolloff: (event.synthesis?.shape?.harmonicRolloff || 1.15) / (event.synthesis?.harmonicBalance || 1), subharmonic: clamp(signature.roughness * .34, 0, .35) }),
    formants: freeze((event.synthesis?.shape?.formantsHz?.length ? event.synthesis.shape.formantsHz : signature.formants).map((frequencyHz, index) => ({ frequencyHz: frequencyHz * (event.synthesis?.resonatorScale || 1), bandwidthHz: event.synthesis?.shape?.formantBandwidthHz?.[index] || Math.max(45, frequencyHz * .16), trajectory: callId === "courtship" && event.speciesId === "grazer" ? [1.05, .91] : [1, 1] }))),
    turbulence: clamp(turbulence + transform.roughness + Number(event.synthesis?.breathiness || 0), 0, 1),
    jitter: clamp(event.synthesis?.shape?.jitter || signature.roughness * .08, 0, .2),
    roughness: clamp(signature.roughness + transform.roughness, 0, 1),
    rhythm: freeze({ pulses: scorePulses, pulseRateHz: event.synthesis?.shape?.pulseRate || event.synthesis?.shape?.trillRate || scorePulses / scoreDuration, callsPerBout: callId === "courtship" ? [2, 9] : callId === "alarm" ? [1, 4] : [1, 3], authorizedBoutCount: event.context?.boutCount || 1, boutIndex: event.context?.boutIndex || 0, interCallSeconds: callId === "courtship" ? [.45, 3.5] : [.2, 8], refractorySeconds: callId === "alarm" ? 4 : 12 }),
    context: freeze({ behaviouralTrigger: event.context?.behaviouralTrigger || event.semanticContract || "authoritative simulation event", movement: event.context?.movement || "unknown", posture: event.context?.posture || "unknown", social: event.context?.social || "unknown" }),
    individual: freeze({ voiceSeed: event.synthesis?.voiceSeed || 0, pitchScale: event.synthesis?.pitchScale || 1, resonatorScale: event.synthesis?.resonatorScale || 1, contourBias: event.synthesis?.contourBias || 0, harmonicBalance: event.synthesis?.harmonicBalance || 1, tempoScale: event.synthesis?.tempoScale || 1, timbre: event.synthesis?.timbre || 0, roughness: event.synthesis?.roughness || 0, breathiness: event.synthesis?.breathiness || 0, intensityScale: event.synthesis?.intensityScale || 1, repetitionSignature: event.synthesis?.repetitionSignature || 0, momentaryCondition: event.synthesis?.condition || null }),
    sonificationInstrument: instrument,
    distinctiveness: freeze({ emphasized: ["frequency-contour", "pulse-pattern", "formant-spacing", "attack-release", "roughness"], boundedBy: evidenceGrade.includes("exact-species") ? "reported exact-species ranges" : "declared composite/proxy range", unrelatedSignatureAdded: false }),
    evidence: freeze({ grade: evidenceGrade, confidence: profile?.evidence?.confidence || .35, sourceIds: event.evidence?.sourceIds || [], extractionMethod: event.speciesId === "grazer" || event.speciesId === "hunter" ? "published measurements and figure-informed contour" : "declared composite model pending exact-species review", uncertainty: evidenceGrade.includes("exact-species") ? "see parameter evidence" : "high" }),
    units: ACOUSTIC_SCORE_UNITS,
    recordingsDistributed: false
  });
}

export function interpolateScoreCurve(points, progress, key) {
  if (!points?.length) return key === "amplitude" ? 1 : 1;
  const x = clamp(progress, 0, 1);
  const upperIndex = points.findIndex(point => point.time >= x);
  if (upperIndex <= 0) return Number(points[0][key]);
  if (upperIndex < 0) return Number(points.at(-1)[key]);
  const lower = points[upperIndex - 1], upper = points[upperIndex], ratio = (x - lower.time) / Math.max(.000001, upper.time - lower.time);
  return Number(lower[key]) * (1 - ratio) + Number(upper[key]) * ratio;
}

export function validateAcousticScore(score) {
  const errors = [];
  if (!score?.scoreId) errors.push("missing score ID");
  if (!(score?.durationSeconds > 0)) errors.push("invalid duration");
  if (!(score?.fundamentalHz > 0)) errors.push("invalid fundamental frequency");
  if (!score?.frequencyContour?.length) errors.push("missing frequency contour");
  if (!score?.amplitudeEnvelope?.length) errors.push("missing amplitude envelope");
  if (!score?.evidence?.grade) errors.push("missing evidence grade");
  if (score?.recordingsDistributed !== false) errors.push("runtime recording prohibited");
  return errors;
}

export const SPECIES_SIGNATURE_IDS = freeze(Object.keys(SIGNATURES));
